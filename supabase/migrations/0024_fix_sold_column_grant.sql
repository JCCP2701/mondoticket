-- 0023's `revoke update (sold) on event_ticket_types from authenticated`
-- did not actually close the gap: `authenticated` also holds Supabase's
-- default table-wide UPDATE grant on this table, and Postgres column
-- privileges are additive with table-wide ones — having either is enough,
-- so the column-level revoke alone was a no-op in practice (confirmed live:
-- an org manager could still UPDATE ... SET sold = 5 after 0023).
--
-- The only way to actually block one column while keeping the others
-- writable is to revoke the table-wide UPDATE grant and re-grant UPDATE
-- explicitly only on the columns clients are allowed to touch.
revoke update on event_ticket_types from authenticated;
grant update (name, description, price, capacity, sort_order) on event_ticket_types to authenticated;
