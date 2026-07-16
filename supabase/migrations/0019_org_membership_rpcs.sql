-- Same signatures as before (create_order_and_tickets: 0015; refund_tickets:
-- 0013) so create or replace is safe — only the authorization block changes,
-- from comparing profiles.organization_id to checking organization_members.
create or replace function create_order_and_tickets(
  p_event_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_stripe_payment_intent_id text,
  p_items jsonb default null,
  p_seat_ids uuid[] default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_order_id uuid;
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
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in to create an order' using errcode = 'P0001';
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

  insert into orders (
    event_id, organization_id, user_id, status,
    customer_name, customer_email, customer_phone,
    stripe_payment_intent_id
  ) values (
    p_event_id, p_organization_id, p_user_id, 'pending',
    p_customer_name, p_customer_email, p_customer_phone,
    p_stripe_payment_intent_id
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
        insert into tickets (order_id, ticket_type_id, event_id, owner_profile_id)
        values (v_order_id, v_type_id, p_event_id, p_user_id);
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
      insert into tickets (order_id, ticket_type_id, event_id, owner_profile_id, seat_id)
      values (v_order_id, v_seat.ticket_type_id, p_event_id, p_user_id, v_seat.id);
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

create or replace function refund_tickets(p_ticket_ids uuid[]) returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_ticket record;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in to refund tickets' using errcode = 'P0001';
  end if;

  for v_ticket in
    select t.id, t.status, t.order_id, t.ticket_type_id, t.seat_id,
           o.organization_id, oi.unit_price
    from tickets t
    join orders o on o.id = t.order_id
    join order_items oi on oi.order_id = t.order_id and oi.ticket_type_id = t.ticket_type_id
    where t.id = any(p_ticket_ids)
  loop
    if not (
      is_superadmin(v_uid)
      or exists (
        select 1 from organization_members om
        where om.profile_id = v_uid and om.organization_id = v_ticket.organization_id
      )
    ) then
      raise exception 'FORBIDDEN: not authorized to refund ticket %', v_ticket.id
        using errcode = 'P0001';
    end if;

    if v_ticket.status <> 'valid' then
      raise exception 'INVALID_STATUS: ticket % is % and cannot be refunded', v_ticket.id, v_ticket.status
        using errcode = 'P0001';
    end if;

    update tickets set status = 'cancelled', refunded_at = now() where id = v_ticket.id;
    update event_ticket_types set sold = sold - 1 where id = v_ticket.ticket_type_id;

    if v_ticket.seat_id is not null then
      update event_seats set status = 'available', held_by = null, hold_expires_at = null
        where id = v_ticket.seat_id;
    end if;

    update orders set refunded_amount = refunded_amount + v_ticket.unit_price
      where id = v_ticket.order_id;
  end loop;

  update orders set status = 'refunded'
  where id in (select distinct order_id from tickets where id = any(p_ticket_ids))
    and refunded_amount >= total;
end;
$$;
