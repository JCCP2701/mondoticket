import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Ticket as TicketIcon,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Gift,
  MapPin,
  X,
  Pencil,
  Image as ImageIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { dataService, EventRecord, TicketRecord } from "../../services/dataService";

export default function EventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refunding, setRefunding] = useState(false);
  const [actionError, setActionError] = useState("");

  const [showCourtesyForm, setShowCourtesyForm] = useState(false);
  const [courtesyForm, setCourtesyForm] = useState({ ticketTypeId: "", name: "", email: "" });
  const [assigningCourtesy, setAssigningCourtesy] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const load = async () => {
    if (!eventId) return;
    setLoading(true);
    const [ev, tks] = await Promise.all([
      dataService.getEventById(eventId),
      dataService.getTicketsForEvent(eventId),
    ]);
    setEvent(ev);
    setTickets(tks);
    setLoading(false);
  };

  useEffect(() => { load(); }, [eventId]);

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleRefundSelected = async () => {
    if (selectedIds.length === 0) return;
    setRefunding(true);
    setActionError("");
    try {
      await dataService.refundTickets(selectedIds);
      setSelectedIds([]);
      await load();
    } catch (err: any) {
      setActionError(err.message || "No se pudo procesar el reembolso");
    } finally {
      setRefunding(false);
    }
  };

  const handleAssignCourtesy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !courtesyForm.ticketTypeId) return;
    setAssigningCourtesy(true);
    setActionError("");
    try {
      await dataService.createOrder({
        eventId: event.id,
        organizationId: event.organizationId,
        userId: null,
        customerName: courtesyForm.name,
        customerEmail: courtesyForm.email,
        customerPhone: "",
        paymentIntentId: `comp_${Date.now()}`,
        items: [{ ticketTypeId: courtesyForm.ticketTypeId, quantity: 1 }],
      });
      setShowCourtesyForm(false);
      setCourtesyForm({ ticketTypeId: "", name: "", email: "" });
      await load();
    } catch (err: any) {
      setActionError(err.message || "No se pudo asignar la cortesía");
    } finally {
      setAssigningCourtesy(false);
    }
  };

  const getStatusBadge = (status: TicketRecord["status"]) => {
    const styles = {
      valid: "bg-green-100 text-green-700 border-green-200",
      used: "bg-blue-100 text-blue-700 border-blue-200",
      cancelled: "bg-red-100 text-red-700 border-red-200",
    };
    const labels = { valid: "Válido", used: "Usado", cancelled: "Reembolsado" };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'valid' ? 'bg-green-500' : status === 'used' ? 'bg-blue-500' : 'bg-red-500'}`} />
        {labels[status]}
      </span>
    );
  };

  const freeTicketTypes = (event?.ticketTypes ?? []).filter((t) => t.price === 0);

  const stats = {
    total: tickets.length,
    valid: tickets.filter((t) => t.status === 'valid').length,
    refunded: tickets.filter((t) => t.status === 'cancelled').length,
    courtesy: tickets.filter((t) => t.unitPrice === 0).length,
    revenue: tickets.filter((t) => t.status !== 'cancelled').reduce((sum, t) => sum + t.unitPrice, 0),
  };

  if (loading) return <div className="p-8 text-muted-foreground">Cargando evento...</div>;
  if (!event) return <div className="p-8 text-muted-foreground">Evento no encontrado.</div>;

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
            <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-muted-foreground">
              <span className="font-medium text-primary bg-primary/5 px-2 py-0.5 rounded text-sm">{event.venueName}</span>
              <span className="text-sm">•</span>
              <span className="text-sm font-medium">{new Date(event.date).toLocaleDateString('es-MX', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border rounded-xl font-bold hover:bg-secondary transition-all"
          >
            <Pencil className="w-5 h-5" />
            Editar Evento
          </button>
          <Link
            to={`/organization/event/${eventId}/venue-designer`}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border rounded-xl font-bold hover:bg-secondary transition-all"
          >
            <MapPin className="w-5 h-5" />
            Mapa de Asientos
          </Link>
          {freeTicketTypes.length > 0 && (
            <button
              onClick={() => setShowCourtesyForm(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
            >
              <Gift className="w-5 h-5" />
              Asignar Cortesía
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{actionError}</div>
      )}

      {/* Courtesy Assignment Modal */}
      {showCourtesyForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-8 max-w-md w-full space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2"><Gift className="w-5 h-5 text-primary" /> Asignar Boleto de Cortesía</h3>
              <button onClick={() => setShowCourtesyForm(false)} className="p-2 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAssignCourtesy} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-muted-foreground mb-2 block">Tipo de Boleto (gratuito)</label>
                <select
                  required
                  value={courtesyForm.ticketTypeId}
                  onChange={(e) => setCourtesyForm({ ...courtesyForm, ticketTypeId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                >
                  <option value="">Selecciona un tipo</option>
                  {freeTicketTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.capacity - t.sold} disponibles)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-muted-foreground mb-2 block">Nombre del destinatario</label>
                <input
                  required
                  type="text"
                  value={courtesyForm.name}
                  onChange={(e) => setCourtesyForm({ ...courtesyForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                  placeholder="Ej. Prensa / Invitado especial"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-muted-foreground mb-2 block">Correo</label>
                <input
                  required
                  type="email"
                  value={courtesyForm.email}
                  onChange={(e) => setCourtesyForm({ ...courtesyForm, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <button
                type="submit"
                disabled={assigningCourtesy}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-60"
              >
                {assigningCourtesy ? "Asignando..." : "Asignar Cortesía"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <EditEventModal event={event} onClose={() => setShowEditModal(false)} onSaved={load} />
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border flex flex-col items-center text-center shadow-sm">
          <div className="p-3 bg-primary/5 rounded-xl mb-4"><TicketIcon className="w-6 h-6 text-primary" /></div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Boletos Totales</p>
          <p className="text-3xl font-black mt-1">{stats.total}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border flex flex-col items-center text-center shadow-sm">
          <div className="p-3 bg-green-500/5 rounded-xl mb-4"><TrendingUp className="w-6 h-6 text-green-600" /></div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Revenue Total</p>
          <p className="text-3xl font-black mt-1 text-primary">${stats.revenue.toLocaleString()}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border flex flex-col items-center text-center shadow-sm">
          <div className="p-3 bg-green-500/5 rounded-xl mb-4"><CheckCircle2 className="w-6 h-6 text-green-600" /></div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Válidos</p>
          <p className="text-3xl font-black mt-1 text-green-600">{stats.valid}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border flex flex-col items-center text-center shadow-sm">
          <div className="p-3 bg-violet-500/5 rounded-xl mb-4"><Gift className="w-6 h-6 text-violet-600" /></div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Cortesías</p>
          <p className="text-3xl font-black mt-1 text-violet-600">{stats.courtesy}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border flex flex-col items-center text-center shadow-sm">
          <div className="p-3 bg-amber-500/5 rounded-xl mb-4"><AlertCircle className="w-6 h-6 text-amber-600" /></div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Reembolsados</p>
          <p className="text-3xl font-black mt-1 text-amber-600">{stats.refunded}</p>
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
              <option value="valid">Válido</option>
              <option value="used">Usado</option>
              <option value="cancelled">Reembolsado</option>
            </select>
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={handleRefundSelected}
              disabled={refunding}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-60 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              {refunding ? "Reembolsando..." : `Reembolsar (${selectedIds.length})`}
            </button>
          )}
        </div>

        {/* Tickets Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-secondary/20 border-b border-border">
                  <th className="px-6 py-4 w-10"></th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">ID Boleto</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Precio</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Compra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-4">
                      {ticket.status === 'valid' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(ticket.id)}
                          onChange={() => toggleSelect(ticket.id)}
                          className="w-4 h-4"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-secondary/50 px-2 py-1 rounded text-primary">{ticket.id.slice(0, 8)}</span>
                      {ticket.seatLabel && <p className="text-[10px] text-muted-foreground mt-1">Asiento {ticket.seatLabel}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-foreground">{ticket.customerName}</p>
                      <p className="text-xs text-muted-foreground">{ticket.customerEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-secondary rounded-lg text-xs font-bold">{ticket.ticketTypeName}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-black">{ticket.unitPrice === 0 ? 'Gratis' : `$${ticket.unitPrice.toLocaleString()}`}</p>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(ticket.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-xs text-muted-foreground">
                        <p>{new Date(ticket.createdAt).toLocaleDateString("es-MX", { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
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

function EditEventModal({ event, onClose, onSaved }: { event: EventRecord; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(event.name);
  const [category, setCategory] = useState(event.category ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(event.imageUrl);
  const [imagePreview, setImagePreview] = useState<string | null>(event.imageUrl);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploadingImage(true);
    try {
      const url = await dataService.uploadEventImage(file, event.organizationId);
      setImageUrl(url);
      setImagePreview(url);
    } catch (err: any) {
      setError(err.message || "No se pudo subir la imagen");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await dataService.updateEvent(event.id, { name, category, description, imageUrl });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "No se pudo guardar el evento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl p-8 max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2"><Pencil className="w-5 h-5 text-primary" /> Editar Evento</h3>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-muted-foreground mb-2 block">Imagen del Evento</label>
            <div className="relative aspect-video rounded-xl bg-secondary/50 border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden group">
              {uploadingImage ? (
                <p className="text-xs text-muted-foreground">Subiendo imagen...</p>
              ) : imagePreview ? (
                <>
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => { setImagePreview(null); setImageUrl(null); }} className="p-2 bg-red-600 text-white rounded-lg">Eliminar</button>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">Arrastra o selecciona una imagen</p>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-muted-foreground mb-2 block">Nombre del Evento</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-muted-foreground mb-2 block">Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none">
              <option value="concierto">Concierto</option>
              <option value="festival">Festival</option>
              <option value="teatro">Teatro</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-muted-foreground mb-2 block">Descripción</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none resize-none"
            />
          </div>

          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <button type="submit" disabled={saving || uploadingImage} className="w-full py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
