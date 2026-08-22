import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Webhook } from 'svix';

// OrkestaPay's authoritative confirmation that money actually moved — the
// only place confirm_order_paid/do_release_order ever get called from.
// Never trust the browser's redirect back to completed_redirect_url on its
// own; that's UX, this is truth.
//
// Svix signs the RAW request body. @vercel/node replays the exact original
// bytes to any req.on('data'/'end') listener (see restoreBody/readBody in
// its dev-server/serverless-handler helpers) — so we read the body that
// way, never via req.body, which is a separately (lazily) parsed object
// that must never be re-serialized for signature verification.
function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (c) => chunks.push((Buffer.isBuffer(c) ? c : Buffer.from(c)) as Uint8Array));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookSecret = process.env.ORKESTA_WEBHOOK_SECRET;
  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    res.status(500).json({ error: 'Server misconfigured: missing Supabase or OrkestaPay env vars' });
    return;
  }

  const rawBody = await readRawBody(req);
  const svixId = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];
  if (typeof svixId !== 'string' || typeof svixTimestamp !== 'string' || typeof svixSignature !== 'string') {
    res.status(400).json({ error: 'Missing Svix headers' });
    return;
  }

  let event: any;
  try {
    event = new Webhook(webhookSecret).verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch {
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  // Defense in depth against Svix redelivery, independent of the
  // "already paid -> no-op" check inside confirm_order_paid.
  const { data: existingEvent } = await serviceClient
    .from('payment_webhook_events')
    .select('id, processed_at')
    .eq('svix_id', svixId)
    .maybeSingle();

  if (existingEvent?.processed_at) {
    res.status(200).json({ received: true });
    return;
  }

  const payment = event?.data?.payment;
  const orkestaOrderId = payment?.order_id;

  if (!existingEvent) {
    await serviceClient.from('payment_webhook_events').insert({
      svix_id: svixId,
      event_type: event?.event_type || 'unknown',
      payload: event,
    });
  }

  if (!orkestaOrderId) {
    await serviceClient.from('payment_webhook_events').update({ processed_at: new Date().toISOString() }).eq('svix_id', svixId);
    res.status(200).json({ received: true });
    return;
  }

  const { data: order } = await serviceClient.from('orders').select('id, status').eq('orkesta_order_id', orkestaOrderId).maybeSingle();
  if (!order) {
    // Likely a race: create-checkout hasn't finished writing
    // orkesta_order_id yet. A non-2xx here lets Svix's own retry/backoff
    // schedule self-heal — do NOT mark this event processed.
    res.status(404).json({ error: 'Unknown order for this OrkestaPay order_id' });
    return;
  }

  await serviceClient.from('payment_webhook_events').update({ order_id: order.id }).eq('svix_id', svixId);

  try {
    if (event.event_type === 'payment.purchase' || event.event_type === 'payment.capture') {
      if (order.status === 'pending') {
        const amount = Number(payment.amount?.captured ?? payment.amount?.authorized);
        const { error } = await serviceClient.rpc('confirm_order_paid', {
          p_order_id: order.id,
          p_orkesta_payment_id: payment.payment_id,
          p_amount: amount,
        });
        if (error) throw error;
      }
    } else if (event.event_type === 'payment.cancel') {
      if (order.status === 'pending') {
        const { error } = await serviceClient.rpc('do_release_order', { p_order_id: order.id });
        if (error) throw error;
      }
    }
    // payment.authorize / payment.refund: acknowledged, no action. Our
    // hosted checkout is one-shot purchase (auto-capture), so an
    // authorize-only event with no matching capture shouldn't mint
    // tickets; refunds are driven synchronously by
    // api/payments/orkesta/refund.ts, not this async echo.
  } catch (err: any) {
    console.error('OrkestaPay webhook processing failed', order.id, event.event_type, err);
    res.status(500).json({ error: 'Failed to process webhook' });
    return;
  }

  await serviceClient.from('payment_webhook_events').update({ processed_at: new Date().toISOString() }).eq('svix_id', svixId);
  res.status(200).json({ received: true });
}
