import { useEffect, useMemo, useState } from "react";
import { Handshake, LogOut, Wallet, Calendar, Building2, ChevronDown, ChevronRight, Receipt } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { dataService, BrokerTransaction } from "../../services/dataService";

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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-primary/10 rounded-lg"><Wallet className="w-6 h-6 text-primary" /></div>
                            <p className="text-sm font-bold text-muted-foreground">Ganado en total</p>
                        </div>
                        <p className="text-3xl font-bold text-primary">{money(totalAllTime)}</p>
                    </div>
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg"><Calendar className="w-6 h-6 text-green-700" /></div>
                            <p className="text-sm font-bold text-muted-foreground">Este mes</p>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{money(totalThisMonth)}</p>
                    </div>
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-teal-100 rounded-lg"><Building2 className="w-6 h-6 text-teal-700" /></div>
                            <p className="text-sm font-bold text-muted-foreground">Organizaciones</p>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{byOrg.length}</p>
                    </div>
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-100 rounded-lg"><Receipt className="w-6 h-6 text-amber-700" /></div>
                            <p className="text-sm font-bold text-muted-foreground">Eventos</p>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{eventCount}</p>
                    </div>
                </div>

                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border bg-secondary/10">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary" /> Ganancias por organización
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">Haz clic en una organización para ver el desglose por evento</p>
                    </div>

                    {byOrg.length === 0 && (
                        <p className="p-6 text-sm text-muted-foreground italic">Todavía no tienes organizaciones bajo contrato, o no han tenido ventas.</p>
                    )}

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
                </div>

                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border bg-secondary/10">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-primary" /> Historial de transacciones
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">Cada compra pagada que generó ganancia para ti, más reciente primero</p>
                    </div>

                    {transactions.length === 0 ? (
                        <p className="p-6 text-sm text-muted-foreground italic">Todavía no hay transacciones.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-secondary/10">
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Evento</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Organización</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Base</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Comisión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {transactions.map((t) => (
                                        <tr key={t.orderId}>
                                            <td className="px-6 py-3 text-sm text-muted-foreground">{new Date(t.paidAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-6 py-3 text-sm font-medium">{t.eventName}</td>
                                            <td className="px-6 py-3 text-sm text-muted-foreground">{t.organizationName}</td>
                                            <td className="px-6 py-3 text-xs text-muted-foreground">{t.commissionPercentage}% · {BASIS_LABEL[t.commissionBasis]}</td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-primary">{money(t.commissionAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
