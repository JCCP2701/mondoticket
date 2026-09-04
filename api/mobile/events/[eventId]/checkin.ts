import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireEnv, adminClient, callerClient, bearerToken, requireCaller, sendRpcError } from '../../_supabase.js';

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
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

  const eventId = req.query.eventId;
  const { qrCode, deviceId } = req.body ?? {};
  if (typeof eventId !== 'string' || typeof qrCode !== 'string') {
    res.status(400).json({ error: 'eventId (route) and qrCode (body) are required' });
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
