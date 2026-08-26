import { useEffect, useMemo, useState } from "react";
import { Ticket, LogOut, Minus, Plus, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { dataService, EventRecord } from "../../services/dataService";
import SeatMapPicker, { SelectedSeat } from "../user/SeatMapPicker";
import OrgSwitcher from "../shared/OrgSwitcher";

export default function TaquillaDashboard() {
  const { user, logout, activeOrganizationId } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
    if (!activeOrganizationId) return;
    setLoading(true);
    dataService.getEventsByOrganization(activeOrganizationId).then((evs) => {
      setEvents(evs);
      setSelectedEventId(evs.length > 0 ? evs[0].id : "");
      setLoading(false);
    });
  }, [activeOrganizationId]);

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
        paymentReference: `taquilla_${paymentNote}_${Date.now()}`,
        items: items.length > 0 ? items : undefined,
        seatIds: selectedSeats.length > 0 ? selectedSeats.map((s) => s.seatId) : undefined,
        salesChannel: 'taquilla',
        idempotencyKey,
      });
      setLastSaleOrderId(orderId);
      resetSelection();
      setCustomer({ name: "", email: "", phone: "" });
      const refreshed = activeOrganizationId ? await dataService.getEventsByOrganization(activeOrganizationId) : [];
      setEvents(refreshed);
    } catch (err: any) {
      setSellError(err.message || "No se pudo completar la venta");
    } finally {
      setSelling(false);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-10">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold">Taquilla</h1>
              <p className="text-xs text-sidebar-foreground/60">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <OrgSwitcher variant="dark" />
            <button onClick={() => logout()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-sidebar-border hover:bg-sidebar-accent text-sm font-bold">
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="px-8 py-8 space-y-6">
        <div className="bg-card p-6 rounded-2xl border border-border">
          <label className="text-sm font-bold text-muted-foreground mb-2 block">Evento</label>
          <select
            value={selectedEventId}
            onChange={(e) => { setSelectedEventId(e.target.value); resetSelection(); }}
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
          >
            {events.length === 0 && <option value="">Sin eventos disponibles</option>}
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name} — {new Date(e.date).toLocaleDateString('es-MX')}</option>
            ))}
          </select>
        </div>

        {event && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {event.imageUrl && (
                <div className="rounded-2xl border border-border overflow-hidden h-48">
                  <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="font-bold mb-4">Selecciona boletos</h3>
                {seatError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{seatError}</div>}
                <div className="space-y-4">
                  {event.ticketTypes.map((t) => {
                    if (t.hasSeatMap) {
                      const seatAvailable = t.capacity - t.sold;
                      const seatQty = selection[t.id] || 0;
                      return (
                        <div key={t.id}>
                          <div className="flex items-center justify-between p-4 rounded-xl border border-border mb-3">
                            <div>
                              <p className="font-bold">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{t.price === 0 ? 'Gratis' : `$${t.price.toLocaleString()}`} · {seatAvailable} disponibles</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button onClick={() => setQty(t.id, seatQty - 1, seatAvailable)} disabled={seatQty === 0} className="w-8 h-8 rounded-lg border border-border disabled:opacity-40"><Minus className="w-4 h-4 mx-auto" /></button>
                              <span className="font-bold w-6 text-center">{seatQty}</span>
                              <button onClick={() => setQty(t.id, seatQty + 1, seatAvailable)} disabled={seatQty >= seatAvailable} className="w-8 h-8 rounded-lg bg-primary text-white disabled:opacity-40"><Plus className="w-4 h-4 mx-auto" /></button>
                            </div>
                          </div>
                          {seatQty > 0 && (
                            <SeatMapPicker
                              eventId={event.id}
                              ticketTypeId={t.id}
                              ticketTypes={[t]}
                              maxSeats={seatQty}
                              onSelectionChange={(seats) => setSelectedSeatsByType((prev) => ({ ...prev, [t.id]: seats }))}
                              onError={setSeatError}
                            />
                          )}
                        </div>
                      );
                    }
                    const available = t.capacity - t.sold;
                    const qty = selection[t.id] || 0;
                    return (
                      <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-border">
                        <div>
                          <p className="font-bold">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.price === 0 ? 'Gratis' : `$${t.price.toLocaleString()}`} · {available} disponibles</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setQty(t.id, qty - 1, available)} disabled={qty === 0} className="w-8 h-8 rounded-lg border border-border disabled:opacity-40"><Minus className="w-4 h-4 mx-auto" /></button>
                          <span className="font-bold w-6 text-center">{qty}</span>
                          <button onClick={() => setQty(t.id, qty + 1, available)} disabled={qty >= available} className="w-8 h-8 rounded-lg bg-primary text-white disabled:opacity-40"><Plus className="w-4 h-4 mx-auto" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
                <h3 className="font-bold">Datos del comprador (opcional)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input placeholder="Nombre" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="px-4 py-2.5 rounded-xl border-2 border-border bg-background outline-none" />
                  <input placeholder="Correo" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="px-4 py-2.5 rounded-xl border-2 border-border bg-background outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-2 block">Método de pago (solo informativo)</label>
                  <div className="flex gap-3">
                    <button onClick={() => setPaymentNote("cash")} className={`px-4 py-2 rounded-xl border-2 font-bold text-sm ${paymentNote === 'cash' ? 'border-primary bg-primary/5' : 'border-border'}`}>Efectivo</button>
                    <button onClick={() => setPaymentNote("card")} className={`px-4 py-2 rounded-xl border-2 font-bold text-sm ${paymentNote === 'card' ? 'border-primary bg-primary/5' : 'border-border'}`}>Tarjeta física</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border h-fit sticky top-24 space-y-4">
              <h3 className="font-bold">Resumen de venta</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Boletos</span>
                <span className="font-bold">{totalQuantity}</span>
              </div>
              <div className="flex justify-between text-lg font-black">
                <span>Total</span>
                <span>${total.toLocaleString()} MXN</span>
              </div>

              {sellError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{sellError}</div>}
              {lastSaleOrderId && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Venta completada (#{lastSaleOrderId.slice(0, 8)})
                </div>
              )}

              {totalQuantity > 0 && !seatSelectionsComplete && (
                <p className="text-xs text-amber-600 text-center">Todavía faltan asientos por elegir en el mapa.</p>
              )}

              <button
                onClick={handleSell}
                disabled={selling || totalQuantity === 0 || !seatSelectionsComplete}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <ShoppingCart className="w-5 h-5" />
                {selling ? "Procesando..." : "Completar Venta"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
