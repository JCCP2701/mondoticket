import { useState, useEffect, useRef, useCallback } from "react";
import { dataService, SeatRecord, TicketType } from "../../services/dataService";
import { supabase } from "../../services/supabaseClient";

const PALETTE = ["#7c3aed", "#0891b2", "#d97706", "#059669", "#be123c", "#4338ca"];
const HEARTBEAT_MS = 90_000;

export interface SelectedSeat {
    seatId: string;
    ticketTypeId: string;
    price: number;
    label: string;
}

interface SeatMapPickerProps {
    eventId: string;
    ticketTypes: TicketType[];
    // Scope the picker to a single ticket type's seats — an event can mix
    // seat-mapped types with plain quantity-based ones, so checkout renders
    // one picker per seat-mapped type rather than one for the whole event.
    ticketTypeId?: string;
    // How many seats the buyer said they want (the quantity stepper shown
    // above this picker). Selection is capped here — once reached, every
    // other available seat becomes unclickable — and undefined/0 disables
    // the whole map until a quantity is chosen.
    maxSeats?: number;
    onSelectionChange: (seats: SelectedSeat[]) => void;
    onError?: (message: string) => void;
}

export default function SeatMapPicker({ eventId, ticketTypes, ticketTypeId, maxSeats, onSelectionChange, onError }: SeatMapPickerProps) {
    const [seats, setSeats] = useState<SeatRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const selectedIdsRef = useRef<string[]>([]);
    selectedIdsRef.current = selectedIds;

    const typeById = new Map(ticketTypes.map((t) => [t.id, t]));
    const typeColor: Record<string, string> = {};
    ticketTypes.forEach((t, i) => { typeColor[t.id] = PALETTE[i % PALETTE.length]; });

    const refreshSeats = useCallback(async () => {
        const data = await dataService.getSeatMap(eventId);
        setSeats(ticketTypeId ? data.filter((s) => s.ticketTypeId === ticketTypeId) : data);
    }, [eventId, ticketTypeId]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await refreshSeats();
            setLoading(false);
        })();

        const channel = supabase
            // Scoped by ticketTypeId too: an event can render more than one
            // SeatMapPicker at once (one per seat-mapped ticket type), and
            // supabase-js reuses/dedupes channels by topic name — two
            // pickers sharing a bare `event-seats-${eventId}` topic would
            // race to call `.on()` after the other already `.subscribe()`d,
            // throwing "cannot add postgres_changes callbacks... after
            // subscribe()" and crashing the whole page.
            .channel(`event-seats-${eventId}-${ticketTypeId ?? 'all'}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'event_seats', filter: `event_id=eq.${eventId}` },
                () => { refreshSeats(); }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (selectedIdsRef.current.length > 0) {
                dataService.releaseSeats(selectedIdsRef.current).catch(() => {});
            }
        };
    }, [eventId, refreshSeats]);

    // Heartbeat: keep the hold alive while there's a selection.
    useEffect(() => {
        if (selectedIds.length === 0) return;
        const interval = setInterval(() => {
            dataService.holdSeats(eventId, selectedIdsRef.current).catch(() => { refreshSeats(); });
        }, HEARTBEAT_MS);
        return () => clearInterval(interval);
    }, [eventId, selectedIds.length, refreshSeats]);

    // If the buyer lowers the quantity stepper below what's already
    // selected, release the overflow instead of leaving a mismatched hold.
    useEffect(() => {
        if (maxSeats === undefined || selectedIds.length <= maxSeats) return;
        const keep = selectedIds.slice(0, maxSeats);
        const release = selectedIds.slice(maxSeats);
        setSelectedIds(keep);
        dataService.releaseSeats(release).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maxSeats]);

    useEffect(() => {
        const chosen = selectedIds
            .map((id) => seats.find((s) => s.id === id))
            .filter((s): s is SeatRecord => !!s)
            .map((s) => ({
                seatId: s.id,
                ticketTypeId: s.ticketTypeId,
                price: typeById.get(s.ticketTypeId)?.price ?? 0,
                label: `${s.rowLabel}${s.seatNumber}`,
            }));
        onSelectionChange(chosen);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIds, seats]);

    const toggleSeat = async (seat: SeatRecord) => {
        if (seat.status === 'sold') return;
        const isMine = selectedIds.includes(seat.id);

        if (isMine) {
            const next = selectedIds.filter((id) => id !== seat.id);
            setSelectedIds(next);
            dataService.releaseSeats([seat.id]).catch(() => {});
            return;
        }

        if (seat.status === 'held' || seat.status === 'reserved') return; // held or mid-payment under someone else's order

        if (maxSeats === undefined || maxSeats === 0) {
            onError?.('Primero elige cuántos boletos quieres arriba.');
            return;
        }
        if (selectedIds.length >= maxSeats) {
            onError?.(`Ya elegiste ${maxSeats} de ${maxSeats} boletos. Quita uno para elegir otro.`);
            return;
        }

        const next = [...selectedIds, seat.id];
        try {
            await dataService.holdSeats(eventId, next);
            setSelectedIds(next);
        } catch (err: any) {
            onError?.(err.message?.includes('SEATS_UNAVAILABLE')
                ? 'Ese asiento ya no está disponible, elige otro.'
                : (err.message || 'No se pudo reservar el asiento'));
            refreshSeats();
        }
    };

    if (loading) return <div className="text-sm text-muted-foreground p-4">Cargando mapa de asientos...</div>;

    const maxRow = Math.max(0, ...seats.map((s) => s.rowIndex)) + 1;
    const maxCol = Math.max(0, ...seats.map((s) => s.colIndex)) + 1;
    const atMax = maxSeats !== undefined && selectedIds.length >= maxSeats;

    return (
        <div>
            {maxSeats !== undefined && (
                <p className="text-sm font-bold mb-3">
                    {maxSeats === 0
                        ? 'Elige cuántos boletos quieres arriba para habilitar el mapa.'
                        : `Selecciona ${selectedIds.length} de ${maxSeats} asientos`}
                </p>
            )}
            <div
                className="grid p-4 bg-secondary/5 rounded-2xl border border-dashed border-border overflow-auto"
                style={{ gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))`, gap: '6px', opacity: maxSeats === 0 ? 0.5 : 1 }}
            >
                {Array.from({ length: maxRow }).map((_, r) =>
                    Array.from({ length: maxCol }).map((_, c) => {
                        const seat = seats.find((s) => s.rowIndex === r && s.colIndex === c);
                        if (!seat) return <div key={`${r}-${c}`} />;

                        const isMine = selectedIds.includes(seat.id);
                        const isTaken = seat.status === 'sold' || seat.status === 'reserved' || (seat.status === 'held' && !isMine);
                        // Available and not taken by anyone, but the buyer already
                        // picked as many seats as they asked for — distinct from
                        // isTaken: this seat is fine, they just need to deselect
                        // one first, so it keeps its color instead of turning grey.
                        const limitReached = !isTaken && !isMine && atMax;
                        const color = typeColor[seat.ticketTypeId] ?? '#888';

                        return (
                            <button
                                key={seat.id}
                                onClick={() => toggleSeat(seat)}
                                disabled={isTaken || limitReached}
                                title={`${seat.rowLabel}${seat.seatNumber} — ${typeById.get(seat.ticketTypeId)?.name ?? ''}`}
                                className="w-8 h-8 rounded-lg text-[8px] font-bold flex items-center justify-center transition-all border"
                                style={{
                                    background: isTaken ? '#e5e7eb' : (isMine ? color : `${color}33`),
                                    color: isTaken ? '#9ca3af' : (isMine ? 'white' : color),
                                    borderColor: isTaken ? '#e5e7eb' : color,
                                    cursor: (isTaken || limitReached) ? 'not-allowed' : 'pointer',
                                    opacity: limitReached ? 0.4 : 1,
                                    transform: isMine ? 'scale(1.1)' : undefined,
                                }}
                            >
                                {seat.rowLabel}{seat.seatNumber}
                            </button>
                        );
                    })
                )}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs">
                {ticketTypes.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ background: typeColor[t.id] }} />
                        <span className="font-bold">{t.name}</span>
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-200 border border-gray-300" />
                    <span className="text-muted-foreground">Ocupado / vendido</span>
                </div>
            </div>
        </div>
    );
}
