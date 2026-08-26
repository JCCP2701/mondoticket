-- Makes the online "pending payment" reservation window (previously a
-- hardcoded 72h in reserve_order) administrable per organization, and
-- enforces it the same way hold_event_seats already enforces its 5-minute
-- browsing hold: lazily, with no cron. reclaim_expired_reservations() is
-- called at the top of both reserve_order and hold_event_seats, so any
-- buyer or taquilla staff touching an event's inventory first sweeps that
-- event's own expired pending orders back to available/sold-count-reverted
-- before doing anything else. Courtesy ($0) and taquilla sales never enter
-- 'pending' state (they go through create_order_and_tickets, untouched by
-- this migration), so they're excluded by construction — no special-casing
-- needed here.

alter table organizations
  add column reservation_hold_minutes int not null default 4320 -- 4320 min = 72h, matches prior hardcoded behavior
  check (reservation_hold_minutes between 5 and 129600); -- 5 minutes .. 90 days

comment on column organizations.reservation_hold_minutes is
  'Minutes a pending online order keeps seats/inventory reserved before being lazily released back to public sale. Does not apply to courtesy or taquilla orders — those never enter a pending state.';

-- Sweep one event's own expired pending orders. Mirrors hold_event_seats'
-- lazy-reclaim philosophy (0010_seat_hold_rpc.sql): no cron, checked
-- atomically at write time. `for update skip locked` so two events being
-- purchased concurrently never block each other, and a second caller
-- racing the same event just skips orders already being reclaimed.
create or replace function reclaim_expired_reservations(p_event_id uuid) returns int
language plpgsql
security definer
as $$
declare
  v_order_id uuid;
  v_count int := 0;
begin
  for v_order_id in
    select o.id from orders o
    where o.event_id = p_event_id
      and o.status = 'pending'
      and o.expires_at < now()
    for update skip locked
  loop
    perform do_release_order(v_order_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function reclaim_expired_reservations(uuid) from public;
grant execute on function reclaim_expired_reservations(uuid) to authenticated, anon;

-- organizations has RLS restricting reads to org members/superadmin (see
-- 0002_rls.sql), so a public/guest buyer at checkout can't read
-- reservation_hold_minutes directly or via an embedded join. This narrow,
-- security-definer lookup exposes just that one number (nothing else about
-- the organization) so checkout can show the buyer an accurate reservation
-- window without needing org membership.
create or replace function get_event_hold_minutes(p_event_id uuid) returns int
language sql
stable
security definer
as $$
  select o.reservation_hold_minutes
  from events e
  join organizations o on o.id = e.organization_id
  where e.id = p_event_id;
$$;

revoke execute on function get_event_hold_minutes(uuid) from public;
grant execute on function get_event_hold_minutes(uuid) to authenticated, anon;

-- hold_event_seats: reclaim this event's expired reservations first, so a
-- seat stuck 'reserved' under an abandoned pending order shows as
-- available the moment anyone (buyer or taquilla) next opens the seat map.
create or replace function hold_event_seats(
  p_event_id uuid,
  p_seat_ids uuid[]
) returns table (seat_id uuid, hold_expires_at timestamptz)
language plpgsql
security definer
as $$
declare
  v_hold_seconds constant int := 300; -- 5 minutes
  v_uid uuid := auth.uid();
  v_requested int;
  v_claimed int;
begin
  perform reclaim_expired_reservations(p_event_id);

  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in to hold seats' using errcode = 'P0001';
  end if;

  v_requested := coalesce(array_length(p_seat_ids, 1), 0);
  if v_requested = 0 then
    raise exception 'NO_SEATS: p_seat_ids must not be empty' using errcode = 'P0001';
  end if;

  with candidates as (
    select id from event_seats
    where id = any(p_seat_ids) and event_id = p_event_id
    order by id
    for update
  )
  update event_seats es
    set held_by = v_uid,
        hold_expires_at = now() + make_interval(secs => v_hold_seconds),
        status = 'held'
    from candidates c
    where es.id = c.id
      and es.status <> 'sold'
      and (
        es.status = 'available'
        or es.held_by = v_uid
        or es.hold_expires_at < now()
      );

  get diagnostics v_claimed = row_count;

  if v_claimed <> v_requested then
    raise exception 'SEATS_UNAVAILABLE: % of % requested seats are held or sold by someone else',
      (v_requested - v_claimed), v_requested using errcode = 'P0001';
  end if;

  return query
    select es.id, es.hold_expires_at from event_seats es
    where es.id = any(p_seat_ids) and es.event_id = p_event_id;
end;
$$;

-- reserve_order: reclaim this event's expired reservations first, then use
-- the organization's configurable reservation_hold_minutes instead of the
-- previous hardcoded 72h.
create or replace function reserve_order(
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
  v_hold_minutes int;
begin
  perform reclaim_expired_reservations(p_event_id);

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

  select courtesy_tickets_per_event, reservation_hold_minutes
    into v_courtesy_limit, v_hold_minutes
    from organizations where id = p_organization_id;

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
    'online', p_idempotency_key, 'orkestapay', now() + make_interval(mins => v_hold_minutes)
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
