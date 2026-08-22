-- Nuevo rol "broker": un intermediario externo que trae organizaciones a la
-- plataforma y se lleva un % de las ganancias de los eventos de esa
-- organización. El contrato es entre la plataforma y el broker (uno por
-- cada pareja broker+organización) — nunca entre el broker y la
-- organización directamente, por eso no vive en organization_members.
--
-- El broker NUNCA tiene acceso de lectura a orders/tickets/event_ticket_types
-- (no se le otorga ninguna política RLS sobre esas tablas) — su única forma
-- de ver dinero es la función get_broker_transactions(), que calcula y
-- devuelve solo el monto de su comisión ya calculado, jamás el ingreso real
-- del evento ni el detalle de órdenes/compradores.

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role = any (array['superadmin','organization','user','taquilla','validador','broker']));

create table broker_contracts (
  id uuid primary key default gen_random_uuid(),
  broker_profile_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  commission_basis text not null check (commission_basis in ('ticket_revenue', 'platform_fee')),
  commission_percentage numeric(5,2) not null check (commission_percentage >= 0 and commission_percentage <= 100),
  notes text,
  created_at timestamptz not null default now(),
  unique (broker_profile_id, organization_id)
);

alter table broker_contracts enable row level security;

create policy "superadmin manages broker contracts"
  on broker_contracts for all
  using (is_superadmin(auth.uid()))
  with check (is_superadmin(auth.uid()));

create policy "broker reads own contracts"
  on broker_contracts for select
  using (broker_profile_id = auth.uid());

-- Recomputa en vivo desde el estado real de tickets/orders/organizations
-- (mismo modelo que getFinanceSummaryByOrganization: ingreso = suma del
-- precio de cada ticket no cancelado, separado por canal de venta) — no hay
-- ledger persistido, así que un reembolso se refleja automáticamente en la
-- siguiente consulta al dejar el ticket en status='cancelled'.
create or replace function get_broker_transactions()
returns table (
  order_id uuid,
  organization_id uuid,
  organization_name text,
  event_id uuid,
  event_name text,
  event_date date,
  paid_at timestamptz,
  sales_channel text,
  commission_basis text,
  commission_percentage numeric,
  commission_amount numeric
)
language plpgsql
security definer
as $$
begin
  return query
  with order_revenue as (
    select
      o.id as order_id,
      o.organization_id,
      o.event_id,
      o.paid_at,
      o.sales_channel,
      sum(ett.price) as revenue
    from orders o
    join tickets t on t.order_id = o.id and t.status <> 'cancelled'
    join event_ticket_types ett on ett.id = t.ticket_type_id
    where o.status = 'paid'
      and o.organization_id in (
        select bc.organization_id from broker_contracts bc where bc.broker_profile_id = auth.uid()
      )
    group by o.id, o.organization_id, o.event_id, o.paid_at, o.sales_channel
    having sum(ett.price) > 0
  )
  select
    orr.order_id,
    orr.organization_id,
    org.name,
    e.id,
    e.name,
    e.event_date,
    orr.paid_at,
    orr.sales_channel,
    bc.commission_basis,
    bc.commission_percentage,
    round(
      case
        when bc.commission_basis = 'ticket_revenue' then orr.revenue * bc.commission_percentage / 100
        else orr.revenue
          * (case when orr.sales_channel = 'taquilla' then coalesce(org.taquilla_fee_percentage, org.fee_percentage) else org.fee_percentage end)
          / 100
          * bc.commission_percentage / 100
      end,
      2
    ) as commission_amount
  from order_revenue orr
  join organizations org on org.id = orr.organization_id
  join events e on e.id = orr.event_id
  join broker_contracts bc on bc.organization_id = orr.organization_id and bc.broker_profile_id = auth.uid()
  order by orr.paid_at desc;
end;
$$;
