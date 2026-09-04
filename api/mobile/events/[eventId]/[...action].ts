import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireEnv, adminClient, callerClient, bearerToken, requireCaller, sendRpcError } from '../../_supabase.js';

// Handles /api/mobile/events/:eventId/checkin, /manifest and /sync out of a
// single Vercel serverless function (a [...action] catch-all nested under
// the [eventId] dynamic segment) — the Hobby plan caps a deployment at 12
// functions total. The URLs, request/response shapes and behavior are
// unchanged from when each lived in its own file; only the physical file
// layout changed.

// The single validation endpoint: forwards straight to check_in_ticket,
// called with the caller's OWN JWT (never service-role) so auth.uid()/
// auth.jwt() inside the RPC see the real validador session — that's what
// makes the aal2/session-revocation checks in migration 0042 apply, and
// what makes ticket_scans.scanned_by attribute correctly. deviceId here is
// only a descriptive label recorded on ticket_scans/tickets.checked_in_device
// — revocation itself keys off auth.jwt()->>'session_id', a claim the
// caller can't omit or forge the way they could a body field, so leaving
// deviceId out of the request does NOT bypass a revoked session.
//
// Any business result (ok / already_used / cancelled / wrong_event /
// not_found — and the vestigial invalid_signature, kept only because a
// rotating-token QR could theoretically still be scanned) is HTTP 200. Only
// real failures (bad session, not staff for this event, MFA missing,
// session revoked, unexpected error) are HTTP errors.
async function checkin(req: VercelRequest, res: VercelResponse, eventId: string, token: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const { qrCode, deviceId } = req.body ?? {};
  if (typeof qrCode !== 'string') {
    res.status(400).json({ error: 'qrCode (body) is required' });
    return;
  }

  const admin = adminClient(e);
  const caller = await requireCaller(admin, token);
  if (!caller) {
    res.status(401).json({ errorCode: 'AUTH_REQUIRED', error: 'Invalid session' });
    return;
  }

  const rpcClient = callerClient(e, token);
  const { data, error } = await rpcClient.rpc('check_in_ticket', {
    p_qr_code: qrCode,
    p_event_id: eventId,
    p_device_id: typeof deviceId === 'string' ? deviceId : null,
  });
  if (error) {
    sendRpcError(res, error);
    return;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    res.status(500).json({ error: 'check_in_ticket returned no result' });
    return;
  }
  res.status(200).json({
    result: row.result,
    ticketId: row.ticket_id,
    ticketTypeName: row.ticket_type_name,
    seatLabel: row.seat_label,
    holderName: row.holder_name,
    checkedInAt: row.checked_in_at,
    checkedInByName: row.checked_in_by_name,
  });
}

// Downloads the gate manifest to prepare offline scanning — deliberately
// does NOT expose get_event_signing_key: that RPC only matters for the
// rotating-token QR scheme, which migration 0030 reverted (allow_static_qr
// is true for every ticket now, and no web component imports rotatingQr.ts
// anymore). Shipping that event-wide HMAC secret to a phone would be pure
// attack surface for a code format nothing produces. Offline verification
// only needs qrHash (SHA-256) — the manifest never carries the real
// qr_code, so a lost/stolen device can't leak a usable credential.
async function manifest(req: VercelRequest, res: VercelResponse, eventId: string, token: string) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const admin = adminClient(e);
  const caller = await requireCaller(admin, token);
  if (!caller) {
    res.status(401).json({ errorCode: 'AUTH_REQUIRED', error: 'Invalid session' });
    return;
  }

  const rpcClient = callerClient(e, token);
  const { data, error } = await rpcClient.rpc('get_event_gate_manifest', { p_event_id: eventId });
  if (error) {
    sendRpcError(res, error);
    return;
  }

  const rows = (data ?? []) as any[];
  res.status(200).json({
    // get_event_gate_manifest repeats now() on every row it returns, so an
    // event with zero tickets sold yet has no row to read it from — fall
    // back to this server's own clock rather than null, since the Android
    // app's manifest-TTL logic needs a real reference time either way.
    serverNow: rows[0]?.server_now ?? new Date().toISOString(),
    tickets: rows.map((r) => ({
      ticketId: r.ticket_id,
      status: r.status,
      ticketTypeName: r.ticket_type_name,
      seatLabel: r.seat_label,
      holderName: r.holder_name,
      qrHash: r.qr_hash,
    })),
  });
}

// Uploads a batch of offline scans. Forwards straight to sync_ticket_scans,
// which re-verifies every scan against the real ticket state server-side
// (the local offline resolution is only for instant on-screen feedback —
// see 0029_fix_offline_sync_trust.sql) and is idempotent per clientScanId,
// so retrying an unresolved batch after a timeout is always safe. Since
// migration 0042, one malformed row degrades to a single 'invalid_payload'
// result instead of rolling back the whole batch — so this handler only
// checks the array's shape, never individual fields: rejecting the whole
// request for one bad row here would defeat exactly the per-row resilience
// the RPC was written to provide. A malformed row (missing/wrong-typed
// field) is passed through as-is and degrades on the SQL side instead.
const MAX_BATCH = 500;

async function sync(req: VercelRequest, res: VercelResponse, eventId: string, token: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const { scans } = req.body ?? {};
  if (!Array.isArray(scans) || scans.length === 0 || scans.length > MAX_BATCH) {
    res.status(400).json({ error: `scans must be a non-empty array of at most ${MAX_BATCH} items` });
    return;
  }

  const admin = adminClient(e);
  const caller = await requireCaller(admin, token);
  if (!caller) {
    res.status(401).json({ errorCode: 'AUTH_REQUIRED', error: 'Invalid session' });
    return;
  }

  const rpcClient = callerClient(e, token);
  const { data, error } = await rpcClient.rpc('sync_ticket_scans', {
    p_event_id: eventId,
    p_scans: scans.map((s: any) => ({
      clientScanId: s?.clientScanId ?? null,
      qrCode: s?.qrCode ?? null,
      deviceId: s?.deviceId ?? null,
      scannedAt: s?.scannedAt ?? null,
    })),
  });
  if (error) {
    sendRpcError(res, error);
    return;
  }

  res.status(200).json({
    results: (data ?? []).map((r: any) => ({
      clientScanId: r.client_scan_id,
      ticketId: r.ticket_id,
      serverResult: r.server_result,
      conflict: r.conflict,
    })),
  });
}

// Read eventId/action straight off the request path rather than
// req.query: different Vercel CLI versions have named a catch-all
// segment's query key inconsistently in local dev (observed '...action'
// instead of 'action' on CLI 56.x) — parsing the URL directly sidesteps
// that entirely and behaves the same in dev and in production.
const ROUTE_PREFIX = '/api/mobile/events/';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.url ?? '').split('?')[0];
  const idx = path.indexOf(ROUTE_PREFIX);
  const rest = idx >= 0 ? path.slice(idx + ROUTE_PREFIX.length).replace(/\/+$/, '') : '';
  const [eventId, ...actionParts] = rest.split('/');
  const route = actionParts.join('/');

  if (!eventId) {
    res.status(400).json({ error: 'eventId is required' });
    return;
  }

  const token = bearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  switch (route) {
    case 'checkin':
      return checkin(req, res, eventId, token);
    case 'manifest':
      return manifest(req, res, eventId, token);
    case 'sync':
      return sync(req, res, eventId, token);
    default:
      res.status(404).json({ error: 'Not found' });
  }
}
