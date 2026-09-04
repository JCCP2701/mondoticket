import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  requireEnv,
  authClient,
  adminClient,
  sessionClient,
  clientIp,
  loadStaffProfile,
  isGateStaff,
  mfaRequired,
  registerSession,
} from '../_supabase.js';

// Handles /api/mobile/auth/login, /verify-mfa and /refresh out of a single
// Vercel serverless function (a [...action] catch-all route) — the Hobby
// plan caps a deployment at 12 functions total, and this project already
// had 6 outside /api/mobile before this API existed. The URLs, request/
// response shapes and behavior are unchanged from when each lived in its
// own file; only the physical file layout changed.

// Step 1 of the Android validador login: password only (AAL1). If the
// account needs MFA — every staff role unless profiles.mfa_exempt, same
// rule as mfaRequired() in src/app/context/AuthContext.tsx — the response
// carries a pendingToken/pendingRefreshToken the app must send back to
// verify-mfa, distinguishing a first-time TOTP enrollment from an
// already-verified factor. Actually ENFORCING aal2 happens in the database
// (migration 0042) on every gate RPC — this endpoint only decides what to
// ask the user for next; it is not itself the security boundary.
async function login(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const { email, password, deviceId, deviceLabel } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const admin = adminClient(e);
  const ip = clientIp(req);

  const { data: allowed, error: allowedError } = await admin.rpc('check_login_allowed', {
    p_email: email,
    p_ip: ip,
  });
  // Fail CLOSED, not open: if the rate-limit check itself errors, treating
  // that as "allowed" would silently disable the brute-force lockout for a
  // shared, high-value staff credential exactly when the safeguard's own
  // infrastructure is unhealthy.
  if (allowedError) {
    res.status(500).json({ error: 'No se pudo verificar el límite de intentos de acceso' });
    return;
  }
  if (allowed === false) {
    res.status(429).json({
      errorCode: 'TOO_MANY_ATTEMPTS',
      error: 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.',
    });
    return;
  }

  const auth = authClient(e);
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  await admin.rpc('record_login_attempt', { p_email: email, p_ip: ip, p_success: !error && !!data?.session });

  if (error || !data.session || !data.user) {
    res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', error: 'Correo o contraseña incorrectos' });
    return;
  }

  const profile = await loadStaffProfile(admin, data.user.id);
  if (!profile) {
    res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', error: 'No se pudo cargar el perfil' });
    return;
  }

  if (!isGateStaff(profile)) {
    res.status(403).json({ errorCode: 'NOT_GATE_STAFF', error: 'Esta cuenta no tiene permiso para validar boletos' });
    return;
  }

  const publicUser = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    organizations: profile.organizations,
  };

  if (!mfaRequired(profile)) {
    await registerSession(e, data.session.access_token, deviceId, deviceLabel);
    res.status(200).json({
      mfaRequired: false,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
      user: publicUser,
    });
    return;
  }

  const asUser = await sessionClient(e, data.session.access_token, data.session.refresh_token);
  if (!asUser) {
    res.status(500).json({ error: 'No se pudo iniciar la sesión pendiente de doble autenticación' });
    return;
  }

  const { data: factors, error: factorsError } = await asUser.auth.mfa.listFactors();
  if (factorsError) {
    res.status(500).json({ error: 'No se pudo consultar el factor de doble autenticación' });
    return;
  }
  const verifiedTotp = factors?.totp?.find((f) => f.status === 'verified');

  if (verifiedTotp) {
    res.status(200).json({
      mfaRequired: true,
      isFirstMfaSetup: false,
      factorId: verifiedTotp.id,
      pendingToken: data.session.access_token,
      pendingRefreshToken: data.session.refresh_token,
    });
    return;
  }

  const { data: enrolled, error: enrollError } = await asUser.auth.mfa.enroll({ factorType: 'totp' });
  if (enrollError || !enrolled) {
    res.status(500).json({ error: 'No se pudo iniciar el registro de doble autenticación' });
    return;
  }

  res.status(200).json({
    mfaRequired: true,
    isFirstMfaSetup: true,
    factorId: enrolled.id,
    pendingToken: data.session.access_token,
    pendingRefreshToken: data.session.refresh_token,
    totp: { secret: enrolled.totp.secret, uri: enrolled.totp.uri, qrCodeSvg: enrolled.totp.qr_code },
  });
}

// Step 2: exchanges the pendingToken/pendingRefreshToken from login plus a
// TOTP code for a full AAL2 session — mirrors verifyMFA() in
// src/app/context/AuthContext.tsx, just server-side. Both tokens (not only
// the access token) are required because supabase-js's auth.mfa.* calls
// need an actual loaded session (auth.setSession), which auth-js refuses
// unless both access_token and refresh_token are present.
async function verifyMfa(req: VercelRequest, res: VercelResponse) {
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

// The AAL level is carried inside the JWT itself, so refreshing preserves
// aal2 automatically — no need to repeat the TOTP challenge on every
// refresh, only on a brand-new signInWithPassword.
async function refresh(req: VercelRequest, res: VercelResponse) {
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

// Read the action straight off the request path rather than
// req.query.action: different Vercel CLI versions have named a catch-all
// segment's query key inconsistently in local dev (observed '...action'
// instead of 'action' on CLI 56.x) — parsing the URL directly sidesteps
// that entirely and behaves the same in dev and in production.
const ROUTE_PREFIX = '/api/mobile/auth/';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.url ?? '').split('?')[0];
  const idx = path.indexOf(ROUTE_PREFIX);
  const route = idx >= 0 ? path.slice(idx + ROUTE_PREFIX.length).replace(/\/+$/, '') : '';

  switch (route) {
    case 'login':
      return login(req, res);
    case 'verify-mfa':
      return verifyMfa(req, res);
    case 'refresh':
      return refresh(req, res);
    default:
      res.status(404).json({ error: 'Not found' });
  }
}
