import { Link, useNavigate } from "react-router";
import { DollarSign, AlertCircle, Plus, Users, Ticket, FileText, Gift, RotateCcw, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useMemo, useState, useEffect } from "react";
import { dataService, Organization, EventRecord } from "../../services/dataService";
import { AuthUser } from "../../context/AuthContext";
import { StatCard } from "../shared/dashboard/StatCard";
import { StatCardGrid } from "../shared/dashboard/StatCardGrid";
import { ChartCard } from "../shared/dashboard/ChartCard";
import { DashboardTableCard } from "../shared/dashboard/DashboardTableCard";
import { ChartTooltip, ChartTooltipContent, type ChartConfig } from "../ui/chart";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalSold: 0, totalCapacity: 0, totalRevenue: 0, totalProfit: 0, orgCount: 0, eventCount: 0 });
  const [statsByEvent, setStatsByEvent] = useState<Record<string, { courtesyCount: number; refundedCount: number }>>({});
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([]);

  useEffect(() => {
    dataService.getOrganizations().then(setOrganizations);
    dataService.getEvents().then((evs) => {
      setEvents(evs);
      dataService.getEventStatsSummary(evs.map((e) => e.id)).then(setStatsByEvent);
    });
    dataService.getGlobalStats().then(setStats);
    dataService.getUsers().then(setUsers);
    dataService.getMonthlyRevenueSeries(6).then(setRevenueData);
  }, []);

  const handleFeeChange = async (id: string, newFee: number) => {
    await dataService.updateOrganizationFee(id, newFee);
    setOrganizations(await dataService.getOrganizations());
  };

  const normalUserCount = users.filter((u) => u.role === 'user').length;
  const orgUserCount = users.filter((u) => u.role === 'organization').length;

  // Ranked revenue-by-organization for "Distribución de Ventas" — same
  // per-org revenue calculation the partners table already does per row,
  // just aggregated once and sorted, top 5 + an "Otras" bucket for the rest.
  const revenueByOrg = useMemo(() => {
    const rows = organizations.map((org) => {
      const orgEvents = events.filter((e) => e.organizationId === org.id);
      const revenue = orgEvents.reduce((sum, e) => sum + e.ticketTypes.reduce((s, t) => s + t.sold * t.price, 0), 0);
      return { name: org.name, revenue };
    }).filter((r) => r.revenue > 0).sort((a, b) => b.revenue - a.revenue);

    const top = rows.slice(0, 5);
    const rest = rows.slice(5);
    if (rest.length > 0) {
      top.push({ name: "Otras", revenue: rest.reduce((s, r) => s + r.revenue, 0) });
    }
    return top;
  }, [organizations, events]);

  const revenueByOrgConfig: ChartConfig = { revenue: { label: "Ingreso", color: "var(--chart-2)" } };
  const monthlyRevenueConfig: ChartConfig = { revenue: { label: "Recaudación", color: "var(--chart-1)" } };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-border shadow-sm mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard General</h1>
          <p className="text-muted-foreground">Vista global de operaciones y rendimiento</p>
        </div>
        <Link
          to="/admin/create-organization"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Nueva Organización
        </Link>
      </div>

      <main>
        {/* Resumen ejecutivo */}
        <div className="mb-8">
          <StatCardGrid columns={4}>
            <StatCard
              label="Ganancia Estimada (Fees)"
              value={`$${stats.totalProfit.toLocaleString()}`}
              icon={DollarSign}
              caption={`De $${stats.totalRevenue.toLocaleString()} en ventas`}
            />
            <StatCard
              label="Boletos Vendidos"
              value={stats.totalSold.toLocaleString()}
              icon={Ticket}
              status="good"
              caption={`${(stats.totalCapacity ? (stats.totalSold / stats.totalCapacity) * 100 : 0).toFixed(1)}% de ocupación total`}
            />
            <StatCard
              label="Boletos por Vender"
              value={(stats.totalCapacity - stats.totalSold).toLocaleString()}
              icon={AlertCircle}
              status="warning"
              caption={`En ${stats.eventCount} eventos activos`}
            />
            <StatCard
              label="Organizaciones"
              value={String(organizations.length)}
              icon={Users}
              caption="Control de partners activos"
            />
          </StatCardGrid>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Recaudación Mensual" subtitle="Últimos 6 meses" config={monthlyRevenueConfig} empty={revenueData.length === 0}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="month" className="fill-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis className="fill-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartCard>

          <ChartCard
            title="Distribución de Ventas"
            subtitle="Ingreso por organización"
            config={revenueByOrgConfig}
            empty={revenueByOrg.length === 0}
            emptyMessage="Todavía no hay ventas registradas."
          >
            <BarChart data={revenueByOrg} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
              <XAxis type="number" className="fill-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" className="fill-muted-foreground" fontSize={12} tickLine={false} axisLine={false} width={90} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartCard>
        </div>

        {/* Partners Table */}
        <DashboardTableCard
          title="Control de Organizaciones"
          subtitle="Boletos comprados, por vender y control de recaudación"
          isEmpty={organizations.length === 0}
          emptyMessage="Todavía no hay organizaciones registradas."
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Organización
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-muted-foreground">
                    Boletos Vendidos
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-muted-foreground">
                    Por Vender
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">
                    Recaudado (Total)
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">
                    A Entregar
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">
                    Ganancia (Fee)
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-muted-foreground">
                    Cortesías / Reembolsos
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-muted-foreground">
                    Fee %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.map((org) => {
                  const orgEvents = events.filter(e => e.organizationId === org.id);
                  const sold = orgEvents.reduce((sum, e) => sum + e.ticketTypes.reduce((s, t) => s + t.sold, 0), 0);
                  const total = orgEvents.reduce((sum, e) => sum + e.ticketTypes.reduce((s, t) => s + t.capacity, 0), 0);
                  const revenue = orgEvents.reduce((sum, e) => sum + e.ticketTypes.reduce((s, t) => s + t.sold * t.price, 0), 0);
                  const profit = (revenue * org.feePercentage) / 100;
                  const toDeliver = revenue - profit;
                  const courtesyCount = orgEvents.reduce((sum, e) => sum + (statsByEvent[e.id]?.courtesyCount ?? 0), 0);
                  const refundedCount = orgEvents.reduce((sum, e) => sum + (statsByEvent[e.id]?.refundedCount ?? 0), 0);

                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.contactEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        {sold.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center text-amber-600">
                        {(total - sold).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        ${revenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-success">
                        ${toDeliver.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-primary font-bold">
                        ${profit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary" title="Cortesías">
                            <Gift className="w-3.5 h-3.5" /> {courtesyCount}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600" title="Reembolsos">
                            <RotateCcw className="w-3.5 h-3.5" /> {refundedCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {editingId === org.id ? (
                            <>
                              <input
                                type="number"
                                defaultValue={org.feePercentage}
                                onBlur={(e) => {
                                  handleFeeChange(org.id, parseFloat(e.target.value));
                                  setEditingId(null);
                                }}
                                className="w-16 px-2 py-1 text-center border border-primary rounded-lg bg-background"
                                autoFocus
                              />
                            </>
                          ) : (
                            <button
                              onClick={() => setEditingId(org.id)}
                              className="px-3 py-1 bg-secondary hover:bg-primary/10 rounded-lg transition-colors font-medium border border-border"
                            >
                              {org.feePercentage}%
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DashboardTableCard>

        {/* Additional Management Sections */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Gestión de Usuarios
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Control de usuarios normales y administradores de organizaciones.
            </p>
            <div className="space-y-4">
              <button onClick={() => navigate('/admin/users?role=user')} className="w-full py-3 bg-secondary hover:bg-secondary/70 rounded-lg text-sm font-medium transition-colors text-left px-4 flex justify-between items-center">
                <span>Ver Usuarios Normales</span>
                <span className="bg-background px-2 py-1 rounded text-xs">Total: {normalUserCount}</span>
              </button>
              <button onClick={() => navigate('/admin/users?role=organization')} className="w-full py-3 bg-secondary hover:bg-secondary/70 rounded-lg text-sm font-medium transition-colors text-left px-4 flex justify-between items-center">
                <span>Ver Usuarios Organizaciones</span>
                <span className="bg-background px-2 py-1 rounded text-xs">Total: {orgUserCount}</span>
              </button>
            </div>
          </div>

          <Link
            to="/admin/finances"
            className="bg-card p-6 rounded-xl border border-border hover:border-primary/40 transition-colors flex flex-col"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Contratos & Convenios
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Analiza a detalle, por organización y evento, lo recaudado en línea vs. en taquilla, y cuánto le corresponde a cada quién.
            </p>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-primary">
              Ver detalle financiero completo
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}