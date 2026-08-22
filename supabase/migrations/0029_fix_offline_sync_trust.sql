-- Corrige un hueco real en 0028: sync_ticket_scans confiaba ciegamente en
-- el ticket_id que el dispositivo offline ya había resuelto localmente, sin
-- volver a verificar la firma del código en el servidor. Eso significa que
-- una sesión de validador (legítima pero comprometida, o una app maliciosa
-- con un JWT robado) podía marcar CUALQUIER boleto como usado vía sync sin
-- necesidad de producir jamás un código válido — un hueco que no existe en
-- check_in_ticket (la vía en línea), donde sí se exige la firma real.
--
-- La corrección: sync_ticket_scans ahora recibe el código escaneado crudo
-- (no un ticket_id pre-resuelto) y lo vuelve a verificar por completo
-- contra la llave real del evento, exactamente igual que check_in_ticket —
-- la resolución local del dispositivo offline es solo para dar
-- retroalimentación instantánea en pantalla; el registro que realmente
-- cuenta en la base de datos solo se escribe después de esta re-verificación.

-- p_reference_time: para el token rotativo, la tolerancia de ±60s debe
-- medirse contra el momento real del escaneo (reportado por el cliente,
-- acotado), no contra "ahora" en el momento de sincronizar — de otro modo
-- todo escaneo offline fallaría la firma simplemente por haberse
-- sincronizado minutos u horas después.
create function resolve_scanned_code(p_qr_code text, p_event_id uuid, p_reference_time timestamptz default now())
returns uuid
language plpgsql
security definer
as $$
declare
  v_parts text[];
  v_token_ticket_id uuid;
  v_token_slot bigint;
  v_token_hmac text;
  v_ticket_event_id uuid;
  v_event_key bytea;
  v_ticket_seed bytea;
  v_reference_slot bigint;
  v_sig_ok boolean;
begin
  if p_qr_code like 'TB1.%' then
    v_parts := string_to_array(p_qr_code, '.');
    if array_length(v_parts, 1) <> 4 then
      return null;
    end if;

    begin
      v_token_ticket_id := v_parts[2]::uuid;
      v_token_slot := v_parts[3]::bigint;
    exception when others then
      return null;
    end;
    v_token_hmac := v_parts[4];

    select event_id into v_ticket_event_id from tickets where id = v_token_ticket_id;
    if v_ticket_event_id is null or v_ticket_event_id <> p_event_id then
      return null;
    end if;

    select secret into v_event_key from event_signing_keys
      where event_id = v_ticket_event_id and revoked_at is null
      order by key_version desc limit 1;
    if v_event_key is null then
      return null;
    end if;

    v_ticket_seed := hmac(v_token_ticket_id::text::bytea, v_event_key, 'sha256');
    v_reference_slot := floor(extract(epoch from p_reference_time) / 30)::bigint;
    v_sig_ok := abs(v_token_slot - v_reference_slot) <= 2
      and left(encode(hmac(v_token_slot::text::bytea, v_ticket_seed, 'sha256'), 'hex'), 20) = v_token_hmac;

    return case when v_sig_ok then v_token_ticket_id else null end;
  else
    return (select id from tickets where qr_code = p_qr_code and event_id = p_event_id and allow_static_qr = true);
  end if;
end;
$$;

-- sync_ticket_scans ahora recibe qrCode (no ticketId) por cada escaneo en
-- el lote, y resuelve el ticket_id real internamente vía resolve_scanned_code
-- antes de aplicar el mismo update atómico de siempre. Mismo signature que
-- 0028 (uuid, jsonb) — solo cambia el cuerpo.
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

  for v_scan in
    select value from jsonb_array_elements(p_scans)
    order by (value->>'scannedAt')::timestamptz asc
  loop
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
  end loop;
end;
$$;

revoke execute on function resolve_scanned_code(text, uuid, timestamptz) from public;
grant execute on function resolve_scanned_code(text, uuid, timestamptz) to authenticated;
