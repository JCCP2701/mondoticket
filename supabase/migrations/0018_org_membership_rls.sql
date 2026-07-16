create or replace function is_org_member(uid uuid, org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from organization_members
    where profile_id = uid and organization_id = org_id
  );
$$;

-- New 2-arg overload. The old 1-arg is_org_manager(uuid) is a distinct
-- function to Postgres (different signature) and stays alive until every
-- policy calling it is repointed below, then it's dropped at the end of
-- this file.
create or replace function is_org_manager(uid uuid, org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles p
    join organization_members om on om.profile_id = p.id
    where p.id = uid and p.role = 'organization' and om.organization_id = org_id
  );
$$;

-- Deferred from 0017: now that is_org_manager(uuid,uuid) exists, fellow
-- managers of an org can see who else belongs to it.
create policy "org managers read fellow members" on organization_members
  for select using (is_org_manager(auth.uid(), organization_id));

-- organizations
drop policy "org members and superadmin can read their org" on organizations;
create policy "org members and superadmin can read their org" on organizations
  for select using (is_superadmin(auth.uid()) or is_org_member(auth.uid(), id));

drop policy "org members and superadmin can update their org" on organizations;
create policy "org managers and superadmin can update their org" on organizations
  for update using (is_superadmin(auth.uid()) or is_org_manager(auth.uid(), id));

-- venues
drop policy "org managers manage own venues" on venues;
create policy "org managers manage own venues" on venues
  for insert with check (is_superadmin(auth.uid()) or is_org_manager(auth.uid(), organization_id));

drop policy "org managers update own venues" on venues;
create policy "org managers update own venues" on venues
  for update using (is_superadmin(auth.uid()) or is_org_manager(auth.uid(), organization_id));

-- events
drop policy "org managers manage own events" on events;
create policy "org managers manage own events" on events
  for insert with check (is_superadmin(auth.uid()) or is_org_manager(auth.uid(), organization_id));

drop policy "org managers update own events" on events;
create policy "org managers update own events" on events
  for update using (is_superadmin(auth.uid()) or is_org_manager(auth.uid(), organization_id));

-- event_ticket_types
drop policy "org managers manage own ticket types" on event_ticket_types;
create policy "org managers manage own ticket types" on event_ticket_types
  for insert with check (
    is_superadmin(auth.uid()) or exists (
      select 1 from events e
      where e.id = event_ticket_types.event_id and is_org_manager(auth.uid(), e.organization_id)
    )
  );

drop policy "org managers update own ticket types" on event_ticket_types;
create policy "org managers update own ticket types" on event_ticket_types
  for update using (
    is_superadmin(auth.uid()) or exists (
      select 1 from events e
      where e.id = event_ticket_types.event_id and is_org_manager(auth.uid(), e.organization_id)
    )
  );

-- event_seats
drop policy "org managers manage own event seats" on event_seats;
create policy "org managers manage own event seats" on event_seats
  for insert with check (
    is_superadmin(auth.uid()) or exists (
      select 1 from events e
      where e.id = event_seats.event_id and is_org_manager(auth.uid(), e.organization_id)
    )
  );

drop policy "org managers update own event seats" on event_seats;
create policy "org managers update own event seats" on event_seats
  for update using (
    is_superadmin(auth.uid()) or exists (
      select 1 from events e
      where e.id = event_seats.event_id and is_org_manager(auth.uid(), e.organization_id)
    )
  );

drop policy "org managers delete own event seats" on event_seats;
create policy "org managers delete own event seats" on event_seats
  for delete using (
    is_superadmin(auth.uid()) or exists (
      select 1 from events e
      where e.id = event_seats.event_id and is_org_manager(auth.uid(), e.organization_id)
    )
  );

-- orders / order_items / tickets (unchanged semantics: any member, not just managers)
drop policy "read own or org or superadmin orders" on orders;
create policy "read own or org or superadmin orders" on orders
  for select using (
    user_id = auth.uid() or is_org_member(auth.uid(), organization_id) or is_superadmin(auth.uid())
  );

drop policy "read own or org or superadmin order_items" on order_items;
create policy "read own or org or superadmin order_items" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or is_org_member(auth.uid(), o.organization_id) or is_superadmin(auth.uid()))
    )
  );

drop policy "read own or org or superadmin tickets" on tickets;
create policy "read own or org or superadmin tickets" on tickets
  for select using (
    owner_profile_id = auth.uid()
    or is_superadmin(auth.uid())
    or exists (
      select 1 from events e
      where e.id = tickets.event_id and is_org_member(auth.uid(), e.organization_id)
    )
  );

-- No policy anywhere references the 1-arg is_org_manager or
-- my_organization_id anymore — safe to drop both.
drop function is_org_manager(uuid);
drop function my_organization_id(uuid);
