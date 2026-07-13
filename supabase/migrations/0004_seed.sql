-- Seed data mirroring the current localStorage mocks in dataService.ts,
-- but split into ticket types to exercise the new per-type inventory.
insert into organizations (id, name, legal_name, rfc, address, contact_name, contact_email, contact_phone, fee_percentage, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'EventPro México', 'EventPro México S.A. de C.V.', 'EPM950101ABC',
  'Av. Reforma 123, CDMX', 'Juan Pérez', 'juan@eventpro.mx', '5512345678',
  10, 'active'
);

insert into venues (id, organization_id, name, address, city)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Foro Sol', 'Viaducto Río de la Piedad, CDMX', 'Ciudad de México'
);

insert into events (id, organization_id, venue_id, name, description, category, event_date, status)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Festival Indie CDMX 2026',
  'Festival de música indie con artistas nacionales e internacionales.',
  'Música',
  '2026-03-15',
  'upcoming'
);

insert into event_ticket_types (event_id, name, description, price, capacity, sold, sort_order)
values
  ('33333333-3333-3333-3333-333333333333', 'General', 'Acceso general al festival', 1200, 4000, 3400, 1),
  ('33333333-3333-3333-3333-333333333333', 'VIP', 'Acceso VIP con zona exclusiva y bebidas incluidas', 2500, 1000, 800, 2);
