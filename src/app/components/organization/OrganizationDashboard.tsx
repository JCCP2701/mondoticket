import { Link } from "react-router";
import { Calendar, Users, DollarSign, Clock, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  totalCapacity: number;
  sold: number;
  presaleActive: boolean;
  revenue: number;
  platformFee: number;
  status: "upcoming" | "ongoing" | "completed";
}

const events: Event[] = [
  {
    id: "EVT001",
    name: "Festival Indie CDMX 2026",
    date: "2026-03-15",
    venue: "Foro Sol",
    totalCapacity: 5000,
    sold: 4200,
    presaleActive: true,
    revenue: 840000,
    platformFee: 84000,
    status: "upcoming",
  },
  {
    id: "EVT002",
    name: "Concierto Rock Nacional",
    date: "2026-02-28",
    venue: "Palacio de los Deportes",
    totalCapacity: 3000,
    sold: 3000,
    presaleActive: false,
    revenue: 450000,
    platformFee: 45000,
    status: "completed",
  },
  {
    id: "EVT003",
    name: "Jazz Night Premium",
    date: "2026-03-01",
    venue: "Teatro Metropólitan",
    totalCapacity: 1500,
    sold: 890,
    presaleActive: true,
    revenue: 267000,
    platformFee: 26700,
    status: "ongoing",
  },
  {
    id: "EVT004",
    name: "Festival Electrónico",
    date: "2026-04-20",
    venue: "Autódromo Hermanos Rodríguez",
    totalCapacity: 10000,
    sold: 6500,
    presaleActive: true,
    revenue: 1300000,
    platformFee: 130000,
    status: "upcoming",
  },
];

const inventoryData = [
  { name: "Vendidos", value: 14590, color: "#8b5cf6" },
  { name: "Disponibles", value: 5410, color: "#e5e5e5" },
];

const liquidationSummary = {
  totalRevenue: events.reduce((sum, e) => sum + e.revenue, 0),
  totalPlatformFee: events.reduce((sum, e) => sum + e.platformFee, 0),
  pendingPayment: 155700,
  nextPaymentDate: "2026-02-28",
};

export default function OrganizationDashboard() {
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
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Eventos Activos</p>
            <p className="text-3xl font-bold tracking-tight">{events.length}</p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Boletos Vendidos</p>
            <p className="text-3xl font-bold tracking-tight">
              {events.reduce((sum, e) => sum + e.sold, 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-violet-500/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Revenue Total</p>
            <p className="text-3xl font-bold tracking-tight">
              ${liquidationSummary.totalRevenue.toLocaleString()}
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Pago Pendiente</p>
            <p className="text-3xl font-bold tracking-tight text-amber-600">
              ${liquidationSummary.pendingPayment.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Inventory & Liquidation */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inventario en Tiempo Real */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="font-semibold mb-6">Inventario en Tiempo Real</h3>
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
                <p className="text-2xl font-bold">{inventoryData[0].value}</p>
                <p className="text-xs text-muted-foreground">Vendidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{inventoryData[1].value}</p>
                <p className="text-xs text-muted-foreground">Disponibles</p>
              </div>
            </div>
          </div>

          {/* Vista de Liquidación */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="font-semibold mb-6">Resumen de Liquidación</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue Total Generado</p>
                  <p className="text-2xl font-bold mt-1">
                    ${liquidationSummary.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>

              <div className="flex items-center justify-between p-4 bg-violet-50 rounded-lg border border-primary/20">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Fee de Plataforma (10%)
                  </p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    ${liquidationSummary.totalPlatformFee.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Independiente del método de pago del cliente
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>

              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pendiente de Pago a Plataforma
                  </p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    ${liquidationSummary.pendingPayment.toLocaleString()}
                  </p>
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    Vence: {liquidationSummary.nextPaymentDate}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3">
                  💡 La plataforma cobra por cada boleto emitido, sin importar si el
                  cliente pagó con transferencia o efectivo.
                </p>
                <button className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                  Realizar Pago de Liquidación
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}