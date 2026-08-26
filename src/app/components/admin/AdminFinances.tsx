import { Wallet, TrendingUp, ArrowDownRight, ChevronDown, ChevronRight, Building2, Store, Globe } from "lucide-react";
import { dataService } from "../../services/dataService";
import { useEffect, useState } from "react";

type FinanceSummary = Awaited<ReturnType<typeof dataService.getFinanceSummaryByOrganization>>;

export default function AdminFinances() {
    const [summary, setSummary] = useState<FinanceSummary>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

    useEffect(() => {
        dataService.getFinanceSummaryByOrganization().then((data) => {
            setSummary(data);
            setLoading(false);
        });
    }, []);

    const totalRevenue = summary.reduce((s, o) => s + o.totalRevenue, 0);
    const totalProfit = summary.reduce((s, o) => s + o.totalProfit, 0);
    const totalToDeliver = totalRevenue - totalProfit;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Control Financiero</h1>
                <p className="text-muted-foreground mt-1 text-lg">Recaudación y utilidades reales, por organización y evento</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-success/10 rounded-lg">
                            <Wallet className="w-6 h-6 text-success" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">Total Recaudado</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground">${totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Ingresos brutos por venta de boletos (no cancelados)</p>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">Utilidad MondoTicket</p>
                    </div>
                    <p className="text-3xl font-bold text-primary">${totalProfit.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Suma de fees, digital + taquilla, por contrato</p>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <ArrowDownRight className="w-6 h-6 text-orange-700" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">Monto por Liquidar</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground">${totalToDeliver.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Total a entregar a los partners organizadores</p>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-secondary/10">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Recaudación por Organización
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Haz clic en una organización para ver el desglose por evento</p>
                </div>

                {loading && <p className="p-6 text-sm text-muted-foreground">Cargando...</p>}

                {!loading && summary.length === 0 && (
                    <p className="p-6 text-sm text-muted-foreground italic">No hay organizaciones registradas todavía.</p>
                )}

                <div className="divide-y divide-border">
                    {summary.map(({ organization, events, totalRevenue: orgRevenue, totalProfit: orgProfit }) => {
                        const expanded = expandedOrgId === organization.id;
                        return (
                            <div key={organization.id}>
                                <button
                                    onClick={() => setExpandedOrgId(expanded ? null : organization.id)}
                                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                        <div>
                                            <p className="font-bold text-foreground">{organization.name}</p>
                                            <p className="text-xs text-muted-foreground">{events.length} evento{events.length !== 1 ? "s" : ""} · Fee {organization.feePercentage}% digital / {organization.taquillaFeePercentage ?? organization.feePercentage}% taquilla</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 text-right">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Recaudado</p>
                                            <p className="font-bold text-foreground">${orgRevenue.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Ganancia TB</p>
                                            <p className="font-bold text-primary">${orgProfit.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">A Entregar</p>
                                            <p className="font-bold text-success">${(orgRevenue - orgProfit).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </button>

                                {expanded && (
                                    <div className="px-6 pb-6">
                                        {events.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic py-4">Esta organización todavía no tiene eventos.</p>
                                        ) : (
                                            <div className="overflow-x-auto rounded-xl border border-border">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-secondary/10">
                                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Evento</th>
                                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right"><Globe className="w-3.5 h-3.5 inline mr-1" />Digital</th>
                                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right"><Store className="w-3.5 h-3.5 inline mr-1" />Taquilla</th>
                                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ganancia TB</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {events.map(({ event, revenueOnline, revenueTaquilla, profit }) => (
                                                            <tr key={event.id}>
                                                                <td className="px-4 py-3">
                                                                    <p className="font-medium text-sm">{event.name}</p>
                                                                    <p className="text-xs text-muted-foreground">{event.date} · {event.venueName}</p>
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-sm">${revenueOnline.toLocaleString()}</td>
                                                                <td className="px-4 py-3 text-right text-sm">${revenueTaquilla.toLocaleString()}</td>
                                                                <td className="px-4 py-3 text-right text-sm font-bold text-primary">${profit.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
