import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  requireEnv,
  adminClient,
  callerClient,
  bearerToken,
  requireCaller,
  sendRpcError,
  loadStaffProfile,
  isSalesStaff,
  type StaffProfile,
} from '../../_supabase.js';

// Handles /api/mobile/events/:eventId/checkin, /manifest, /sync (validador)
// and /ticket-types, /seats, /seats/hold, /seats/release, /sell (taquilla)
// out of a single Vercel serverless function (a [...action] catch-all
// nested under the [eventId] dynamic segment) — the Hobby plan caps a
// deployment at 12 functions total. The URLs, request/response shapes and
// behavior are unchanged from when each first lived in its own file; only
// the physical file layout changed.

// Shared by every taquilla (sales) action below — resolves identity AND
// confirms the role is allowed to sell, in one place, so the three sales
// endpoints don't each hand-roll the same two-step check (and risk drifting
// on which HTTP status/errorCode goes with which failure, the way the four
// validador actions above already independently repeat their own simpler
// version of this).
async function requireSalesStaff(
  admin: SupabaseClient,
  token: string
): Promise<{ profile: StaffProfile } | { status: number; body: Record<string, unknown> }> {
  const caller = await requireCaller(admin, token);
  if (!caller) {
    return { status: 401, body: { errorCode: 'AUTH_REQUIRED', error: 'Invalid session' } };
  }
  const profile = await loadStaffProfile(admin, caller.id);
  if (!profile) {
    return { status: 401, body: { error: 'Invalid session' } };
  }
  if (!isSalesStaff(profile)) {
    return { status: 403, body: { errorCode: 'NOT_SALES_STAFF', error: 'Esta cuenta no tiene permiso para vender boletos' } };
  }
  return { profile };
}

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

// Lists ticket types for the event picker in the taquilla sale screen —
// name, price, and live availability. event_ticket_types is publicly
// readable (RLS "anyone can read ticket types", 0002_rls.sql), so reading
// via the admin client here is a convenience, not a bypass — identical
// precedent to events/index.ts.
async function ticketTypes(req: VercelRequest, res: VercelResponse, eventId: string, token: string) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const admin = adminClient(e);
  const check = await requireSalesStaff(admin, token);
  if ('status' in check) {
    res.status(check.status).json(check.body);
    return;
  }

  const { data, error } = await admin
    .from('event_ticket_types')
    .select('id, name, price, capacity, sold, has_seat_map')
    .eq('event_id', eventId)
    .order('sort_order');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({
    ticketTypes: (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      capacity: t.capacity,
      sold: t.sold,
      available: t.capacity - t.sold,
      hasSeatMap: t.has_seat_map,
    })),
  });
}

// Seat map for one ticket type (only meaningful when hasSeatMap is true).
// event_seats is publicly readable (RLS "anyone can read event seats",
// 0009_event_seats_rls.sql) — same convenience-read precedent as above.
// heldByMe lets the app treat "I already hold this seat" as sellable
// without needing realtime/websockets the way the web SeatMapPicker does.
async function seats(req: VercelRequest, res: VercelResponse, eventId: string, token: string) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const admin = adminClient(e);
  const check = await requireSalesStaff(admin, token);
  if ('status' in check) {
    res.status(check.status).json(check.body);
    return;
  }

  const ticketTypeId = req.query.ticketTypeId;
  if (typeof ticketTypeId !== 'string') {
    res.status(400).json({ error: 'ticketTypeId query param is required' });
    return;
  }

  const { data, error } = await admin
    .from('event_seats')
    .select('id, row_label, seat_number, row_index, col_index, section, status, held_by')
    .eq('event_id', eventId)
    .eq('ticket_type_id', ticketTypeId)
    .order('row_index')
    .order('col_index');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({
    seats: (data ?? []).map((s: any) => ({
      id: s.id,
      rowLabel: s.row_label,
      seatNumber: s.seat_number,
      rowIndex: s.row_index,
      colIndex: s.col_index,
      section: s.section,
      status: s.status,
      heldByMe: s.held_by === check.profile.id,
    })),
  });
}

// Holds seats for 5 minutes (hold_event_seats) so a taquilla operator can
// confirm a sale without losing the seat to another counter mid-sale. Must
// be called with the caller's own JWT (callerClient, never service-role) —
// held_by is auth.uid() inside the RPC.
async function holdSeats(req: VercelRequest, res: VercelResponse, eventId: string, token: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const { seatIds } = req.body ?? {};
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    res.status(400).json({ error: 'seatIds must be a non-empty array' });
    return;
  }

  const admin = adminClient(e);
  const check = await requireSalesStaff(admin, token);
  if ('status' in check) {
    res.status(check.status).json(check.body);
    return;
  }

  const rpcClient = callerClient(e, token);
  const { data, error } = await rpcClient.rpc('hold_event_seats', { p_event_id: eventId, p_seat_ids: seatIds });
  if (error) {
    sendRpcError(res, error);
    return;
  }

  res.status(200).json({
    seats: (data ?? []).map((s: any) => ({ seatId: s.seat_id, holdExpiresAt: s.hold_expires_at })),
  });
}

// Releases seats a taquilla operator no longer wants (customer changed
// their mind, or reduced quantity) — frees them for other counters
// immediately instead of waiting out the 5-minute hold.
async function releaseSeats(req: VercelRequest, res: VercelResponse, eventId: string, token: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const { seatIds } = req.body ?? {};
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    res.status(400).json({ error: 'seatIds must be a non-empty array' });
    return;
  }

  const admin = adminClient(e);
  const check = await requireSalesStaff(admin, token);
  if ('status' in check) {
    res.status(check.status).json(check.body);
    return;
  }

  const rpcClient = callerClient(e, token);
  const { error } = await rpcClient.rpc('release_event_seats', { p_seat_ids: seatIds });
  if (error) {
    sendRpcError(res, error);
    return;
  }

  res.status(200).json({ ok: true });
}

// Confirms a taquilla sale: forwards to create_order_and_tickets with
// p_sales_channel/p_user_id fixed server-side (never trust the client for
// these — 'taquilla' and null match exactly what the web TaquillaDashboard
// always sends), called with the caller's own JWT so auth.uid() attributes
// orders.sold_by correctly and the aal2/session-revocation checks (0043)
// apply. paymentMethod is purely a label (this system has no real payment
// terminal integration for in-person sales — payment happens outside it,
// same as the web flow) folded into payment_reference deterministically
// from idempotencyKey, so retrying the exact same request never produces a
// different reference. Returns the created tickets (with qrCode) in the
// same response so the app can show/print them immediately — the web
// dashboard never did this (a real gap fixed here, not carried over).
async function sell(req: VercelRequest, res: VercelResponse, eventId: string, token: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const e = requireEnv(res);
  if (!e) return;

  const { items, seatIds, customerName, customerEmail, paymentMethod, idempotencyKey } = req.body ?? {};
  const hasItems = Array.isArray(items) && items.length > 0;
  const hasSeats = Array.isArray(seatIds) && seatIds.length > 0;
  if (!hasItems && !hasSeats) {
    res.status(400).json({ error: 'items or seatIds must be a non-empty array' });
    return;
  }
  if (paymentMethod !== 'cash' && paymentMethod !== 'card') {
    res.status(400).json({ error: "paymentMethod must be 'cash' or 'card'" });
    return;
  }
  if (typeof idempotencyKey !== 'string') {
    res.status(400).json({ error: 'idempotencyKey is required' });
    return;
  }

  const admin = adminClient(e);
  const check = await requireSalesStaff(admin, token);
  if ('status' in check) {
    res.status(check.status).json(check.body);
    return;
  }

  const { data: eventRow, error: eventError } = await admin
    .from('events')
    .select('organization_id')
    .eq('id', eventId)
    .single();
  if (eventError || !eventRow) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const rpcClient = callerClient(e, token);
  const { data: orderId, error } = await rpcClient.rpc('create_order_and_tickets', {
    p_event_id: eventId,
    p_organization_id: (eventRow as any).organization_id,
    p_user_id: null,
    p_customer_name: typeof customerName === 'string' && customerName ? customerName : 'Venta en taquilla',
    p_customer_email: typeof customerEmail === 'string' && customerEmail ? customerEmail : 'sin-correo@taquilla.local',
    p_customer_phone: null,
    p_payment_reference: `taquilla_mobile_${paymentMethod}_${idempotencyKey}`,
    p_items: hasItems
      ? items.map((i: any) => ({ ticket_type_id: i?.ticketTypeId ?? null, quantity: i?.quantity ?? null }))
      : null,
    p_seat_ids: hasSeats ? seatIds : null,
    p_sales_channel: 'taquilla',
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    sendRpcError(res, error);
    return;
  }

  // Convenience read via admin client, not a fresh authorization decision:
  // the RPC above already just authorized this exact caller for this exact
  // order. tickets.qr_code is what the app needs to show/print right away.
  const { data: ticketRows, error: ticketsError } = await admin
    .from('tickets')
    .select('id, qr_code, event_ticket_types(name), event_seats(row_label, seat_number)')
    .eq('order_id', orderId);
  if (ticketsError) {
    res.status(500).json({ error: `Order created but failed to load tickets: ${ticketsError.message}` });
    return;
  }

  res.status(200).json({
    orderId,
    tickets: (ticketRows ?? []).map((t: any) => ({
      ticketId: t.id,
      qrCode: t.qr_code,
      ticketTypeName: t.event_ticket_types?.name ?? null,
      seatLabel: t.event_seats ? `${t.event_seats.row_label}-${t.event_seats.seat_number}` : null,
    })),
  });
}

// Read eventId/action straight off the request path rather than
// req.query: different Vercel CLI versions have named a catch-all
// segment's query key inconsistently in local dev (observed '...action'
// instead of 'action' on CLI 56.x) — parsing the URL directly sidesteps
// that entirely and behaves the same in dev and in production.
//
// Keep every case below to a single path segment (no slash) — `vercel dev`
// (observed on CLI 56.x) 404s at the platform level, before this function
// ever runs, for any request more than one segment past :eventId (e.g.
// .../seats/hold), regardless of how `route` is computed here. Untested
// whether that's dev-only or also true in production; single-segment
// action names (hold-seats, not seats/hold) sidestep the question entirely.
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
    case 'ticket-types':
      return ticketTypes(req, res, eventId, token);
    case 'seats':
      return seats(req, res, eventId, token);
    case 'hold-seats':
      return holdSeats(req, res, eventId, token);
    case 'release-seats':
      return releaseSeats(req, res, eventId, token);
    case 'sell':
      return sell(req, res, eventId, token);
    default:
      res.status(404).json({ error: 'Not found' });
  }
}
