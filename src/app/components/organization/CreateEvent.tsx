import { useNavigate } from "react-router";
import { Calendar, MapPin, Users, DollarSign, Clock, Plus, Image as ImageIcon, Info, FileText } from "lucide-react";
import { useState } from "react";

export default function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    venue: "",
    address: "",
    date: "",
    time: "",
    capacity: "",
    price: "",
    description: "",
    category: "concierto",
    presaleDate: "",
    presaleTime: "",
    instructions: "",
    conditions: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validación básica
    const newErrors: { [key: string]: boolean } = {};
    const required = ["name", "venue", "address", "date", "time", "capacity", "price"];
    required.forEach((key) => {
      if (!formData[key as keyof typeof formData]) {
        newErrors[key] = true;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Simular creación exitosa
    alert(`Evento "${formData.name}" creado exitosamente`);
    navigate("/organization/events");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Simulamos carga de imagen
    setImagePreview("https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1000");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Evento</h1>
        <p className="text-muted-foreground">Configura los detalles, precios y medios de tu evento</p>
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
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-2 block">Capacidad Total *</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 ${errors.capacity ? "border-red-500" : "border-border"} bg-background focus:ring-2 focus:ring-primary/20 outline-none`}
                  />
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
        </div>

        {/* Sidebar Creation Info */}
        <div className="space-y-8">
          {/* Photo Upload Area */}
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
                  <p className="text-xs text-muted-foreground">Arrestra o selecciona<br />una imagen profesional</p>
                  <input type="file" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 text-left">Precios y Fees</h3>
            <div>
              <label className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Precio Base *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background font-bold text-xl"
                placeholder="0.00"
              />
            </div>

            <div className="p-4 bg-primary/5 rounded-xl space-y-2 border border-primary/10">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tu Ganancia (Neto):</span>
                <span className="font-bold text-foreground">${(parseFloat(formData.price || "0") * 0.9).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-primary font-medium italic">Service Fee TB (10%):</span>
                <span className="font-bold text-primary">${(parseFloat(formData.price || "0") * 0.1).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg shadow-primary/20">
            <Plus className="w-6 h-6" />
            Publicar Evento
          </button>
        </div>
      </form>
    </div>
  );
}
