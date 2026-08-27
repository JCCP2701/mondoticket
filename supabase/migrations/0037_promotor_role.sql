-- Nuevo rol "promotor": vendedor afiliado a UNA organización (misma
-- mecánica de membresía que taquilla/validador, vía organization_members)
-- que vende boletos con el mismo flujo que taquilla (create_order_and_tickets,
-- sales_channel='taquilla') pero cuyas ventas quedan atribuidas a él
-- (orders.sold_by, agregado en 0038) para que su propio dashboard pueda
-- medir su avance contra una meta de boletos vendidos y, opcionalmente,
-- una comisión — ambas configurables por la organización ("como convenios
-- entre el promotor y la organización"), nunca fijas a nivel sistema.
--
-- promoter_terms es la comisión (opcional — sin fila, no aplica comisión),
-- análogo a broker_contracts pero con una tercera política de RLS para que
-- el manager de la organización (no solo superadmin) también administre
-- los términos de SUS promotores. A diferencia de broker_contracts no hay
-- columna commission_basis: un promotor ES quien vendió el boleto, así que
-- la única base con sentido es el ingreso de sus propias ventas (no el fee
-- de la plataforma, que sí aplica a un broker externo).
--
-- promoter_goals son los periodos de meta (conteo de boletos), una fila por
-- periodo — la organización puede crear/editar/eliminar periodos libremente
-- a lo largo del tiempo (no hay un periodo fijo tipo "mensual").

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role = any (array['superadmin','organization','user','taquilla','validador','broker','promotor']));

create table promoter_terms (
  id uuid primary key default gen_random_uuid(),
  promoter_profile_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  commission_percentage numeric(5,2) not null check (commission_percentage >= 0 and commission_percentage <= 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (promoter_profile_id, organization_id)
);

alter table promoter_terms enable row level security;

create policy "superadmin manages promoter terms"
  on promoter_terms for all
  using (is_superadmin(auth.uid()))
  with check (is_superadmin(auth.uid()));

create policy "org managers manage own promoter terms"
  on promoter_terms for all
  using (is_org_manager(auth.uid(), organization_id))
  with check (is_org_manager(auth.uid(), organization_id));

create policy "promoter reads own terms"
  on promoter_terms for select
  using (promoter_profile_id = auth.uid());

create table promoter_goals (
  id uuid primary key default gen_random_uuid(),
  promoter_profile_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  target_ticket_count int not null check (target_ticket_count >= 0),
  notes text,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index idx_promoter_goals_promoter on promoter_goals(promoter_profile_id);
create index idx_promoter_goals_org on promoter_goals(organization_id);

alter table promoter_goals enable row level security;

create policy "superadmin manages promoter goals"
  on promoter_goals for all
  using (is_superadmin(auth.uid()))
  with check (is_superadmin(auth.uid()));

create policy "org managers manage own promoter goals"
  on promoter_goals for all
  using (is_org_manager(auth.uid(), organization_id))
  with check (is_org_manager(auth.uid(), organization_id));

create policy "promoter reads own goals"
  on promoter_goals for select
  using (promoter_profile_id = auth.uid());
