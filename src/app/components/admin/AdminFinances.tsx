import { Wallet, TrendingUp, ArrowDownRight, ArrowUpRight, FileText, Download, Filter } from "lucide-react";
import { dataService } from "../../services/dataService";
import { useEffect, useState } from "react";

export default function AdminFinances() {
    const [stats, setStats] = useState(dataService.getGlobalStats());

    useEffect(() => {
        setStats(dataService.getGlobalStats());
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Control Financiero</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Conciliación, pagos y utilidades del sistema</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-xl font-bold hover:bg-secondary transition-all">
                    <Download className="w-5 h-5 text-primary" />
                    Exportar Reporte
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Wallet className="w-6 h-6 text-green-700" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">Total Recaudado</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground">${stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Ingresos brutos por venta de boletos</p>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">Utilidad TicketFlow</p>
                    </div>
                    <p className="text-3xl font-bold text-primary">${stats.totalProfit.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Ganancia neta basada en fees contractuales</p>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <ArrowDownRight className="w-6 h-6 text-orange-700" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">Monto por Liquidar</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground">${(stats.totalRevenue - stats.totalProfit).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Total a entregar a los partners organizadores</p>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-secondary/10 flex items-center justify-between">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Liquidaciones Recientes
                    </h3>
                    <button className="text-sm text-primary font-bold hover:underline py-2 px-4 rounded-lg bg-primary/5">
                        Ver Historial Completo
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-secondary/5 border-b border-border">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Organización</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Recaudado</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Fee (%)</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ganancia TB</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">A Entregar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {/* Demo dynamic calculation in view */}
                            <tr className="hover:bg-secondary/20 transition-colors group">
                                <td className="px-6 py-4 font-bold text-foreground">EventPro México</td>
                                <td className="px-6 py-4 text-right">${stats.totalRevenue.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">10%</td>
                                <td className="px-6 py-4 text-right font-bold text-primary">${stats.totalProfit.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-bold text-green-700">${(stats.totalRevenue - stats.totalProfit).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
