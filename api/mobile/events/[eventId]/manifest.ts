import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireEnv, adminClient, callerClient, bearerToken, requireCaller, sendRpcError } from '../../_supabase.js';

// Downloads the gate manifest to prepare offline scanning — deliberately
// does NOT expose get_event_signing_key: that RPC only matters for the
// rotating-token QR scheme, which migration 0030 reverted (allow_static_qr
// is true for every ticket now, and no web component imports rotatingQr.ts
// anymore). Shipping that event-wide HMAC secret to a phone would be pure
// attack surface for a code format nothing produces. Offline verification
// only needs qrHash (SHA-256) — the manifest never carries the real
// qr_code, so a lost/stolen device can't leak a usable credential.
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

  const eventId = req.query.eventId;
  if (typeof eventId !== 'string') {
    res.status(400).json({ error: 'eventId is required' });
    return;
  }

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
