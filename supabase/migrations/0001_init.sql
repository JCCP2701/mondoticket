-- TicketBlessing initial schema
-- Organizations, profiles (auth), venues, events, ticket types (section/type inventory),
-- orders, order_items, tickets. See /Users/juancoronapartida/.claude/plans for the design rationale.

create extension if not exists pgcrypto;

-- ─── organizations ──────────────────────────────────────────────────────────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  rfc text,
  address text,
  contact_name text,
  contact_email text,
  contact_phone text,
  fee_percentage numeric(5,2) not null default 0,
  status text not null default 'active' check (status in ('active','pending','suspended')),
  created_at timestamptz not null default now()
);

-- ─── profiles (1:1 with auth.users) ────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text not null,
  avatar_url text,
  role text not null default 'user' check (role in ('superadmin','organization','user')),
  organization_id uuid references organizations(id),
  created_at timestamptz not null default now()
);

-- ─── venues ─────────────────────────────────────────────────────────────────
create table venues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  address text,
  city text,
  created_at timestamptz not null default now()
);

-- ─── events ─────────────────────────────────────────────────────────────────
create table events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  venue_id uuid not null references venues(id),
  name text not null,
  description text,
  category text,
  image_url text,
  event_date date not null,
  event_time time,
  doors_time time,
  presale_date timestamptz,
  instructions text,
  conditions text,
  status text not null default 'upcoming' check (status in ('upcoming','ongoing','completed','cancelled')),
  created_at timestamptz not null default now()
);

-- ─── event_ticket_types (the section/type inventory) ───────────────────────
create table event_ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  capacity int not null check (capacity > 0),
  sold int not null default 0 check (sold >= 0 and sold <= capacity),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ─── orders ─────────────────────────────────────────────────────────────────
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  event_id uuid not null references events(id),
  organization_id uuid not null references organizations(id),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  subtotal numeric(10,2),
  service_fee numeric(10,2),
  total numeric(10,2),
  currency text not null default 'MXN',
  stripe_payment_intent_id text unique,
  customer_name text,
  customer_email text,
  customer_phone text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- ─── order_items ────────────────────────────────────────────────────────────
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  ticket_type_id uuid not null references event_ticket_types(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null
);

-- ─── tickets ────────────────────────────────────────────────────────────────
create table tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  order_item_id uuid references order_items(id),
  ticket_type_id uuid not null references event_ticket_types(id),
  event_id uuid not null references events(id),
  owner_profile_id uuid references profiles(id),
  qr_code text not null unique default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'valid' check (status in ('valid','used','cancelled')),
  checked_in_at timestamptz,
  apple_wallet_pass_url text,
  google_wallet_link text,
  created_at timestamptz not null default now()
);

create index idx_events_org on events(organization_id);
create index idx_events_venue on events(venue_id);
create index idx_ticket_types_event on event_ticket_types(event_id);
create index idx_orders_user on orders(user_id);
create index idx_orders_event on orders(event_id);
create index idx_tickets_owner on tickets(owner_profile_id);
create index idx_tickets_event on tickets(event_id);
create index idx_tickets_qr on tickets(qr_code);
