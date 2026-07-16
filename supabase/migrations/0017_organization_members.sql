-- Many-to-many membership: which organizations a profile (role
-- organization/taquilla) may act on. Role stays a single global attribute on
-- profiles.role — this table only grants org-scoped authorization.
create table organization_members (
  profile_id      uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (profile_id, organization_id)
);

create index idx_organization_members_org on organization_members(organization_id);

alter table organization_members enable row level security;

create policy "members read own membership rows" on organization_members
  for select using (profile_id = auth.uid() or is_superadmin(auth.uid()));

create policy "only superadmin inserts membership" on organization_members
  for insert with check (is_superadmin(auth.uid()));

create policy "only superadmin updates membership" on organization_members
  for update using (is_superadmin(auth.uid()));

create policy "only superadmin deletes membership" on organization_members
  for delete using (is_superadmin(auth.uid()));

-- Backfill from the (still-existing, dropped in a later migration) single
-- organization_id column, before it goes away.
insert into organization_members (profile_id, organization_id)
select id, organization_id
from profiles
where organization_id is not null
on conflict (profile_id, organization_id) do nothing;
