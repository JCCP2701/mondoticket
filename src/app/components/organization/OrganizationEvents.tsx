import { Link } from "react-router";
import { Eye, Plus, Search, Filter, Calendar, Gift, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { dataService, EventRecord } from "../../services/dataService";
import { useAuth } from "../../context/AuthContext";

export default function OrganizationEvents() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [events, setEvents] = useState<EventRecord[]>([]);
    const [statsByEvent, setStatsByEvent] = useState<Record<string, { courtesyCount: number; refundedCount: number }>>({});

    useEffect(() => {
        if (!user?.organizationId) return;
        dataService.getEventsByOrganization(user.organizationId).then((evs) => {
            setEvents(evs);
            dataService.getEventStatsSummary(evs.map((e) => e.id)).then(setStatsByEvent);
        });
    }, [user]);

    const mockEvents = events.map((e) => {
        const sold = e.ticketTypes.reduce((s, t) => s + t.sold, 0);
        const totalCapacity = e.ticketTypes.reduce((s, t) => s + t.capacity, 0);
        const revenue = e.ticketTypes.reduce((s, t) => s + t.sold * t.price, 0);
        return {
            id: e.id,
            name: e.name,
            date: e.date,
            venue: e.venueName,
            totalCapacity,
            sold,
            presaleActive: e.status === "upcoming",
            revenue,
            platformFee: revenue * 0.1,
            status: e.status,
            courtesyCount: statsByEvent[e.id]?.courtesyCount ?? 0,
            refundedCount: statsByEvent[e.id]?.refundedCount ?? 0,
        };
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-foreground">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mis Eventos</h1>
                    <p className="text-muted-foreground mt-1">Gestiona el inventario, precios y estados de tus eventos</p>
                </div>
                <Link
                    to="/organization/create-event"
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Evento
                </Link>
            </div>

            {/* Filters Area */}
            <div className="flex gap-4 items-center bg-card p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o recinto..."
                        className="w-full pl-12 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl hover:bg-secondary transition-all font-medium">
                    <Filter className="w-4 h-4" />
                    Filtros
                </button>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-secondary/20 border-b border-border">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Evento</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Ocupación</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Preventa</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Revenue</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Cortesías / Reembolsos</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {mockEvents.map((event) => {
                                const occupancyPercent = event.totalCapacity ? (event.sold / event.totalCapacity) * 100 : 0;
                                return (
                                    <tr key={event.id} className="hover:bg-secondary/10 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-lg">{event.name}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {event.date} • {event.venue}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center">
                                                <div className="w-32 bg-secondary rounded-full h-2 mb-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${occupancyPercent >= 90 ? "bg-green-500" : occupancyPercent >= 60 ? "bg-primary" : "bg-orange-500"
                                                            }`}
                                                        style={{ width: `${occupancyPercent}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold">{event.sold} / {event.totalCapacity} ({occupancyPercent.toFixed(0)}%)</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${event.presaleActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                                }`}>
                                                {event.presaleActive && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                                                {event.presaleActive ? "Activa" : "Cerrada"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-bold text-foreground">${event.revenue.toLocaleString()}</p>
                                            <p className="text-[10px] text-primary lowercase font-medium">Fee: ${event.platformFee.toLocaleString()}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-4">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600" title="Cortesías">
                                                    <Gift className="w-3.5 h-3.5" /> {event.courtesyCount}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600" title="Reembolsos">
                                                    <RotateCcw className="w-3.5 h-3.5" /> {event.refundedCount}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${event.status === "completed" ? "bg-gray-200 text-gray-700" : event.status === "ongoing" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                                                }`}>
                                                {event.status === "completed" ? "Finalizado" : event.status === "ongoing" ? "En Venta" : "Próximo"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Link
                                                to={`/organization/event/${event.id}`}
                                                className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-all inline-flex items-center gap-2 font-bold text-sm"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Detalles
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
