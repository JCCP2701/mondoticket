import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireEnv, adminClient, bearerToken, requireCaller, loadStaffProfile, isGateStaff } from '../_supabase.js';

// Lists the events the caller can scan tickets for, to populate the event
// picker in the Android app (equivalent to dataService.getEventsByOrganization
// used by ValidadorDashboard.tsx). events RLS is `for select using (true)`
// (public), so reading here with the admin client is a convenience — not a
// bypass of anything a caller with the anon key couldn't already read.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const token = bearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const admin = adminClient(e);
  const caller = await requireCaller(admin, token);
  if (!caller) {
    res.status(401).json({ errorCode: 'AUTH_REQUIRED', error: 'Invalid session' });
    return;
  }

  const profile = await loadStaffProfile(admin, caller.id);
  if (!profile) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }
  if (!isGateStaff(profile)) {
    res.status(403).json({ errorCode: 'NOT_GATE_STAFF', error: 'Esta cuenta no tiene permiso para validar boletos' });
    return;
  }

  const requestedOrgId = typeof req.query.organizationId === 'string' ? req.query.organizationId : null;
  const orgIds = profile.organizations.map((o) => o.id).filter((id) => !requestedOrgId || id === requestedOrgId);

  if (orgIds.length === 0) {
    // Known limit case, not a bug: superadmin has no organization_members
    // row and ValidadorDashboard.tsx already documents the same gap for the
    // web UI (its event dropdown is empty for a bare superadmin account).
    res.status(200).json({ organizations: profile.organizations, events: [] });
    return;
  }

  const { data: rows, error: rowsError } = await admin
    .from('events')
    .select('id, organization_id, name, event_date, status, venues(name)')
    .in('organization_id', orgIds)
    .order('event_date');
  if (rowsError) {
    res.status(500).json({ error: rowsError.message });
    return;
  }

  res.status(200).json({
    organizations: profile.organizations,
    events: (rows ?? []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      name: r.name,
      venueName: r.venues?.name ?? '',
      eventDate: r.event_date,
      status: r.status,
    })),
  });
}
