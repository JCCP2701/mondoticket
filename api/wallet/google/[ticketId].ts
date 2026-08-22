import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createSign } from 'node:crypto';

// Generates a "Save to Google Wallet" link for a ticket. The barcode
// embedded in the wallet pass is the ticket's single qr_code — the exact
// same code shown in-app, by email, and printed. There is no separate
// "wallet QR" — anti-clone protection comes entirely from check_in_ticket
// burning that code on first scan (valid -> used), not from the pass being
// wallet-specific. Every call re-upserts the Wallet object from the
// ticket's current status, so the pass always reflects reality (valid,
// already used, or refunded) even if it was added to the wallet earlier.
//
// Requires GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_CLIENT_EMAIL and
// GOOGLE_WALLET_PRIVATE_KEY (service-account credentials) — server-only,
// never sent to the browser.

const WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1';

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signRs256(payload: Record<string, unknown>, privateKeyPem: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const signingInput = `${base64url(Buffer.from(JSON.stringify(header)))}.${base64url(Buffer.from(JSON.stringify(payload)))}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(privateKeyPem);
  return `${signingInput}.${base64url(signature)}`;
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signRs256(
    {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    },
    privateKey
  );

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google OAuth token request failed: ${JSON.stringify(json)}`);
  return json.access_token as string;
}

async function upsertWalletResource(kind: 'eventTicketClass' | 'eventTicketObject', id: string, body: Record<string, unknown>, accessToken: string): Promise<void> {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
  const getRes = await fetch(`${WALLET_API}/${kind}/${id}`, { headers });
  if (getRes.status === 404) {
    const insertRes = await fetch(`${WALLET_API}/${kind}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!insertRes.ok) throw new Error(`Failed to create ${kind}: ${await insertRes.text()}`);
  } else if (getRes.ok) {
    const updateRes = await fetch(`${WALLET_API}/${kind}/${id}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (!updateRes.ok) throw new Error(`Failed to update ${kind}: ${await updateRes.text()}`);
  } else {
    throw new Error(`Failed to look up ${kind}: ${await getRes.text()}`);
  }
}

function walletState(status: string): string {
  if (status === 'used') return 'COMPLETED';
  if (status === 'cancelled') return 'INACTIVE';
  return 'ACTIVE';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const clientEmail = process.env.GOOGLE_WALLET_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!supabaseUrl || !serviceRoleKey || !issuerId || !clientEmail || !privateKey) {
    res.status(500).json({ error: 'Server misconfigured: missing Supabase or Google Wallet env vars' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }
  const callerToken = authHeader.slice('Bearer '.length);

  const ticketId = req.query.ticketId;
  if (typeof ticketId !== 'string') {
    res.status(400).json({ error: 'ticketId is required' });
    return;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerData, error: callerError } = await serviceClient.auth.getUser(callerToken);
  if (callerError || !callerData.user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const { data: ticket, error: ticketError } = await serviceClient
    .from('tickets')
    .select(
      'id, qr_code, status, owner_profile_id, order_id, ' +
        'event_ticket_types(name), event_seats(row_label, seat_number), ' +
        'orders(customer_name), ' +
        'events(id, name, event_date, event_time, organization_id, venues(name, address))'
    )
    .eq('id', ticketId)
    .single();

  if (ticketError || !ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const event = (ticket as any).events;
  const { data: callerProfile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single();

  const { data: membership } = await serviceClient
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', callerData.user.id)
    .eq('organization_id', event.organization_id)
    .maybeSingle();

  const isOwner = (ticket as any).owner_profile_id === callerData.user.id;
  const isSuperadmin = callerProfile?.role === 'superadmin';
  const isOrgMember = !!membership;
  if (!isOwner && !isSuperadmin && !isOrgMember) {
    res.status(403).json({ error: 'Not authorized to access this ticket' });
    return;
  }

  try {
    const accessToken = await getAccessToken(clientEmail, privateKey);

    const classId = `${issuerId}.event_${event.id}`;
    const objectId = `${issuerId}.ticket_${(ticket as any).id}`;
    const venue = event.venues;
    const eventTime: string | null = event.event_time ? String(event.event_time).slice(0, 8) : null;

    await upsertWalletResource(
      'eventTicketClass',
      classId,
      {
        id: classId,
        issuerName: 'MondoTicket',
        reviewStatus: 'UNDER_REVIEW',
        eventName: { defaultValue: { language: 'es-MX', value: event.name } },
        venue: {
          name: { defaultValue: { language: 'es-MX', value: venue?.name || 'Recinto por confirmar' } },
          ...(venue?.address ? { address: { defaultValue: { language: 'es-MX', value: venue.address } } } : {}),
        },
        dateTime: { start: `${event.event_date}T${eventTime || '00:00:00'}-06:00` },
        hexBackgroundColor: '#7c3aed',
        logo: {
          sourceUri: { uri: 'https://ticketblessing.vercel.app/wallet/logo.png' },
          contentDescription: { defaultValue: { language: 'es-MX', value: 'MondoTicket' } },
        },
        heroImage: {
          sourceUri: { uri: 'https://ticketblessing.vercel.app/wallet/hero.png' },
          contentDescription: { defaultValue: { language: 'es-MX', value: 'MondoTicket' } },
        },
      },
      accessToken
    );

    const seat = (ticket as any).event_seats;
    const seatLabel = seat ? `${seat.row_label}${seat.seat_number}` : null;

    await upsertWalletResource(
      'eventTicketObject',
      objectId,
      {
        id: objectId,
        classId,
        state: walletState((ticket as any).status),
        ticketHolderName: (ticket as any).orders?.customer_name || '',
        ticketNumber: (ticket as any).id.slice(0, 8).toUpperCase(),
        ticketType: { defaultValue: { language: 'es-MX', value: (ticket as any).event_ticket_types?.name || 'Boleto' } },
        ...(seatLabel ? { seatInfo: { seat: { defaultValue: { language: 'es-MX', value: seatLabel } } } } : {}),
        barcode: { type: 'QR_CODE', value: (ticket as any).qr_code },
      },
      accessToken
    );

    const saveJwt = signRs256(
      {
        iss: clientEmail,
        aud: 'google',
        typ: 'savetowallet',
        iat: Math.floor(Date.now() / 1000),
        payload: { eventTicketObjects: [{ id: objectId }] },
      },
      privateKey
    );

    res.status(200).json({ saveUrl: `https://pay.google.com/gp/v/save/${saveJwt}` });
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Failed to build Google Wallet pass' });
  }
}
