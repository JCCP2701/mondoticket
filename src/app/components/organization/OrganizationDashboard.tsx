import { Link } from "react-router";
import { Calendar, Users, DollarSign, TrendingUp, CheckCircle2, Plus, Download } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { dataService, EventRecord } from "../../services/dataService";
import { useAuth } from "../../context/AuthContext";
import { generateLiquidationSummaryPdf } from "../../lib/pdf";

export default function OrganizationDashboard() {
  const { activeOrganizationId } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [orgName, setOrgName] = useState("");
  const [feePercentage, setFeePercentage] = useState(10);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrganizationId) return;
    setLoading(true);
    Promise.all([
      dataService.getEventsByOrganization(activeOrganizationId),
      dataService.getOrganizations(),
      dataService.getFinanceSummaryByOrganization(),
    ]).then(([evs, orgs, financeByOrg]) => {
      setEvents(evs);
      const org = orgs.find((o) => o.id === activeOrganizationId);
      if (org) {
        setFeePercentage(org.feePercentage);
        setOrgName(org.name);
      }
      const own = financeByOrg.find((f) => f.organization.id === activeOrganizationId);
      setTotalRevenue(own?.totalRevenue ?? 0);
      setTotalProfit(own?.totalProfit ?? 0);
      setLoading(false);
    });
  }, [activeOrganizationId]);

  const activeEvents = events.filter((e) => e.status === "upcoming" || e.status === "ongoing");
  const totalSold = events.reduce((sum, e) => sum + e.ticketTypes.reduce((s, t) => s + t.sold, 0), 0);
  const totalCapacity = events.reduce((sum, e) => sum + e.ticketTypes.reduce((s, t) => s + t.capacity, 0), 0);
  const totalAvailable = Math.max(0, totalCapacity - totalSold);

  const inventoryData = [
    { name: "Vendidos", value: totalSold, color: "#328022" },
    { name: "Disponibles", value: totalAvailable, color: "#e5e5e5" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Panel de Control</h1>
          <p className="text-muted-foreground mt-1">Gestión de eventos y resultados financieros</p>
        </div>
        <Link
          to="/organization/create-event"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Crear Evento
        </Link>
      </div>

      <main>
        {loading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : (
        <>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Eventos Activos</p>
            <p className="text-3xl font-bold tracking-tight">{activeEvents.length}</p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Boletos Vendidos</p>
            <p className="text-3xl font-bold tracking-tight">{totalSold.toLocaleString()}</p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-violet-500/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Revenue Total</p>
            <p className="text-3xl font-bold tracking-tight">${totalRevenue.toLocaleString()}</p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Fee a Liquidar</p>
            <p className="text-3xl font-bold tracking-tight text-amber-600">${totalProfit.toLocaleString()}</p>
          </div>
        </div>

        {/* Inventory & Liquidation */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inventario en Tiempo Real */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="font-semibold mb-6">Inventario en Tiempo Real</h3>
            {totalCapacity === 0 ? (
              <p className="text-sm text-muted-foreground italic py-10 text-center">Todavía no hay boletos configurados en tus eventos.</p>
            ) : (
              <>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {inventoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-8 mt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{totalSold.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Vendidos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{totalAvailable.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Disponibles</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Vista de Liquidación */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="font-semibold mb-6">Resumen de Liquidación</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue Total Generado</p>
                  <p className="text-2xl font-bold mt-1">${totalRevenue.toLocaleString()}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>

              <div className="flex items-center justify-between p-4 bg-violet-50 rounded-lg border border-primary/20">
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

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3">
                  💡 La plataforma cobra por cada boleto emitido, sin importar si el
                  cliente pagó con transferencia o efectivo.
                </p>
                <button
                  onClick={() => generateLiquidationSummaryPdf({
                    orgName,
                    periodLabel: new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
                    activeEvents: activeEvents.length,
                    totalSold,
                    totalRevenue,
                    feePercentage,
                    totalProfit,
                  })}
                  className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar Resumen
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  );
}
