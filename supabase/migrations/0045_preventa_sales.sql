-- Preventa: un tipo de venta con fee de plataforma propio, determinado
-- 100% automáticamente por fecha (nunca manual, nunca un tipo de boleto
-- aparte). Cada evento define cuándo arranca la "venta general"
-- (events.presale_date, que hoy existe en la BD pero nunca tuvo UI ni se
-- ha escrito jamás desde el frontend — siempre NULL en producción, así
-- que renombrarla no migra ningún dato real). El contrato de cada
-- organización define, opcionalmente, un % de fee de preventa y una
-- duración (valor + unidad) que cuenta HACIA ATRÁS desde la fecha de
-- venta general: la ventana de preventa es
-- [fecha_venta_general - duración, fecha_venta_general).
--
-- Ejemplo (dado literalmente por el organizador): evento el 1 de
-- diciembre, "inicio de venta general" = 1 de diciembre, contrato dice
-- "5 días de preventa" → la preventa arranca el 26 de noviembre y
-- termina el 1 de diciembre (cuando empieza la venta general).
--
-- Sin fecha de venta general y/o sin duración configurada: comportamiento
-- IDÉNTICO al actual (venta abierta, nada se clasifica como preventa) —
-- no rompe ninguna organización/evento existente.
--
-- La preventa es ortogonal al canal: una venta en taquilla dentro de la
-- ventana también cuenta como preventa (mismo % de fee, sin importar
-- canal) — solo el bloqueo NOT_ON_SALE antes de que abra la ventana sigue
-- aplicando nada más al canal online, igual que hoy (taquilla nunca se
-- bloquea, es criterio del staff).
--
-- orders.is_preventa se fija UNA SOLA VEZ al crear/reservar la orden
-- (snapshot, igual que ya se hace con sales_channel) — un cambio
-- posterior al contrato o a la fecha del evento nunca reclasifica ventas
-- ya hechas.

-- 1. Renombrar events.presale_date -> events.general_sale_date. Columna
--    sin uso real en producción (siempre NULL): 0 riesgo de datos.
alter table events rename column presale_date to general_sale_date;

comment on column events.general_sale_date is
  'Fecha/hora en que arranca la venta general (fee normal). Si el contrato de la organización tiene preventa_duration_* configurada, la ventana [general_sale_date - duración, general_sale_date) es preventa (fee de preventa, cualquier canal). NULL = sin restricción, venta abierta siempre (comportamiento histórico).';

-- 2. Contrato: fee de preventa y duración de la ventana.
alter table organizations
  add column preventa_fee_percentage numeric(5,2)
    check (preventa_fee_percentage is null or preventa_fee_percentage between 0 and 100),
  add column preventa_duration_value int
    check (preventa_duration_value is null or preventa_duration_value > 0),
  add column preventa_duration_unit text
    check (preventa_duration_unit in ('hours', 'days', 'weeks', 'months')),
  add constraint preventa_duration_consistent check (
    (preventa_duration_value is null and preventa_duration_unit is null)
    or (preventa_duration_value is not null and preventa_duration_unit is not null)
  );

comment on column organizations.preventa_fee_percentage is
  'Fee de plataforma (%) para boletos vendidos dentro de la ventana de preventa de cada evento, sin importar el canal. NULL = usa fee_percentage general (mismo patrón que taquilla_fee_percentage).';
comment on column organizations.preventa_duration_value is
  'Duración de la ventana de preventa, contada hacia atrás desde events.general_sale_date, junto con preventa_duration_unit. NULL = preventa no configurada (ningún evento de esta organización clasifica ventas como preventa, aunque tenga general_sale_date).';

-- 3. orders.is_preventa: snapshot fijado por los RPCs de creación de orden.
alter table orders add column is_preventa boolean not null default false;

comment on column orders.is_preventa is
  'Snapshot fijado al crear/reservar la orden: true si el momento de la venta cayó dentro de la ventana de preventa del evento en ese instante. Nunca se recalcula después, igual que sales_channel.';

-- 4. Helper: intervalo de duración value+unit, reusado por los 2 RPCs de
--    creación de orden.
create or replace function preventa_duration_interval(p_value int, p_unit text)
returns interval
language sql
immutable
as $$
  select case p_unit
    when 'hours' then make_interval(hours => p_value)
    when 'days' then make_interval(days => p_value)
    when 'weeks' then make_interval(weeks => p_value)
    when 'months' then make_interval(months => p_value)
    else null
  end;
$$;

-- 5. protect_organization_contract_terms(): agregar las 3 columnas nuevas
--    a la lista de términos de contrato protegidos contra UPDATE directo
--    de un no-superadmin. Cuerpo idéntico a 0040_configurable_courtesy_mode.sql
--    + 3 condiciones nuevas. El trigger trg_protect_organization_contract_terms
--    ya existe y apunta a esta función por nombre — no hace falta recrearlo.
create or replace function protect_organization_contract_terms() returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not is_superadmin(auth.uid()) then
    if new.fee_percentage is distinct from old.fee_percentage
      or new.taquilla_fee_percentage is distinct from old.taquilla_fee_percentage
      or new.courtesy_tickets_per_event is distinct from old.courtesy_tickets_per_event
      or new.courtesy_mode is distinct from old.courtesy_mode
      or new.courtesy_percentage is distinct from old.courtesy_percentage
      or new.max_events_per_month is distinct from old.max_events_per_month
      or new.reservation_hold_minutes is distinct from old.reservation_hold_minutes
      or new.payment_terms is distinct from old.payment_terms
      or new.preventa_fee_percentage is distinct from old.preventa_fee_percentage
      or new.preventa_duration_value is distinct from old.preventa_duration_value
      or new.preventa_duration_unit is distinct from old.preventa_duration_unit
    then
      raise exception 'CONTRACT_TERMS_LOCKED: only a superadmin can modify contract terms'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- 6. create_order_and_tickets: cuerpo idéntico al vigente en
--    0043_taquilla_mobile_sales.sql, con el cálculo de la ventana de
--    preventa insertado donde antes solo se leía presale_date, y
--    is_preventa agregado al INSERT de orders. Todo lo demás (MFA, sesión
--    revocada, límite de cortesías, order_items, tickets, seats) queda
--    sin cambios.
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
  v_general_sale_date timestamptz;
  v_preventa_duration_value int;
  v_preventa_duration_unit text;
  v_preventa_window_start timestamptz;
  v_is_preventa boolean := false;
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

  select status, general_sale_date into v_event_status, v_general_sale_date from events where id = p_event_id;

  if v_event_status = 'cancelled' then
    raise exception 'EVENT_CANCELLED: this event has been cancelled' using errcode = 'P0001';
  end if;

  select preventa_duration_value, preventa_duration_unit
    into v_preventa_duration_value, v_preventa_duration_unit
    from organizations where id = p_organization_id;

  if v_general_sale_date is not null and v_preventa_duration_value is not null then
    v_preventa_window_start := v_general_sale_date
      - preventa_duration_interval(v_preventa_duration_value, v_preventa_duration_unit);
  else
    v_preventa_window_start := v_general_sale_date;
  end if;

  if p_sales_channel = 'online' and v_preventa_window_start is not null and now() < v_preventa_window_start then
    raise exception 'NOT_ON_SALE: tickets for this event are not yet on sale' using errcode = 'P0001';
  end if;

  if v_general_sale_date is not null and v_preventa_window_start is not null
     and now() >= v_preventa_window_start and now() < v_general_sale_date then
    v_is_preventa := true;
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
    payment_reference, sales_channel, idempotency_key, sold_by, is_preventa
  ) values (
    p_event_id, p_organization_id, p_user_id, 'pending',
    p_customer_name, p_customer_email, p_customer_phone,
    p_payment_reference, p_sales_channel, p_idempotency_key, v_sold_by, v_is_preventa
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

-- 7. reserve_order: cuerpo idéntico al vigente en
--    0044_reserve_order_quantity_fix.sql, mismo diff que arriba. El gate
--    NOT_ON_SALE aquí nunca tuvo condicional de canal (este RPC es 100%
--    online), así que solo cambia contra qué fecha compara.
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
  v_courtesy_mode text;
  v_courtesy_fixed int;
  v_courtesy_pct numeric;
  v_event_capacity int;
  v_existing_courtesy int;
  v_requested_courtesy int := 0;
  v_event_status text;
  v_general_sale_date timestamptz;
  v_preventa_duration_value int;
  v_preventa_duration_unit text;
  v_preventa_window_start timestamptz;
  v_is_preventa boolean := false;
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

  select status, general_sale_date into v_event_status, v_general_sale_date from events where id = p_event_id;

  if v_event_status = 'cancelled' then
    raise exception 'EVENT_CANCELLED: this event has been cancelled' using errcode = 'P0001';
  end if;

  select preventa_duration_value, preventa_duration_unit
    into v_preventa_duration_value, v_preventa_duration_unit
    from organizations where id = p_organization_id;

  if v_general_sale_date is not null and v_preventa_duration_value is not null then
    v_preventa_window_start := v_general_sale_date
      - preventa_duration_interval(v_preventa_duration_value, v_preventa_duration_unit);
  else
    v_preventa_window_start := v_general_sale_date;
  end if;

  if v_preventa_window_start is not null and now() < v_preventa_window_start then
    raise exception 'NOT_ON_SALE: tickets for this event are not yet on sale' using errcode = 'P0001';
  end if;

  if v_general_sale_date is not null and v_preventa_window_start is not null
     and now() >= v_preventa_window_start and now() < v_general_sale_date then
    v_is_preventa := true;
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

  select courtesy_mode, courtesy_tickets_per_event, courtesy_percentage, reservation_hold_minutes
    into v_courtesy_mode, v_courtesy_fixed, v_courtesy_pct, v_hold_minutes
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
    sales_channel, idempotency_key, payment_provider, expires_at, is_preventa
  ) values (
    p_event_id, p_organization_id, p_user_id, 'pending',
    p_customer_name, p_customer_email, p_customer_phone,
    'online', p_idempotency_key, 'orkestapay', now() + make_interval(mins => v_hold_minutes), v_is_preventa
  ) returning id into v_order_id;

  if p_items is not null then
    for v_item in select * from jsonb_array_elements(p_items) loop
      v_type_id := (v_item->>'ticket_type_id')::uuid;
      v_qty := (v_item->>'quantity')::int;

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

-- 8. get_broker_transactions: cuerpo idéntico al vigente en
--    0031_broker_role.sql, agregando is_preventa al CTE y una 3ra rama en
--    el cálculo de comisión sobre fee de plataforma.
create or replace function get_broker_transactions()
returns table (
  order_id uuid,
  organization_id uuid,
  organization_name text,
  event_id uuid,
  event_name text,
  event_date date,
  paid_at timestamptz,
  sales_channel text,
  commission_basis text,
  commission_percentage numeric,
  commission_amount numeric
)
language plpgsql
security definer
as $$
begin
  return query
  with order_revenue as (
    select
      o.id as order_id,
      o.organization_id,
      o.event_id,
      o.paid_at,
      o.sales_channel,
      o.is_preventa,
      sum(ett.price) as revenue
    from orders o
    join tickets t on t.order_id = o.id and t.status <> 'cancelled'
    join event_ticket_types ett on ett.id = t.ticket_type_id
    where o.status = 'paid'
      and o.organization_id in (
        select bc.organization_id from broker_contracts bc where bc.broker_profile_id = auth.uid()
      )
    group by o.id, o.organization_id, o.event_id, o.paid_at, o.sales_channel, o.is_preventa
    having sum(ett.price) > 0
  )
  select
    orr.order_id,
    orr.organization_id,
    org.name,
    e.id,
    e.name,
    e.event_date,
    orr.paid_at,
    orr.sales_channel,
    bc.commission_basis,
    bc.commission_percentage,
    round(
      case
        when bc.commission_basis = 'ticket_revenue' then orr.revenue * bc.commission_percentage / 100
        else orr.revenue
          * (
              case
                when orr.is_preventa then coalesce(org.preventa_fee_percentage, org.fee_percentage)
                when orr.sales_channel = 'taquilla' then coalesce(org.taquilla_fee_percentage, org.fee_percentage)
                else org.fee_percentage
              end
            )
          / 100
          * bc.commission_percentage / 100
      end,
      2
    ) as commission_amount
  from order_revenue orr
  join organizations org on org.id = orr.organization_id
  join events e on e.id = orr.event_id
  join broker_contracts bc on bc.organization_id = orr.organization_id and bc.broker_profile_id = auth.uid()
  order by orr.paid_at desc;
end;
$$;
