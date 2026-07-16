-- Individual seat map per event. Seats live directly on the event (not a
-- reusable venue template) since ticket-type/price assignment is inherently
-- per-event in this schema already (event_ticket_types is event-scoped).
create table event_seats (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  ticket_type_id  uuid not null references event_ticket_types(id) on delete restrict,
  section         text,
  row_label       text not null,
  seat_number     text not null,
  row_index       int not null,
  col_index       int not null,
  status          text not null default 'available' check (status in ('available','held','sold')),
  held_by         uuid references profiles(id),
  hold_expires_at timestamptz,
  created_at      timestamptz not null default now(),

  constraint uq_event_seat_position unique (event_id, row_index, col_index),
  constraint chk_hold_fields check (
    (status = 'held' and held_by is not null and hold_expires_at is not null)
    or (status <> 'held' and held_by is null and hold_expires_at is null)
  )
);

create index idx_event_seats_event on event_seats(event_id);
create index idx_event_seats_event_status on event_seats(event_id, status);
create index idx_event_seats_ticket_type on event_seats(ticket_type_id);
create index idx_event_seats_held_by on event_seats(held_by) where held_by is not null;

-- A seat's ticket_type must belong to the same event as the seat itself.
create or replace function validate_seat_ticket_type() returns trigger
language plpgsql as $$
begin
  if not exists (
    select 1 from event_ticket_types
    where id = new.ticket_type_id and event_id = new.event_id
  ) then
    raise exception 'INVALID_TICKET_TYPE: ticket_type % does not belong to event %',
      new.ticket_type_id, new.event_id using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trg_validate_seat_ticket_type
before insert or update of ticket_type_id, event_id on event_seats
for each row execute function validate_seat_ticket_type();

-- Keep event_ticket_types.capacity in sync with however many seats point at
-- it, so every existing reader of capacity/sold (global stats, dashboards,
-- the non-seat-map checkout path) keeps working unmodified for seat-map
-- ticket types too. Never let capacity drop below what's already sold.
create or replace function sync_ticket_type_capacity() returns trigger
language plpgsql as $$
declare
  v_type_id uuid := coalesce(new.ticket_type_id, old.ticket_type_id);
  v_old_type_id uuid := old.ticket_type_id;
begin
  if v_type_id is not null then
    update event_ticket_types t
      set capacity = greatest(t.sold, (select count(*) from event_seats where ticket_type_id = v_type_id))
      where t.id = v_type_id;
  end if;
  if tg_op = 'UPDATE' and v_old_type_id is not null and v_old_type_id is distinct from new.ticket_type_id then
    update event_ticket_types t
      set capacity = greatest(t.sold, (select count(*) from event_seats where ticket_type_id = v_old_type_id))
      where t.id = v_old_type_id;
  end if;
  return null;
end;
$$;

create trigger trg_sync_capacity
after insert or update of ticket_type_id or delete on event_seats
for each row execute function sync_ticket_type_capacity();

-- One ticket per seat, ever.
alter table tickets add column seat_id uuid references event_seats(id) on delete restrict;
create unique index idx_tickets_seat_unique on tickets(seat_id) where seat_id is not null;
