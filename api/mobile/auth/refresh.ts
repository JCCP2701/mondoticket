import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireEnv, authClient } from '../_supabase.js';

// The AAL level is carried inside the JWT itself, so refreshing preserves
// aal2 automatically — no need to repeat the TOTP challenge on every
// refresh, only on a brand-new signInWithPassword.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const { refreshToken } = req.body ?? {};
  if (typeof refreshToken !== 'string') {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  const client = authClient(e);
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    res.status(401).json({ errorCode: 'SESSION_EXPIRED', error: 'Sesión expirada, inicia sesión de nuevo' });
    return;
  }

  res.status(200).json({
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    },
  });
}
