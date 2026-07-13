import { Link } from "react-router";
import { ArrowLeft, DollarSign, AlertCircle, TrendingUp, Plus, Users, Ticket, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useState, useEffect } from "react";
import { dataService, Organization, Event } from "../../services/dataService";

export default function SuperAdminDashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setOrganizations(dataService.getOrganizations());
    setEvents(dataService.getEvents());
  }, []);

  const stats = dataService.getGlobalStats();

  const handleFeeChange = (id: string, newFee: number) => {
    dataService.updateOrganizationFee(id, newFee);
    setOrganizations(dataService.getOrganizations());
  };

  // Prepare chart data from real events (grouped by month or similar)
  // For now using static for charts but dynamic for KPIs and Table
  const revenueData = [
    { month: "Ene", revenue: 45000 },
    { month: "Feb", revenue: 52000 },
    { month: "Mar", revenue: stats.totalRevenue / 10 },
    { month: "Abr", revenue: 61000 },
    { month: "May", revenue: 55000 },
    { month: "Jun", revenue: 67000 },
  ];

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
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Ganancia Estimada (Fees)</p>
            <p className="text-3xl font-bold tracking-tight">
              ${stats.totalProfit.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              De ${stats.totalRevenue.toLocaleString()} en ventas
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Ticket className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Boletos Vendidos</p>
            <p className="text-3xl font-bold tracking-tight">
              {stats.totalSold.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {((stats.totalSold / stats.totalCapacity) * 100).toFixed(1)}% de ocupación total
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Boletos por Vender</p>
            <p className="text-3xl font-bold tracking-tight text-amber-600">
              {(stats.totalCapacity - stats.totalSold).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              En {stats.eventCount} eventos activos
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-violet-500/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Organizaciones</p>
            <p className="text-3xl font-bold tracking-tight">{organizations.length}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Control de partners activos
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="font-semibold mb-6">Recaudación Mensual</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" stroke="#737373" fontSize={12} />
                <YAxis stroke="#737373" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="font-semibold mb-6">Distribución de Ventas</h3>
            <div className="h-[240px] flex items-center justify-center text-muted-foreground italic">
              Ventas por categoría y organización disponible próximamente
            </div>
          </div>
        </div>

        {/* Partners Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Control de Organizaciones</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Boletos comprados, por vender y control de recaudación
              </p>
            </div>
          </div>

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
                    Fee %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.map((org) => {
                  const orgEvents = events.filter(e => e.organizationId === org.id);
                  const sold = orgEvents.reduce((sum, e) => sum + e.sold, 0);
                  const total = orgEvents.reduce((sum, e) => sum + e.totalCapacity, 0);
                  const revenue = orgEvents.reduce((sum, e) => sum + (e.sold * e.price), 0);
                  const profit = (revenue * org.feePercentage) / 100;
                  const toDeliver = revenue - profit;

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
                      <td className="px-6 py-4 text-right text-green-600">
                        ${toDeliver.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-primary font-bold">
                        ${profit.toLocaleString()}
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
        </div>

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
              <button className="w-full py-3 bg-secondary hover:bg-secondary/70 rounded-lg text-sm font-medium transition-colors text-left px-4 flex justify-between items-center">
                <span>Ver Usuarios Normales</span>
                <span className="bg-background px-2 py-1 rounded text-xs">Total: 124</span>
              </button>
              <button className="w-full py-3 bg-secondary hover:bg-secondary/70 rounded-lg text-sm font-medium transition-colors text-left px-4 flex justify-between items-center">
                <span>Ver Usuarios Organizaciones</span>
                <span className="bg-background px-2 py-1 rounded text-xs">Total: {organizations.length}</span>
              </button>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Contratos & Convenios
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Analiza detalladamente el dinero a entregar y nuestras ganancias.
            </p>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex justify-between mb-2">
                <span className="text-sm">Total Recaudado:</span>
                <span className="font-bold">${stats.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-primary">Ganancia TicketFlow:</span>
                <span className="font-bold text-primary">${stats.totalProfit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-primary/10">
                <span className="text-sm font-medium">Total a Entregar:</span>
                <span className="font-bold text-green-600">${(stats.totalRevenue - stats.totalProfit).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}