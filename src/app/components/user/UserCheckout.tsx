import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Minus, Plus, CreditCard, Banknote, MapPin, Calendar, User, Mail, Phone, Ticket, ShieldCheck, Sparkles } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { dataService, EventRecord } from "../../services/dataService";

export default function UserCheckout() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { register } = useAuth();

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        // Landing-page showcase cards use illustrative IDs that don't exist
        // in the DB yet — fall back to the first real event so checkout
        // always has real, purchasable inventory behind it.
        const byId = eventId ? await dataService.getEventById(eventId) : null;
        const resolved = byId ?? (await dataService.getEvents())[0] ?? null;
        if (!cancelled) setEvent(resolved);
      } catch (err: any) {
        if (!cancelled) setLoadError(err.message || "No se pudo cargar el evento");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  const [selection, setSelection] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer" | "cash" | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [formErrors, setFormErrors] = useState({ name: false, email: false, phone: false });

  const setQty = (typeId: string, qty: number, max: number) => {
    setSelection((prev) => ({ ...prev, [typeId]: Math.max(0, Math.min(max, qty)) }));
  };

  const totalQuantity = useMemo(
    () => Object.values(selection).reduce((sum, q) => sum + q, 0),
    [selection]
  );

  const subtotal = useMemo(() => {
    if (!event) return 0;
    return event.ticketTypes.reduce((sum, t) => sum + (selection[t.id] || 0) * t.price, 0);
  }, [event, selection]);

  const serviceFee = subtotal * 0.08;
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
    if (!event || !paymentMethod || totalQuantity === 0 || !validateForm()) return;

    setIsProcessing(true);

    // Real payment processing (Stripe) + order/ticket creation lands in the
    // next phase; this still simulates the purchase but against real
    // event + ticket-type data and real per-type availability.
    await register(formData.name, formData.email, "Blessing2026!");
    await new Promise((r) => setTimeout(r, 2000));

    const ticketId = `TKT_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    navigate(`/ticket/${ticketId}`, {
      state: {
        event: {
          name: event.name,
          date: new Date(event.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          time: '',
          venue: event.venueName,
        },
        quantity: totalQuantity,
        ticketBreakdown: event.ticketTypes
          .filter((t) => (selection[t.id] || 0) > 0)
          .map((t) => ({ name: t.name, quantity: selection[t.id] })),
        paymentMethod,
        total,
        purchaseDate: new Date().toISOString(),
        customerInfo: formData,
        isGuest: false,
      },
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0b1e', color: '#f0edff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Cargando evento...
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0b1e', color: '#f0edff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p>{loadError || 'No hay eventos disponibles todavía.'}</p>
        <Link to="/" style={{ color: '#a78bfa' }}>Volver al inicio</Link>
      </div>
    );
  }

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
              <div style={{ padding: '24px' }}>
                <span style={{ background: 'rgba(124,58,237,0.8)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px', display: 'inline-block' }}>{event.category || 'Evento'}</span>
                <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '16px' }}>{event.name}</h1>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(240,237,255,0.6)', fontSize: '13px' }}>
                    <Calendar size={14} color="#a78bfa" />
                    {new Date(event.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(240,237,255,0.6)', fontSize: '13px' }}>
                    <MapPin size={14} color="#a78bfa" />
                    {event.venueName}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Ticket Type Selection — per-type availability */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.15)', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>1</span>
                Elige tus boletos
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {event.ticketTypes.map((t) => {
                  const available = t.capacity - t.sold;
                  const qty = selection[t.id] || 0;
                  const soldOut = available <= 0;
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                      padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      opacity: soldOut ? 0.5 : 1,
                    }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '15px' }}>{t.name}</p>
                        <p style={{ fontSize: '13px', color: 'rgba(240,237,255,0.5)' }}>
                          ${t.price.toLocaleString()} MXN · {soldOut ? 'Agotado' : `${available} disponibles`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                          onClick={() => setQty(t.id, qty - 1, available)}
                          disabled={qty === 0}
                          style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: qty === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: qty === 0 ? 0.4 : 1 }}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontSize: '16px', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                        <button
                          onClick={() => setQty(t.id, qty + 1, available)}
                          disabled={soldOut || qty >= available}
                          style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', border: 'none', color: 'white', cursor: (soldOut || qty >= available) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (soldOut || qty >= available) ? 0.4 : 1 }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                  <span style={{ color: 'rgba(240,237,255,0.5)' }}>Subtotal ({totalQuantity} boletos)</span>
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
                disabled={isProcessing || !paymentMethod || totalQuantity === 0}
                style={{
                  width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                  background: (paymentMethod && totalQuantity > 0) ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                  color: 'white', fontWeight: 800, fontSize: '16px', cursor: (isProcessing || !paymentMethod || totalQuantity === 0) ? 'not-allowed' : 'pointer',
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
