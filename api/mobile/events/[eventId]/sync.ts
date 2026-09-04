import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireEnv, adminClient, callerClient, bearerToken, requireCaller, sendRpcError } from '../../_supabase.js';

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
  const { scans } = req.body ?? {};
  if (typeof eventId !== 'string' || !Array.isArray(scans) || scans.length === 0 || scans.length > MAX_BATCH) {
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
