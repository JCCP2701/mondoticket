import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireEnv, authClient, adminClient, loadStaffProfile, clientIp } from '../../_supabase.js';

// Login/registro para el COMPRADOR final (rol 'user') — deliberadamente
// separado de api/mobile/auth/[...action].ts (staff): un comprador nunca
// pasa por TOTP (mfaRequired() en AuthContext.tsx excluye role==='user'), y
// aquí SÍ se permite auto-registro — dos propiedades opuestas a las del
// login de staff, que conviene no mezclar en el mismo dispatcher.
//
// loadStaffProfile (de _supabase.ts) se reusa tal cual pese al nombre: es
// una lectura genérica de profiles + organization_members que funciona
// igual para cualquier rol — un comprador simplemente no pertenece a
// ninguna organización, así que esa lista sale vacía.
function publicUser(profile: { id: string; name: string; email: string; role: string }) {
  return { id: profile.id, name: profile.name, email: profile.email, role: profile.role };
}

// Espeja register() de AuthContext.tsx, pero sin el fallback de "si ya
// existe, intenta hacer login con la misma password que se acaba de
// teclear" — ese fallback produce un mensaje engañoso ("Error al
// registrar") cuando el problema real es que la cuenta ya existe con OTRA
// password. Aquí se reporta el motivo real para que la app pueda mandar al
// usuario a /login en vez de reintentar el registro.
async function register(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const { name, email, password } = req.body ?? {};
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'name, email and password are required' });
    return;
  }

  const auth = authClient(e);
  const { data, error } = await auth.auth.signUp({ email, password, options: { data: { name } } });
  if (error) {
    if (error.message?.toLowerCase().includes('already') || (error as any).code === 'user_already_exists') {
      res.status(409).json({ errorCode: 'ALREADY_REGISTERED', error: 'Ya existe una cuenta con este correo. Inicia sesión.' });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }
  if (!data.user || !data.session) {
    // email confirmation enabled server-side — no debería pasar con la
    // configuración actual del proyecto (confirmado sin paso de "revisa tu
    // correo" en la web), pero cubierto por si cambia en el dashboard.
    res.status(202).json({ error: 'Cuenta creada, confirma tu correo antes de iniciar sesión' });
    return;
  }

  const admin = adminClient(e);
  const profile = await loadStaffProfile(admin, data.user.id);
  if (!profile) {
    res.status(500).json({ error: 'No se pudo cargar el perfil recién creado' });
    return;
  }

  res.status(200).json({
    session: { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at },
    user: publicUser(profile),
  });
}

// Login con contraseña — sin ningún paso de MFA, a diferencia del login de
// staff. Funciona para cualquier cuenta (no solo compradores) ya que no
// filtra por rol: un miembro de staff que también compra para sí mismo
// puede usar esta misma app sin fricción. Precisamente porque también sirve
// para autenticar cuentas de staff (cuya contraseña es la mitad de su
// credencial elevada), reusa el mismo rate limiting de
// check_login_allowed/record_login_attempt (0042) que ya protege el login
// de staff — sin esto, este endpoint sería una vía sin fricción para
// adivinar la contraseña de una cuenta staff (el segundo factor la
// protegería de todos modos en las acciones reales, pero no debe depender
// solo de eso).
async function login(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const admin = adminClient(e);
  const ip = clientIp(req);

  const { data: allowed, error: allowedError } = await admin.rpc('check_login_allowed', { p_email: email, p_ip: ip });
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

  res.status(200).json({
    session: { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at },
    user: publicUser(profile),
  });
}

// Login sin contraseña para un INVITADO de checkout (nunca antes tuvo
// cuenta) — shouldCreateUser: true, espeja requestGuestOtp/verifyGuestOtp
// de AuthContext.tsx. Al verificar, la cuenta ya existe (creada por
// Supabase en el primer request) y queda con role='user' vía el trigger
// handle_new_user() — nunca necesita TOTP.
async function guestOtpRequest(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const { email, name } = req.body ?? {};
  if (typeof email !== 'string') {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  const auth = authClient(e);
  const { error } = await auth.auth.signInWithOtp({
    email,
    options: { data: typeof name === 'string' ? { name } : undefined, shouldCreateUser: true },
  });
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(200).json({ ok: true });
}

// Login sin contraseña para una cuenta YA EXISTENTE — shouldCreateUser:
// false, espeja requestLoginOtp/verifyLoginOtp. Un correo no registrado da
// error aquí (a propósito: nunca crea una cuenta nueva desde el formulario
// de login).
async function loginOtpRequest(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const { email } = req.body ?? {};
  if (typeof email !== 'string') {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  const auth = authClient(e);
  const { error } = await auth.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(200).json({ ok: true });
}

// Canjea el código de 6 dígitos de CUALQUIERA de los dos flujos de OTP de
// arriba (guest o login) — ambos usan type: 'email', el mismo canje sirve
// para los dos.
async function otpVerify(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const { email, code } = req.body ?? {};
  if (typeof email !== 'string' || typeof code !== 'string') {
    res.status(400).json({ error: 'email and code are required' });
    return;
  }

  const auth = authClient(e);
  const { data, error } = await auth.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error || !data.session || !data.user) {
    res.status(401).json({ errorCode: 'INVALID_OTP', error: 'Código incorrecto o expirado' });
    return;
  }

  const admin = adminClient(e);
  const profile = await loadStaffProfile(admin, data.user.id);
  if (!profile) {
    res.status(401).json({ error: 'No se pudo cargar el perfil' });
    return;
  }

  res.status(200).json({
    session: { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at },
    user: publicUser(profile),
  });
}

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
    session: { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at },
  });
}

// Recuperación de contraseña por CÓDIGO, no por link — un link con el token
// en el fragmento de la URL (#access_token=...) solo lo puede procesar un
// navegador con el SDK de Supabase corriendo ahí (ver ResetPasswordPage.tsx
// en la web); una app nativa nunca lo recibe. Requiere que la plantilla de
// correo "Recovery" en el dashboard de Supabase incluya {{ .Token }} (el
// código de 6 dígitos), no solo el link — esto NO se puede configurar
// desde este código, es un cambio manual de configuración en Supabase.
async function passwordResetRequest(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const { email } = req.body ?? {};
  if (typeof email !== 'string') {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  const auth = authClient(e);
  await auth.auth.resetPasswordForEmail(email);
  // Siempre 200, exista o no la cuenta — no revelar qué correos están
  // registrados.
  res.status(200).json({ ok: true });
}

async function passwordResetVerify(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const { email, code, newPassword } = req.body ?? {};
  if (typeof email !== 'string' || typeof code !== 'string' || typeof newPassword !== 'string') {
    res.status(400).json({ error: 'email, code and newPassword are required' });
    return;
  }

  const auth = authClient(e);
  const { data, error } = await auth.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (error || !data.session || !data.user) {
    res.status(401).json({ errorCode: 'INVALID_OTP', error: 'Código incorrecto o expirado' });
    return;
  }

  const { error: updateError } = await auth.auth.updateUser({ password: newPassword });
  if (updateError) {
    res.status(400).json({ error: updateError.message });
    return;
  }

  const admin = adminClient(e);
  const profile = await loadStaffProfile(admin, data.user.id);
  res.status(200).json({
    session: { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at },
    user: profile ? publicUser(profile) : null,
  });
}

// Igual que en api/mobile/auth/[...action].ts y api/mobile/events/[eventId]/
// [...action].ts: la acción se lee del path crudo, no de req.query — evita
// la inconsistencia observada entre versiones de la CLI de Vercel al
// nombrar el parámetro de una ruta catch-all en desarrollo local.
const ROUTE_PREFIX = '/api/mobile/buyer/auth/';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.url ?? '').split('?')[0];
  const idx = path.indexOf(ROUTE_PREFIX);
  const route = idx >= 0 ? path.slice(idx + ROUTE_PREFIX.length).replace(/\/+$/, '') : '';

  switch (route) {
    case 'register':
      return register(req, res);
    case 'login':
      return login(req, res);
    case 'guest-otp-request':
      return guestOtpRequest(req, res);
    case 'login-otp-request':
      return loginOtpRequest(req, res);
    case 'otp-verify':
      return otpVerify(req, res);
    case 'refresh':
      return refresh(req, res);
    case 'password-reset-request':
      return passwordResetRequest(req, res);
    case 'password-reset-verify':
      return passwordResetVerify(req, res);
    default:
      res.status(404).json({ error: 'Not found' });
  }
}
