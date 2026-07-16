import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Creates a 'taquilla' (box-office) account for the caller's organization.
// Requires SUPABASE_SERVICE_ROLE_KEY — this must never be sent to the
// browser, which is exactly why account creation has to go through a
// serverless function rather than the browser Supabase client used
// everywhere else in this app.
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

  const { name, email } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'name and a valid email are required' });
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
    .select('role, organization_id')
    .eq('id', callerData.user.id)
    .single();

  if (profileError || !callerProfile || callerProfile.role !== 'organization' || !callerProfile.organization_id) {
    res.status(403).json({ error: 'Only an organization account can invite box-office staff' });
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
    .update({ role: 'taquilla', organization_id: callerProfile.organization_id })
    .eq('id', created.user.id);

  if (updateError) {
    res.status(500).json({ error: 'Account created but failed to assign role: ' + updateError.message });
    return;
  }

  res.status(200).json({ email, temporaryPassword });
}

function generateTemporaryPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16) + 'Aa1!';
}
