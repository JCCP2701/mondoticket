-- confirm_order_paid: rechaza p_amount nulo. Antes, `round(null, 2) <>
-- round(total, 2)` evaluaba a NULL y el IF no disparaba AMOUNT_MISMATCH, así
-- que un webhook sin monto capturado (p. ej. payment.purchase en estado
-- PAYMENT_ACTION_REQUIRED, que solo trae amount.requested) marcaba la orden
-- como pagada y emitía boletos sin cobro real. Mismo cuerpo que 0033 más ese
-- guard.

create or replace function confirm_order_paid(
  p_order_id uuid,
  p_orkesta_payment_id text,
  p_amount numeric
) returns void
language plpgsql
security definer
as $$
declare
  v_order record;
  v_item record;
  v_seat record;
  i int;
begin
  select id, status, total, event_id, user_id into v_order from orders where id = p_order_id for update;

  if v_order.id is null then
    raise exception 'ORDER_NOT_FOUND: order % does not exist', p_order_id using errcode = 'P0001';
  end if;

  if v_order.status = 'paid' then
    return; -- Svix redelivery of an event we already fully handled
  end if;

  if v_order.status <> 'pending' then
    raise exception 'INVALID_STATUS: order % is % and cannot be confirmed paid', p_order_id, v_order.status
      using errcode = 'P0001';
  end if;

  if p_amount is null or round(p_amount, 2) <> round(v_order.total, 2) then
    raise exception 'AMOUNT_MISMATCH: order % expected % but webhook reported %',
      p_order_id, v_order.total, p_amount using errcode = 'P0001';
  end if;

  -- Quantity-based order_items (ticket types with no seat map at all).
  for v_item in
    select oi.ticket_type_id, oi.quantity
    from order_items oi
    where oi.order_id = p_order_id
      and not exists (select 1 from event_seats es where es.ticket_type_id = oi.ticket_type_id)
  loop
    for i in 1..v_item.quantity loop
      insert into tickets (order_id, ticket_type_id, event_id, owner_profile_id, allow_static_qr)
      values (p_order_id, v_item.ticket_type_id, v_order.event_id, v_order.user_id, true);
    end loop;
  end loop;

  -- Seat-based: every seat reserve_order tied to this order.
  for v_seat in select id, ticket_type_id from event_seats where order_id = p_order_id loop
    insert into tickets (order_id, ticket_type_id, event_id, owner_profile_id, seat_id, allow_static_qr)
    values (p_order_id, v_seat.ticket_type_id, v_order.event_id, v_order.user_id, v_seat.id, true);
  end loop;

  update event_seats set status = 'sold', order_id = null where order_id = p_order_id;

  update orders
    set status = 'paid', paid_at = now(), orkesta_payment_id = p_orkesta_payment_id
    where id = p_order_id;
end;
$$;

revoke execute on function confirm_order_paid(uuid, text, numeric) from public;
grant execute on function confirm_order_paid(uuid, text, numeric) to service_role;
