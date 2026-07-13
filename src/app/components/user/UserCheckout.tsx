import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Minus, Plus, CreditCard, Banknote, MapPin, Calendar, Clock, User, Mail, Phone, Ticket, ShieldCheck, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";

// The 6 diverse event examples for the full experience
const EVENTS_DATABASE: Record<string, any> = {
  "evt_aura_2026": {
    id: "evt_aura_2026",
    name: "Festival Aura 2026",
    category: "Música / Festival",
    date: "Viernes, 22 de Mayo 2026",
    time: "14:00 hrs",
    venue: "Estadio Azteca, CDMX",
    price: 1850,
    availableTickets: 1240,
    image: "https://images.unsplash.com/photo-1459749411177-042180ce673c?w=1200",
    gradient: "from-indigo-600/20 to-purple-600/20",
    accent: "#6366f1"
  },
  "evt_copa_mx": {
    id: "evt_copa_mx",
    name: "Final Copa MX: Águilas vs Rayados",
    category: "Deportes / Fútbol",
    date: "Domingo, 12 de Abril 2026",
    time: "20:00 hrs",
    venue: "Estadio Akron, Guadalajara",
    price: 950,
    availableTickets: 450,
    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200",
    gradient: "from-blue-600/20 to-cyan-600/20",
    accent: "#2563eb"
  },
  "evt_fantasma_opera": {
    id: "evt_fantasma_opera",
    name: "El Fantasma de la Ópera",
    category: "Teatro / Musical",
    date: "Jueves, 04 de Junio 2026",
    time: "20:30 hrs",
    venue: "Teatro Telcel, CDMX",
    price: 1200,
    availableTickets: 120,
    image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200",
    gradient: "from-red-600/20 to-rose-900/20",
    accent: "#be123c"
  },
  "evt_tech_summit": {
    id: "evt_tech_summit",
    name: "Tech Summit Blessing 2026",
    category: "Conferencia / Tech",
    date: "Miércoles, 15 de Julio 2026",
    time: "09:00 hrs",
    venue: "WTC, Ciudad de México",
    price: 3500,
    availableTickets: 300,
    image: "https://images.unsplash.com/photo-1540575861501-7ad0582371f3?w=1200",
    gradient: "from-violet-600/20 to-fuchsia-600/20",
    accent: "#8b5cf6"
  },
  "evt_art_soumaya": {
    id: "evt_art_soumaya",
    name: "Avant-Garde Art Exhibition",
    category: "Arte / Exposición",
    date: "Sábado, 08 de Agosto 2026",
    time: "11:00 hrs",
    venue: "Museo Soumaya, CDMX",
    price: 450,
    availableTickets: 200,
    image: "https://images.unsplash.com/photo-1492691523567-6170c367314e?w=1200",
    gradient: "from-amber-600/20 to-orange-600/20",
    accent: "#d97706"
  },
  "evt_cinema_stars": {
    id: "evt_cinema_stars",
    name: "Cinema Under the Stars",
    category: "Cine / Experiencia",
    date: "Viernes, 18 de Septiembre 2026",
    time: "19:30 hrs",
    venue: "Cineteca Nacional, CDMX",
    price: 250,
    availableTickets: 150,
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200",
    gradient: "from-teal-600/20 to-emerald-600/20",
    accent: "#059669"
  }
};

export default function UserCheckout() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { register } = useAuth();

  // Load event or default to first one
  const event = useMemo(() => {
    return (eventId && EVENTS_DATABASE[eventId]) || EVENTS_DATABASE["evt_aura_2026"];
  }, [eventId]);

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer" | "cash" | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [formErrors, setFormErrors] = useState({
    name: false,
    email: false,
    phone: false,
  });

  const subtotal = quantity * event.price;
  const serviceFee = subtotal * 0.08; // 8% service fee for TicketBlessing premium
  const total = subtotal + serviceFee;

  const validateForm = () => {
    const errors = {
      name: formData.name.trim().length < 3,
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      phone: formData.phone.trim().length < 10,
    };
    setFormErrors(errors);
    return !Object.values(errors).some((error) => error);
  };

  const handlePurchase = async () => {
    if (!paymentMethod || !validateForm()) return;

    setIsProcessing(true);

    // Auto-registration logic:
    // Create a "user" account if the email is new, so they have a wallet.
    // In a real app, you'd check if the email exists first.
    // For this simulation, we'll just attempt to register.
    // If it's already registered, it'll just fail silently or update state.
    await register(formData.name, formData.email, "Blessing2026!");

    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 2000));

    const ticketId = `TKT_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    navigate(`/ticket/${ticketId}`, {
      state: {
        event,
        quantity,
        paymentMethod,
        total,
        purchaseDate: new Date().toISOString(),
        customerInfo: formData,
        isGuest: false // Now they are a registered user
      },
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0b1e', color: '#f0edff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header Navigation */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'rgba(240,237,255,0.6)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            <ArrowLeft size={18} />
            Volver a Eventos
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={16} color="white" />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 800 }}>Ticket<span style={{ color: '#a78bfa' }}>Blessing</span></span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }} className="checkout-grid">

          {/* Main Checkout Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* 1. Event Selection (Visual confirmation) */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.15)', overflow: 'hidden' }}>
              <div style={{ height: '160px', position: 'relative' }}>
                <img src={event.image} alt={event.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, #0d0b1e, transparent)` }} />
                <div style={{ position: 'absolute', bottom: '16px', left: '24px' }}>
                  <span style={{ background: 'rgba(124,58,237,0.8)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', display: 'inline-block' }}>{event.category}</span>
                  <h1 style={{ fontSize: '24px', fontWeight: 900 }}>{event.name}</h1>
                </div>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(240,237,255,0.6)', fontSize: '13px' }}>
                  <Calendar size={14} color="#a78bfa" />
                  {event.date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(240,237,255,0.6)', fontSize: '13px' }}>
                  <MapPin size={14} color="#a78bfa" />
                  {event.venue}
                </div>
              </div>
            </div>

            {/* 2. Tickets Quantity */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.15)', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>1</span>
                Selecciona la cantidad
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={18} />
                  </button>
                  <span style={{ fontSize: '24px', fontWeight: 800, minWidth: '30px', textAlign: 'center' }}>{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(240,237,255,0.5)' }}>
                  <p style={{ fontWeight: 600, color: '#f0edff' }}>Precio unitario: ${event.price} MXN</p>
                  <p>{event.availableTickets} disponibles</p>
                </div>
              </div>
            </div>

            {/* 3. Customer Info */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.15)', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>2</span>
                Tus datos para el boleto
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-grid">
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(240,237,255,0.5)', marginBottom: '6px', display: 'block' }}>Nombre Completo</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,237,255,0.3)' }} />
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${formErrors.name ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`, color: 'white', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(240,237,255,0.5)', marginBottom: '6px', display: 'block' }}>Correo Electrónico</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,237,255,0.3)' }} />
                    <input
                      type="email"
                      placeholder="juan@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${formErrors.email ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`, color: 'white', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px', color: 'rgba(240,237,255,0.5)', marginBottom: '6px', display: 'block' }}>Teléfono de contacto</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,237,255,0.3)' }} />
                    <input
                      type="tel"
                      placeholder="55 1234 5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${formErrors.phone ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`, color: 'white', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Payment Method */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.15)', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>3</span>
                Método de pago
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { id: 'card', name: 'Tarjeta', icon: <CreditCard size={20} />, sub: 'Stripe Secure' },
                  { id: 'transfer', name: 'SPEI', icon: <CreditCard size={20} />, sub: 'Transferencia' },
                  { id: 'cash', name: 'Efectivo', icon: <Banknote size={20} />, sub: 'OXXO / Pay' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    style={{
                      padding: '16px', borderRadius: '16px', border: `2px solid ${paymentMethod === m.id ? '#a78bfa' : 'rgba(255,255,255,0.1)'}`,
                      background: paymentMethod === m.id ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                      color: 'white', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                    }}
                  >
                    {m.icon}
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', fontWeight: 700 }}>{m.name}</p>
                      <p style={{ fontSize: '10px', color: 'rgba(240,237,255,0.4)' }}>{m.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>


          <div style={{ position: 'sticky', top: '120px', height: 'fit-content' }}>
            <div style={{ background: 'rgba(19,16,42,0.95)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Resumen de Compra</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'rgba(240,237,255,0.5)' }}>Subtotal ({quantity} boletos)</span>
                  <span style={{ fontWeight: 600 }}>${subtotal.toLocaleString()} MXN</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'rgba(240,237,255,0.5)' }}>Cargos por servicio</span>
                  <span style={{ fontWeight: 600 }}>${serviceFee.toLocaleString()} MXN</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800 }}>Total</span>
                <span style={{ fontSize: '28px', fontWeight: 900, color: '#a78bfa' }}>${total.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600 }}>MXN</span></span>
              </div>

              <button
                onClick={handlePurchase}
                disabled={isProcessing || !paymentMethod}
                style={{
                  width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                  background: paymentMethod ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                  color: 'white', fontWeight: 800, fontSize: '16px', cursor: (isProcessing || !paymentMethod) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: paymentMethod ? '0 10px 20px rgba(124,58,237,0.3)' : 'none', transition: 'all 0.3s'
                }}
              >
                {isProcessing ? 'Procesando...' : (
                  <>
                    <Sparkles size={20} />
                    Finalizar Compra
                  </>
                )}
              </button>

              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'rgba(16,185,129,0.8)', fontSize: '12px', fontWeight: 600 }}>
                <ShieldCheck size={16} />
                Compra segura y encriptada
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '16px', borderRadius: '16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '12px', color: 'rgba(245,158,11,0.8)', lineHeight: 1.5 }}>
              ⚠️ Recibirás tus boletos digitales y el código QR de acceso inmediatamente después de confirmar el pago.
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
          .checkout-grid > div:last-child { position: static !important; }
        }
        @media (max-width: 600px) {
          .form-grid { grid-template-columns: 1fr !important; }
          .form-grid > div { grid-column: span 1 !important; }
        }
      `}</style>
    </div>
  );
}