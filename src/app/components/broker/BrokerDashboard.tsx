import { useEffect, useMemo, useState } from "react";
import { Handshake, LogOut, Wallet, Calendar, Building2, ChevronDown, ChevronRight, Receipt } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAuth } from "../../context/AuthContext";
import { dataService, BrokerTransaction } from "../../services/dataService";
import { StatCard } from "../shared/dashboard/StatCard";
import { StatCardGrid } from "../shared/dashboard/StatCardGrid";
import { ChartCard } from "../shared/dashboard/ChartCard";
import { DashboardTableCard } from "../shared/dashboard/DashboardTableCard";
import { ChartTooltip, ChartTooltipContent, type ChartConfig } from "../ui/chart";

const BASIS_LABEL: Record<BrokerTransaction['commissionBasis'], string> = {
    ticket_revenue: 'venta de boletos',
    platform_fee: 'fee de la plataforma',
};

function money(n: number): string {
    return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BrokerDashboard() {
    const { user, logout } = useAuth();
    const [transactions, setTransactions] = useState<BrokerTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

    useEffect(() => {
        dataService.getBrokerTransactions().then((rows) => {
            setTransactions(rows);
            setLoading(false);
        });
    }, []);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalAllTime = useMemo(() => transactions.reduce((s, t) => s + t.commissionAmount, 0), [transactions]);
    const totalThisMonth = useMemo(
        () => transactions.filter((t) => t.paidAt.slice(0, 7) === currentMonthKey).reduce((s, t) => s + t.commissionAmount, 0),
        [transactions, currentMonthKey]
    );

    const byOrg = useMemo(() => {
        const map = new Map<string, { organizationId: string; organizationName: string; total: number; events: Map<string, { eventName: string; eventDate: string; total: number }> }>();
        for (const t of transactions) {
            if (!map.has(t.organizationId)) {
                map.set(t.organizationId, { organizationId: t.organizationId, organizationName: t.organizationName, total: 0, events: new Map() });
            }
            const org = map.get(t.organizationId)!;
            org.total += t.commissionAmount;
            if (!org.events.has(t.eventId)) org.events.set(t.eventId, { eventName: t.eventName, eventDate: t.eventDate, total: 0 });
            org.events.get(t.eventId)!.total += t.commissionAmount;
        }
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [transactions]);

    const eventCount = useMemo(() => new Set(transactions.map((t) => t.eventId)).size, [transactions]);

    // Historial de transacciones: una fila por EVENTO (sumando todas las
    // órdenes que lo componen), no una fila por orden/boleto individual.
    // commissionBasis/commissionPercentage son iguales para todas las
    // transacciones de un mismo evento (vienen del contrato por
    // organización, no cambian orden a orden), así que basta con tomar el
    // primer valor visto.
    const transactionsByEvent = useMemo(() => {
        const map = new Map<string, {
            eventId: string;
            eventName: string;
            eventDate: string;
            organizationName: string;
            commissionBasis: BrokerTransaction['commissionBasis'];
            commissionPercentage: number;
            totalCommission: number;
            orderCount: number;
            lastPaidAt: string;
        }>();
        for (const t of transactions) {
            if (!map.has(t.eventId)) {
                map.set(t.eventId, {
                    eventId: t.eventId,
                    eventName: t.eventName,
                    eventDate: t.eventDate,
                    organizationName: t.organizationName,
                    commissionBasis: t.commissionBasis,
                    commissionPercentage: t.commissionPercentage,
                    totalCommission: 0,
                    orderCount: 0,
                    lastPaidAt: t.paidAt,
                });
            }
            const e = map.get(t.eventId)!;
            e.totalCommission += t.commissionAmount;
            e.orderCount += 1;
            if (t.paidAt > e.lastPaidAt) e.lastPaidAt = t.paidAt;
        }
        return Array.from(map.values()).sort((a, b) => b.lastPaidAt.localeCompare(a.lastPaidAt));
    }, [transactions]);

    // Monthly commission — the one genuinely new chart in this dashboard,
    // grouping the already-loaded transactions by month (last 6, zero-filled),
    // mirroring the shape of getMonthlyRevenueSeries used elsewhere.
    const monthlyCommission = useMemo(() => {
        const buckets: { month: string; key: string; commission: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            buckets.push({
                month: d.toLocaleDateString('es-MX', { month: 'short' }),
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                commission: 0,
            });
        }
        for (const t of transactions) {
            const bucket = buckets.find((b) => b.key === t.paidAt.slice(0, 7));
            if (bucket) bucket.commission += t.commissionAmount;
        }
        return buckets;
    }, [transactions]);

    const monthlyCommissionConfig: ChartConfig = { commission: { label: "Comisión", color: "var(--chart-1)" } };

    if (loading) return <div className="min-h-screen bg-background text-foreground p-8 text-muted-foreground">Cargando...</div>;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-10">
                <div className="px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <Handshake className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-bold">Broker</h1>
                            <p className="text-xs text-sidebar-foreground/60">{user?.name}</p>
                        </div>
                    </div>
                    <button onClick={() => logout()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-sidebar-border hover:bg-sidebar-accent text-sm font-bold">
                        <LogOut className="w-4 h-4" /> Salir
                    </button>
                </div>
            </header>

            <main className="px-8 py-8 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Tus ganancias</h2>
                    <p className="text-muted-foreground mt-1">Tu comisión ya calculada por organización y evento. No incluye el ingreso real de cada evento.</p>
                </div>

                <StatCardGrid columns={4}>
                    <StatCard label="Ganado en total" value={money(totalAllTime)} icon={Wallet} />
                    <StatCard label="Este mes" value={money(totalThisMonth)} icon={Calendar} status="good" />
                    <StatCard label="Organizaciones" value={String(byOrg.length)} icon={Building2} />
                    <StatCard label="Eventos" value={String(eventCount)} icon={Receipt} />
                </StatCardGrid>

                <ChartCard
                    title="Comisión mensual"
                    subtitle="Últimos 6 meses"
                    config={monthlyCommissionConfig}
                    empty={monthlyCommission.every((b) => b.commission === 0)}
                    emptyMessage="Todavía no hay comisiones en este periodo."
                >
                    <BarChart data={monthlyCommission}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                        <XAxis dataKey="month" className="fill-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis className="fill-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="commission" fill="var(--color-commission)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ChartCard>

                <DashboardTableCard
                    title="Ganancias por organización"
                    subtitle="Haz clic en una organización para ver el desglose por evento"
                    isEmpty={byOrg.length === 0}
                    emptyMessage="Todavía no tienes organizaciones bajo contrato, o no han tenido ventas."
                >
                    <div className="divide-y divide-border">
                        {byOrg.map((org) => {
                            const expanded = expandedOrgId === org.organizationId;
                            const events = Array.from(org.events.values()).sort((a, b) => b.total - a.total);
                            return (
                                <div key={org.organizationId}>
                                    <button
                                        onClick={() => setExpandedOrgId(expanded ? null : org.organizationId)}
                                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                            <div>
                                                <p className="font-bold text-foreground">{org.organizationName}</p>
                                                <p className="text-xs text-muted-foreground">{events.length} evento{events.length !== 1 ? "s" : ""} con ganancia</p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-primary">{money(org.total)}</p>
                                    </button>
                                    {expanded && (
                                        <div className="px-6 pb-6">
                                            <div className="overflow-x-auto rounded-xl border border-border">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-secondary/10">
                                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Evento</th>
                                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Tu ganancia</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {events.map((e, i) => (
                                                            <tr key={i}>
                                                                <td className="px-4 py-3">
                                                                    <p className="font-medium text-sm">{e.eventName}</p>
                                                                    <p className="text-xs text-muted-foreground">{new Date(e.eventDate + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-sm font-bold text-primary">{money(e.total)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </DashboardTableCard>

                <DashboardTableCard
                    title="Historial de transacciones"
                    subtitle="Una fila por evento, sumando todas sus ventas — más reciente primero"
                    isEmpty={transactionsByEvent.length === 0}
                    emptyMessage="Todavía no hay transacciones."
                >
                    <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-secondary/10">
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Evento</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Organización</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Base</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ventas</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Comisión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {transactionsByEvent.map((e) => (
                                        <tr key={e.eventId}>
                                            <td className="px-6 py-3">
                                                <p className="text-sm font-medium">{e.eventName}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(e.eventDate + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                            </td>
                                            <td className="px-6 py-3 text-sm text-muted-foreground">{e.organizationName}</td>
                                            <td className="px-6 py-3 text-xs text-muted-foreground">{e.commissionPercentage}% · {BASIS_LABEL[e.commissionBasis]}</td>
                                            <td className="px-6 py-3 text-right text-sm text-muted-foreground">{e.orderCount}</td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-primary">{money(e.totalCommission)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                    </div>
                </DashboardTableCard>
            </main>
        </div>
    );
}
