-- Preparación para la venta de boletos en taquilla desde una app Android
-- (extensión de /api/mobile/*, que hasta ahora solo cubría al validador).
--
-- Mismo hueco que 0042 cerró para check_in_ticket/get_event_gate_manifest/
-- undo_check_in/sync_ticket_scans, ahora para las tres funciones que la
-- venta en taquilla necesita: el MFA (TOTP) hoy solo se exige en la UI web
-- (ProtectedRoute), y la revocación de sesión de un dispositivo perdido no
-- existía en absoluto para estas tres. Se añaden las mismas dos
-- comprobaciones ya definidas en 0042 (current_mfa_satisfied,
-- current_mobile_session_revoked) — sin crear nada nuevo, solo
-- conectándolas aquí:
--
-- - create_order_and_tickets: ya distingue "comprador online autoservicio"
--   (v_uid = p_user_id, rol 'user' — nunca debe pasar por MFA, exactamente
--   igual que mfaRequired() en el frontend) de "staff vendiendo a nombre de
--   otro" (rama que ya resuelve profiles.role para autorizar). Las dos
--   comprobaciones nuevas se insertan DENTRO de esa segunda rama — un
--   comprador normal jamás las toca; solo organization/taquilla/promotor/
--   superadmin vendiendo en el mostrador.
-- - hold_event_seats / release_event_seats: las usa tanto un comprador
--   normal (self-checkout con mapa de asientos) como taquilla — a
--   diferencia de create_order_and_tickets, no tienen ninguna rama que ya
--   distinga el rol del llamante, así que aquí sí hace falta resolver
--   profiles.role explícitamente para aplicar el mismo "no exento de MFA
--   implica aal2" SOLO cuando el rol no es 'user'.
--
-- Ningún cambio de comportamiento para el flujo web actual: un operador de
-- taquilla ya llega a estas funciones con sesión aal2 (ProtectedRoute lo
-- exige antes de mostrar TaquillaDashboard) y sin ninguna fila en
-- mobile_devices (nunca pasó por /api/mobile/auth/*, así que
-- current_mobile_session_revoked() siempre da false para esa sesión — el
-- mismo argumento ya documentado en 0042 para el device_id ad-hoc del
-- validador web).

-- ── 1. create_order_and_tickets: + MFA + sesión revocada (solo venta a
--       nombre de otro) ──────────────────────────────────────────────────
-- Cuerpo idéntico al de 0040_configurable_courtesy_mode.sql (última versión
-- vigente — ninguna migración posterior la toca), con las dos condiciones
-- nuevas insertadas justo antes de "v_sold_by := v_uid;".

create or replace function create_order_and_tickets(
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
  v_courtesy_mode text;
  v_courtesy_fixed int;
  v_courtesy_pct numeric;
  v_event_capacity int;
  v_existing_courtesy int;
  v_requested_courtesy int := 0;
  v_event_status text;
  v_presale_date timestamptz;
  v_sold_by uuid;
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

  -- Staff/superadmin selling on someone else's behalf (or with no buyer
  -- account at all, p_user_id null): v_uid is the seller, recorded below
  -- in orders.sold_by. Plain online self-checkout (v_uid = p_user_id)
  -- leaves v_sold_by (and sold_by) null, and never reaches the two new
  -- checks below — a regular 'user' buyer is never subject to them.
  if p_user_id is null or v_uid <> p_user_id then
    if not (
      is_superadmin(v_uid)
      or exists (
        select 1 from events e
        join organization_members om on om.organization_id = e.organization_id and om.profile_id = v_uid
        join profiles p on p.id = v_uid
        where e.id = p_event_id
          and p.role in ('organization', 'taquilla', 'promotor')
      )
    ) then
      raise exception 'AUTH_MISMATCH: not authorized to create an order for another user'
        using errcode = 'P0001';
    end if;

    if not current_mfa_satisfied(v_uid) then
      raise exception 'MFA_REQUIRED: a verified second factor is required to sell tickets on behalf of another user' using errcode = 'P0001';
    end if;

    if current_mobile_session_revoked() then
      raise exception 'DEVICE_REVOKED: this session has been revoked' using errcode = 'P0001';
    end if;

    v_sold_by := v_uid;
  end if;

  if p_items is null and p_seat_ids is null then
    raise exception 'INVALID_ARGS: at least one of p_items or p_seat_ids must be provided'
      using errcode = 'P0001';
  end if;

  if p_sales_channel not in ('online', 'taquilla') then
    raise exception 'INVALID_ARGS: p_sales_channel must be online or taquilla' using errcode = 'P0001';
  end if;

  select courtesy_mode, courtesy_tickets_per_event, courtesy_percentage
    into v_courtesy_mode, v_courtesy_fixed, v_courtesy_pct
    from organizations where id = p_organization_id;

  if v_courtesy_mode = 'percentage' then
    if v_courtesy_pct is null then
      v_courtesy_limit := null;
    else
      select coalesce(sum(capacity), 0) into v_event_capacity
        from event_ticket_types where event_id = p_event_id;
      v_courtesy_limit := round(v_event_capacity * v_courtesy_pct / 100)::int;
    end if;
  else
    v_courtesy_limit := v_courtesy_fixed;
  end if;

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
    payment_reference, sales_channel, idempotency_key, sold_by
  ) values (
    p_event_id, p_organization_id, p_user_id, 'pending',
    p_customer_name, p_customer_email, p_customer_phone,
    p_payment_reference, p_sales_channel, p_idempotency_key, v_sold_by
  ) returning id into v_order_id;

  if p_items is not null then
    for v_item in select * from jsonb_array_elements(p_items) loop
      v_type_id := (v_item->>'ticket_type_id')::uuid;
      v_qty := (v_item->>'quantity')::int;

      -- Pre-existing gap (present since 0003, never triggered by the web
      -- UI's own quantity stepper, which never lets you submit 0 or
      -- negative): zero silently created a $0-ticket-count line item, and
      -- negative would have passed "sold + v_qty <= capacity" trivially,
      -- fabricating inventory (decrementing sold) and corrupting
      -- v_subtotal/total, while still creating zero tickets for that line.
      -- Closed here because the new mobile taquilla API is the first path
      -- that hands this quantity straight from an untrusted client without
      -- a UI widget in front of it — fixing it here benefits every caller,
      -- web included, not just mobile.
      if v_qty is null or v_qty <= 0 then
        raise exception 'INVALID_ARGS: quantity must be a positive integer' using errcode = 'P0001';
      end if;

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

-- ── 2. hold_event_seats: + MFA + sesión revocada (solo si el rol no es
--       'user') ────────────────────────────────────────────────────────────
-- A diferencia de create_order_and_tickets, esta función no distingue rol
-- del llamante en ningún punto — la usa igual un comprador en línea
-- eligiendo su propio asiento que un operador de taquilla. Se resuelve
-- profiles.role explícitamente (v_caller_role) para aplicar el candado
-- SOLO a roles de staff, nunca a un comprador normal. Cuerpo idéntico al de
-- 0035_configurable_reservation_hold.sql (última versión vigente).

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
  v_caller_role text;
  v_requested int;
  v_claimed int;
begin
  perform reclaim_expired_reservations(p_event_id);

  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in to hold seats' using errcode = 'P0001';
  end if;

  select role into v_caller_role from profiles where id = v_uid;
  if v_caller_role is not null and v_caller_role <> 'user' then
    if not current_mfa_satisfied(v_uid) then
      raise exception 'MFA_REQUIRED: a verified second factor is required for this action' using errcode = 'P0001';
    end if;
    if current_mobile_session_revoked() then
      raise exception 'DEVICE_REVOKED: this session has been revoked' using errcode = 'P0001';
    end if;
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

-- ── 3. release_event_seats: + MFA + sesión revocada (solo si el rol no es
--       'user') ────────────────────────────────────────────────────────────
-- Mismo criterio que hold_event_seats. Cuerpo idéntico al de
-- 0010_seat_hold_rpc.sql (nunca redefinida desde entonces).

create or replace function release_event_seats(p_seat_ids uuid[]) returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_caller_role text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in to release seats' using errcode = 'P0001';
  end if;

  select role into v_caller_role from profiles where id = v_uid;
  if v_caller_role is not null and v_caller_role <> 'user' then
    if not current_mfa_satisfied(v_uid) then
      raise exception 'MFA_REQUIRED: a verified second factor is required for this action' using errcode = 'P0001';
    end if;
    if current_mobile_session_revoked() then
      raise exception 'DEVICE_REVOKED: this session has been revoked' using errcode = 'P0001';
    end if;
  end if;

  update event_seats
    set status = 'available', held_by = null, hold_expires_at = null
    where id = any(p_seat_ids) and held_by = v_uid and status = 'held';
end;
$$;
