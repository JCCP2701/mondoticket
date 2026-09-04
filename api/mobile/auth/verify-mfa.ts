import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireEnv, adminClient, sessionClient, loadStaffProfile, isGateStaff, registerSession } from '../_supabase.js';

// Step 2: exchanges the pendingToken/pendingRefreshToken from login.ts plus
// a TOTP code for a full AAL2 session — mirrors verifyMFA() in
// src/app/context/AuthContext.tsx, just server-side. Both tokens (not only
// the access token) are required because supabase-js's auth.mfa.* calls
// need an actual loaded session (auth.setSession), which auth-js refuses
// unless both access_token and refresh_token are present.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const { pendingToken, pendingRefreshToken, factorId, code, deviceId, deviceLabel } = req.body ?? {};
  if (
    typeof pendingToken !== 'string' ||
    typeof pendingRefreshToken !== 'string' ||
    typeof factorId !== 'string' ||
    typeof code !== 'string'
  ) {
    res.status(400).json({ error: 'pendingToken, pendingRefreshToken, factorId and code are required' });
    return;
  }

  const asUser = await sessionClient(e, pendingToken, pendingRefreshToken);
  if (!asUser) {
    res.status(401).json({ errorCode: 'INVALID_MFA_CODE', error: 'Sesión pendiente inválida o expirada' });
    return;
  }

  const { data, error } = await asUser.auth.mfa.challengeAndVerify({ factorId, code });
  if (error || !data) {
    res.status(401).json({ errorCode: 'INVALID_MFA_CODE', error: 'Código incorrecto o expirado' });
    return;
  }

  const admin = adminClient(e);
  const profile = await loadStaffProfile(admin, data.user.id);
  if (!profile) {
    res.status(401).json({ error: 'No se pudo cargar el perfil' });
    return;
  }
  if (!isGateStaff(profile)) {
    res.status(403).json({ errorCode: 'NOT_GATE_STAFF', error: 'Esta cuenta no tiene permiso para validar boletos' });
    return;
  }

  await registerSession(e, data.access_token, deviceId, deviceLabel);

  res.status(200).json({
    session: { accessToken: data.access_token, refreshToken: data.refresh_token },
    user: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      organizations: profile.organizations,
    },
  });
}
