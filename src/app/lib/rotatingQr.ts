// Client-side half of the rotating-QR anti-clone scheme. The server side
// (verification) lives in check_in_ticket, supabase/migrations/0026. A
// screenshot of the displayed code stops working ~30s after it's taken,
// since the code embeds a signed, time-boxed slot.

const SLOT_SECONDS = 30;

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(keyBytes: Uint8Array, message: string): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
    return new Uint8Array(sig);
}

export function currentSlot(nowMs: number = Date.now()): number {
    return Math.floor(nowMs / 1000 / SLOT_SECONDS);
}

export function secondsUntilNextSlot(nowMs: number = Date.now()): number {
    return SLOT_SECONDS - (Math.floor(nowMs / 1000) % SLOT_SECONDS);
}

// ticketSeedHex comes from dataService.getTicketDisplaySeed() — a value
// derived server-side (HMAC of the event's signing key + this ticket's id),
// never the event key itself, so leaking one ticket's seed only affects
// that one ticket.
export async function computeRotatingToken(ticketId: string, ticketSeedHex: string, nowMs: number = Date.now()): Promise<string> {
    const seedBytes = hexToBytes(ticketSeedHex);
    const slot = currentSlot(nowMs);
    const sig = await hmacSha256(seedBytes, String(slot));
    const hmacHex = bytesToHex(sig).slice(0, 20);
    return `TB1.${ticketId}.${slot}.${hmacHex}`;
}
