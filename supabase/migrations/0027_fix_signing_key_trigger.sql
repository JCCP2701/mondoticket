-- 0026's ensure_event_signing_key() trigger was missing `security definer`,
-- so it ran as the calling role (e.g. an organization manager) — and since
-- event_signing_keys has RLS enabled with no insert policy for anyone,
-- every single event creation started failing with a 403 the moment
-- 0026 was applied. Confirmed live: creating an event as organization@demo.com
-- failed with "new row violates row-level security policy for table
-- event_signing_keys" immediately after 0026 landed.
create or replace function ensure_event_signing_key() returns trigger
language plpgsql
security definer
as $$
begin
  insert into event_signing_keys (event_id, key_version) values (new.id, 1);
  return new;
end;
$$;
