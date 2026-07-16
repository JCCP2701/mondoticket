-- New role: taquilla (physical box-office staff, sells at the venue).
alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('superadmin','organization','user','taquilla'));

create or replace function is_org_manager(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles where id = uid and role = 'organization'
  );
$$;

-- Tighten write policies on venues/events/event_ticket_types/event_seats:
-- they previously only compared organization_id, which a 'taquilla' profile
-- (same organization_id as its 'organization' peers) would also satisfy.
-- Taquilla should read (see live availability) but never manage events.
drop policy "org members manage own venues" on venues;
drop policy "org members update own venues" on venues;
create policy "org managers manage own venues" on venues
  for insert with check (is_superadmin(auth.uid()) or (is_org_manager(auth.uid()) and organization_id = my_organization_id(auth.uid())));
create policy "org managers update own venues" on venues
  for update using (is_superadmin(auth.uid()) or (is_org_manager(auth.uid()) and organization_id = my_organization_id(auth.uid())));

drop policy "org members manage own events" on events;
drop policy "org members update own events" on events;
create policy "org managers manage own events" on events
  for insert with check (is_superadmin(auth.uid()) or (is_org_manager(auth.uid()) and organization_id = my_organization_id(auth.uid())));
create policy "org managers update own events" on events
  for update using (is_superadmin(auth.uid()) or (is_org_manager(auth.uid()) and organization_id = my_organization_id(auth.uid())));

drop policy "org members manage own ticket types" on event_ticket_types;
drop policy "org members update own ticket types" on event_ticket_types;
create policy "org managers manage own ticket types" on event_ticket_types
  for insert with check (
    is_superadmin(auth.uid()) or (is_org_manager(auth.uid()) and exists (
      select 1 from events e where e.id = event_ticket_types.event_id and e.organization_id = my_organization_id(auth.uid())
    ))
  );
create policy "org managers update own ticket types" on event_ticket_types
  for update using (
    is_superadmin(auth.uid()) or (is_org_manager(auth.uid()) and exists (
      select 1 from events e where e.id = event_ticket_types.event_id and e.organization_id = my_organization_id(auth.uid())
    ))
  );

drop policy "org members manage own event seats" on event_seats;
drop policy "org members update own event seats" on event_seats;
drop policy "org members delete own event seats" on event_seats;
create policy "org managers manage own event seats" on event_seats
  for insert with check (
    is_superadmin(auth.uid()) or (is_org_manager(auth.uid()) and exists (
      select 1 from events e where e.id = event_seats.event_id and e.organization_id = my_organization_id(auth.uid())
    ))
  );
create policy "org managers update own event seats" on event_seats
  for update using (
    is_superadmin(auth.uid()) or (is_org_manager(auth.uid()) and exists (
      select 1 from events e where e.id = event_seats.event_id and e.organization_id = my_organization_id(auth.uid())
    ))
  );
create policy "org managers delete own event seats" on event_seats
  for delete using (
    is_superadmin(auth.uid()) or (is_org_manager(auth.uid()) and exists (
      select 1 from events e where e.id = event_seats.event_id and e.organization_id = my_organization_id(auth.uid())
    ))
  );
