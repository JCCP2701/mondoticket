import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Creates an 'organization' or 'taquilla' account and assigns it to one or
// more organizations. Requires SUPABASE_SERVICE_ROLE_KEY — this must never
// be sent to the browser, which is exactly why account creation has to go
// through a serverless function rather than the browser Supabase client
// used everywhere else in this app.
//
// Two callers are allowed:
//   - superadmin: can invite either role, to any organization(s).
//   - organization (manager): can only invite 'taquilla', and only into
//     organization(s) they themselves belong to.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server misconfigured: missing Supabase env vars' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }
  const callerToken = authHeader.slice('Bearer '.length);

  const { name, email, role, organizationIds } = req.body ?? {};
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    (role !== 'organization' && role !== 'taquilla') ||
    !Array.isArray(organizationIds) || organizationIds.length === 0 || !organizationIds.every((id) => typeof id === 'string')
  ) {
    res.status(400).json({ error: 'name, a valid email, role (organization|taquilla), and a non-empty organizationIds array are required' });
    return;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerData, error: callerError } = await serviceClient.auth.getUser(callerToken);
  if (callerError || !callerData.user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const { data: callerProfile, error: profileError } = await serviceClient
    .from('profiles')
    .select('role, organization_members(organization_id)')
    .eq('id', callerData.user.id)
    .single();

  if (profileError || !callerProfile) {
    res.status(403).json({ error: 'Could not verify caller' });
    return;
  }

  const callerOrgIds = new Set((callerProfile as any).organization_members?.map((m: any) => m.organization_id) ?? []);
  const isSuperadmin = callerProfile.role === 'superadmin';
  const isOrgManager = callerProfile.role === 'organization';

  if (isSuperadmin) {
    // may invite either role, to any organization(s) — no further checks.
  } else if (isOrgManager) {
    if (role !== 'taquilla' || !organizationIds.every((id: string) => callerOrgIds.has(id))) {
      res.status(403).json({ error: 'An organization account can only invite taquilla staff into its own organization(s)' });
      return;
    }
  } else {
    res.status(403).json({ error: 'Only a superadmin or organization account can invite staff' });
    return;
  }

  const temporaryPassword = generateTemporaryPassword();

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError || !created.user) {
    res.status(409).json({ error: createError?.message || 'Could not create the account' });
    return;
  }

  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({ role })
    .eq('id', created.user.id);

  if (updateError) {
    res.status(500).json({ error: 'Account created but failed to assign role: ' + updateError.message });
    return;
  }

  const { error: membershipError } = await serviceClient
    .from('organization_members')
    .insert(organizationIds.map((organizationId: string) => ({ profile_id: created.user.id, organization_id: organizationId })));

  if (membershipError) {
    res.status(500).json({ error: 'Account created but failed to assign organization(s): ' + membershipError.message });
    return;
  }

  res.status(200).json({ email, temporaryPassword });
}

function generateTemporaryPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16) + 'Aa1!';
}
