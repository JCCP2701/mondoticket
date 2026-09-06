import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireEnv, adminClient, callerClient, bearerToken, sendRpcError, requireCaller } from '../_supabase.js';

// API móvil para el comprador final (rol 'user'): navegar el catálogo
// público, reservar asientos, comprar (efectivo/cortesía instantáneo, o
// pago real vía OrkestaPay), y ver sus boletos ya comprados. Todo bajo un
// único catch-all — junto con api/mobile/buyer/auth/[...action].ts, son las
// únicas 2 funciones nuevas que suma esta API (el resto ya existía para
// validador/taquilla), para no acercarse al límite de 12 funciones del plan
// Hobby de Vercel.
//
// Regla de negocio: los boletos de cortesía (event_ticket_types.price = 0)
// los asigna la organización a mano (EventDetail.tsx, "Asignar Cortesía") —
// nunca deben ser visibles ni comprables desde esta app. ticketTypes()
// los excluye del listado, y checkout()/buyFree() los rechazan
// explícitamente aunque alguien arme el request a mano con un
// ticketTypeId de cortesía saltándose la UI.

// Catálogo público de eventos — sin autenticación, igual que la landing
// page web. event_ticket_types se trae embebido solo para calcular el
// rango de precio "desde"; se excluyen los de cortesía (price = 0) del
// cálculo para no anunciar como "gratis" un evento que en realidad cuesta.
async function events(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const admin = adminClient(e);
  const { data, error } = await admin
    .from('events')
    .select('id, name, event_date, category, image_url, status, organizations(name), venues(name), event_ticket_types(price)')
    .in('status', ['upcoming', 'ongoing'])
    .order('event_date');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({
    events: (data ?? []).map((ev: any) => {
      const paidPrices = (ev.event_ticket_types ?? []).map((t: any) => Number(t.price)).filter((p: number) => p > 0);
      return {
        id: ev.id,
        name: ev.name,
        eventDate: ev.event_date,
        category: ev.category,
        imageUrl: ev.image_url,
        organizationName: ev.organizations?.name ?? null,
        venueName: ev.venues?.name ?? null,
        priceFrom: paidPrices.length > 0 ? Math.min(...paidPrices) : null,
      };
    }),
  });
}

// Tipos de boleto de un evento — público, sin autenticación. Excluye
// cortesías (price = 0) por completo: la app del comprador nunca debe
// ofrecerlas como opción de compra.
async function ticketTypes(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const eventId = req.query.eventId;
  if (typeof eventId !== 'string') {
    res.status(400).json({ error: 'eventId query param is required' });
    return;
  }

  const admin = adminClient(e);
  const { data, error } = await admin
    .from('event_ticket_types')
    .select('id, name, description, price, capacity, sold, has_seat_map')
    .eq('event_id', eventId)
    .gt('price', 0)
    .order('sort_order');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({
    ticketTypes: (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      price: t.price,
      available: t.capacity - t.sold,
      hasSeatMap: t.has_seat_map,
    })),
  });
}

// Mapa de asientos — público (mismo criterio que ticket-types), pero
// heldByMe solo tiene sentido si hay sesión: se resuelve el caller si viene
// un Bearer, sin exigirlo.
async function seats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const eventId = req.query.eventId;
  const ticketTypeId = req.query.ticketTypeId;
  if (typeof eventId !== 'string' || typeof ticketTypeId !== 'string') {
    res.status(400).json({ error: 'eventId and ticketTypeId query params are required' });
    return;
  }

  const admin = adminClient(e);
  let callerId: string | null = null;
  const token = bearerToken(req.headers.authorization);
  if (token) {
    const caller = await requireCaller(admin, token);
    callerId = caller?.id ?? null;
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
      heldByMe: callerId !== null && s.held_by === callerId,
    })),
  });
}

async function holdSeats(req: VercelRequest, res: VercelResponse, token: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const { eventId, seatIds } = req.body ?? {};
  if (typeof eventId !== 'string' || !Array.isArray(seatIds) || seatIds.length === 0) {
    res.status(400).json({ error: 'eventId and a non-empty seatIds array are required' });
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

async function releaseSeats(req: VercelRequest, res: VercelResponse, token: string) {
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

  const rpcClient = callerClient(e, token);
  const { error } = await rpcClient.rpc('release_event_seats', { p_seat_ids: seatIds });
  if (error) {
    sendRpcError(res, error);
    return;
  }
  res.status(200).json({ ok: true });
}

// Confirma que ningún ticketTypeId (directo en items, o indirecto vía el
// ticket_type_id de cada seatId) sea de cortesía (price = 0) — cierra la
// puerta a que alguien arme el request a mano saltándose el filtro de
// ticketTypes(). Devuelve null si todo está bien. Falla CERRADO, no
// abierto: si cualquiera de las dos consultas da error, se bloquea la
// compra igual que si fuera cortesía — esta función es la única barrera
// real entre un ticketTypeId de cortesía y create_order_and_tickets/
// reserve_order (ninguno de los dos RPC rechaza price=0 por sí solo, solo
// limitan un CONTEO agregado de cortesías), así que un error aquí no puede
// interpretarse silenciosamente como "no es cortesía".
async function findCourtesyAttempt(
  admin: SupabaseClient,
  items: any[],
  seatIds: string[]
): Promise<{ status: number; errorCode: string; message: string } | null> {
  const directIds = items.map((i) => i?.ticketTypeId).filter((id): id is string => typeof id === 'string');
  const seatTypeIds: string[] = [];
  if (seatIds.length > 0) {
    const { data, error } = await admin.from('event_seats').select('ticket_type_id').in('id', seatIds);
    if (error) {
      return { status: 500, errorCode: 'INTERNAL', message: 'No se pudo validar los asientos seleccionados' };
    }
    for (const row of data ?? []) if (row.ticket_type_id) seatTypeIds.push(row.ticket_type_id);
  }
  const allIds = Array.from(new Set([...directIds, ...seatTypeIds]));
  if (allIds.length === 0) return null;

  const { data: types, error } = await admin.from('event_ticket_types').select('id, price').in('id', allIds);
  if (error) {
    return { status: 500, errorCode: 'INTERNAL', message: 'No se pudo validar los tipos de boleto seleccionados' };
  }
  const hasCourtesy = (types ?? []).some((t: any) => Number(t.price) === 0);
  return hasCourtesy
    ? {
        status: 403,
        errorCode: 'COURTESY_NOT_PURCHASABLE',
        message: 'Este tipo de boleto es una cortesía y solo la organización puede asignarla — no está disponible para compra.',
      }
    : null;
}

function buildItemsAndSeatIds(body: any): { items: any[] | null; seatIds: string[] | null; hasItems: boolean; hasSeats: boolean } {
  const items = Array.isArray(body?.items) ? body.items : null;
  const seatIds = Array.isArray(body?.seatIds) ? body.seatIds : null;
  return { items, seatIds, hasItems: !!items && items.length > 0, hasSeats: !!seatIds && seatIds.length > 0 };
}

// Reserva la orden (pending) para pagar con OrkestaPay — wrapper de
// reserve_order. El siguiente paso, crear la sesión de pago, NO es un
// endpoint nuevo: la app llama directo a POST /api/payments/orkesta/
// create-checkout (ya existente, acepta el mismo Bearer) con { orderId }.
async function checkout(req: VercelRequest, res: VercelResponse, token: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const { eventId, customerName, customerEmail, customerPhone, idempotencyKey } = req.body ?? {};
  const { items, seatIds, hasItems, hasSeats } = buildItemsAndSeatIds(req.body);
  if (typeof eventId !== 'string' || (!hasItems && !hasSeats)) {
    res.status(400).json({ error: 'eventId and (items or seatIds) are required' });
    return;
  }
  if (typeof idempotencyKey !== 'string') {
    res.status(400).json({ error: 'idempotencyKey is required' });
    return;
  }

  const admin = adminClient(e);
  const caller = await requireCaller(admin, token);
  if (!caller) {
    res.status(401).json({ errorCode: 'AUTH_REQUIRED', error: 'Invalid session' });
    return;
  }

  const courtesyCheck = await findCourtesyAttempt(admin, items ?? [], seatIds ?? []);
  if (courtesyCheck) {
    res.status(courtesyCheck.status).json({ errorCode: courtesyCheck.errorCode, error: courtesyCheck.message });
    return;
  }

  const { data: eventRow, error: eventError } = await admin.from('events').select('organization_id').eq('id', eventId).single();
  if (eventError || !eventRow) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const rpcClient = callerClient(e, token);
  const { data: orderId, error } = await rpcClient.rpc('reserve_order', {
    p_event_id: eventId,
    p_organization_id: (eventRow as any).organization_id,
    p_user_id: caller.id,
    p_customer_name: typeof customerName === 'string' && customerName ? customerName : null,
    p_customer_email: typeof customerEmail === 'string' && customerEmail ? customerEmail : null,
    p_customer_phone: typeof customerPhone === 'string' && customerPhone ? customerPhone : null,
    p_items: hasItems ? items.map((i: any) => ({ ticket_type_id: i?.ticketTypeId ?? null, quantity: i?.quantity ?? null })) : null,
    p_seat_ids: hasSeats ? seatIds : null,
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    sendRpcError(res, error);
    return;
  }

  res.status(200).json({ orderId });
}

// Carrito 100% gratis (ningún tipo de pago involucrado) — instantáneo, sin
// pasarela, wrapper de create_order_and_tickets con p_sales_channel='online'
// y p_user_id fijado server-side al propio caller (nunca a otro). Esto NO
// es para cortesías: findCourtesyAttempt rechaza cualquier ticketTypeId
// con price=0 igual que en checkout() — un carrito solo llega aquí si
// TODOS sus tipos de boleto tienen price>0 y aun así el total da 0, lo cual
// no debería ocurrir en la práctica (ver docs). Se deja el endpoint por
// paridad con el checkout web (UserCheckout.tsx: rama isFree), pero con la
// cortesía bloqueada explícitamente en ambos casos.
async function buyFree(req: VercelRequest, res: VercelResponse, token: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const { eventId, customerName, customerEmail, customerPhone, idempotencyKey } = req.body ?? {};
  const { items, seatIds, hasItems, hasSeats } = buildItemsAndSeatIds(req.body);
  if (typeof eventId !== 'string' || (!hasItems && !hasSeats)) {
    res.status(400).json({ error: 'eventId and (items or seatIds) are required' });
    return;
  }
  if (typeof idempotencyKey !== 'string') {
    res.status(400).json({ error: 'idempotencyKey is required' });
    return;
  }

  const admin = adminClient(e);
  const caller = await requireCaller(admin, token);
  if (!caller) {
    res.status(401).json({ errorCode: 'AUTH_REQUIRED', error: 'Invalid session' });
    return;
  }

  const courtesyCheck = await findCourtesyAttempt(admin, items ?? [], seatIds ?? []);
  if (courtesyCheck) {
    res.status(courtesyCheck.status).json({ errorCode: courtesyCheck.errorCode, error: courtesyCheck.message });
    return;
  }

  const { data: eventRow, error: eventError } = await admin.from('events').select('organization_id').eq('id', eventId).single();
  if (eventError || !eventRow) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const rpcClient = callerClient(e, token);
  const { data: orderId, error } = await rpcClient.rpc('create_order_and_tickets', {
    p_event_id: eventId,
    p_organization_id: (eventRow as any).organization_id,
    p_user_id: caller.id,
    p_customer_name: typeof customerName === 'string' && customerName ? customerName : null,
    p_customer_email: typeof customerEmail === 'string' && customerEmail ? customerEmail : null,
    p_customer_phone: typeof customerPhone === 'string' && customerPhone ? customerPhone : null,
    p_payment_reference: `free_${caller.id}_${idempotencyKey}`,
    p_items: hasItems ? items.map((i: any) => ({ ticket_type_id: i?.ticketTypeId ?? null, quantity: i?.quantity ?? null })) : null,
    p_seat_ids: hasSeats ? seatIds : null,
    p_sales_channel: 'online',
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    sendRpcError(res, error);
    return;
  }

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

// Espeja el polling de UserTicket.tsx: estado de la orden + boletos (con QR
// solo una vez 'paid' — confirm_order_paid, disparado por el webhook, es
// quien los crea). callerClient (no admin): RLS en orders/tickets ya
// restringe a "mi propia orden", así que una consulta ajena simplemente no
// devuelve filas en vez de tener que filtrar a mano por user_id.
async function orderStatus(req: VercelRequest, res: VercelResponse, token: string) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const orderId = req.query.orderId;
  if (typeof orderId !== 'string') {
    res.status(400).json({ error: 'orderId query param is required' });
    return;
  }

  const rpcClient = callerClient(e, token);
  const { data: order, error: orderError } = await rpcClient
    .from('orders')
    .select('id, status, total, created_at, events(name, event_date, venues(name))')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) {
    res.status(500).json({ error: orderError.message });
    return;
  }
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const { data: tickets, error: ticketsError } = await rpcClient
    .from('tickets')
    .select('id, qr_code, status, event_ticket_types(name), event_seats(row_label, seat_number)')
    .eq('order_id', orderId)
    .order('created_at');
  if (ticketsError) {
    res.status(500).json({ error: ticketsError.message });
    return;
  }

  res.status(200).json({
    orderId: order.id,
    status: order.status,
    total: order.total,
    eventName: (order as any).events?.name ?? null,
    eventDate: (order as any).events?.event_date ?? null,
    venueName: (order as any).events?.venues?.name ?? null,
    tickets: (tickets ?? []).map((t: any) => ({
      ticketId: t.id,
      qrCode: order.status === 'paid' ? t.qr_code : null,
      status: t.status,
      ticketTypeName: t.event_ticket_types?.name ?? null,
      seatLabel: t.event_seats ? `${t.event_seats.row_label}-${t.event_seats.seat_number}` : null,
    })),
  });
}

// El comprador cancela su propia orden pendiente (equivalente al retorno
// ?orkesta=canceled de la web) — wrapper de release_order, que ya valida
// que el caller sea el dueño (o de superadmin/org) antes de liberar.
async function releaseOrder(req: VercelRequest, res: VercelResponse, token: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const { orderId } = req.body ?? {};
  if (typeof orderId !== 'string') {
    res.status(400).json({ error: 'orderId is required' });
    return;
  }

  const rpcClient = callerClient(e, token);
  const { error } = await rpcClient.rpc('release_order', { p_order_id: orderId });
  if (error) {
    sendRpcError(res, error);
    return;
  }
  res.status(200).json({ ok: true });
}

// "Mis boletos" — espeja getTicketsForOwner() de dataService.ts: todo el
// historial, sin paginar, RLS-scoped por owner_profile_id = auth.uid().
async function tickets(req: VercelRequest, res: VercelResponse, token: string) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const e = requireEnv(res);
  if (!e) return;

  const rpcClient = callerClient(e, token);
  const { data, error } = await rpcClient
    .from('tickets')
    .select(
      'id, order_id, status, qr_code, created_at, event_ticket_types(name, price), event_seats(row_label, seat_number), events(id, name, event_date, category, image_url, venues(name))'
    )
    .order('created_at', { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({
    tickets: (data ?? []).map((t: any) => ({
      ticketId: t.id,
      orderId: t.order_id,
      status: t.status,
      qrCode: t.status === 'cancelled' ? null : t.qr_code,
      ticketTypeName: t.event_ticket_types?.name ?? null,
      price: t.event_ticket_types?.price ?? null,
      seatLabel: t.event_seats ? `${t.event_seats.row_label}-${t.event_seats.seat_number}` : null,
      event: t.events
        ? {
            id: t.events.id,
            name: t.events.name,
            eventDate: t.events.event_date,
            category: t.events.category,
            imageUrl: t.events.image_url,
            venueName: t.events.venues?.name ?? null,
          }
        : null,
    })),
  });
}

const ROUTE_PREFIX = '/api/mobile/buyer/';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = (req.url ?? '').split('?')[0];
  const idx = path.indexOf(ROUTE_PREFIX);
  const route = idx >= 0 ? path.slice(idx + ROUTE_PREFIX.length).split('?')[0].replace(/\/+$/, '') : '';

  // events/ticket-types/seats son catálogo público — sin exigir sesión.
  switch (route) {
    case 'events':
      return events(req, res);
    case 'ticket-types':
      return ticketTypes(req, res);
    case 'seats':
      return seats(req, res);
  }

  const token = bearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  switch (route) {
    case 'hold-seats':
      return holdSeats(req, res, token);
    case 'release-seats':
      return releaseSeats(req, res, token);
    case 'checkout':
      return checkout(req, res, token);
    case 'buy-free':
      return buyFree(req, res, token);
    case 'order-status':
      return orderStatus(req, res, token);
    case 'release-order':
      return releaseOrder(req, res, token);
    case 'tickets':
      return tickets(req, res, token);
    default:
      res.status(404).json({ error: 'Not found' });
  }
}
