-- OrkestaPay integration, part 1: split the online real-money purchase path
-- into "reserve" (this migration) and "confirm paid" (0033) so a ticket's
-- QR only exists after a real payment gateway confirms money moved, instead
-- of create_order_and_tickets' current unconditional "mark it paid" ending.
--
-- Taquilla (cash/terminal, sales_channel='taquilla') and $0 courtesy orders
-- keep calling create_order_and_tickets completely unmodified — there is no
-- gateway to wait for in either case. This migration does not touch that
-- function.

-- Seat reservations must survive far longer than the existing 5-minute
-- browsing hold (hold_event_seats, 0010_seat_hold_rpc.sql) — a SPEI/cash
-- payment can sit in "waiting for confirmation" for hours or days. A new
-- 'reserved' status tied to order_id (not the TTL-based held_by/
-- hold_expires_at pair) records "this still-pending order owns this seat"
-- for as long as needed, independent of the browsing-hold TTL.
alter table event_seats add column order_id uuid references orders(id) on delete set null;

alter table event_seats drop constraint chk_hold_fields;
alter table event_seats add constraint chk_hold_fields check (
  (status = 'held' and held_by is not null and hold_expires_at is not null and order_id is null)
  or (status = 'reserved' and order_id is not null and held_by is null and hold_expires_at is null)
  or (status in ('available', 'sold') and held_by is null and hold_expires_at is null and order_id is null)
);

alter table event_seats drop constraint event_seats_status_check;
alter table event_seats add constraint event_seats_status_check
  check (status in ('available', 'held', 'reserved', 'sold'));

create index idx_event_seats_order on event_seats(order_id) where order_id is not null;

alter table orders add column payment_provider text not null default 'none'
  check (payment_provider in ('orkestapay', 'none'));
alter table orders add column orkesta_checkout_id text;
alter table orders add column orkesta_order_id text unique;
alter table orders add column orkesta_payment_id text;
alter table orders add column expires_at timestamptz;

-- reserve_order(): create_order_and_tickets' auth/presale/cancelled/
-- courtesy-limit/AUTH_MISMATCH checks and atomic inventory-decrement logic,
-- reused near-verbatim — but stops before inserting tickets or marking
-- paid. Online-only (no p_sales_channel param; always 'online').
create function reserve_order(
  p_event_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_items jsonb default null,
  p_seat_ids uuid[] default null,
  p_idempotency_key uuid default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_order_id uuid;
  v_existing_order_id uuid;
  v_item jsonb;
  v_type_id uuid;
  v_qty int;
  v_unit_price numeric;
  v_subtotal numeric := 0;
  v_uid uuid := auth.uid();
  v_seat_count int;
  v_held_count int;
  v_seat_type_rec record;
  v_courtesy_limit int;
  v_existing_courtesy int;
  v_requested_courtesy int := 0;
  v_event_status text;
  v_presale_date timestamptz;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in to create an order' using errcode = 'P0001';
  end if;

  if p_idempotency_key is not null then
    select id into v_existing_order_id from orders where idempotency_key = p_idempotency_key;
    if v_existing_order_id is not null then
      return v_existing_order_id;
    end if;
  end if;

  select status, presale_date into v_event_status, v_presale_date from events where id = p_event_id;

  if v_event_status = 'cancelled' then
    raise exception 'EVENT_CANCELLED: this event has been cancelled' using errcode = 'P0001';
  end if;

  if v_presale_date is not null and now() < v_presale_date then
    raise exception 'NOT_ON_SALE: tickets for this event are not yet on sale' using errcode = 'P0001';
  end if;

  if p_user_id is null or v_uid <> p_user_id then
    if not (
      is_superadmin(v_uid)
      or exists (
        select 1 from events e
        join organization_members om on om.organization_id = e.organization_id and om.profile_id = v_uid
        join profiles p on p.id = v_uid
        where e.id = p_event_id
          and p.role in ('organization', 'taquilla')
      )
    ) then
      raise exception 'AUTH_MISMATCH: not authorized to create an order for another user'
        using errcode = 'P0001';
    end if;
  end if;

  if p_items is null and p_seat_ids is null then
    raise exception 'INVALID_ARGS: at least one of p_items or p_seat_ids must be provided'
      using errcode = 'P0001';
  end if;

  select courtesy_tickets_per_event into v_courtesy_limit from organizations where id = p_organization_id;
  if v_courtesy_limit is not null then
    select count(*) into v_existing_courtesy
      from tickets t
      join event_ticket_types ett on ett.id = t.ticket_type_id
      where t.event_id = p_event_id and ett.price = 0 and t.status <> 'cancelled';

    if p_items is not null then
      for v_item in select * from jsonb_array_elements(p_items) loop
        if (select price from event_ticket_types where id = (v_item->>'ticket_type_id')::uuid) = 0 then
          v_requested_courtesy := v_requested_courtesy + (v_item->>'quantity')::int;
        end if;
      end loop;
    end if;

    if p_seat_ids is not null then
      select v_requested_courtesy + count(*) into v_requested_courtesy
        from event_seats es
        join event_ticket_types ett on ett.id = es.ticket_type_id
        where es.id = any(p_seat_ids) and ett.price = 0;
    end if;

    if v_existing_courtesy + v_requested_courtesy > v_courtesy_limit then
      raise exception 'COURTESY_LIMIT: this event has reached its contractual courtesy ticket limit (%)', v_courtesy_limit
        using errcode = 'P0001';
    end if;
  end if;

  insert into orders (
    event_id, organization_id, user_id, status,
    customer_name, customer_email, customer_phone,
    sales_channel, idempotency_key, payment_provider, expires_at
  ) values (
    p_event_id, p_organization_id, p_user_id, 'pending',
    p_customer_name, p_customer_email, p_customer_phone,
    'online', p_idempotency_key, 'orkestapay', now() + interval '72 hours'
  ) returning id into v_order_id;

  if p_items is not null then
    for v_item in select * from jsonb_array_elements(p_items) loop
      v_type_id := (v_item->>'ticket_type_id')::uuid;
      v_qty := (v_item->>'quantity')::int;

      update event_ticket_types
        set sold = sold + v_qty
        where id = v_type_id and sold + v_qty <= capacity
        returning price into v_unit_price;

      if not found then
        raise exception 'SOLD_OUT: ticket_type % has insufficient inventory', v_type_id
          using errcode = 'P0001';
      end if;

      insert into order_items (order_id, ticket_type_id, quantity, unit_price)
      values (v_order_id, v_type_id, v_qty, v_unit_price);

      v_subtotal := v_subtotal + v_unit_price * v_qty;
    end loop;
  end if;

  if p_seat_ids is not null then
    v_seat_count := coalesce(array_length(p_seat_ids, 1), 0);
    if v_seat_count = 0 then
      raise exception 'NO_SEATS: p_seat_ids must not be empty' using errcode = 'P0001';
    end if;

    perform 1 from event_seats where id = any(p_seat_ids) order by id for update;

    select count(*) into v_held_count
      from event_seats
      where id = any(p_seat_ids)
        and event_id = p_event_id
        and status = 'held'
        and held_by = v_uid
        and hold_expires_at > now();

    if v_held_count <> v_seat_count then
      raise exception 'HOLD_EXPIRED: one or more selected seats are no longer held by you'
        using errcode = 'P0001';
    end if;

    for v_seat_type_rec in
      select ticket_type_id, count(*) as qty from event_seats
      where id = any(p_seat_ids) group by ticket_type_id
    loop
      v_type_id := v_seat_type_rec.ticket_type_id;
      v_qty := v_seat_type_rec.qty;

      update event_ticket_types
        set sold = sold + v_qty
        where id = v_type_id and sold + v_qty <= capacity
        returning price into v_unit_price;

      if not found then
        raise exception 'SOLD_OUT: ticket_type % has insufficient inventory', v_type_id
          using errcode = 'P0001';
      end if;

      insert into order_items (order_id, ticket_type_id, quantity, unit_price)
      values (v_order_id, v_type_id, v_qty, v_unit_price);

      v_subtotal := v_subtotal + v_unit_price * v_qty;
    end loop;

    update event_seats
      set status = 'reserved', order_id = v_order_id, held_by = null, hold_expires_at = null
      where id = any(p_seat_ids);
  end if;

  update orders
    set subtotal = v_subtotal,
        service_fee = round(v_subtotal * 0.08, 2),
        total = round(v_subtotal * 1.08, 2)
    where id = v_order_id;

  return v_order_id;
end;
$$;

revoke execute on function reserve_order(uuid, uuid, uuid, text, text, text, jsonb, uuid[], uuid) from public;
grant execute on function reserve_order(uuid, uuid, uuid, text, text, text, jsonb, uuid[], uuid) to authenticated;

-- Shared rollback used by release_order (buyer/staff-facing, below),
-- release_expired_orders (reaper, below) and the webhook handler's
-- payment.cancel case (via confirm_order_paid's migration grant). No
-- authorization check of its own — every caller has already established
-- authorization (or is service_role) before reaching this.
create function do_release_order(p_order_id uuid) returns boolean
language plpgsql
security definer
as $$
declare
  v_status text;
  v_item record;
begin
  select status into v_status from orders where id = p_order_id for update;

  if v_status is null then
    raise exception 'ORDER_NOT_FOUND: order % does not exist', p_order_id using errcode = 'P0001';
  end if;

  if v_status <> 'pending' then
    return false;
  end if;

  for v_item in
    select oi.ticket_type_id, oi.quantity
    from order_items oi
    where oi.order_id = p_order_id
      and not exists (select 1 from event_seats es where es.ticket_type_id = oi.ticket_type_id)
  loop
    update event_ticket_types set sold = sold - v_item.quantity where id = v_item.ticket_type_id;
  end loop;

  update event_seats set status = 'available', order_id = null where order_id = p_order_id;
  update orders set status = 'failed' where id = p_order_id;

  return true;
end;
$$;

revoke execute on function do_release_order(uuid) from public;

-- release_order(): buyer/staff-facing entrypoint, called from the
-- OrkestaPay canceled_redirect_url landing page. Safe to call more than
-- once, or after a webhook already resolved the order another way.
create function release_order(p_order_id uuid) returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_order record;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in to release an order' using errcode = 'P0001';
  end if;

  select id, user_id, organization_id into v_order from orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'ORDER_NOT_FOUND: order % does not exist', p_order_id using errcode = 'P0001';
  end if;

  if not (
    is_superadmin(v_uid)
    or v_order.user_id = v_uid
    or exists (
      select 1 from organization_members om
      where om.profile_id = v_uid and om.organization_id = v_order.organization_id
    )
  ) then
    raise exception 'FORBIDDEN: not authorized to release order %', p_order_id using errcode = 'P0001';
  end if;

  perform do_release_order(p_order_id);
end;
$$;

revoke execute on function release_order(uuid) from public;
grant execute on function release_order(uuid) to authenticated;

-- Sweep for orders nobody explicitly released (abandoned checkout, browser
-- closed mid-payment). Not wired to any schedule by this migration — ready
-- for a future Vercel Cron. Worst case without one: inventory stays
-- "reserved" for an abandoned cart until the 72h expires_at passes. Never
-- causes a double-sale, only pessimistic unavailability in the meantime.
create function release_expired_orders() returns int
language plpgsql
security definer
as $$
declare
  v_order_id uuid;
  v_count int := 0;
begin
  for v_order_id in select id from orders where status = 'pending' and expires_at < now() loop
    perform do_release_order(v_order_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function release_expired_orders() from public;
grant execute on function release_expired_orders() to service_role;
