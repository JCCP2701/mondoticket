import { useEffect, useMemo, useState } from "react";
import { dataService, EventRecord } from "../services/dataService";
import { SelectedSeat } from "../components/user/SeatMapPicker";

export function useTicketSaleFlow(organizationId: string | null, paymentReferencePrefix: string) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selection, setSelection] = useState<Record<string, number>>({});
  const [selectedSeatsByType, setSelectedSeatsByType] = useState<Record<string, SelectedSeat[]>>({});
  const [seatError, setSeatError] = useState("");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [paymentNote, setPaymentNote] = useState<"cash" | "card">("cash");
  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState("");
  const [lastSaleOrderId, setLastSaleOrderId] = useState<string | null>(null);
  // One key per cart, not per click — a double-tap on "Completar Venta" (a
  // busy box office) or a retry after a dropped response reuses the same
  // key instead of selling the same cart twice. Refreshed only when the
  // cart itself is cleared (resetSelection), not on every failed attempt.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    setLoadError("");
    dataService.getEventsByOrganization(organizationId).then((evs) => {
      setEvents(evs);
      setSelectedEventId(evs.length > 0 ? evs[0].id : "");
      setLoading(false);
    }).catch(() => {
      setLoadError("No se pudieron cargar los eventos. Verifica tu conexión e intenta de nuevo.");
      setLoading(false);
    });
  }, [organizationId]);

  const event = events.find((e) => e.id === selectedEventId) ?? null;

  const selectedSeats = useMemo(
    () => Object.values(selectedSeatsByType).flat(),
    [selectedSeatsByType]
  );

  const setQty = (typeId: string, qty: number, max: number) => {
    setSelection((prev) => ({ ...prev, [typeId]: Math.max(0, Math.min(max, qty)) }));
  };

  // `selection[t.id]` means "how many I want" for every ticket type now —
  // for a seat-mapped type it's the target the seat map is capped at.
  // Summing it alone reflects intent immediately, before seats are picked.
  const totalQuantity = useMemo(
    () => Object.values(selection).reduce((sum, q) => sum + q, 0),
    [selection]
  );

  const seatSelectionsComplete = useMemo(
    () => (event?.ticketTypes ?? [])
      .filter((t) => t.hasSeatMap)
      .every((t) => (selection[t.id] || 0) === (selectedSeatsByType[t.id]?.length || 0)),
    [event, selection, selectedSeatsByType]
  );

  const total = useMemo(() => {
    if (!event) return 0;
    return event.ticketTypes.reduce((sum, t) => sum + (selection[t.id] || 0) * t.price, 0);
  }, [event, selection]);

  const resetSelection = () => {
    setSelection({});
    setSelectedSeatsByType({});
    setIdempotencyKey(crypto.randomUUID());
  };

  const handleSell = async () => {
    if (!event || totalQuantity === 0 || !seatSelectionsComplete) return;
    setSelling(true);
    setSellError("");
    setLastSaleOrderId(null);
    try {
      const items = event.ticketTypes
        .filter((t) => !t.hasSeatMap && (selection[t.id] || 0) > 0)
        .map((t) => ({ ticketTypeId: t.id, quantity: selection[t.id] }));

      const orderId = await dataService.createOrder({
        eventId: event.id,
        organizationId: event.organizationId,
        userId: null,
        customerName: customer.name || "Venta en taquilla",
        customerEmail: customer.email || "sin-correo@taquilla.local",
        customerPhone: customer.phone,
        paymentReference: `${paymentReferencePrefix}_${paymentNote}_${Date.now()}`,
        items: items.length > 0 ? items : undefined,
        seatIds: selectedSeats.length > 0 ? selectedSeats.map((s) => s.seatId) : undefined,
        salesChannel: 'taquilla',
        idempotencyKey,
      });
      setLastSaleOrderId(orderId);
      resetSelection();
      setCustomer({ name: "", email: "", phone: "" });
      const refreshed = organizationId ? await dataService.getEventsByOrganization(organizationId) : [];
      setEvents(refreshed);
    } catch (err: any) {
      setSellError(err.message || "No se pudo completar la venta");
    } finally {
      setSelling(false);
    }
  };

  return {
    events,
    selectedEventId,
    setSelectedEventId,
    event,
    loading,
    loadError,
    selection,
    setQty,
    selectedSeatsByType,
    setSelectedSeatsByType,
    seatError,
    setSeatError,
    selectedSeats,
    totalQuantity,
    seatSelectionsComplete,
    total,
    customer,
    setCustomer,
    paymentNote,
    setPaymentNote,
    selling,
    sellError,
    lastSaleOrderId,
    handleSell,
    resetSelection,
  };
}
