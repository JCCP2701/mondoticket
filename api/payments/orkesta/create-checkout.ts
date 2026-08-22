import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { orkestaFetch } from './_orkestaClient.js';

// Turns an already-reserved ('pending') order into an OrkestaPay hosted
// Checkout and hands back the URL to redirect the buyer's browser to.
// OrkestaPay collects card/SPEI/cash and 3DS on their own page — we never
// see card data. The amount charged is always computed here, from the
// order's own server-side total, never trusted from the browser.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicSiteUrl = process.env.PUBLIC_SITE_URL;
  if (!supabaseUrl || !serviceRoleKey || !publicSiteUrl || !process.env.ORKESTA_CLIENT_ID || !process.env.ORKESTA_CLIENT_SECRET || !process.env.ORKESTA_API_BASE_URL) {
    res.status(500).json({ error: 'Server misconfigured: missing Supabase or OrkestaPay env vars' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }
  const callerToken = authHeader.slice('Bearer '.length);

  const { orderId } = req.body ?? {};
  if (typeof orderId !== 'string') {
    res.status(400).json({ error: 'orderId is required' });
    return;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerData, error: callerError } = await serviceClient.auth.getUser(callerToken);
  if (callerError || !callerData.user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select(
      'id, user_id, organization_id, status, total, subtotal, currency, event_id, customer_name, customer_email, ' +
        'expires_at, orkesta_checkout_id, orkesta_order_id, ' +
        'order_items(quantity, unit_price, ticket_type_id, event_ticket_types(name))'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const { data: callerProfile } = await serviceClient.from('profiles').select('role').eq('id', callerData.user.id).single();
  const isOwner = (order as any).user_id === callerData.user.id;
  const isSuperadmin = callerProfile?.role === 'superadmin';
  if (!isOwner && !isSuperadmin) {
    res.status(403).json({ error: 'Not authorized to access this order' });
    return;
  }

  if ((order as any).status !== 'pending') {
    res.status(409).json({ error: 'Este pedido ya no está pendiente de pago' });
    return;
  }

  if ((order as any).expires_at && new Date((order as any).expires_at).getTime() < Date.now()) {
    res.status(410).json({ error: 'Tu reserva expiró, vuelve a seleccionar tus boletos' });
    return;
  }

  const total = Number((order as any).total);
  const subtotal = Number((order as any).subtotal);
  if (!(total > 0)) {
    res.status(400).json({ error: 'Esta orden no tiene un monto a cobrar' });
    return;
  }

  // Already has a checkout (retry/duplicate click) — reuse it instead of
  // minting a second one for the same reservation.
  if ((order as any).orkesta_checkout_id) {
    try {
      const existing = await orkestaFetch(`/v1/checkouts/${(order as any).orkesta_checkout_id}`, { method: 'GET' });
      res.status(200).json({ checkoutRedirectUrl: existing.checkout_redirect_url });
      return;
    } catch {
      // fall through and create a fresh one if the lookup fails
    }
  }

  const items = ((order as any).order_items ?? []) as Array<{ quantity: number; unit_price: number; ticket_type_id: string; event_ticket_types: { name: string } | null }>;
  const products = items.map((item) => ({
    product_id: item.ticket_type_id,
    name: item.event_ticket_types?.name || 'Boleto',
    quantity: item.quantity,
    unit_price: Number(item.unit_price),
  }));
  // A synthetic line for the service fee, computed as the remainder rather
  // than the stored service_fee column, so the line items always sum to
  // exactly `total` even if independent roundings of subtotal*1.08 and
  // subtotal*0.08 land on different cents.
  const serviceFeeLine = Math.round((total - subtotal) * 100) / 100;
  if (serviceFeeLine > 0) {
    products.push({ product_id: 'service_fee', name: 'Cargo por servicio', quantity: 1, unit_price: serviceFeeLine });
  }

  const [firstName, ...rest] = ((order as any).customer_name || 'Cliente').trim().split(/\s+/);
  const lastName = rest.join(' ') || firstName;

  let checkout: any;
  try {
    checkout = await orkestaFetch('/v1/checkouts', {
      method: 'POST',
      body: JSON.stringify({
        completed_redirect_url: `${publicSiteUrl}/ticket/${orderId}?orkesta=completed`,
        canceled_redirect_url: `${publicSiteUrl}/checkout/${(order as any).event_id}?orkesta=canceled&orderId=${orderId}`,
        locale: 'ES_LATAM',
        order: {
          merchant_order_id: `${orderId}-${Date.now()}`,
          currency: (order as any).currency || 'MXN',
          country_code: 'MX',
          total_amount: total,
          subtotal_amount: subtotal,
          products,
          customer: { email: (order as any).customer_email, first_name: firstName, last_name: lastName },
          expires_at: new Date((order as any).expires_at).getTime(), // OrkestaPay expects Unix milliseconds here, despite other timestamp fields in its docs being seconds
        },
      }),
    });
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'No se pudo crear el checkout con la pasarela de pago' });
    return;
  }

  // Guard against a race with the webhook: only persist if the order is
  // still the one we just read as 'pending'.
  const { data: updated } = await serviceClient
    .from('orders')
    .update({ orkesta_checkout_id: checkout.checkout_id, orkesta_order_id: checkout.order.order_id })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id');

  if (!updated || updated.length === 0) {
    res.status(409).json({ error: 'Este pedido ya no está pendiente de pago' });
    return;
  }

  res.status(200).json({ checkoutRedirectUrl: checkout.checkout_redirect_url });
}
