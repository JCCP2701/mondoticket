import { Link } from "react-router";
import { Calendar, ChevronDown, Users, DollarSign, TrendingUp, CheckCircle2, Plus, Download, Ticket, Megaphone, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
import { dataService, EventRecord, OrganizationSalesDetail, PromoterTerms } from "../../services/dataService";
import { useAuth } from "../../context/AuthContext";
import { generateLiquidationSummaryPdf } from "../../lib/pdf";
import { ChartCard } from "../shared/dashboard/ChartCard";
import { ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "../ui/chart";
import { cn } from "../ui/utils";

const DATE_PRESETS = [
  { id: 'all', label: 'Todo' },
  { id: 'month', label: 'Este mes' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: 'custom', label: 'Personalizado' },
] as const;
type DatePreset = (typeof DATE_PRESETS)[number]['id'];

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function OrganizationDashboard() {
  const { activeOrganizationId } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [orgName, setOrgName] = useState("");
  const [feePercentage, setFeePercentage] = useState(10);
  const [taquillaFeePercentage, setTaquillaFeePercentage] = useState<number | null>(null);
  const [courtesyMode, setCourtesyMode] = useState<'fixed' | 'percentage'>('fixed');
  const [courtesyTicketsPerEvent, setCourtesyTicketsPerEvent] = useState<number | null>(null);
  const [courtesyPercentage, setCourtesyPercentage] = useState<number | null>(null);
  const [promoterTerms, setPromoterTerms] = useState<PromoterTerms[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro de evento/periodo — independiente de la carga de eventos/org de
  // arriba, para que cambiar un filtro no vuelva a mostrar "Cargando..." toda
  // la pantalla (solo la zona de KPIs/gráfica/liquidación que sí depende de él).
  const [selectedEventId, setSelectedEventId] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [salesDetail, setSalesDetail] = useState<OrganizationSalesDetail | null>(null);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState("");

  // Botón único de periodo (reemplaza la fila de botones + inputs siempre
  // visible): un popover que se cierra solo al hacer click fuera.
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const periodMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!periodMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (periodMenuRef.current && !periodMenuRef.current.contains(e.target as Node)) {
        setPeriodMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [periodMenuOpen]);

  useEffect(() => {
    if (!activeOrganizationId) return;
    setLoading(true);
    Promise.all([
      dataService.getEventsByOrganization(activeOrganizationId),
      dataService.getOrganizations(),
      dataService.getPromoterTermsForOrganization(activeOrganizationId),
    ]).then(([evs, orgs, terms]) => {
      setEvents(evs);
      setPromoterTerms(terms);
      const org = orgs.find((o) => o.id === activeOrganizationId);
      if (org) {
        setFeePercentage(org.feePercentage);
        setTaquillaFeePercentage(org.taquillaFeePercentage ?? null);
        setCourtesyMode(org.courtesyMode);
        setCourtesyTicketsPerEvent(org.courtesyTicketsPerEvent ?? null);
        setCourtesyPercentage(org.courtesyPercentage ?? null);
        setOrgName(org.name);
      }
      setLoading(false);
    });
  }, [activeOrganizationId]);

  // eventsInScope respeta el filtro de evento seleccionado — antes
  // totalCapacity sumaba TODOS los eventos sin importar el <select>, un bug
  // que nunca se notó porque la cuenta demo solo tiene un evento.
  const eventsInScope = selectedEventId ? events.filter((e) => e.id === selectedEventId) : events;
  const totalCapacity = eventsInScope.reduce((sum, e) => sum + e.ticketTypes.reduce((s, t) => s + t.capacity, 0), 0);

  // El aforo/capacidad no es una cifra "de un periodo" — no tiene una lectura
  // sensata de "disponibles en agosto", así que la dona de inventario se queda
  // sin filtrar por fecha (solo respeta el filtro de evento, si hay uno).
  // Deliberadamente NO se usa event_ticket_types.sold aquí: es un contador que
  // se incrementa en cada venta, y en la práctica puede desincronizarse de los
  // boletos reales (confirmado en esta organización: el contador sumaba 31
  // pero solo existen 16 filas reales en `tickets` con una orden pagada) — lo
  // que antes producía justo la inconsistencia que se quiere resolver aquí
  // (dos números que no coinciden entre sí en la misma pantalla). Se usa el
  // mismo conteo real de boletos que ya alimenta "Boletos Vendidos" arriba,
  // pidiendo la misma función pero sin filtro de fecha.
  const [capacityDetail, setCapacityDetail] = useState<OrganizationSalesDetail | null>(null);
  useEffect(() => {
    if (!activeOrganizationId) return;
    let cancelled = false;
    dataService
      .getOrganizationSalesDetail(activeOrganizationId, { eventId: selectedEventId || undefined })
      .then((detail) => { if (!cancelled) setCapacityDetail(detail); });
    return () => { cancelled = true; };
  }, [activeOrganizationId, selectedEventId]);

  const totalSoldAllTime = capacityDetail?.totalTicketsSold ?? 0;
  const percentSold = totalCapacity > 0 ? Math.round((totalSoldAllTime / totalCapacity) * 100) : 0;

  // Reserva contractual de cortesías: se resta de "Disponibles" desde el
  // día uno, aunque todavía no se haya emitido ningún boleto de cortesía
  // real. null en el valor activo según el modo = sin límite = no reserva
  // nada (nunca reutiliza el valor fijo residual cuando el modo es
  // porcentaje sin configurar — mismo criterio que el RPC).
  const courtesyReservedTotal = useMemo(() => {
    if (courtesyMode === 'percentage') {
      if (courtesyPercentage == null) return 0;
      return eventsInScope.reduce((sum, e) => {
        const eventCapacity = e.ticketTypes.reduce((s, t) => s + t.capacity, 0);
        return sum + Math.round((eventCapacity * courtesyPercentage) / 100);
      }, 0);
    }
    if (courtesyTicketsPerEvent == null) return 0;
    return eventsInScope.length * courtesyTicketsPerEvent;
  }, [eventsInScope, courtesyMode, courtesyTicketsPerEvent, courtesyPercentage]);

  // Desglose de "vendidos" por canal — de capacityDetail (sin filtro de
  // fecha), nunca de salesDetail, para que siga cuadrando con totalCapacity
  // (tampoco filtrado por fecha). cortesiaOccupied se acota al espacio que
  // realmente queda después de los otros canales (no totalAvailable de
  // forma independiente), para que online+taquillaDirecto+promotor+
  // cortesiaOccupied+disponibles sume totalCapacity SIEMPRE, incluso si el
  // contrato reserva más cortesías de las que caben físicamente.
  const breakdown = capacityDetail?.breakdown;
  const cortesiaCount = breakdown?.cortesia.count ?? 0;
  const otherSoldCount = (breakdown?.online.count ?? 0) + (breakdown?.taquillaDirecto.count ?? 0) + (breakdown?.promotor.count ?? 0);
  const roomForCourtesy = Math.max(0, totalCapacity - otherSoldCount);
  const cortesiaOccupied = Math.min(Math.max(cortesiaCount, courtesyReservedTotal), roomForCourtesy);
  const totalAvailable = totalCapacity - otherSoldCount - cortesiaOccupied;
  const cortesiaPct = totalCapacity > 0 ? Math.round((cortesiaOccupied / totalCapacity) * 100) : 0;
  const availablePct = totalCapacity > 0 ? Math.round((totalAvailable / totalCapacity) * 100) : 0;
  // % de cupo usado = vendido + reservado para cortesía (aunque no se haya
  // usado todavía) — es lo que realmente ya no está disponible para venta
  // pública, distinto de "% Vendido" que solo cuenta ventas reales. Es el
  // número que debe ir junto a la barra de dos colores (verde+azul), para
  // que el número grande coincida con lo que la barra realmente llena.
  const occupiedCount = totalCapacity - totalAvailable;
  const occupiedPct = totalCapacity > 0 ? Math.round((occupiedCount / totalCapacity) * 100) : 0;

  // Orden fijo (nunca por magnitud) y misma escala (count / totalCapacity)
  // en las 5 filas, para que las barras sean comparables entre sí.
  const breakdownRows = [
    { key: "online", label: "En línea", color: "var(--chart-1)", count: breakdown?.online.count ?? 0 },
    { key: "taquillaDirecto", label: "Taquilla directo", color: "var(--chart-2)", count: breakdown?.taquillaDirecto.count ?? 0 },
    { key: "promotor", label: "Por promotor", color: "var(--chart-3)", count: breakdown?.promotor.count ?? 0 },
    { key: "cortesia", label: "Cortesías", color: "var(--chart-4)", count: cortesiaOccupied },
    { key: "disponible", label: "Disponibles", color: "var(--chart-neutral)", count: totalAvailable },
  ].map((row) => ({ ...row, pct: totalCapacity > 0 ? Math.round((row.count / totalCapacity) * 100) : 0 }));

  const dateRangeInvalid = datePreset === "custom" && !!customDateFrom && !!customDateTo && customDateFrom > customDateTo;

  const periodButtonLabel = useMemo(() => {
    if (datePreset === "custom") {
      if (customDateFrom && customDateTo && !dateRangeInvalid) {
        const from = new Date(`${customDateFrom}T00:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
        const to = new Date(`${customDateTo}T00:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
        return `${from} – ${to}`;
      }
      return "Personalizado";
    }
    return DATE_PRESETS.find((p) => p.id === datePreset)?.label ?? "Todo";
  }, [datePreset, customDateFrom, customDateTo, dateRangeInvalid]);

  const effectiveRange = useMemo(() => {
    const now = new Date();
    if (datePreset === "month") {
      return { dateFrom: toYMD(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: toYMD(now) };
    }
    if (datePreset === "30d") {
      return { dateFrom: toYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), dateTo: toYMD(now) };
    }
    if (datePreset === "custom") {
      if (dateRangeInvalid) return { dateFrom: undefined, dateTo: undefined };
      return { dateFrom: customDateFrom || undefined, dateTo: customDateTo || undefined };
    }
    return { dateFrom: undefined, dateTo: undefined }; // "all"
  }, [datePreset, customDateFrom, customDateTo, dateRangeInvalid]);

  useEffect(() => {
    if (!activeOrganizationId || dateRangeInvalid) return;
    let cancelled = false;
    setSalesLoading(true);
    setSalesError("");
    dataService
      .getOrganizationSalesDetail(activeOrganizationId, {
        eventId: selectedEventId || undefined,
        dateFrom: effectiveRange.dateFrom,
        dateTo: effectiveRange.dateTo,
      })
      .then((detail) => { if (!cancelled) setSalesDetail(detail); })
      .catch(() => { if (!cancelled) setSalesError("No se pudieron cargar las ventas del periodo seleccionado."); })
      .finally(() => { if (!cancelled) setSalesLoading(false); });
    return () => { cancelled = true; };
  }, [activeOrganizationId, selectedEventId, effectiveRange.dateFrom, effectiveRange.dateTo, dateRangeInvalid]);

  const totalSold = salesDetail?.totalTicketsSold ?? 0;
  const totalRevenue = salesDetail?.totalRevenue ?? 0;
  const effectiveTaquillaFeePct = taquillaFeePercentage ?? feePercentage;
  const totalProfit = ((salesDetail?.revenueOnline ?? 0) * feePercentage) / 100
    + ((salesDetail?.revenueTaquilla ?? 0) * effectiveTaquillaFeePct) / 100;

  // Comisión total a promotores: cada promotor puede tener su propio % de
  // comisión (promoter_terms), así que se calcula por promotor individual
  // (promoterRevenueById) y se suma — no un solo % aplicado al total de
  // "por promotor", que sería incorrecto si hay más de un promotor con
  // distinto convenio.
  const promoterRevenueById = salesDetail?.promoterRevenueById ?? {};
  const promoterCommissionTotal = promoterTerms.reduce(
    (sum, term) => sum + ((promoterRevenueById[term.promoterProfileId] ?? 0) * term.commissionPercentage) / 100,
    0
  );
  const netMargin = totalRevenue - totalProfit - promoterCommissionTotal;

  // Mismo orden/color fijo que la lista de desglose de "Inventario en Tiempo
  // Real" — para que una categoría siempre sea el mismo color en toda la
  // pantalla. Barras apiladas (no una sola serie "Boletos") para poder
  // distinguir taquilla directo de promotor dentro de un mismo periodo, sin
  // tener que bajar hasta el desglose de abajo.
  const salesChartConfig: ChartConfig = {
    online: { label: "En línea", color: "var(--chart-1)" },
    taquillaDirecto: { label: "Taquilla directo", color: "var(--chart-2)" },
    promotor: { label: "Por promotor", color: "var(--chart-3)" },
    cortesia: { label: "Cortesías", color: "var(--chart-4)" },
  };
  const salesChartData = (salesDetail?.series ?? []).map((b) => ({
    bucketLabel: b.bucketLabel,
    online: b.breakdown.online,
    taquillaDirecto: b.breakdown.taquillaDirecto,
    promotor: b.breakdown.promotor,
    cortesia: b.breakdown.cortesia,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Page Header + filtros de evento/periodo, todo a la misma altura */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Panel de Control</h1>
          <p className="text-muted-foreground mt-1">Gestión de eventos y resultados financieros</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border-2 border-border bg-background text-sm font-bold outline-none"
          >
            <option value="">Todos los eventos</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name} — {new Date(e.date).toLocaleDateString('es-MX')}</option>
            ))}
          </select>

          <div className="relative" ref={periodMenuRef}>
            <button
              type="button"
              onClick={() => setPeriodMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-border bg-background text-sm font-bold hover:bg-secondary/30 transition-colors"
            >
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {periodButtonLabel}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
            {periodMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-20 p-4 space-y-1">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setDatePreset(p.id); if (p.id !== "custom") setPeriodMenuOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors",
                      datePreset === p.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/40 text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                {datePreset === "custom" && (
                  <div className="pt-3 mt-2 border-t border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground w-12 shrink-0">Desde</label>
                      <input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border-2 border-border bg-background text-sm outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground w-12 shrink-0">Hasta</label>
                      <input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border-2 border-border bg-background text-sm outline-none"
                      />
                    </div>
                    {dateRangeInvalid && (
                      <p className="text-xs text-destructive font-bold">"Desde" debe ser anterior a "Hasta".</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => generateLiquidationSummaryPdf({
              orgName,
              periodLabel: periodButtonLabel,
              eventScopeLabel: selectedEventId ? (events.find((e) => e.id === selectedEventId)?.name ?? "Evento seleccionado") : "Todos los eventos",
              totalCapacity,
              totalSold,
              soldPct: totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0,
              totalAvailable,
              availablePct,
              occupiedPct,
              totalRevenue,
              feePercentage,
              totalProfit,
              promoterCommissionTotal,
              netMargin,
              channelBreakdown: [
                { label: "En línea", count: salesDetail?.breakdown.online.count ?? 0, colorKey: "online" },
                { label: "Taquilla directo", count: salesDetail?.breakdown.taquillaDirecto.count ?? 0, colorKey: "taquillaDirecto" },
                { label: "Por promotor", count: salesDetail?.breakdown.promotor.count ?? 0, colorKey: "promotor" },
                { label: "Cortesías", count: salesDetail?.breakdown.cortesia.count ?? 0, colorKey: "cortesia" },
              ],
              cortesiaReservedCount: cortesiaOccupied,
              cortesiaReservedPct: cortesiaPct,
              peakLabel: salesDetail?.peak ? `${salesDetail.peak.bucketLabel} (${salesDetail.peak.ticketsSold} boletos)` : null,
            })}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-border bg-background font-bold hover:bg-secondary/30 transition-colors disabled:opacity-60"
          >
            <Download className="w-5 h-5" />
            Descargar Resumen
          </button>

          <Link
            to="/organization/create-event"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Crear Evento
          </Link>
        </div>
      </div>
      {salesError && <p className="text-xs text-destructive px-2">{salesError}</p>}

      <main>
        {loading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : (
        <>
        {/* Resumen ejecutivo — boletos (totales/vendidos/disponibles) arriba
            de todo, sin tener que bajar a "Inventario en Tiempo Real" */}
        <div className="mb-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Boletos Totales</p>
                <p className="text-2xl font-bold mt-1">{totalCapacity.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">capacidad de tus eventos</p>
              </div>
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>

            <div className="flex items-center justify-between p-4 bg-success/5 rounded-lg border border-success/20">
              <div>
                <p className="text-sm text-muted-foreground">Boletos Vendidos</p>
                <p className="text-2xl font-bold text-success mt-1">{totalSold.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{totalCapacity > 0 ? `${Math.round((totalSold / totalCapacity) * 100)}% del total` : "—"}</p>
              </div>
              <Users className="w-8 h-8 text-success" />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Disponibles</p>
                <p className="text-2xl font-bold mt-1">{totalAvailable.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{availablePct}% del total</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Monto Bruto</p>
                <p className="text-2xl font-bold text-success mt-1">${totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-success" />
            </div>
          </div>
        </div>

        {/* Resumen de Liquidación */}
        <div className="mb-8 bg-card p-6 rounded-xl border border-border">
          <h3 className="font-semibold mb-6">Resumen de Liquidación</h3>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Monto Bruto Generado</p>
                  <p className="text-2xl font-bold mt-1">${totalRevenue.toLocaleString()}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Fee de Plataforma ({feePercentage}%)
                  </p>
                  <p className="text-2xl font-bold text-primary mt-1">${totalProfit.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Suma de fee digital y de taquilla, según tu convenio
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>

              <div className="flex items-center justify-between p-4 bg-warning/5 rounded-lg border border-warning/20">
                <div>
                  <p className="text-sm text-muted-foreground">Comisión de Promotores</p>
                  <p className="text-2xl font-bold text-warning mt-1">${promoterCommissionTotal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Según convenio de cada promotor
                  </p>
                </div>
                <Megaphone className="w-8 h-8 text-warning" />
              </div>

              <div className="flex items-center justify-between p-4 bg-success/5 rounded-lg border border-success/20">
                <div>
                  <p className="text-sm text-muted-foreground">Margen Neto</p>
                  <p className="text-2xl font-bold text-success mt-1">${netMargin.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bruto − fee de plataforma − comisión de promotores
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-success" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground pt-4 border-t border-border">
              💡 La plataforma cobra por cada boleto emitido, sin importar si el
              cliente pagó con transferencia o efectivo.
            </p>
          </div>
        </div>

        {/* Ventas en el periodo — barras apiladas por canal, para distinguir
            taquilla directo de promotor sin bajar a otra sección */}
        <div className="mb-8">
          <ChartCard
            title="Ventas en el periodo"
            subtitle={selectedEventId ? undefined : "Todos los eventos"}
            config={salesChartConfig}
            height={300}
            empty={!salesLoading && totalSold === 0}
            emptyMessage="No se registraron ventas en el periodo o evento seleccionado."
            footnote={salesDetail?.peak ? `Pico de ventas: ${salesDetail.peak.bucketLabel} (${salesDetail.peak.ticketsSold} boletos)` : undefined}
          >
            <BarChart data={salesChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="bucketLabel" className="fill-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis className="fill-muted-foreground" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="online" stackId="ventas" fill="var(--color-online)" />
              <Bar dataKey="taquillaDirecto" stackId="ventas" fill="var(--color-taquillaDirecto)" />
              <Bar dataKey="promotor" stackId="ventas" fill="var(--color-promotor)" />
              <Bar dataKey="cortesia" stackId="ventas" fill="var(--color-cortesia)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>

        {/* Inventario en Tiempo Real */}
        <div className="mb-8 bg-card p-6 rounded-xl border border-border">
          <h3 className="font-bold mb-6">Inventario en Tiempo Real</h3>
          {totalCapacity === 0 ? (
            <p className="text-sm text-muted-foreground italic">Todavía no hay boletos configurados en tus eventos.</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center pb-6 border-b border-border">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Capacidad total</p>
                  <p className="text-3xl font-bold tracking-tight text-foreground mt-1">{totalCapacity.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">boletos para vender</p>
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm font-bold text-foreground">% de Cupo Usado</span>
                    <span className="text-2xl font-bold text-foreground">{occupiedPct}%</span>
                  </div>
                  {/* El número grande de arriba SIEMPRE debe coincidir con lo
                      que esta barra llena: verde (vendido real) + azul
                      (reservado para cortesía, aunque no se haya usado) =
                      % de Cupo Usado. Lo que queda vacío es lo único
                      realmente disponible. */}
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                    <div className="h-full bg-success" style={{ width: `${percentSold}%` }} />
                    <div className="h-full" style={{ width: `${cortesiaPct}%`, backgroundColor: "var(--chart-4)" }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {percentSold}% vendido ({totalSoldAllTime.toLocaleString()})
                    {cortesiaOccupied > 0 && ` + ${cortesiaPct}% cortesía (${cortesiaOccupied.toLocaleString()})`}
                    {" · "}{totalAvailable.toLocaleString()} disponibles
                  </p>
                </div>
              </div>

              <div className="pt-6 space-y-4">
                {breakdownRows.map((row) => (
                  <div key={row.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
                        {row.label}
                      </span>
                      <span className="flex items-baseline gap-2">
                        <span className="text-sm font-bold tabular-nums text-foreground">{row.count.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground w-10 text-right">{row.pct}%</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </>
        )}
      </main>
    </div>
  );
}
