alter table event_seats enable row level security;

-- Public read (same pattern as event_ticket_types) — the seat map itself is
-- part of the public catalog; held_by is a bare uuid with no way for another
-- browser to resolve it to a name (profiles has its own RLS), so exposing it
-- to read is not a privacy leak.
create policy "anyone can read event seats" on event_seats
  for select using (true);

create policy "org members manage own event seats" on event_seats
  for insert with check (
    is_superadmin(auth.uid()) or exists (
      select 1 from events e
      where e.id = event_seats.event_id
        and e.organization_id = my_organization_id(auth.uid())
    )
  );

create policy "org members update own event seats" on event_seats
  for update using (
    is_superadmin(auth.uid()) or exists (
      select 1 from events e
      where e.id = event_seats.event_id
        and e.organization_id = my_organization_id(auth.uid())
    )
  );

create policy "org members delete own event seats" on event_seats
  for delete using (
    is_superadmin(auth.uid()) or exists (
      select 1 from events e
      where e.id = event_seats.event_id
        and e.organization_id = my_organization_id(auth.uid())
    )
  );
-- NOTE: like event_ticket_types, no policy here allows a client to touch
-- status/held_by/hold_expires_at directly — those are only ever written by
-- the SECURITY DEFINER hold/release/purchase RPCs (0010, 0011), which bypass
-- RLS by design. These insert/update/delete policies exist for the org's
-- authoring flow (VenueDesigner) editing section/row/seat/ticket_type_id.
