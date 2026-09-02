import { useEffect, useMemo, useState } from "react";
import { Megaphone, LogOut, Minus, Plus, ShoppingCart, CheckCircle2, Target, TrendingUp, Wallet, Ticket } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import SeatMapPicker from "../user/SeatMapPicker";
import OrgSwitcher from "../shared/OrgSwitcher";
import { useTicketSaleFlow } from "../../lib/useTicketSaleFlow";
import { dataService, PromoterProgress } from "../../services/dataService";
import { StatCard, type StatStatus } from "../shared/dashboard/StatCard";
import { StatCardGrid } from "../shared/dashboard/StatCardGrid";
import { DashboardTableCard } from "../shared/dashboard/DashboardTableCard";
import { SectionHeader } from "../shared/dashboard/SectionHeader";
import { Progress } from "../ui/progress";

function money(n: number): string {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PromoterDashboard() {
  const { user, logout, activeOrganizationId } = useAuth();
  const sale = useTicketSaleFlow(activeOrganizationId, 'promotor');

  const [progress, setProgress] = useState<PromoterProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    setProgressLoading(true);
    dataService.getPromoterProgress()
      .then((rows) => setProgress(rows))
      .catch(() => setProgress([]))
      .finally(() => setProgressLoading(false));
    // Re-load right after a sale completes so the goal/progress numbers
    // refresh without a manual page reload.
  }, [sale.lastSaleOrderId]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentPeriod = useMemo(
    () => progress.find((p) => p.periodStart <= todayStr && todayStr <= p.periodEnd) ?? null,
    [progress, todayStr]
  );
  const otherPeriods = useMemo(
    () => progress.filter((p) => p.periodId !== currentPeriod?.periodId),
    [progress, currentPeriod]
  );

  const progressPct = currentPeriod && currentPeriod.targetTicketCount > 0
    ? Math.min(100, (currentPeriod.ticketsSold / currentPeriod.targetTicketCount) * 100)
    : 0;

  // Pacing: how far along the period is in time vs. how far along the goal
  // is in sales — the one genuinely new insight here (everything else is
  // re-styling), fully client-side from data already in `currentPeriod`.
  const timeElapsedPct = useMemo(() => {
    if (!currentPeriod) return 0;
    const start = new Date(`${currentPeriod.periodStart}T00:00:00`).getTime();
    const end = new Date(`${currentPeriod.periodEnd}T00:00:00`).getTime();
    if (end <= start) return 100;
    return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
  }, [currentPeriod]);

  const pacingStatus: StatStatus = !currentPeriod
    ? "neutral"
    : progressPct >= 100
    ? "good"
    : progressPct < timeElapsedPct - 15
    ? "warning"
    : "neutral";
  const pacingLabel = pacingStatus === "good" ? "Meta cumplida" : pacingStatus === "warning" ? "Por debajo del ritmo" : undefined;
  const pacingIndicatorClass = pacingStatus === "good" ? "bg-success" : pacingStatus === "warning" ? "bg-warning" : "bg-primary";

  if (sale.loading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-10">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold">Promotor</h1>
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
        {sale.loadError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{sale.loadError}</div>
        )}

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Tu meta de ventas</h2>
            <p className="text-muted-foreground mt-1">Tu progreso contra la meta activa de tu organización.</p>
          </div>

          {progressLoading ? (
            <p className="text-sm text-muted-foreground">Cargando meta...</p>
          ) : currentPeriod ? (
            <>
              <StatCardGrid columns={currentPeriod.commissionPercentage !== null ? 3 : 2}>
                <StatCard
                  label="Meta de boletos"
                  value={String(currentPeriod.targetTicketCount)}
                  icon={Target}
                  caption={currentPeriod.organizationName}
                />
                <StatCard
                  label="Boletos vendidos"
                  value={String(currentPeriod.ticketsSold)}
                  icon={TrendingUp}
                  status={pacingStatus}
                  statusLabel={pacingLabel}
                  caption={`${formatDate(currentPeriod.periodStart)} – ${formatDate(currentPeriod.periodEnd)}`}
                />
                {currentPeriod.commissionPercentage !== null && (
                  <StatCard
                    label="Comisión ganada"
                    value={money(currentPeriod.commissionEarned ?? 0)}
                    icon={Wallet}
                    caption={`${currentPeriod.commissionPercentage}% sobre ventas`}
                  />
                )}
              </StatCardGrid>

              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-muted-foreground">Progreso del periodo</p>
                  <p className="text-sm font-bold text-foreground">{progressPct.toFixed(0)}%</p>
                </div>
                <Progress value={progressPct} indicatorClassName={pacingIndicatorClass} />
              </div>
            </>
          ) : (
            <div className="bg-card p-6 rounded-2xl border border-border text-sm text-muted-foreground italic">
              Tu organización aún no configuró una meta activa. Puedes seguir vendiendo boletos normalmente.
            </div>
          )}

          {otherPeriods.length > 0 && (
            <DashboardTableCard title="Otros periodos" subtitle="Metas pasadas o futuras de tu organización">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-secondary/10">
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Periodo</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Organización</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Meta</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Vendidos</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Comisión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {otherPeriods.map((p) => (
                      <tr key={p.periodId}>
                        <td className="px-6 py-3 text-sm text-muted-foreground">{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}</td>
                        <td className="px-6 py-3 text-sm font-medium">{p.organizationName}</td>
                        <td className="px-6 py-3 text-sm text-right">{p.targetTicketCount}</td>
                        <td className="px-6 py-3 text-sm text-right">{p.ticketsSold}</td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-primary">{p.commissionEarned !== null ? money(p.commissionEarned) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardTableCard>
          )}
        </section>

        <div className="border-t border-border pt-6">
          <SectionHeader
            eyebrow="Venta en curso"
            icon={Ticket}
            title="Vender boletos"
            subtitle="Selecciona el evento y completa la venta."
          />
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border">
          <label className="text-sm font-bold text-muted-foreground mb-2 block">Evento</label>
          <select
            value={sale.selectedEventId}
            onChange={(e) => { sale.setSelectedEventId(e.target.value); sale.resetSelection(); }}
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
          >
            {sale.events.length === 0 && <option value="">Sin eventos disponibles</option>}
            {sale.events.map((e) => (
              <option key={e.id} value={e.id}>{e.name} — {new Date(e.date).toLocaleDateString('es-MX')}</option>
            ))}
          </select>
        </div>

        {sale.event && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {sale.event.imageUrl && (
                <div className="rounded-2xl border border-border overflow-hidden h-48">
                  <img src={sale.event.imageUrl} alt={sale.event.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="bg-card p-6 rounded-2xl border border-border">
                <h3 className="font-bold mb-4">Selecciona boletos</h3>
                {sale.seatError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{sale.seatError}</div>}
                <div className="space-y-4">
                  {sale.event.ticketTypes.map((t) => {
                    if (t.hasSeatMap) {
                      const seatAvailable = t.capacity - t.sold;
                      const seatQty = sale.selection[t.id] || 0;
                      return (
                        <div key={t.id}>
                          <div className="flex items-center justify-between p-4 rounded-xl border border-border mb-3">
                            <div>
                              <p className="font-bold">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{t.price === 0 ? 'Gratis' : `$${t.price.toLocaleString()}`} · {seatAvailable} disponibles</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button onClick={() => sale.setQty(t.id, seatQty - 1, seatAvailable)} disabled={seatQty === 0} className="w-8 h-8 rounded-lg border border-border disabled:opacity-40"><Minus className="w-4 h-4 mx-auto" /></button>
                              <span className="font-bold w-6 text-center">{seatQty}</span>
                              <button onClick={() => sale.setQty(t.id, seatQty + 1, seatAvailable)} disabled={seatQty >= seatAvailable} className="w-8 h-8 rounded-lg bg-primary text-white disabled:opacity-40"><Plus className="w-4 h-4 mx-auto" /></button>
                            </div>
                          </div>
                          {seatQty > 0 && (
                            <SeatMapPicker
                              eventId={sale.event.id}
                              ticketTypeId={t.id}
                              ticketTypes={[t]}
                              maxSeats={seatQty}
                              onSelectionChange={(seats) => sale.setSelectedSeatsByType((prev) => ({ ...prev, [t.id]: seats }))}
                              onError={sale.setSeatError}
                            />
                          )}
                        </div>
                      );
                    }
                    const available = t.capacity - t.sold;
                    const qty = sale.selection[t.id] || 0;
                    return (
                      <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-border">
                        <div>
                          <p className="font-bold">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.price === 0 ? 'Gratis' : `$${t.price.toLocaleString()}`} · {available} disponibles</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => sale.setQty(t.id, qty - 1, available)} disabled={qty === 0} className="w-8 h-8 rounded-lg border border-border disabled:opacity-40"><Minus className="w-4 h-4 mx-auto" /></button>
                          <span className="font-bold w-6 text-center">{qty}</span>
                          <button onClick={() => sale.setQty(t.id, qty + 1, available)} disabled={qty >= available} className="w-8 h-8 rounded-lg bg-primary text-white disabled:opacity-40"><Plus className="w-4 h-4 mx-auto" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
                <h3 className="font-bold">Datos del comprador (opcional)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input placeholder="Nombre" value={sale.customer.name} onChange={(e) => sale.setCustomer({ ...sale.customer, name: e.target.value })} className="px-4 py-2.5 rounded-xl border-2 border-border bg-background outline-none" />
                  <input placeholder="Correo" type="email" value={sale.customer.email} onChange={(e) => sale.setCustomer({ ...sale.customer, email: e.target.value })} className="px-4 py-2.5 rounded-xl border-2 border-border bg-background outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-2 block">Método de pago (solo informativo)</label>
                  <div className="flex gap-3">
                    <button onClick={() => sale.setPaymentNote("cash")} className={`px-4 py-2 rounded-xl border-2 font-bold text-sm ${sale.paymentNote === 'cash' ? 'border-primary bg-primary/5' : 'border-border'}`}>Efectivo</button>
                    <button onClick={() => sale.setPaymentNote("card")} className={`px-4 py-2 rounded-xl border-2 font-bold text-sm ${sale.paymentNote === 'card' ? 'border-primary bg-primary/5' : 'border-border'}`}>Tarjeta física</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border h-fit sticky top-24 space-y-4">
              <h3 className="font-bold">Resumen de venta</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Boletos</span>
                <span className="font-bold">{sale.totalQuantity}</span>
              </div>
              <div className="flex justify-between text-lg font-black">
                <span>Total</span>
                <span>${sale.total.toLocaleString()} MXN</span>
              </div>

              {sale.sellError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{sale.sellError}</div>}
              {sale.lastSaleOrderId && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Venta completada (#{sale.lastSaleOrderId.slice(0, 8)})
                </div>
              )}

              {sale.totalQuantity > 0 && !sale.seatSelectionsComplete && (
                <p className="text-xs text-amber-600 text-center">Todavía faltan asientos por elegir en el mapa.</p>
              )}

              <button
                onClick={sale.handleSell}
                disabled={sale.selling || sale.totalQuantity === 0 || !sale.seatSelectionsComplete}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <ShoppingCart className="w-5 h-5" />
                {sale.selling ? "Procesando..." : "Completar Venta"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
