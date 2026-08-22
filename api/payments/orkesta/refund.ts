import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { orkestaFetch } from './_orkestaClient.js';

// Refunds a batch of tickets: DB-side cancellation happens first (via the
// existing refund_tickets RPC, unchanged, called as the caller so its own
// organization-membership/superadmin authorization keeps applying exactly
// as before), THEN — only for tickets whose order actually went through
// OrkestaPay — the proportional amount is refunded at the gateway. This
// order matters: if the gateway call fails after the DB side already
// cancelled the ticket, that's a support ticket to resolve manually; the
// reverse order (refund the money, then fail to cancel the ticket) would
// let someone keep a still-scannable ticket after getting their money
// back, which is fraud, not an ops inconvenience.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    res.status(500).json({ error: 'Server misconfigured: missing Supabase env vars' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }
  const callerToken = authHeader.slice('Bearer '.length);

  const { ticketIds } = req.body ?? {};
  if (!Array.isArray(ticketIds) || ticketIds.length === 0 || !ticketIds.every((id) => typeof id === 'string')) {
    res.status(400).json({ error: 'ticketIds must be a non-empty array of strings' });
    return;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerData, error: callerError } = await serviceClient.auth.getUser(callerToken);
  if (callerError || !callerData.user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const { data: rows, error: rowsError } = await serviceClient
    .from('tickets')
    .select('id, status')
    .in('id', ticketIds);

  if (rowsError || !rows) {
    res.status(500).json({ error: rowsError?.message || 'Could not load tickets' });
    return;
  }

  // A 'used' ticket is never eligible — reject the whole batch, matching
  // refund_tickets' own all-or-nothing behavior (it errors out entirely if
  // any ticket in the batch isn't 'valid'). An already-'cancelled' ticket
  // is treated differently: silently excluded rather than rejected, which
  // is what makes retrying this same request safe after a prior partial
  // success (those tickets are simply skipped, never double-refunded).
  const used = (rows as any[]).filter((r) => r.status === 'used');
  if (used.length > 0) {
    res.status(400).json({ error: `${used.length} boleto(s) ya fueron usados y no se pueden reembolsar` });
    return;
  }
  const toCancel = (rows as any[]).filter((r) => r.status === 'valid').map((r) => r.id as string);

  if (toCancel.length > 0) {
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${callerToken}` } },
    });
    const { error: refundError } = await callerClient.rpc('refund_tickets', { p_ticket_ids: toCancel });
    if (refundError) {
      res.status(400).json({ error: refundError.message });
      return;
    }
  }

  // Re-read unit_price for exactly the tickets we just cancelled (frozen at
  // purchase time on order_items, same value refund_tickets itself
  // credits), grouped by order, to compute each order's gateway refund.
  const { data: priced } = await serviceClient
    .from('tickets')
    .select('id, order_id, ticket_type_id, orders(payment_provider, orkesta_payment_id)')
    .in('id', toCancel.length > 0 ? toCancel : ['00000000-0000-0000-0000-000000000000']);

  const byOrder = new Map<string, { paymentId: string; ticketIds: string[]; ticketTypeIds: string[] }>();
  for (const t of (priced as any[]) ?? []) {
    const provider = t.orders?.payment_provider;
    const paymentId = t.orders?.orkesta_payment_id;
    if (provider !== 'orkestapay' || !paymentId) continue; // taquilla/free — nothing to reverse at a gateway
    const entry = byOrder.get(t.order_id) ?? { paymentId, ticketIds: [], ticketTypeIds: [] };
    entry.ticketIds.push(t.id);
    entry.ticketTypeIds.push(t.ticket_type_id);
    byOrder.set(t.order_id, entry);
  }

  const orkestaRefunds: { orderId: string; paymentId: string; amount: number; error?: string }[] = [];

  for (const [orderId, entry] of byOrder) {
    const { data: orderItems } = await serviceClient
      .from('order_items')
      .select('ticket_type_id, unit_price')
      .eq('order_id', orderId)
      .in('ticket_type_id', entry.ticketTypeIds);

    const priceByType = new Map<string, number>((orderItems ?? []).map((oi: any) => [oi.ticket_type_id, Number(oi.unit_price)]));
    const subtotal = entry.ticketTypeIds.reduce((sum, typeId) => sum + (priceByType.get(typeId) ?? 0), 0);
    const amount = Math.round(subtotal * 1.08 * 100) / 100; // fee-inclusive, matching what OrkestaPay actually captured

    const idempotencyKey = createHash('sha256').update([...entry.ticketIds].sort().join(',')).digest('hex');

    try {
      await orkestaFetch(`/v1/payments/${entry.paymentId}/refund`, {
        method: 'POST',
        idempotencyKey,
        body: JSON.stringify({ amount, description: `MondoTicket: reembolso de ${entry.ticketIds.length} boleto(s), orden ${orderId}` }),
      });
      orkestaRefunds.push({ orderId, paymentId: entry.paymentId, amount });
    } catch (err: any) {
      console.error('OrkestaPay refund failed', orderId, entry.paymentId, err);
      orkestaRefunds.push({ orderId, paymentId: entry.paymentId, amount, error: err?.message || 'Refund request failed' });
    }
  }

  res.status(200).json({ refundedTicketCount: toCancel.length, orkestaRefunds });
}
