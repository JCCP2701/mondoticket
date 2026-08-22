// Shared OrkestaPay REST helpers. Filename starts with "_" so Vercel does
// not turn this into its own route (only [ticketId]-style/plain .ts files
// under api/ become endpoints).
//
// A fresh access token is fetched on every call rather than cached — these
// functions only ever run inside a single short-lived serverless
// invocation that makes at most one downstream OrkestaPay call, exactly
// like the existing Google Wallet endpoint's own per-invocation OAuth
// fetch. Caching across invocations would add a shared-state/race surface
// for no measurable benefit at this volume.

export function getOrkestaBaseUrl(): string {
  const base = process.env.ORKESTA_API_BASE_URL;
  if (!base) throw new Error('ORKESTA_API_BASE_URL is not set');
  return base;
}

export async function getOrkestaAccessToken(): Promise<string> {
  const clientId = process.env.ORKESTA_CLIENT_ID;
  const clientSecret = process.env.ORKESTA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('OrkestaPay credentials are not configured');

  const res = await fetch(`${getOrkestaBaseUrl()}/v1/oauth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`OrkestaPay auth failed: ${json?.message || res.status}`);
  return json.access_token as string;
}

export async function orkestaFetch(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<any> {
  const token = await getOrkestaAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;

  const res = await fetch(`${getOrkestaBaseUrl()}${path}`, { ...init, headers });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`OrkestaPay request to ${path} failed (${res.status}): ${json?.message || JSON.stringify(json)}`);
  }
  return json;
}
