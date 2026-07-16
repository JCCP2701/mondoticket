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
    onSelectionChange: (seats: SelectedSeat[]) => void;
    onError?: (message: string) => void;
}

export default function SeatMapPicker({ eventId, ticketTypes, ticketTypeId, onSelectionChange, onError }: SeatMapPickerProps) {
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
            .channel(`event-seats-${eventId}`)
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

        if (seat.status === 'held') return; // held by someone else

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

    return (
        <div>
            <div
                className="grid p-4 bg-secondary/5 rounded-2xl border border-dashed border-border overflow-auto"
                style={{ gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))`, gap: '6px' }}
            >
                {Array.from({ length: maxRow }).map((_, r) =>
                    Array.from({ length: maxCol }).map((_, c) => {
                        const seat = seats.find((s) => s.rowIndex === r && s.colIndex === c);
                        if (!seat) return <div key={`${r}-${c}`} />;

                        const isMine = selectedIds.includes(seat.id);
                        const isTaken = seat.status === 'sold' || (seat.status === 'held' && !isMine);
                        const color = typeColor[seat.ticketTypeId] ?? '#888';

                        return (
                            <button
                                key={seat.id}
                                onClick={() => toggleSeat(seat)}
                                disabled={isTaken}
                                title={`${seat.rowLabel}${seat.seatNumber} — ${typeById.get(seat.ticketTypeId)?.name ?? ''}`}
                                className="w-8 h-8 rounded-lg text-[8px] font-bold flex items-center justify-center transition-all border"
                                style={{
                                    background: isTaken ? '#e5e7eb' : (isMine ? color : `${color}33`),
                                    color: isTaken ? '#9ca3af' : (isMine ? 'white' : color),
                                    borderColor: isTaken ? '#e5e7eb' : color,
                                    cursor: isTaken ? 'not-allowed' : 'pointer',
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
