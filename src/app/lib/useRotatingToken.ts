import { useEffect, useState } from 'react';
import { computeRotatingToken, secondsUntilNextSlot } from './rotatingQr';

// Recomputes the displayed QR value every second (cheap — one HMAC via
// WebCrypto) so the countdown stays accurate; the actual token string only
// changes once every 30s. Falls back to null (caller should show a plain
// static state) until the seed has loaded.
export function useRotatingToken(ticketId: string | null, ticketSeedHex: string | null) {
    const [token, setToken] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(30);

    useEffect(() => {
        if (!ticketId || !ticketSeedHex) {
            setToken(null);
            return;
        }
        let cancelled = false;
        const tick = async () => {
            const t = await computeRotatingToken(ticketId, ticketSeedHex);
            if (!cancelled) {
                setToken(t);
                setSecondsLeft(secondsUntilNextSlot());
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [ticketId, ticketSeedHex]);

    return { token, secondsLeft };
}
