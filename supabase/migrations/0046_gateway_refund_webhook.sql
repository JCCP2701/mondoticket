-- Cancels an order's still-valid tickets when OrkestaPay reports a refund
-- (payment.refund webhook) that didn't originate from our own
-- api/payments/orkesta/refund.ts flow — e.g. a dispute/chargeback resolved
-- directly in the OrkestaPay dashboard. refund_tickets (0019) can't be
-- reused here as-is: it requires auth.uid() (a logged-in caller with
-- organization membership or superadmin), which the webhook — a trusted
-- server-to-server call authenticated by its Svix signature, not a user
-- session — never has. This mirrors its ticket-cancellation logic without
-- that auth check, callable only by service_role.
create or replace function cancel_order_tickets_for_gateway_refund(p_order_id uuid) returns void
language plpgsql
security definer
as $$
declare
  v_ticket record;
begin
  for v_ticket in
    select t.id, t.ticket_type_id, t.seat_id, oi.unit_price
    from tickets t
    join order_items oi on oi.order_id = t.order_id and oi.ticket_type_id = t.ticket_type_id
    where t.order_id = p_order_id and t.status = 'valid'
  loop
    update tickets set status = 'cancelled', refunded_at = now() where id = v_ticket.id;
    update event_ticket_types set sold = sold - 1 where id = v_ticket.ticket_type_id;
    if v_ticket.seat_id is not null then
      update event_seats set status = 'available', held_by = null, hold_expires_at = null where id = v_ticket.seat_id;
    end if;
    update orders set refunded_amount = refunded_amount + v_ticket.unit_price where id = p_order_id;
  end loop;

  -- Same refunded_amount >= total comparison as refund_tickets (0019) — and
  -- the same known limitation (refunded_amount excludes the service fee, so
  -- this practically never flips orders.status to 'refunded'). Kept
  -- consistent with the existing manual-refund path rather than fixed here;
  -- see docs/orkestapay-pending-fixes.md. Tickets are cancelled correctly
  -- either way, which is what actually gates whether one can be scanned.
  update orders set status = 'refunded' where id = p_order_id and refunded_amount >= total;
end;
$$;

revoke execute on function cancel_order_tickets_for_gateway_refund(uuid) from public;
revoke execute on function cancel_order_tickets_for_gateway_refund(uuid) from authenticated;
grant execute on function cancel_order_tickets_for_gateway_refund(uuid) to service_role;
