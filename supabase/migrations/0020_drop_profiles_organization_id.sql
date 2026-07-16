-- Isolated on its own since it's the one irreversible step. Safe at this
-- point: no policy ever referenced profiles.organization_id directly, and
-- the one object that did (my_organization_id) was already dropped in
-- 0018, after every dependent policy was repointed to organization_members.
alter table profiles drop column organization_id;
