-- Fase 1 del roadmap de blindaje: escaneo y validación en la puerta.
-- Hoy tickets.status puede ser 'used' y checked_in_at existe, pero ningún
-- código los escribe jamás — un mismo boleto se puede "usar" un número
-- ilimitado de veces. Esto cierra ese hueco con una transición atómica
-- valid -> used (mismo patrón que ya usa el inventario: UPDATE ... WHERE
-- status = 'valid', así que dos escaneos simultáneos del mismo código,
-- exactamente uno gana) y un log de auditoría de cada intento, no solo
-- el ganador — los intentos rechazados son la señal de fraude real (una
-- captura circulando produce N filas 'already_used' sobre un mismo boleto).

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('superadmin','organization','user','taquilla','validador'));

alter table tickets
  add column checked_in_by uuid references profiles(id),
  add column checked_in_device text;

create table ticket_scans (
  id             bigserial primary key,
  ticket_id      uuid references tickets(id) on delete cascade,
  event_id       uuid not null references events(id) on delete cascade,
  scanned_by     uuid not null references profiles(id),
  device_id      text,
  qr_prefix      text,
  result         text not null check (result in
                   ('ok','already_used','cancelled','wrong_event','not_found')),
  scanned_at     timestamptz not null default now()
);
create index idx_ticket_scans_event on ticket_scans(event_id, scanned_at desc);
create index idx_ticket_scans_ticket on ticket_scans(ticket_id);

alter table ticket_scans enable row level security;

-- Solo lectura para el staff de la organización y superadmin. Sin policy de
-- insert/update/delete — se escribe únicamente desde check_in_ticket(),
-- que corre como SECURITY DEFINER y por lo tanto no depende de esta RLS.
create policy "org members and superadmin read ticket scans" on ticket_scans
  for select using (
    is_superadmin(auth.uid())
    or exists (
      select 1 from events e
      where e.id = ticket_scans.event_id and is_org_member(auth.uid(), e.organization_id)
    )
  );

-- Quién puede escanear boletos de un evento: managers de organización,
-- taquilla y el nuevo rol validador — pero nunca un 'user' (comprador)
-- aunque por algún error llegara a estar en organization_members.
create or replace function is_event_gate_staff(uid uuid, p_event_id uuid) returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from events e
    join organization_members om on om.organization_id = e.organization_id and om.profile_id = uid
    join profiles p on p.id = uid
    where e.id = p_event_id and p.role in ('organization', 'taquilla', 'validador')
  );
$$;

create function check_in_ticket(
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
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in to scan tickets' using errcode = 'P0001';
  end if;

  if not coalesce(is_event_gate_staff(v_uid, p_event_id) or is_superadmin(v_uid), false) then
    raise exception 'FORBIDDEN: not authorized to scan tickets for this event' using errcode = 'P0001';
  end if;

  -- Row-locked for the rest of this transaction: a second scan of the same
  -- QR arriving concurrently blocks here until this one commits, then sees
  -- the already-updated status — that's what makes the race-free guarantee
  -- work, the same trick the inventory RPC already relies on.
  select t.id, t.status, t.event_id, t.checked_in_at, t.checked_in_by,
         ett.name as type_name, es.row_label, es.seat_number, o.customer_name
    into v_ticket
    from tickets t
    join event_ticket_types ett on ett.id = t.ticket_type_id
    left join event_seats es on es.id = t.seat_id
    join orders o on o.id = t.order_id
    where t.qr_code = p_qr_code
    for update of t;

  if v_ticket.id is null then
    insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result)
      values (null, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'not_found');
    return query select 'not_found'::text, null::uuid, null::text, null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  if v_ticket.event_id <> p_event_id then
    insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result)
      values (v_ticket.id, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'wrong_event');
    return query select 'wrong_event'::text, v_ticket.id, v_ticket.type_name,
      case when v_ticket.row_label is not null then v_ticket.row_label || '-' || v_ticket.seat_number else null end,
      v_ticket.customer_name, v_ticket.checked_in_at, null::text;
    return;
  end if;

  if v_ticket.status = 'cancelled' then
    insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result)
      values (v_ticket.id, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'cancelled');
    return query select 'cancelled'::text, v_ticket.id, v_ticket.type_name,
      case when v_ticket.row_label is not null then v_ticket.row_label || '-' || v_ticket.seat_number else null end,
      v_ticket.customer_name, v_ticket.checked_in_at, null::text;
    return;
  end if;

  if v_ticket.status = 'used' then
    insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result)
      values (v_ticket.id, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'already_used');
    return query select 'already_used'::text, v_ticket.id, v_ticket.type_name,
      case when v_ticket.row_label is not null then v_ticket.row_label || '-' || v_ticket.seat_number else null end,
      v_ticket.customer_name, v_ticket.checked_in_at,
      (select name from profiles where id = v_ticket.checked_in_by);
    return;
  end if;

  -- Only remaining case: status = 'valid'. Guaranteed to affect exactly one
  -- row — we already confirmed status='valid' under FOR UPDATE above, in
  -- the same transaction, so nothing could have changed it since.
  update tickets set status = 'used', checked_in_at = now(), checked_in_by = v_uid, checked_in_device = p_device_id
    where id = v_ticket.id;

  insert into ticket_scans (ticket_id, event_id, scanned_by, device_id, qr_prefix, result)
    values (v_ticket.id, p_event_id, v_uid, p_device_id, left(p_qr_code, 8), 'ok');

  return query select 'ok'::text, v_ticket.id, v_ticket.type_name,
    case when v_ticket.row_label is not null then v_ticket.row_label || '-' || v_ticket.seat_number else null end,
    v_ticket.customer_name, now(), (select name from profiles where id = v_uid);
end;
$$;

revoke execute on function check_in_ticket(text, uuid, text) from public;
grant execute on function check_in_ticket(text, uuid, text) to authenticated;

-- Revertir un escaneo por error humano (se escaneó el teléfono equivocado,
-- etc.) — restringido a manager de organización o superadmin, nunca a
-- taquilla/validador, para que una cuenta de puerta comprometida no pueda
-- des-marcar entradas.
create function undo_check_in(p_ticket_id uuid) returns void
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

  update tickets set status = 'valid', checked_in_at = null, checked_in_by = null, checked_in_device = null
    where id = p_ticket_id and status = 'used';

  if not found then
    raise exception 'INVALID_STATUS: ticket is not currently checked in' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function undo_check_in(uuid) from public;
grant execute on function undo_check_in(uuid) to authenticated;

alter publication supabase_realtime add table ticket_scans;
