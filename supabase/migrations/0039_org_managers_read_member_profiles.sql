-- Un manager de organización necesita leer el perfil (name, email, role,
-- mfa_exempt) de cualquier compañero de equipo que sea miembro de una org
-- que administra. Dos consumidores concretos:
--   1. getOrganizationMembers() en dataService.ts embebe profiles(...) a
--      través de organization_members — usado por OrganizationPromoters.tsx
--      ("Mis promotores"), que con la única policy de SELECT existente sobre
--      profiles ("id = auth.uid() or is_superadmin(auth.uid())", 0002_rls.sql)
--      recibe null en cada fila profiles embebida que no sea la del propio
--      caller — PostgREST no lanza error, solo omite el dato — por lo que
--      hoy esa lista sale SIEMPRE VACÍA para un dueño de organización real.
--   2. getOrganizationSalesDetail() (extendida en esta misma entrega) ahora
--      embebe profiles!sold_by(role) sobre orders para clasificar una venta
--      como "por promotor" vs "taquilla directo".
--
-- Las policies de RLS para un mismo comando (SELECT) se combinan con OR,
-- así que esto es ADICIONAL a "users can read own profile" — no le hace
-- DROP ni la reemplaza.
--
-- Alcance de seguridad: el exists() está anclado en "el perfil objetivo
-- (profiles.id) es miembro (organization_members) de una organización para
-- la cual is_org_manager(auth.uid(), esa_organization_id) es verdadero".
-- is_org_manager ya exige que el CALLER tenga role='organization' Y sea
-- miembro de esa misma organización (0018_org_membership_rls.sql), así que
-- esto no puede satisfacerse para una organización distinta a la que el
-- caller administra, ni por un caller que no sea manager de organización.
-- No expone perfiles de gente sin ninguna organización en común con el
-- caller. Deliberadamente acotado a is_org_manager (no is_org_member): no
-- hay hoy un caso de uso real donde un promotor/taquilla/validador necesite
-- leer el perfil de un compañero de equipo, así que ampliarlo sería
-- over-otorgar permisos que nadie pidió.
create policy "org managers read fellow member profiles" on profiles
  for select using (
    exists (
      select 1 from organization_members om
      where om.profile_id = profiles.id
        and is_org_manager(auth.uid(), om.organization_id)
    )
  );
