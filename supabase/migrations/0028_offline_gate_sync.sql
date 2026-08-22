-- Fase 2 del roadmap de blindaje: escaneo tolerante a que la red del venue
-- se sature o se caiga. El dispositivo de puerta descarga, antes de abrir
-- puertas, (a) la llave de firma del evento — para poder verificar
-- localmente cualquier token rotativo sin ida y vuelta al servidor — y (b)
-- un manifiesto con el estado actual de cada boleto, para saber sin red si
-- ya fue usado. Los escaneos hechos sin conexión se guardan localmente
-- (en el navegador) y se sincronizan por lotes cuando vuelve la señal.
--
-- Promesa honesta, no perfecta: sin doble entrada mientras hay conexión
-- (igual que check_in_ticket ya garantiza); doble entrada *detectada y
-- reportada* si dos dispositivos escanearon el mismo boleto mientras ambos
-- estaban desconectados — el reporte de reconciliación para el organizador
-- (visible como boletos con más de un intento) es la herramienta para
-- resolverlo después del evento, no una promesa de que nunca pasa.

alter table ticket_scans add column client_scan_id uuid unique;

-- La llave completa del evento solo se entrega al staff de puerta, y solo
-- para mantenerla en memoria del dispositivo (nunca en IndexedDB/disco) —
-- así, un dispositivo perdido o robado expone como máximo la llave de UN
-- evento ya en curso, nunca las de otros eventos ni la de la base de datos.
create function get_event_signing_key(p_event_id uuid) returns text
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_key bytea;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in' using errcode = 'P0001';
  end if;

  if not coalesce(is_event_gate_staff(v_uid, p_event_id) or is_superadmin(v_uid), false) then
    raise exception 'FORBIDDEN: not authorized for this event' using errcode = 'P0001';
  end if;

  select secret into v_key from event_signing_keys
    where event_id = p_event_id and revoked_at is null
    order by key_version desc limit 1;

  if v_key is null then
    raise exception 'NO_SIGNING_KEY: this event has no active signing key' using errcode = 'P0001';
  end if;

  return encode(v_key, 'hex');
end;
$$;

revoke execute on function get_event_signing_key(uuid) from public;
grant execute on function get_event_signing_key(uuid) to authenticated;

-- Manifiesto: solo el hash del qr_code (nunca el valor real) para los
-- boletos con allow_static_qr — un dispositivo comprometido no debe filtrar
-- credenciales usables. Los boletos con QR rotativo no necesitan hash: el
-- propio token que se escanea ya trae el ticket_id, y la firma se valida
-- con la llave del evento (get_event_signing_key), no con este manifiesto.
create function get_event_gate_manifest(p_event_id uuid)
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

revoke execute on function get_event_gate_manifest(uuid) from public;
grant execute on function get_event_gate_manifest(uuid) to authenticated;

-- Reconcilia por lotes los escaneos hechos sin conexión. p_scans es un
-- arreglo de objetos {clientScanId, ticketId, deviceId, scannedAt,
-- localResult}. Se procesa ordenado por scannedAt para que, dentro de UN
-- mismo lote, el escaneo más temprano gane. Idempotente por client_scan_id
-- (uuid generado en el dispositivo) — reintentar un lote parcialmente
-- enviado no duplica nada.
create function sync_ticket_scans(p_event_id uuid, p_scans jsonb)
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
  v_ticket_id uuid;
  v_device_id text;
  v_scanned_at timestamptz;
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

  for v_scan in
    select value from jsonb_array_elements(p_scans)
    order by (value->>'scannedAt')::timestamptz asc
  loop
    v_client_scan_id := (v_scan->>'clientScanId')::uuid;
    v_ticket_id := (v_scan->>'ticketId')::uuid;
    v_device_id := v_scan->>'deviceId';
    -- Clamp: a wildly wrong device clock can't backdate a scan far enough
    -- to win a conflict against a legitimately-earlier one, nor postdate
    -- past "now" on the server applying the batch.
    v_scanned_at := least(greatest((v_scan->>'scannedAt')::timestamptz, v_min_time), now());

    select ts.ticket_id, ts.result into v_existing from ticket_scans ts where ts.client_scan_id = v_client_scan_id;
    if v_existing.ticket_id is not null or v_existing.result is not null then
      return query select v_client_scan_id, v_existing.ticket_id, v_existing.result, (v_existing.result <> 'ok');
      continue;
    end if;

    select t.id, t.status into v_ticket from tickets t where t.id = v_ticket_id for update;

    if v_ticket.id is null then
      insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result, client_scan_id, scanned_at)
        values (null, p_event_id, v_uid, v_device_id, 'offline', 'not_found', v_client_scan_id, v_scanned_at);
      return query select v_client_scan_id, null::uuid, 'not_found'::text, true;
      continue;
    end if;

    if v_ticket.status = 'valid' then
      update tickets set status = 'used', checked_in_at = v_scanned_at, checked_in_by = v_uid, checked_in_device = v_device_id
        where id = v_ticket.id;
      insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result, client_scan_id, scanned_at)
        values (v_ticket.id, p_event_id, v_uid, v_device_id, 'offline', 'ok', v_client_scan_id, v_scanned_at);
      return query select v_client_scan_id, v_ticket.id, 'ok'::text, false;
    else
      insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result, client_scan_id, scanned_at)
        values (v_ticket.id, p_event_id, v_uid, v_device_id,
          'offline', case when v_ticket.status = 'cancelled' then 'cancelled' else 'already_used' end,
          v_client_scan_id, v_scanned_at);
      return query select v_client_scan_id, v_ticket.id,
        (case when v_ticket.status = 'cancelled' then 'cancelled' else 'already_used' end)::text, true;
    end if;
  end loop;
end;
$$;

revoke execute on function sync_ticket_scans(uuid, jsonb) from public;
grant execute on function sync_ticket_scans(uuid, jsonb) to authenticated;
