// Offline mirror of the exact verification logic check_in_ticket runs
// server-side (supabase/migrations/0026/0028). Used only when the gate
// device has no network — everything here is re-checked by the server at
// sync time regardless, this is just what lets the scanner give an
// immediate accept/reject without a round trip.

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
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

export async function sha256Hex(text: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return bytesToHex(new Uint8Array(digest));
}

export type OfflineVerifyResult =
    | { kind: 'rotating'; valid: boolean; ticketId: string | null }
    | { kind: 'static'; qrHash: string };

// Parses a scanned string and verifies it locally:
//  - "TB1.<ticketId>.<slot>.<hmac>" → verify against the event's signing
//    key (never the DB's copy — this is the key handed to staff via
//    get_event_signing_key, kept in memory only).
//  - anything else → treated as a possible static code; caller looks up
//    its hash against the cached manifest's qr_hash list.
export async function verifyScannedCode(code: string, eventKeyHex: string): Promise<OfflineVerifyResult> {
    if (code.startsWith('TB1.')) {
        const parts = code.split('.');
        if (parts.length !== 4) return { kind: 'rotating', valid: false, ticketId: null };
        const [, ticketId, slotStr, hmacHex] = parts;
        const slot = Number(slotStr);
        if (!ticketId || !Number.isFinite(slot)) return { kind: 'rotating', valid: false, ticketId: null };

        const eventKeyBytes = hexToBytes(eventKeyHex);
        const ticketSeed = await hmacSha256(eventKeyBytes, ticketId);
        const currentSlot = Math.floor(Date.now() / 1000 / 30);
        const withinTolerance = Math.abs(slot - currentSlot) <= 2;
        const expectedSig = await hmacSha256(ticketSeed, String(slot));
        const expectedHex = bytesToHex(expectedSig).slice(0, 20);
        const valid = withinTolerance && expectedHex === hmacHex;
        return { kind: 'rotating', valid, ticketId: valid ? ticketId : null };
    }

    const qrHash = await sha256Hex(code);
    return { kind: 'static', qrHash };
}
