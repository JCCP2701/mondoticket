-- Fase 3 del roadmap de blindaje: QR dinámico anti-clonación.
--
-- tickets.qr_code sigue existiendo como identidad interna (nunca se
-- muestra ya en pantalla para boletos vendidos en línea) pero ahora la
-- pantalla del comprador muestra un token que rota cada 30s, firmado con
-- una llave propia de cada evento. Una captura de pantalla del código deja
-- de servir 30 segundos después de tomarse. Los boletos vendidos en
-- taquilla (o marcados explícitamente) siguen aceptando el código estático
-- de siempre, para no depender de que el comprador tenga su teléfono con
-- batería/señal en ese momento — cada vez que se usa esa puerta trasera
-- queda registrado en ticket_scans.used_static.

create table event_signing_keys (
  event_id    uuid not null references events(id) on delete cascade,
  key_version int not null default 1,
  secret      bytea not null default gen_random_bytes(32),
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  primary key (event_id, key_version)
);

-- RLS habilitado pero sin ninguna policy de select: la llave solo se puede
-- leer desde dentro de una función SECURITY DEFINER, nunca directo por la
-- API — ni siquiera un superadmin puede hacer un SELECT * a esta tabla
-- desde el cliente.
alter table event_signing_keys enable row level security;

create function ensure_event_signing_key() returns trigger
language plpgsql as $$
begin
  insert into event_signing_keys (event_id, key_version) values (new.id, 1);
  return new;
end;
$$;

create trigger trg_ensure_event_signing_key
after insert on events
for each row execute function ensure_event_signing_key();

-- Backfill para eventos que ya existían antes de esta migración.
insert into event_signing_keys (event_id, key_version)
  select id, 1 from events
  where not exists (select 1 from event_signing_keys esk where esk.event_id = events.id);

alter table tickets add column allow_static_qr boolean not null default false;
alter table ticket_scans add column used_static boolean not null default false;
alter table ticket_scans drop constraint ticket_scans_result_check;
alter table ticket_scans add constraint ticket_scans_result_check
  check (result in ('ok','already_used','cancelled','wrong_event','not_found','invalid_signature'));

-- Devuelve la semilla derivada (HMAC de la llave del evento + el id del
-- boleto) al dueño del boleto o al staff de puerta — nunca la llave maestra
-- del evento completa, así que filtrar la semilla de un boleto solo
-- compromete ese boleto, no todo el evento.
create function get_ticket_display_seed(p_ticket_id uuid) returns text
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_ticket record;
  v_key bytea;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in' using errcode = 'P0001';
  end if;

  select t.id, t.event_id, t.owner_profile_id into v_ticket from tickets t where t.id = p_ticket_id;
  if v_ticket.id is null then
    raise exception 'NOT_FOUND: ticket does not exist' using errcode = 'P0001';
  end if;

  if not coalesce(
    coalesce(v_ticket.owner_profile_id = v_uid, false)
    or is_superadmin(v_uid)
    or is_event_gate_staff(v_uid, v_ticket.event_id),
    false
  ) then
    raise exception 'FORBIDDEN: not authorized to view this ticket' using errcode = 'P0001';
  end if;

  select secret into v_key from event_signing_keys
    where event_id = v_ticket.event_id and revoked_at is null
    order by key_version desc limit 1;

  if v_key is null then
    raise exception 'NO_SIGNING_KEY: this event has no active signing key' using errcode = 'P0001';
  end if;

  return encode(hmac(p_ticket_id::text::bytea, v_key, 'sha256'), 'hex');
end;
$$;

revoke execute on function get_ticket_display_seed(uuid) from public;
grant execute on function get_ticket_display_seed(uuid) to authenticated;

-- check_in_ticket ahora acepta dos formatos en p_qr_code:
--   1. "TB1.<ticket_id>.<epoch_slot>.<hmac_hex20>" — token rotativo (30s),
--      verificado con tolerancia de ±2 slots (~60s de desfase de reloj).
--   2. El qr_code interno de siempre (32 hex) — solo válido si ese boleto
--      específico tiene allow_static_qr = true (venta en taquilla).
-- Mismo signature que antes (text, uuid, text) — no hace falta un nuevo
-- overload, solo cambia el cuerpo.
create or replace function check_in_ticket(
  p_qr_code text,
  p_event_id uuid,
  p_device_id text default null
) returns table (
  result text,
  ticket_id uuid,
  ticket_type_name text,
  seat_label text,
  holder_name text,
  checked_in_at timestamptz,
  checked_in_by_name text
)
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_ticket record;
  v_is_rotating boolean;
  v_parts text[];
  v_token_ticket_id uuid;
  v_token_slot bigint;
  v_token_hmac text;
  v_event_key bytea;
  v_ticket_seed bytea;
  v_current_slot bigint;
  v_sig_ok boolean := false;
  v_used_static boolean := false;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in to scan tickets' using errcode = 'P0001';
  end if;

  if not coalesce(is_event_gate_staff(v_uid, p_event_id) or is_superadmin(v_uid), false) then
    raise exception 'FORBIDDEN: not authorized to scan tickets for this event' using errcode = 'P0001';
  end if;

  v_is_rotating := p_qr_code like 'TB1.%';

  if v_is_rotating then
    v_parts := string_to_array(p_qr_code, '.');
    if array_length(v_parts, 1) <> 4 then
      insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result)
        values (null, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'not_found');
      return query select 'not_found'::text, null::uuid, null::text, null::text, null::text, null::timestamptz, null::text;
      return;
    end if;

    begin
      v_token_ticket_id := v_parts[2]::uuid;
      v_token_slot := v_parts[3]::bigint;
    exception when others then
      insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result)
        values (null, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'not_found');
      return query select 'not_found'::text, null::uuid, null::text, null::text, null::text, null::timestamptz, null::text;
      return;
    end;
    v_token_hmac := v_parts[4];

    select t.id, t.status, t.event_id, t.checked_in_at, t.checked_in_by,
           ett.name as type_name, es.row_label, es.seat_number, o.customer_name
      into v_ticket
      from tickets t
      join event_ticket_types ett on ett.id = t.ticket_type_id
      left join event_seats es on es.id = t.seat_id
      join orders o on o.id = t.order_id
      where t.id = v_token_ticket_id
      for update of t;

    if v_ticket.id is null then
      insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result)
        values (null, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'not_found');
      return query select 'not_found'::text, null::uuid, null::text, null::text, null::text, null::timestamptz, null::text;
      return;
    end if;

    select secret into v_event_key from event_signing_keys
      where event_id = v_ticket.event_id and revoked_at is null
      order by key_version desc limit 1;

    if v_event_key is not null then
      v_ticket_seed := hmac(v_token_ticket_id::text::bytea, v_event_key, 'sha256');
      v_current_slot := floor(extract(epoch from now()) / 30)::bigint;
      -- The token's own embedded slot must be within tolerance of "now"
      -- (rejects a stale/replayed token even if hmac happened to match
      -- some other slot), and its hmac must check out for that exact slot.
      v_sig_ok := abs(v_token_slot - v_current_slot) <= 2
        and left(encode(hmac(v_token_slot::text::bytea, v_ticket_seed, 'sha256'), 'hex'), 20) = v_token_hmac;
    end if;

    if not v_sig_ok then
      insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result)
        values (v_ticket.id, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'invalid_signature');
      return query select 'invalid_signature'::text, v_ticket.id, v_ticket.type_name,
        case when v_ticket.row_label is not null then v_ticket.row_label || '-' || v_ticket.seat_number else null end,
        v_ticket.customer_name, v_ticket.checked_in_at, null::text;
      return;
    end if;
  else
    select t.id, t.status, t.event_id, t.checked_in_at, t.checked_in_by, t.allow_static_qr,
           ett.name as type_name, es.row_label, es.seat_number, o.customer_name
      into v_ticket
      from tickets t
      join event_ticket_types ett on ett.id = t.ticket_type_id
      left join event_seats es on es.id = t.seat_id
      join orders o on o.id = t.order_id
      where t.qr_code = p_qr_code
      for update of t;

    if v_ticket.id is null or not coalesce(v_ticket.allow_static_qr, false) then
      insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result)
        values (null, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'not_found');
      return query select 'not_found'::text, null::uuid, null::text, null::text, null::text, null::timestamptz, null::text;
      return;
    end if;
    v_used_static := true;
  end if;

  if v_ticket.event_id <> p_event_id then
    insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result, used_static)
      values (v_ticket.id, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'wrong_event', v_used_static);
    return query select 'wrong_event'::text, v_ticket.id, v_ticket.type_name,
      case when v_ticket.row_label is not null then v_ticket.row_label || '-' || v_ticket.seat_number else null end,
      v_ticket.customer_name, v_ticket.checked_in_at, null::text;
    return;
  end if;

  if v_ticket.status = 'cancelled' then
    insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result, used_static)
      values (v_ticket.id, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'cancelled', v_used_static);
    return query select 'cancelled'::text, v_ticket.id, v_ticket.type_name,
      case when v_ticket.row_label is not null then v_ticket.row_label || '-' || v_ticket.seat_number else null end,
      v_ticket.customer_name, v_ticket.checked_in_at, null::text;
    return;
  end if;

  if v_ticket.status = 'used' then
    insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result, used_static)
      values (v_ticket.id, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'already_used', v_used_static);
    return query select 'already_used'::text, v_ticket.id, v_ticket.type_name,
      case when v_ticket.row_label is not null then v_ticket.row_label || '-' || v_ticket.seat_number else null end,
      v_ticket.customer_name, v_ticket.checked_in_at,
      (select name from profiles where id = v_ticket.checked_in_by);
    return;
  end if;

  update tickets set status = 'used', checked_in_at = now(), checked_in_by = v_uid, checked_in_device = p_device_id
    where id = v_ticket.id;

  insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result, used_static)
    values (v_ticket.id, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'ok', v_used_static);

  return query select 'ok'::text, v_ticket.id, v_ticket.type_name,
    case when v_ticket.row_label is not null then v_ticket.row_label || '-' || v_ticket.seat_number else null end,
    v_ticket.customer_name, now(), (select name from profiles where id = v_uid);
end;
$$;

-- create_order_and_tickets: los boletos vendidos en taquilla se marcan
-- allow_static_qr = true de una vez (venta presencial, no depende de que
-- el comprador tenga su teléfono con batería/señal en ese momento); los
-- vendidos en línea quedan en false — solo el QR rotativo les funciona.
-- Mismo signature que 0023 (10 argumentos) — solo cambia el cuerpo.
create or replace function create_order_and_tickets(
  p_event_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_stripe_payment_intent_id text,
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
  v_allow_static boolean;
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

  v_allow_static := (p_sales_channel = 'taquilla');

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
    stripe_payment_intent_id, sales_channel, idempotency_key
  ) values (
    p_event_id, p_organization_id, p_user_id, 'pending',
    p_customer_name, p_customer_email, p_customer_phone,
    p_stripe_payment_intent_id, p_sales_channel, p_idempotency_key
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
        values (v_order_id, v_type_id, p_event_id, p_user_id, v_allow_static);
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
      values (v_order_id, v_seat.ticket_type_id, p_event_id, p_user_id, v_seat.id, v_allow_static);
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
