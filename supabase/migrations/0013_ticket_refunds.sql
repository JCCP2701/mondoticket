alter table tickets add column refunded_at timestamptz;
alter table orders add column refunded_amount numeric not null default 0;

-- Refund one or more individual tickets (not necessarily a whole order).
-- Real gateway refund (Stripe/etc.) is out of scope until a payment
-- provider is chosen — there is no real charge to reverse yet, since
-- checkout still simulates the charge. This only unwinds our own records:
-- restores inventory (or frees the seat), marks the ticket cancelled, and
-- tracks the refunded amount against its order.
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
    -- Written as EXISTS/is_superadmin (never NULL) rather than a bare
    -- `organization_id = my_organization_id(uid)` equality: when the caller
    -- has no organization_id (e.g. role='user'), that equality evaluates to
    -- NULL rather than false, and `if not (false or null)` is NULL — which
    -- PL/pgSQL treats as "don't raise," silently allowing the refund. Caught
    -- during verification: a plain 'user' account successfully refunded
    -- someone else's ticket before this fix.
    if not (
      is_superadmin(v_uid)
      or exists (
        select 1 from profiles p
        where p.id = v_uid and p.organization_id = v_ticket.organization_id
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

revoke execute on function refund_tickets(uuid[]) from public;
grant execute on function refund_tickets(uuid[]) to authenticated;
