-- Preparación para la API móvil (/api/mobile/*) que consumirá la app Android
-- de validador. Cierra tres huecos reales encontrados al diseñar esa API,
-- ninguno exclusivo del APK — ya existían para el validador web, pero un
-- cliente nativo distribuible hace más fácil notar/explotar el primero:
--
-- 1. El TOTP (MFA) hoy solo se exige en la UI de React (mfaRequired() en
--    AuthContext.tsx) — la base de datos nunca comprueba el nivel de
--    aseguramiento del JWT. Con la sola contraseña (sin TOTP) ya se puede
--    llamar check_in_ticket/sync_ticket_scans/get_event_gate_manifest/
--    undo_check_in directo. current_mfa_satisfied() aplica la misma regla
--    que ya usa mfaRequired() (profiles.mfa_exempt) a las cuatro. Dentro de
--    estas funciones el llamante ya está garantizado no-'user'
--    (is_event_gate_staff/is_superadmin lo exige), así que la condición se
--    reduce a "no exento de MFA implica aal2".
--
-- 2. Revocación instantánea de un dispositivo de puerta perdido/robado:
--    cerrar sesión en Supabase Auth no invalida un access token ya emitido
--    hasta que expira por su cuenta. La clave de revocación es
--    auth.jwt()->>'session_id' — un claim firmado por GoTrue que el cliente
--    no puede omitir, cambiar ni falsificar (a diferencia de un device_id de
--    texto libre que el cliente decide si manda y qué valor le pone).
--    mobile_devices liga cada sesión a un device_id/device_label solo
--    descriptivos (para que un admin pueda revocar "la tablet de la puerta
--    2" sin memorizar un uuid) — la revocación real bloquea por session_id,
--    así que omitir o inventar un device_id en el request ya no sirve para
--    evadirla. current_mobile_session_revoked() aplica esta misma
--    comprobación, una sola vez por llamada (la sesión del JWT es una sola
--    para toda la llamada), a las cuatro funciones de puerta.
--
-- 3. sync_ticket_scans (0029) procesaba el lote entero sin manejo de
--    excepciones por fila: un solo escaneo mal formado revertía también los
--    check-ins ya aplicados antes en el mismo lote. Cada iteración ahora
--    corre en su propio bloque begin/exception (savepoint implícito). Ojo:
--    el ORDER BY del cursor del FOR debe evaluarse ANTES de que el loop
--    empiece a correr row por row — un cast directo de scannedAt ahí
--    reventaría fuera de cualquier begin/exception y tumbaría el lote
--    entero de todos modos, así que el ORDER BY usa una función de cast
--    seguro (safe_to_timestamptz) que nunca lanza, dejando el cast estricto
--    (el que sí puede fallar) dentro del bloque protegido por fila.

-- ── 0. Predicados compartidos (MFA + revocación de sesión) ────────────────

create table mobile_devices (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id),
  session_id     uuid not null unique,
  device_id      text,
  device_label   text,
  registered_at  timestamptz not null default now(),
  last_seen_at   timestamptz,
  revoked_at     timestamptz
);
create index idx_mobile_devices_profile on mobile_devices(profile_id);
create index idx_mobile_devices_device on mobile_devices(device_id);

-- Igual que event_signing_keys: RLS habilitado pero sin ninguna policy de
-- select/insert/update — solo se toca desde las funciones SECURITY DEFINER
-- de abajo, nunca con un SELECT/UPDATE directo del cliente.
alter table mobile_devices enable row level security;

-- Un validador registra su propia sesión (upsert por session_id — un claim
-- que GoTrue genera por login y no puede pertenecer a dos perfiles a la
-- vez, así que esto nunca es un conflicto real de dueño, solo un upsert).
-- device_id/device_label son etiquetas descriptivas, no la clave de
-- seguridad — sirven para que un admin identifique qué revocar, nada más.
create function register_mobile_device(p_device_id text default null, p_device_label text default null) returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_session_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in' using errcode = 'P0001';
  end if;

  v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  if v_session_id is null then
    raise exception 'INVALID_SESSION: could not resolve a session id from this token' using errcode = 'P0001';
  end if;

  insert into mobile_devices (profile_id, session_id, device_id, device_label, last_seen_at)
    values (v_uid, v_session_id, p_device_id, p_device_label, now())
  on conflict (session_id) do update
    set last_seen_at = now(),
        device_id = coalesce(excluded.device_id, mobile_devices.device_id),
        device_label = coalesce(excluded.device_label, mobile_devices.device_label);
end;
$$;

-- Revocar: manager de la organización del dueño del dispositivo, o
-- superadmin — mismo criterio que undo_check_in para acciones de corte de
-- emergencia (nunca taquilla/validador, para que una cuenta de puerta
-- comprometida no pueda des-revocar su propio dispositivo). Un device_id
-- puede tener varias filas (el mismo tablet físico pudo iniciar sesión
-- varias veces a lo largo del tiempo, cada vez con un session_id distinto)
-- — revocar por device_id apaga TODAS esas sesiones a la vez, que es lo que
-- realmente se quiere al decir "esta tablet ya no es de fiar".
create function revoke_mobile_device(p_device_id text) returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in' using errcode = 'P0001';
  end if;

  if not coalesce(
    is_superadmin(v_uid)
    or exists (
      select 1
      from mobile_devices md
      join organization_members om_owner on om_owner.profile_id = md.profile_id
      join organization_members om_caller on om_caller.organization_id = om_owner.organization_id and om_caller.profile_id = v_uid
      join profiles p on p.id = v_uid
      where md.device_id = p_device_id and p.role = 'organization'
    ), false
  ) then
    raise exception 'FORBIDDEN: only an organization manager or superadmin can revoke a device' using errcode = 'P0001';
  end if;

  update mobile_devices set revoked_at = now() where device_id = p_device_id and revoked_at is null;
  if not found then
    raise exception 'NOT_FOUND: device is not registered' using errcode = 'P0001';
  end if;
end;
$$;

-- Une los dos chequeos que check_in_ticket/get_event_gate_manifest/
-- undo_check_in/sync_ticket_scans ya hacían por separado, hechos ahora
-- funciones para no repetir el mismo texto cuatro veces.
create function current_mfa_satisfied(p_uid uuid) returns boolean
language sql
stable
as $$
  select coalesce((select mfa_exempt from profiles where id = p_uid), false)
     or coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create function current_mobile_session_revoked() returns boolean
language sql
stable
as $$
  select exists (
    select 1 from mobile_devices
    where session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and revoked_at is not null
  );
$$;

-- current_mfa_satisfied/current_mobile_session_revoked are internal helper
-- predicates, same category as is_event_gate_staff/is_superadmin (0025,
-- 0002) — no explicit revoke/grant, left at default PUBLIC execute. They're
-- only ever called nested inside check_in_ticket/get_event_gate_manifest/
-- undo_check_in/sync_ticket_scans, which already run SECURITY DEFINER —
-- Postgres doesn't switch current_user for a SECURITY INVOKER function
-- called from within one, so the nested mobile_devices/profiles reads
-- correctly inherit the enclosing function's elevated privileges regardless
-- of these two having no grant of their own. Calling them directly via RPC
-- would run as the caller's own role, which mobile_devices' policy-less RLS
-- blocks outright — harmless (it can only ever look "not revoked" from
-- that angle), just not useful, so no grant is added for that case either.

revoke execute on function register_mobile_device(text, text) from public;
grant execute on function register_mobile_device(text, text) to authenticated;
revoke execute on function revoke_mobile_device(text) from public;
grant execute on function revoke_mobile_device(text) to authenticated;

-- ── 1. Rate limiting de login ───────────────────────────────────────────────

create table auth_login_attempts (
  id            bigserial primary key,
  email         text not null,
  ip            text,
  success       boolean not null,
  attempted_at  timestamptz not null default now()
);
create index idx_auth_login_attempts_email on auth_login_attempts (lower(email), attempted_at desc);

-- Same as mobile_devices/event_signing_keys: RLS enabled with no policies at
-- all, so nothing reachable through PostgREST (anon or authenticated) can
-- read a single row here directly — only check_login_allowed/
-- record_login_attempt (SECURITY DEFINER) touch this table. Without this,
-- every failed/successful login attempt's email + source IP would be
-- readable by anyone via the public REST API, by default Supabase grants.
alter table auth_login_attempts enable row level security;

-- api/mobile/auth/login.ts llama esto (con el cliente service-role, antes de
-- intentar signInWithPassword) y record_login_attempt después, con el
-- resultado real. Lockout por email (credencial de staff compartida, de
-- alto valor) más un tope más laxo por IP para no depender solo del email.
-- Un solo scan de la tabla (filter en vez de dos selects) para las dos
-- cuentas a la vez.
--
-- Límite conocido, aceptado a propósito: check (aquí) y record (después de
-- llamar a signInWithPassword, un salto de red externo a GoTrue en medio)
-- no son atómicos entre sí — una ráfaga de intentos verdaderamente
-- simultáneos para el mismo correo puede leer el mismo conteo antes de que
-- ninguno se registre, y colarse unos pocos intentos de más. Cerrar esto
-- del todo requeriría fusionar check+record en una sola operación
-- (imposible mientras signInWithPassword quede en medio) — el control
-- sigue bloqueando efectivamente el caso común (intentos secuenciales),
-- que es lo que un rate limiter de esta naturaleza busca resolver.
create function check_login_allowed(p_email text, p_ip text default null) returns boolean
language plpgsql
security definer
as $$
declare
  v_failed_by_email int;
  v_failed_by_ip int;
begin
  select
    count(*) filter (where lower(email) = lower(p_email)),
    count(*) filter (where p_ip is not null and ip = p_ip)
    into v_failed_by_email, v_failed_by_ip
  from auth_login_attempts
  where success = false and attempted_at > now() - interval '15 minutes';

  if v_failed_by_email >= 5 then
    return false;
  end if;

  if v_failed_by_ip >= 20 then
    return false;
  end if;

  return true;
end;
$$;

create function record_login_attempt(p_email text, p_ip text, p_success boolean) returns void
language sql
security definer
as $$
  insert into auth_login_attempts (email, ip, success) values (p_email, p_ip, p_success);
$$;

revoke execute on function check_login_allowed(text, text) from public;
grant execute on function check_login_allowed(text, text) to service_role;
revoke execute on function record_login_attempt(text, text, boolean) from public;
grant execute on function record_login_attempt(text, text, boolean) to service_role;

-- ── 2. check_in_ticket: + MFA + sesión revocada ────────────────────────────
-- Cuerpo idéntico al de 0026_rotating_qr.sql (última versión vigente — 0030
-- no tocó esta función), solo con las dos condiciones nuevas justo después
-- de la comprobación de is_event_gate_staff/is_superadmin que ya tenía.

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

  if not current_mfa_satisfied(v_uid) then
    raise exception 'MFA_REQUIRED: a verified second factor is required to scan tickets' using errcode = 'P0001';
  end if;

  if current_mobile_session_revoked() then
    raise exception 'DEVICE_REVOKED: this session has been revoked' using errcode = 'P0001';
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

-- ── 3. get_event_gate_manifest: + MFA + sesión revocada ────────────────────
-- Cuerpo idéntico al de 0028_offline_gate_sync.sql, solo con las dos
-- condiciones nuevas tras el chequeo de staff.

create or replace function get_event_gate_manifest(p_event_id uuid)
returns table (
  ticket_id uuid,
  status text,
  ticket_type_name text,
  seat_label text,
  holder_name text,
  allow_static_qr boolean,
  qr_hash text,
  server_now timestamptz
)
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in' using errcode = 'P0001';
  end if;

  if not coalesce(is_event_gate_staff(v_uid, p_event_id) or is_superadmin(v_uid), false) then
    raise exception 'FORBIDDEN: not authorized for this event' using errcode = 'P0001';
  end if;

  if not current_mfa_satisfied(v_uid) then
    raise exception 'MFA_REQUIRED: a verified second factor is required for this action' using errcode = 'P0001';
  end if;

  if current_mobile_session_revoked() then
    raise exception 'DEVICE_REVOKED: this session has been revoked' using errcode = 'P0001';
  end if;

  return query
    select t.id, t.status, ett.name,
      case when es.row_label is not null then es.row_label || '-' || es.seat_number else null end,
      o.customer_name, t.allow_static_qr,
      case when t.allow_static_qr then encode(digest(t.qr_code, 'sha256'), 'hex') else null end,
      now()
    from tickets t
    join event_ticket_types ett on ett.id = t.ticket_type_id
    left join event_seats es on es.id = t.seat_id
    join orders o on o.id = t.order_id
    where t.event_id = p_event_id;
end;
$$;

-- ── 4. undo_check_in: + MFA + sesión revocada ──────────────────────────────
-- Cuerpo idéntico al de 0025_ticket_checkin.sql, solo con las dos
-- condiciones nuevas tras el chequeo de manager/superadmin.

create or replace function undo_check_in(p_ticket_id uuid) returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_event_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in' using errcode = 'P0001';
  end if;

  select event_id into v_event_id from tickets where id = p_ticket_id;
  if v_event_id is null then
    raise exception 'NOT_FOUND: ticket does not exist' using errcode = 'P0001';
  end if;

  if not coalesce(
    is_superadmin(v_uid)
    or exists (
      select 1 from events e
      join organization_members om on om.organization_id = e.organization_id and om.profile_id = v_uid
      join profiles p on p.id = v_uid
      where e.id = v_event_id and p.role = 'organization'
    ), false
  ) then
    raise exception 'FORBIDDEN: only an organization manager or superadmin can undo a check-in' using errcode = 'P0001';
  end if;

  if not current_mfa_satisfied(v_uid) then
    raise exception 'MFA_REQUIRED: a verified second factor is required for this action' using errcode = 'P0001';
  end if;

  if current_mobile_session_revoked() then
    raise exception 'DEVICE_REVOKED: this session has been revoked' using errcode = 'P0001';
  end if;

  update tickets set status = 'valid', checked_in_at = null, checked_in_by = null, checked_in_device = null
    where id = p_ticket_id and status = 'used';

  if not found then
    raise exception 'INVALID_STATUS: ticket is not currently checked in' using errcode = 'P0001';
  end if;
end;
$$;

-- ── 5. sync_ticket_scans: + MFA + sesión revocada + aislamiento por fila ───
-- Cuerpo basado en 0029_fix_offline_sync_trust.sql (última versión vigente),
-- con cambios:
--   a) MFA + sesión revocada comprobados UNA VEZ arriba (la sesión del JWT
--      es la misma para todo el lote) en vez de por fila — más simple y más
--      barato que repetir un exists() por cada uno de hasta 500 escaneos.
--   b) El ORDER BY del cursor ya NO hace un cast directo de scannedAt (eso
--      corre para TODO el resultado antes de que el loop empiece, fuera de
--      cualquier begin/exception — un solo valor malformado tumbaba el lote
--      entero de todos modos, aunque el comentario original decía lo
--      contrario). safe_to_timestamptz() nunca lanza; el cast estricto que
--      sí puede fallar queda dentro del bloque protegido por fila.
--   c) v_client_scan_id se reinicia a null al principio de cada iteración,
--      así que si su propio cast falla, el resultado 'invalid_payload' no
--      queda erróneamente atribuido al client_scan_id de la fila anterior.

-- stable, not immutable: a text->timestamptz cast without an explicit
-- offset depends on the session's TimeZone setting, so the same input can
-- yield a different result across sessions — immutable would be a false
-- promise to the planner (e.g. if this were ever used in an index).
create function safe_to_timestamptz(p_value text) returns timestamptz
language plpgsql
stable
as $$
begin
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function sync_ticket_scans(p_event_id uuid, p_scans jsonb)
returns table (
  client_scan_id uuid,
  ticket_id uuid,
  server_result text,
  conflict boolean
)
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_scan jsonb;
  v_client_scan_id uuid;
  v_qr_code text;
  v_device_id text;
  v_scanned_at timestamptz;
  v_ticket_id uuid;
  v_ticket record;
  v_min_time timestamptz := now() - interval '48 hours';
  v_existing record;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in' using errcode = 'P0001';
  end if;

  if not coalesce(is_event_gate_staff(v_uid, p_event_id) or is_superadmin(v_uid), false) then
    raise exception 'FORBIDDEN: not authorized for this event' using errcode = 'P0001';
  end if;

  if not current_mfa_satisfied(v_uid) then
    raise exception 'MFA_REQUIRED: a verified second factor is required for this action' using errcode = 'P0001';
  end if;

  if current_mobile_session_revoked() then
    raise exception 'DEVICE_REVOKED: this session has been revoked' using errcode = 'P0001';
  end if;

  for v_scan in
    select value from jsonb_array_elements(p_scans)
    order by safe_to_timestamptz(value->>'scannedAt') asc nulls last
  loop
    v_client_scan_id := null;

    begin
      v_client_scan_id := (v_scan->>'clientScanId')::uuid;
      v_qr_code := v_scan->>'qrCode';
      v_device_id := v_scan->>'deviceId';
      v_scanned_at := least(greatest((v_scan->>'scannedAt')::timestamptz, v_min_time), now());

      select ts.ticket_id, ts.result into v_existing from ticket_scans ts where ts.client_scan_id = v_client_scan_id;
      if v_existing.result is not null then
        return query select v_client_scan_id, v_existing.ticket_id, v_existing.result, (v_existing.result <> 'ok');
        continue;
      end if;

      v_ticket_id := resolve_scanned_code(v_qr_code, p_event_id, v_scanned_at);

      if v_ticket_id is null then
        insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result, client_scan_id, scanned_at)
          values (null, p_event_id, v_uid, v_device_id, left(v_qr_code, 8), 'not_found', v_client_scan_id, v_scanned_at);
        return query select v_client_scan_id, null::uuid, 'not_found'::text, true;
        continue;
      end if;

      select t.id, t.status into v_ticket from tickets t where t.id = v_ticket_id for update;

      if v_ticket.status = 'valid' then
        update tickets set status = 'used', checked_in_at = v_scanned_at, checked_in_by = v_uid, checked_in_device = v_device_id
          where id = v_ticket.id;
        insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result, client_scan_id, scanned_at)
          values (v_ticket.id, p_event_id, v_uid, v_device_id, left(v_qr_code, 8), 'ok', v_client_scan_id, v_scanned_at);
        return query select v_client_scan_id, v_ticket.id, 'ok'::text, false;
      else
        insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result, client_scan_id, scanned_at)
          values (v_ticket.id, p_event_id, v_uid, v_device_id, left(v_qr_code, 8),
            case when v_ticket.status = 'cancelled' then 'cancelled' else 'already_used' end,
            v_client_scan_id, v_scanned_at);
        return query select v_client_scan_id, v_ticket.id,
          (case when v_ticket.status = 'cancelled' then 'cancelled' else 'already_used' end)::text, true;
      end if;
    exception when others then
      -- Una fila mal formada (cast fallido de clientScanId/scannedAt, etc.)
      -- no debe tumbar el resto del lote ni revertir los check-ins que ya
      -- se aplicaron antes en este mismo loop (savepoint implícito de este
      -- begin/exception). No se escribe ticket_scans aquí: no hay un
      -- ticket_id confiable que atribuirle. v_client_scan_id puede seguir
      -- siendo null si fue justo su propio cast el que falló — se reporta
      -- honesto en vez de arriesgar atribuirlo a la fila equivocada.
      return query select v_client_scan_id, null::uuid, 'invalid_payload'::text, true;
    end;
  end loop;
end;
$$;
