-- Row Level Security policies.
-- Design: catalog tables (organizations/venues/events/event_ticket_types) are
-- publicly readable so the storefront works for anonymous visitors; writes are
-- scoped to the owning organization or superadmin. orders/tickets are
-- read-only for clients — all writes happen exclusively through the
-- create_order_and_tickets() SECURITY DEFINER function called by trusted
-- server code (never directly from the browser).

create or replace function is_superadmin(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles where id = uid and role = 'superadmin'
  );
$$;

create or replace function my_organization_id(uid uuid)
returns uuid
language sql
security definer
stable
as $$
  select organization_id from profiles where id = uid;
$$;

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table venues enable row level security;
alter table events enable row level security;
alter table event_ticket_types enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table tickets enable row level security;

-- organizations
create policy "org members and superadmin can read their org" on organizations
  for select using (
    is_superadmin(auth.uid()) or id = my_organization_id(auth.uid())
  );
create policy "only superadmin can create organizations" on organizations
  for insert with check (is_superadmin(auth.uid()));
create policy "org members and superadmin can update their org" on organizations
  for update using (
    is_superadmin(auth.uid()) or id = my_organization_id(auth.uid())
  );

-- profiles
create policy "users can read own profile" on profiles
  for select using (id = auth.uid() or is_superadmin(auth.uid()));
create policy "users can update own profile" on profiles
  for update using (id = auth.uid());

-- venues (public read, org/superadmin write)
create policy "anyone can read venues" on venues
  for select using (true);
create policy "org members manage own venues" on venues
  for insert with check (
    is_superadmin(auth.uid()) or organization_id = my_organization_id(auth.uid())
  );
create policy "org members update own venues" on venues
  for update using (
    is_superadmin(auth.uid()) or organization_id = my_organization_id(auth.uid())
  );

-- events (public read, org/superadmin write)
create policy "anyone can read events" on events
  for select using (true);
create policy "org members manage own events" on events
  for insert with check (
    is_superadmin(auth.uid()) or organization_id = my_organization_id(auth.uid())
  );
create policy "org members update own events" on events
  for update using (
    is_superadmin(auth.uid()) or organization_id = my_organization_id(auth.uid())
  );

-- event_ticket_types (public read; write restricted to the owning org via events join)
create policy "anyone can read ticket types" on event_ticket_types
  for select using (true);
create policy "org members manage own ticket types" on event_ticket_types
  for insert with check (
    is_superadmin(auth.uid()) or exists (
      select 1 from events e
      where e.id = event_ticket_types.event_id
        and e.organization_id = my_organization_id(auth.uid())
    )
  );
create policy "org members update own ticket types" on event_ticket_types
  for update using (
    is_superadmin(auth.uid()) or exists (
      select 1 from events e
      where e.id = event_ticket_types.event_id
        and e.organization_id = my_organization_id(auth.uid())
    )
  );
-- NOTE: no update policy allows touching `sold` from the client — application
-- code never issues a raw UPDATE against this table for `sold`; only the
-- SECURITY DEFINER RPC in 0003_orders_rpc.sql does, bypassing RLS by design.

-- orders / order_items / tickets: read-only for clients, no insert/update policy at all
create policy "read own or org or superadmin orders" on orders
  for select using (
    user_id = auth.uid()
    or organization_id = my_organization_id(auth.uid())
    or is_superadmin(auth.uid())
  );

create policy "read own or org or superadmin order_items" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or o.organization_id = my_organization_id(auth.uid()) or is_superadmin(auth.uid()))
    )
  );

create policy "read own or org or superadmin tickets" on tickets
  for select using (
    owner_profile_id = auth.uid()
    or is_superadmin(auth.uid())
    or exists (
      select 1 from events e
      where e.id = tickets.event_id and e.organization_id = my_organization_id(auth.uid())
    )
  );
