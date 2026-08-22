-- Defense in depth against Svix redelivery, independent of the
-- "already paid -> no-op" check inside confirm_order_paid. processed_at
-- distinguishes "duplicate of an already-handled event" (skip) from "retry
-- of an event whose business logic hasn't succeeded yet" (must reprocess —
-- api/payments/orkesta/webhook.ts checks this before deciding whether to
-- call confirm_order_paid/do_release_order again).
create table payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  svix_id text not null unique,
  event_type text not null,
  order_id uuid references orders(id),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index idx_payment_webhook_events_order on payment_webhook_events(order_id) where order_id is not null;

alter table payment_webhook_events enable row level security;
-- No policies for anon/authenticated: only api/payments/orkesta/webhook.ts
-- touches this table, using the service-role key (bypasses RLS). Zero
-- policies means zero access for every other role.
