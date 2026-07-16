import { useNavigate } from "react-router";
import { Calendar, MapPin, Clock, Plus, Trash2, Image as ImageIcon, Info, FileText, Tag } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { dataService } from "../../services/dataService";

interface TicketTypeForm {
  name: string;
  price: string;
  capacity: string;
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const { activeOrganizationId } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    venue: "",
    address: "",
    date: "",
    time: "",
    description: "",
    category: "concierto",
    instructions: "",
  });
  const [ticketTypes, setTicketTypes] = useState<TicketTypeForm[]>([
    { name: "General", price: "", capacity: "" },
  ]);

  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { name: "", price: "", capacity: "" }]);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const updateTicketType = (index: number, field: keyof TicketTypeForm, value: string) => {
    setTicketTypes(ticketTypes.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    const newErrors: { [key: string]: boolean } = {};
    const required = ["name", "venue", "address", "date", "time"];
    required.forEach((key) => {
      if (!formData[key as keyof typeof formData]) newErrors[key] = true;
    });

    const validTicketTypes = ticketTypes.filter((t) => t.name && t.price && t.capacity);
    if (validTicketTypes.length === 0) newErrors.ticketTypes = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!activeOrganizationId) {
      setSubmitError("Tu cuenta no está asociada a una organización.");
      return;
    }

    setSubmitting(true);
    try {
      await dataService.createEvent({
        organizationId: activeOrganizationId,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        venueName: formData.venue,
        venueAddress: formData.address,
        date: formData.date,
        instructions: formData.instructions,
        ticketTypes: validTicketTypes.map((t) => ({
          name: t.name,
          price: parseFloat(t.price),
          capacity: parseInt(t.capacity, 10),
        })),
      });
      navigate("/organization/events");
    } catch (err: any) {
      setSubmitError(err.message || "Error al crear el evento");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = () => {
    setImagePreview("https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1000");
  };

  const totalCapacity = ticketTypes.reduce((sum, t) => sum + (parseInt(t.capacity) || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Evento</h1>
        <p className="text-muted-foreground">Configura los detalles, tipos de boleto y medios de tu evento</p>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Detailed Info */}
          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Información General
            </h3>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-muted-foreground mb-2 block">Nombre del Evento *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 ${errors.name ? "border-red-500" : "border-border"} bg-background focus:ring-2 focus:ring-primary/20 outline-none`}
                    placeholder="Ej. Festival Indie CDMX 2026"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-2 block">Categoría *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                  >
                    <option value="concierto">Concierto</option>
                    <option value="festival">Festival</option>
                    <option value="teatro">Teatro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-muted-foreground mb-2 block">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none resize-none"
                  placeholder="Detalles sobre el evento..."
                ></textarea>
              </div>
            </div>
          </div>

          {/* Location & Instructions */}
          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Sede y Ubicación
            </h3>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-2 block">Sede (Venue) *</label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 ${errors.venue ? "border-red-500" : "border-border"} bg-background outline-none`}
                    placeholder="Nombre de la sede"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-2 block">Dirección Completa *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 ${errors.address ? "border-red-500" : "border-border"} bg-background outline-none`}
                    placeholder="Calle, Número, Colonia..."
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Fecha *
                  </label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background" />
                </div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Hora *
                  </label>
                  <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background" />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-muted-foreground mb-2 block">Instrucciones de Acceso</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none resize-none"
                  placeholder="Ej. Puerta 5, presentar identificación..."
                ></textarea>
              </div>
            </div>
          </div>

          {/* Ticket Types — the per-section/type inventory */}
          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Tipos de Boleto
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Define cada tipo (General, VIP, Palco...) con su precio y aforo disponible.
            </p>

            <div className="space-y-4">
              {ticketTypes.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Nombre</label>
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => updateTicketType(i, "name", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none"
                      placeholder="Ej. VIP"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Precio</label>
                    <input
                      type="number"
                      value={t.price}
                      onChange={(e) => updateTicketType(i, "price", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Aforo</label>
                    <input
                      type="number"
                      value={t.capacity}
                      onChange={(e) => updateTicketType(i, "capacity", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none"
                      placeholder="0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTicketType(i)}
                    disabled={ticketTypes.length === 1}
                    className="p-2.5 rounded-xl border-2 border-border text-muted-foreground hover:text-red-600 hover:border-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {errors.ticketTypes && (
              <p className="text-xs text-red-500 mt-3">Agrega al menos un tipo de boleto con nombre, precio y aforo.</p>
            )}

            <button
              type="button"
              onClick={addTicketType}
              className="mt-4 flex items-center gap-2 text-sm font-bold text-primary hover:underline"
            >
              <Plus className="w-4 h-4" />
              Agregar tipo de boleto
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm overflow-hidden text-center">
            <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 text-left">Imagen del Evento</h3>
            <div className="relative aspect-video rounded-xl bg-secondary/50 border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden group">
              {imagePreview ? (
                <>
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => setImagePreview(null)} className="p-2 bg-red-600 text-white rounded-lg">Eliminar</button>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">Arrastra o selecciona<br />una imagen profesional</p>
                  <input type="file" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase text-left">Resumen</h3>
            <div className="p-4 bg-primary/5 rounded-xl space-y-2 border border-primary/10">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aforo total:</span>
                <span className="font-bold text-foreground">{totalCapacity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipos de boleto:</span>
                <span className="font-bold text-foreground">{ticketTypes.filter(t => t.name).length}</span>
              </div>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              El inventario de cada tipo se descuenta automáticamente conforme se venden boletos.
            </p>
          </div>

          {submitError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{submitError}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            <Plus className="w-6 h-6" />
            {submitting ? "Publicando..." : "Publicar Evento"}
          </button>
        </div>
      </form>
    </div>
  );
}
