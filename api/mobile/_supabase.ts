import type { VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Shared helpers for /api/mobile/*. Filename starts with "_" so Vercel does
// not turn this into its own route (same convention as
// api/payments/orkesta/_orkestaClient.ts).

export interface Env {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
}

export function env(): Env | null {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  return { supabaseUrl, anonKey, serviceRoleKey };
}

// Same env() check + 500 response, written once so every handler reports the
// exact same message instead of hand-copied variants drifting apart.
export function requireEnv(res: VercelResponse): Env | null {
  const e = env();
  if (!e) {
    res.status(500).json({ error: 'Server misconfigured: missing Supabase env vars' });
    return null;
  }
  return e;
}

// Resolves identity (auth.getUser) and reads profiles/organization_members
// without depending on RLS. NEVER use this client to call check_in_ticket,
// sync_ticket_scans, get_event_gate_manifest, undo_check_in or
// register_mobile_device — those RPCs read auth.uid()/auth.jwt(), which are
// NULL/empty under the service-role key, so they'd fail outright (or, worse,
// misattribute ticket_scans.scanned_by to nobody).
export function adminClient(e: Env): SupabaseClient {
  return createClient(e.supabaseUrl, e.serviceRoleKey);
}

// Scoped to the caller's own JWT via a plain Authorization header — this is
// enough for .from()/.rpc() calls (PostgREST reads the header directly), so
// any SECURITY DEFINER RPC that depends on auth.uid()/auth.jwt() gets the
// real caller's identity and its own authorization checks stay the single
// source of truth, exactly like the web app's supabase.rpc(...) calls.
// persistSession/autoRefreshToken off: this client lives only for the
// duration of one serverless invocation, never touches storage/timers.
//
// Do NOT use this for supabase.auth.mfa.* calls (see sessionClient below) —
// the auth/GoTrue submodule manages its own in-memory session state and
// ignores this global header entirely; it needs an explicit setSession().
export function callerClient(e: Env, accessToken: string): SupabaseClient {
  return createClient(e.supabaseUrl, e.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Bare client for auth steps that don't have a full session yet
// (signInWithPassword, refreshSession).
export function authClient(e: Env): SupabaseClient {
  return createClient(e.supabaseUrl, e.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

// For supabase.auth.mfa.* calls (listFactors/enroll/challengeAndVerify).
// The GoTrue client resolves "who is calling" from its own loaded session,
// not from a global Authorization header, so it must be primed with
// setSession({access_token, refresh_token}) — both required and non-empty,
// or auth-js returns AuthSessionMissingError.
export async function sessionClient(e: Env, accessToken: string, refreshToken: string) {
  const client = authClient(e);
  const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) return null;
  return client;
}

export function bearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length);
}

// Client IP, best-effort, for login rate limiting — Vercel populates
// x-forwarded-for with the real client IP first in the list.
export function clientIp(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  return first?.split(',')[0]?.trim() || null;
}

// Every RPC in this repo raises `'CODE: human message'` (errcode P0001 by
// convention, not enforced by Postgres). Map the leading CODE to an HTTP
// status so the Android app gets consistent, typed errors. Codes we don't
// recognize (a raw Postgres error, a timeout, a deadlock — anything that
// isn't one of our own `raise exception 'CODE: ...'`s) default to 500, not
// 400: an unrecognized failure is exactly the "unexpected server error"
// case docs/mobile-api.md documents as 500, and treating it as a 400 would
// tell the Android app a transient server problem was a bad request.
const STATUS_BY_CODE: Record<string, number> = {
  AUTH_REQUIRED: 401,
  MFA_REQUIRED: 401,
  FORBIDDEN: 403,
  DEVICE_REVOKED: 403,
  NOT_FOUND: 404,
  INVALID_STATUS: 409,
};

export function mapRpcError(error: { message: string }): { status: number; errorCode: string; message: string } {
  const idx = error.message.indexOf(':');
  const code = idx > 0 && /^[A-Z_]+$/.test(error.message.slice(0, idx)) ? error.message.slice(0, idx) : 'INTERNAL';
  return { status: STATUS_BY_CODE[code] ?? 500, errorCode: code, message: error.message };
}

// Shared by every handler that forwards an RPC error straight to the HTTP
// response — kept in one place so all of them report the identical shape.
export function sendRpcError(res: VercelResponse, error: { message: string }): void {
  const mapped = mapRpcError(error);
  res.status(mapped.status).json({ errorCode: mapped.errorCode, error: mapped.message });
}

// Resolves the caller's identity from a bearer token via the service-role
// client. Used by every mobile handler that isn't already going through an
// RPC call (which would 401 with AUTH_REQUIRED on its own) — this is the
// only path that needs its own explicit check.
export async function requireCaller(admin: SupabaseClient, token: string): Promise<{ id: string } | null> {
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// Registers the caller's current session so it becomes revocable later
// (register_mobile_device upserts by the session_id embedded in the JWT,
// never by deviceId — see migration 0042). Called on EVERY successful
// login/verify-mfa, regardless of whether the app sent a deviceId: if this
// were skipped whenever deviceId is omitted, that session would have no row
// to revoke at all, quietly defeating the "lost/stolen device" story this
// migration exists for. deviceId/deviceLabel are optional purely as a
// human-readable tag for whoever revokes it later — never a precondition
// for the session being revocable. Not fatal to login: the actual security
// boundary is aal2 + session revocation, not this label, so a failure here
// is logged, not surfaced to the client.
export async function registerSession(
  e: Env,
  accessToken: string,
  deviceId: unknown,
  deviceLabel: unknown
): Promise<void> {
  const caller = callerClient(e, accessToken);
  const { error } = await caller.rpc('register_mobile_device', {
    p_device_id: typeof deviceId === 'string' ? deviceId : null,
    p_device_label: typeof deviceLabel === 'string' ? deviceLabel : null,
  });
  if (error) {
    console.error('register_mobile_device failed', error.message);
  }
}

export type StaffProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  mfaExempt: boolean;
  organizations: { id: string; name: string }[];
};

// Roles allowed to scan tickets, identical to is_event_gate_staff() in SQL
// (0025_ticket_checkin.sql) plus superadmin — kept in lockstep on purpose so
// the API's 403 never drifts from the RPC's own authorization.
export const GATE_STAFF_ROLES = ['organization', 'taquilla', 'validador'];

export function isGateStaff(profile: Pick<StaffProfile, 'role'>): boolean {
  return GATE_STAFF_ROLES.includes(profile.role) || profile.role === 'superadmin';
}

// Same rule as mfaRequired() in src/app/context/AuthContext.tsx: every role
// except 'user' needs a verified TOTP factor, unless mfa_exempt. Gate-staff
// callers are never 'user', so in practice this is just "not mfa_exempt".
export function mfaRequired(profile: Pick<StaffProfile, 'role' | 'mfaExempt'>): boolean {
  return profile.role !== 'user' && !profile.mfaExempt;
}

export async function loadStaffProfile(admin: SupabaseClient, userId: string): Promise<StaffProfile | null> {
  const { data, error } = await admin
    .from('profiles')
    .select('id, name, email, role, mfa_exempt, organization_members(organization_id, organizations(id, name))')
    .eq('id', userId)
    .single();
  if (error || !data) return null;

  const organizations = ((data as any).organization_members ?? [])
    .map((m: any) => m.organizations)
    .filter(Boolean)
    .map((o: any) => ({ id: o.id, name: o.name }));

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    mfaExempt: data.mfa_exempt ?? false,
    organizations,
  };
}
