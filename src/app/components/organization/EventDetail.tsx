import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Edit2,
  Ticket as TicketIcon,
  DollarSign,
  TrendingUp,
  AlertCircle,
  MoreVertical
} from "lucide-react";
import { useState } from "react";

interface Ticket {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
  total: number;
  paymentMethod: "transfer" | "cash";
  paymentStatus: "paid" | "pending" | "partial" | "cancelled";
  purchaseDate: string;
}

const mockTickets: Ticket[] = [
  {
    id: "TKT_001",
    customerName: "Ana García Martínez",
    customerEmail: "ana.garcia@email.com",
    customerPhone: "+52 55 1234 5678",
    quantity: 2,
    total: 420,
    paymentMethod: "transfer",
    paymentStatus: "paid",
    purchaseDate: "2026-02-10T10:30:00",
  },
  {
    id: "TKT_002",
    customerName: "Carlos Rodríguez López",
    customerEmail: "carlos.r@email.com",
    customerPhone: "+52 55 9876 5432",
    quantity: 1,
    total: 210,
    paymentMethod: "cash",
    paymentStatus: "pending",
    purchaseDate: "2026-02-12T15:45:00",
  },
  {
    id: "TKT_003",
    customerName: "María Fernanda Soto",
    customerEmail: "mf.soto@email.com",
    customerPhone: "+52 55 5555 1234",
    quantity: 4,
    total: 840,
    paymentMethod: "transfer",
    paymentStatus: "partial",
    purchaseDate: "2026-02-11T09:15:00",
  },
  {
    id: "TKT_004",
    customerName: "José Luis Hernández",
    customerEmail: "jlhernandez@email.com",
    customerPhone: "+52 55 4321 8765",
    quantity: 3,
    total: 630,
    paymentMethod: "cash",
    paymentStatus: "cancelled",
    purchaseDate: "2026-02-09T14:20:00",
  },
  {
    id: "TKT_005",
    customerName: "Laura Pérez Ruiz",
    customerEmail: "laura.perez@email.com",
    customerPhone: "+52 55 6789 0123",
    quantity: 2,
    total: 420,
    paymentMethod: "transfer",
    paymentStatus: "paid",
    purchaseDate: "2026-02-13T11:00:00",
  },
];

const eventDetails = {
  id: "EVT001",
  name: "Festival Indie CDMX 2026",
  date: "2026-03-15",
  venue: "Foro Sol",
  totalCapacity: 5000,
  sold: 4200,
};

export default function EventDetail() {
  const { eventId } = useParams();
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingTicket, setEditingTicket] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<Ticket["paymentStatus"] | null>(null);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === "all" || ticket.paymentStatus === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const handleStatusUpdate = (ticketId: string) => {
    if (editingStatus) {
      setTickets(
        tickets.map((t) =>
          t.id === ticketId ? { ...t, paymentStatus: editingStatus } : t
        )
      );
    }
    setEditingTicket(null);
    setEditingStatus(null);
  };

  const getStatusBadge = (status: Ticket["paymentStatus"]) => {
    const styles = {
      paid: "bg-green-100 text-green-700 border-green-200",
      pending: "bg-amber-100 text-amber-700 border-amber-200",
      partial: "bg-blue-100 text-blue-700 border-blue-200",
      cancelled: "bg-red-100 text-red-700 border-red-200",
    };
    const labels = {
      paid: "Pagado",
      pending: "Pendiente",
      partial: "Pago Parcial",
      cancelled: "Cancelado",
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'paid' ? 'bg-green-500' : status === 'pending' ? 'bg-amber-500' : status === 'partial' ? 'bg-blue-500' : 'bg-red-500'}`} />
        {labels[status]}
      </span>
    );
  };

  const stats = {
    totalTickets: tickets.length,
    totalRevenue: tickets.reduce((sum, t) => t.paymentStatus !== "cancelled" ? sum + t.total : sum, 0),
    paidTickets: tickets.filter((t) => t.paymentStatus === "paid").length,
    pendingTickets: tickets.filter((t) => (t.paymentStatus === "pending" || t.paymentStatus === "partial")).length,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-foreground">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-5">
          <Link
            to="/organization/events"
            className="p-3 bg-secondary/50 hover:bg-secondary rounded-xl transition-all group"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{eventDetails.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-muted-foreground">
              <span className="font-medium text-primary bg-primary/5 px-2 py-0.5 rounded text-sm">{eventDetails.venue}</span>
              <span className="text-sm">•</span>
              <span className="text-sm font-medium">{new Date(eventDetails.date).toLocaleDateString('es-MX', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20">
          <Download className="w-5 h-5" />
          Exportar CSV
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border flex flex-col items-center text-center group hover:border-primary/50 transition-all shadow-sm">
          <div className="p-3 bg-primary/5 rounded-xl mb-4 group-hover:scale-110 transition-transform">
            <TicketIcon className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Boletos Vendidos</p>
          <p className="text-3xl font-black mt-1">{stats.totalTickets}</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border flex flex-col items-center text-center group hover:border-primary/50 transition-all shadow-sm">
          <div className="p-3 bg-green-500/5 rounded-xl mb-4 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Revenue Total</p>
          <p className="text-3xl font-black mt-1 text-primary">${stats.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border flex flex-col items-center text-center group hover:border-primary/50 transition-all shadow-sm">
          <div className="p-3 bg-green-500/5 rounded-xl mb-4 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pagados</p>
          <p className="text-3xl font-black mt-1 text-green-600">{stats.paidTickets}</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border flex flex-col items-center text-center group hover:border-primary/50 transition-all shadow-sm">
          <div className="p-3 bg-amber-500/5 rounded-xl mb-4 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pendientes</p>
          <p className="text-3xl font-black mt-1 text-amber-600">{stats.pendingTickets}</p>
        </div>
      </div>

      {/* Ticket List Header/Filters */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-2xl border border-border shadow-sm">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o ID de boleto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-5 h-5 text-muted-foreground shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full md:w-48 px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none font-medium"
            >
              <option value="all">Todos los estados</option>
              <option value="paid">Pagado</option>
              <option value="pending">Pendiente</option>
              <option value="partial">Pago Parcial</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-secondary/20 border-b border-border">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">ID Boleto</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente & Contacto</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Cant.</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Total</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Método / Estado</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Compra</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-6">
                      <span className="font-mono text-xs bg-secondary/50 px-2 py-1 rounded text-primary">{ticket.id}</span>
                    </td>
                    <td className="px-6 py-6">
                      <div>
                        <p className="font-bold text-lg text-foreground mb-0.5">{ticket.customerName}</p>
                        <p className="text-xs text-muted-foreground">{ticket.customerEmail} • {ticket.customerPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="px-3 py-1 bg-secondary rounded-lg text-sm">{ticket.quantity}</span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <p className="font-black text-lg">${ticket.total.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        {getStatusBadge(ticket.paymentStatus)}
                        <span className="text-[10px] text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded italic">
                          {ticket.paymentMethod === "transfer" ? "Transferencia" : "Efectivo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="text-xs text-muted-foreground">
                        <p>{new Date(ticket.purchaseDate).toLocaleDateString("es-MX", { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        <p className="font-bold text-foreground opacity-60 uppercase">{new Date(ticket.purchaseDate).toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      {editingTicket === ticket.id ? (
                        <div className="flex items-center justify-center gap-2 animate-in zoom-in-95 duration-200">
                          <select
                            value={editingStatus || ticket.paymentStatus}
                            onChange={(e) => setEditingStatus(e.target.value as Ticket["paymentStatus"])}
                            className="px-2 py-1 text-xs rounded-lg border border-primary bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                          >
                            <option value="paid">Pagado</option>
                            <option value="pending">Pendiente</option>
                            <option value="partial">Parcial</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                          <button onClick={() => handleStatusUpdate(ticket.id)} className="p-1 px-2 bg-primary text-white text-[10px] font-bold rounded hover:scale-105 transition-transform">OK</button>
                          <button onClick={() => { setEditingTicket(null); setEditingStatus(null); }} className="p-1 px-2 bg-secondary text-[10px] font-bold rounded">X</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => { setEditingTicket(ticket.id); setEditingStatus(ticket.paymentStatus); }}
                            className="p-2.5 hover:bg-primary/10 text-primary rounded-xl transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 font-bold text-xs"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTickets.length === 0 && (
            <div className="py-20 flex flex-col items-center text-muted-foreground italic">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p>No se encontraron boletos que coincidan con la búsqueda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
