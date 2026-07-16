-- Extends create_order_and_tickets with:
--   (1) a seat-map purchase path (p_seat_ids) alongside the existing
--       quantity path (p_items) — exactly one of the two must be given;
--   (2) unified authorization for "staff-assisted" orders: a buyer can only
--       buy for themselves (auth.uid() = p_user_id), unless the caller is
--       superadmin or org/taquilla staff of that event's organization, in
--       which case p_user_id may be null (walk-in/comp, no account) or
--       someone else's id. This single function now covers online
--       self-checkout, $0 courtesy tickets assigned by an organizer, and
--       in-person box-office (taquilla) sales — no separate RPCs needed.
--
-- Dropped and recreated (not CREATE OR REPLACE) because Postgres identifies
-- a function by name + parameter list; OR REPLACE with a different
-- signature would leave two overloads and risk PostgREST ambiguity when
-- resolving supabase.rpc(...) calls by JSON body keys.
drop function create_order_and_tickets(uuid, uuid, uuid, text, text, text, text, jsonb);

create function create_order_and_tickets(
  p_event_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_stripe_payment_intent_id text,
  p_items jsonb default null,     -- quantity path: [{ ticket_type_id, quantity }]
  p_seat_ids uuid[] default null  -- seat-map path: seats the caller currently holds
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

  -- Self-checkout (p_user_id = auth.uid()) never needs this check. Anything
  -- else — a null p_user_id (walk-in/comp guest) or a different profile's id
  -- — requires the caller to be staff for this event's organization.
  -- (BUG FIXED DURING VERIFICATION: this used to only fire when p_user_id
  -- was non-null, so any authenticated user could pass p_user_id=null and
  -- create free guest orders. Caught by testing a plain 'user' role account
  -- against this exact path before shipping it.)
  if p_user_id is null or v_uid <> p_user_id then
    if not (
      is_superadmin(v_uid)
      or exists (
        select 1 from events e join profiles p on p.id = v_uid
        where e.id = p_event_id and p.organization_id = e.organization_id
          and p.role in ('organization', 'taquilla')
      )
    ) then
      raise exception 'AUTH_MISMATCH: not authorized to create an order for another user'
        using errcode = 'P0001';
    end if;
  end if;

  if (p_items is null) = (p_seat_ids is null) then
    raise exception 'INVALID_ARGS: exactly one of p_items or p_seat_ids must be provided'
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
    -- Existing quantity path — unchanged.
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

  else
    -- Seat-map path.
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

revoke execute on function create_order_and_tickets(uuid, uuid, uuid, text, text, text, text, jsonb, uuid[]) from public;
grant execute on function create_order_and_tickets(uuid, uuid, uuid, text, text, text, text, jsonb, uuid[]) to authenticated;
