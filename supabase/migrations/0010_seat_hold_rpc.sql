-- Atomic, race-free seat holds with lazy expiry (no cron job). A "held" row
-- is treated as free again exactly at the moment some other caller's UPDATE
-- WHERE clause reclaims it — nothing proactively flips it back in the
-- background, mirroring the SOLD_OUT philosophy already used for ticket
-- types: the DB is the only source of truth, checked atomically at write time.
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
  v_requested int;
  v_claimed int;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in to hold seats' using errcode = 'P0001';
  end if;

  v_requested := coalesce(array_length(p_seat_ids, 1), 0);
  if v_requested = 0 then
    raise exception 'NO_SEATS: p_seat_ids must not be empty' using errcode = 'P0001';
  end if;

  -- Lock candidates in a deterministic order so two concurrent callers
  -- requesting overlapping seat sets can't deadlock against each other.
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
        or es.held_by = v_uid          -- refresh/extend your own hold
        or es.hold_expires_at < now()   -- lazily reclaim an expired hold
      );

  get diagnostics v_claimed = row_count;

  if v_claimed <> v_requested then
    -- All-or-nothing: rolls back every row this call touched, including
    -- ones it just claimed. No half-held carts.
    raise exception 'SEATS_UNAVAILABLE: % of % requested seats are held or sold by someone else',
      (v_requested - v_claimed), v_requested using errcode = 'P0001';
  end if;

  return query
    select es.id, es.hold_expires_at from event_seats es
    where es.id = any(p_seat_ids) and es.event_id = p_event_id;
end;
$$;

create or replace function release_event_seats(p_seat_ids uuid[]) returns void
language plpgsql
security definer
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: must be logged in to release seats' using errcode = 'P0001';
  end if;
  update event_seats
    set status = 'available', held_by = null, hold_expires_at = null
    where id = any(p_seat_ids) and held_by = v_uid and status = 'held';
end;
$$;

revoke execute on function hold_event_seats(uuid, uuid[]) from public;
grant execute on function hold_event_seats(uuid, uuid[]) to authenticated;
revoke execute on function release_event_seats(uuid[]) from public;
grant execute on function release_event_seats(uuid[]) to authenticated;
