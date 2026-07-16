import { useEffect, useMemo, useState } from "react";
import { Ticket, LogOut, Minus, Plus, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { dataService, EventRecord } from "../../services/dataService";
import SeatMapPicker, { SelectedSeat } from "../user/SeatMapPicker";

export default function TaquillaDashboard() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [selection, setSelection] = useState<Record<string, number>>({});
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [seatError, setSeatError] = useState("");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [paymentNote, setPaymentNote] = useState<"cash" | "card">("cash");
  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState("");
  const [lastSaleOrderId, setLastSaleOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.organizationId) return;
    dataService.getEventsByOrganization(user.organizationId).then((evs) => {
      setEvents(evs);
      if (evs.length > 0) setSelectedEventId(evs[0].id);
      setLoading(false);
    });
  }, [user]);

  const event = events.find((e) => e.id === selectedEventId) ?? null;

  const setQty = (typeId: string, qty: number, max: number) => {
    setSelection((prev) => ({ ...prev, [typeId]: Math.max(0, Math.min(max, qty)) }));
  };

  const totalQuantity = useMemo(() => {
    if (event?.hasSeatMap) return selectedSeats.length;
    return Object.values(selection).reduce((sum, q) => sum + q, 0);
  }, [selection, selectedSeats, event]);

  const total = useMemo(() => {
    if (!event) return 0;
    if (event.hasSeatMap) return selectedSeats.reduce((sum, s) => sum + s.price, 0);
    return event.ticketTypes.reduce((sum, t) => sum + (selection[t.id] || 0) * t.price, 0);
  }, [event, selection, selectedSeats]);

  const resetSelection = () => {
    setSelection({});
    setSelectedSeats([]);
  };

  const handleSell = async () => {
    if (!event || totalQuantity === 0) return;
    setSelling(true);
    setSellError("");
    setLastSaleOrderId(null);
    try {
      const orderId = await dataService.createOrder({
        eventId: event.id,
        organizationId: event.organizationId,
        userId: null,
        customerName: customer.name || "Venta en taquilla",
        customerEmail: customer.email || "sin-correo@taquilla.local",
        customerPhone: customer.phone,
        paymentIntentId: `taquilla_${paymentNote}_${Date.now()}`,
        items: event.hasSeatMap ? undefined : event.ticketTypes
          .filter((t) => (selection[t.id] || 0) > 0)
          .map((t) => ({ ticketTypeId: t.id, quantity: selection[t.id] })),
        seatIds: event.hasSeatMap ? selectedSeats.map((s) => s.seatId) : undefined,
      });
      setLastSaleOrderId(orderId);
      resetSelection();
      setCustomer({ name: "", email: "", phone: "" });
      const refreshed = user?.organizationId ? await dataService.getEventsByOrganization(user.organizationId) : [];
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
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold">Taquilla</h1>
              <p className="text-xs text-muted-foreground">{user?.name}</p>
            </div>
          </div>
          <button onClick={() => logout()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-secondary text-sm font-bold">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8 space-y-6">
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
              <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="font-bold mb-4">{event.hasSeatMap ? "Selecciona asientos" : "Selecciona boletos"}</h3>
                {event.hasSeatMap ? (
                  <>
                    {seatError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{seatError}</div>}
                    <SeatMapPicker eventId={event.id} ticketTypes={event.ticketTypes} onSelectionChange={setSelectedSeats} onError={setSeatError} />
                  </>
                ) : (
                  <div className="space-y-4">
                    {event.ticketTypes.map((t) => {
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
                )}
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
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Venta completada (#{lastSaleOrderId.slice(0, 8)})
                </div>
              )}

              <button
                onClick={handleSell}
                disabled={selling || totalQuantity === 0}
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
