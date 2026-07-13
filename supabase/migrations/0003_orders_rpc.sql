-- Atomic order + inventory decrement. Called once per paid order from the
-- Stripe webhook handler (api/stripe-webhook.ts) using the service-role
-- client. Never call this twice for the same order, and never split
-- "decrement inventory" from "insert order" into separate calls — the whole
-- point is that both happen inside one Postgres transaction so a sold-out
-- ticket type rolls back the entire order atomically.

create or replace function create_order_and_tickets(
  p_event_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_stripe_payment_intent_id text,
  p_items jsonb -- [{ "ticket_type_id": "...", "quantity": 2 }, ...]
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
  i int;
begin
  insert into orders (
    event_id, organization_id, user_id, status,
    customer_name, customer_email, customer_phone,
    stripe_payment_intent_id
  ) values (
    p_event_id, p_organization_id, p_user_id, 'pending',
    p_customer_name, p_customer_email, p_customer_phone,
    p_stripe_payment_intent_id
  ) returning id into v_order_id;

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
