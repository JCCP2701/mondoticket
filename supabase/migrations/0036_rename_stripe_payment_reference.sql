-- stripe_payment_intent_id never actually held a Stripe id — the platform's
-- real payment gateway is OrkestaPay (see api/payments/orkesta/), and this
-- column is only ever populated by create_order_and_tickets() for the
-- flows that skip OrkestaPay entirely (courtesy tickets, taquilla walk-in
-- sales, free tickets), with synthetic local references like
-- 'comp_<timestamp>' or 'taquilla_<note>_<timestamp>'. Renaming to
-- payment_reference so the column name matches what it actually stores.
alter table orders rename column stripe_payment_intent_id to payment_reference;

-- Postgres won't let CREATE OR REPLACE rename an input parameter — drop and
-- recreate instead. This loses the function's grants, so they're re-applied
-- below with the exact grant already in place from 0023_phase0_hardening.sql.
drop function create_order_and_tickets(uuid,uuid,uuid,text,text,text,text,jsonb,uuid[],text,uuid);

create function create_order_and_tickets(
  p_event_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_payment_reference text,
  p_items jsonb default null,
  p_seat_ids uuid[] default null,
  p_sales_channel text default 'online',
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
  v_seat record;
  i int;
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

  if p_sales_channel = 'online' and v_presale_date is not null and now() < v_presale_date then
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

  if p_sales_channel not in ('online', 'taquilla') then
    raise exception 'INVALID_ARGS: p_sales_channel must be online or taquilla' using errcode = 'P0001';
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
    payment_reference, sales_channel, idempotency_key
  ) values (
    p_event_id, p_organization_id, p_user_id, 'pending',
    p_customer_name, p_customer_email, p_customer_phone,
    p_payment_reference, p_sales_channel, p_idempotency_key
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

      for i in 1..v_qty loop
        insert into tickets (order_id, ticket_type_id, event_id, owner_profile_id, allow_static_qr)
        values (v_order_id, v_type_id, p_event_id, p_user_id, true);
      end loop;
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

    for v_seat in select id, ticket_type_id from event_seats where id = any(p_seat_ids) loop
      insert into tickets (order_id, ticket_type_id, event_id, owner_profile_id, seat_id, allow_static_qr)
      values (v_order_id, v_seat.ticket_type_id, p_event_id, p_user_id, v_seat.id, true);
    end loop;

    update event_seats
      set status = 'sold', held_by = null, hold_expires_at = null
      where id = any(p_seat_ids);
  end if;

  update orders
    set status = 'paid',
        subtotal = v_subtotal,
        service_fee = round(v_subtotal * 0.08, 2),
        total = round(v_subtotal * 1.08, 2),
        paid_at = now()
    where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function create_order_and_tickets(uuid, uuid, uuid, text, text, text, text, jsonb, uuid[], text, uuid) to authenticated;
