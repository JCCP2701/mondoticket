import { Ticket, LogOut, Minus, Plus, ShoppingCart, CheckCircle2, TicketCheck, PieChart, DollarSign } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import SeatMapPicker from "../user/SeatMapPicker";
import OrgSwitcher from "../shared/OrgSwitcher";
import { useTicketSaleFlow } from "../../lib/useTicketSaleFlow";
import { StatCard } from "../shared/dashboard/StatCard";
import { StatCardGrid } from "../shared/dashboard/StatCardGrid";

export default function TaquillaDashboard() {
  const { user, logout, activeOrganizationId } = useAuth();
  const {
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
  } = useTicketSaleFlow(activeOrganizationId, 'taquilla');

  if (loading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  // At-a-glance strip for the selected event — all from data already
  // fetched (event.ticketTypes carries capacity/sold/price per type), no
  // new query. Scoped to the event, not "today"/shift, since there's no
  // date-filtered sales query yet.
  const eventSold = event ? event.ticketTypes.reduce((s, t) => s + t.sold, 0) : 0;
  const eventCapacity = event ? event.ticketTypes.reduce((s, t) => s + t.capacity, 0) : 0;
  const eventAvailable = Math.max(0, eventCapacity - eventSold);
  const eventOccupancyPct = eventCapacity > 0 ? (eventSold / eventCapacity) * 100 : 0;
  const eventRevenue = event ? event.ticketTypes.reduce((s, t) => s + t.sold * t.price, 0) : 0;

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
        {loadError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{loadError}</div>
        )}
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
          <>
          <StatCardGrid columns={4}>
            <StatCard label="Boletos vendidos" value={eventSold.toLocaleString()} icon={TicketCheck} />
            <StatCard label="Disponibles" value={eventAvailable.toLocaleString()} icon={Ticket} />
            <StatCard
              label="% de aforo"
              value={`${eventOccupancyPct.toFixed(0)}%`}
              icon={PieChart}
              status={eventOccupancyPct >= 90 ? "good" : "neutral"}
              statusLabel={eventOccupancyPct >= 90 ? "Casi agotado" : undefined}
            />
            <StatCard label="Ingresos del evento" value={`$${eventRevenue.toLocaleString()}`} icon={DollarSign} />
          </StatCardGrid>
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
          </>
        )}
      </main>
    </div>
  );
}
