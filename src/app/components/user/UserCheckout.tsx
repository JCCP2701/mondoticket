import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Minus, Plus, CreditCard, Banknote, MapPin, Calendar, User, Mail, Phone, Ticket, ShieldCheck, Sparkles } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { dataService, EventRecord } from "../../services/dataService";
import { supabase } from "../../services/supabaseClient";
import SeatMapPicker, { SelectedSeat } from "./SeatMapPicker";

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
  const [selectedSeatsByType, setSelectedSeatsByType] = useState<Record<string, SelectedSeat[]>>({});
  const [seatError, setSeatError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer" | "cash" | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [formErrors, setFormErrors] = useState({ name: false, email: false, phone: false });

  // Holding a seat (or even reserving general-admission inventory
  // atomically) requires an authenticated session — the anon role can't call
  // hold_event_seats. Real ticketeras (Ticketmaster, AXS) gate the seat map
  // behind login/guest-checkout for the same reason (anti-bot/fraud), so
  // contact info comes first, creates the session invisibly, and only then
  // does the ticket/seat picker unlock.
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: { user: authedUser } } = await supabase.auth.getUser();
        setFormData((prev) => ({
          ...prev,
          name: prev.name || (authedUser?.user_metadata?.name as string) || "",
          email: prev.email || authedUser?.email || "",
        }));
        setSessionReady(true);
      }
      setCheckingSession(false);
    })();
  }, []);

  const handleContinue = async () => {
    if (sessionReady) return;
    if (!validateForm()) return;
    setRegistering(true);
    setRegisterError("");
    try {
      // register() transparently signs the buyer in instead if this email
      // is already registered from a previous purchase (same fixed guest
      // password each time) — it only returns false when that email
      // belongs to a real account with a different password.
      const ok = await register(formData.name, formData.email, "Blessing2026!");
      if (!ok) {
        throw new Error("Este correo ya tiene una cuenta con otra contraseña. Inicia sesión desde /login para continuar con esta compra.");
      }
      const { data: { user: authedUser } } = await supabase.auth.getUser();
      if (!authedUser) throw new Error("No se pudo iniciar tu sesión de compra");
      setSessionReady(true);
    } catch (err: any) {
      setRegisterError(err.message || "No se pudo continuar con estos datos");
    } finally {
      setRegistering(false);
    }
  };

  const selectedSeats = useMemo(
    () => Object.values(selectedSeatsByType).flat(),
    [selectedSeatsByType]
  );

  const setQty = (typeId: string, qty: number, max: number) => {
    setSelection((prev) => ({ ...prev, [typeId]: Math.max(0, Math.min(max, qty)) }));
  };

  const totalQuantity = useMemo(
    () => Object.values(selection).reduce((sum, q) => sum + q, 0) + selectedSeats.length,
    [selection, selectedSeats]
  );

  const subtotal = useMemo(() => {
    if (!event) return 0;
    const quantitySubtotal = event.ticketTypes
      .filter((t) => !t.hasSeatMap)
      .reduce((sum, t) => sum + (selection[t.id] || 0) * t.price, 0);
    const seatSubtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
    return quantitySubtotal + seatSubtotal;
  }, [event, selection, selectedSeats]);

  const serviceFee = subtotal * 0.08;
  const total = subtotal + serviceFee;
  const isFree = totalQuantity > 0 && total === 0;

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
    if (!event || !sessionReady || totalQuantity === 0 || !validateForm()) return;
    if (!isFree && !paymentMethod) return;

    setIsProcessing(true);
    setPurchaseError("");

    try {
      // Payment gateway integration is pending (no provider chosen yet), so
      // any non-$0 charge is still simulated. What's real from here on: the
      // order/tickets/inventory decrement below, which runs through the
      // same atomic RPC a real gateway webhook would call — no separate
      // "demo mode" data path. A $0 selection (e.g. a free/courtesy ticket
      // type) skips the simulated delay entirely since there's nothing to
      // "pay." The buyer's session was already created in step 1, before
      // ticket/seat selection.
      const { data: { user: authedUser } } = await supabase.auth.getUser();
      if (!authedUser) throw new Error("Tu sesión expiró, recarga la página e intenta de nuevo");

      if (!isFree) await new Promise((r) => setTimeout(r, 1500));

      const items = event.ticketTypes
        .filter((t) => !t.hasSeatMap && (selection[t.id] || 0) > 0)
        .map((t) => ({ ticketTypeId: t.id, quantity: selection[t.id] }));

      const orderId = await dataService.createOrder({
        eventId: event.id,
        organizationId: event.organizationId,
        userId: authedUser.id,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        paymentIntentId: `sim_${authedUser.id}_${Date.now()}`,
        items: items.length > 0 ? items : undefined,
        seatIds: selectedSeats.length > 0 ? selectedSeats.map((s) => s.seatId) : undefined,
      });

      navigate(`/ticket/${orderId}`);
    } catch (err: any) {
      const message: string = err.message || '';
      if (message.includes('SOLD_OUT')) {
        setPurchaseError('Uno de los tipos de boleto se agotó justo ahora. Ajusta tu selección e intenta de nuevo.');
        setSelection({});
      } else if (message.includes('HOLD_EXPIRED')) {
        setPurchaseError('Tu reserva de asientos expiró. Vuelve a seleccionarlos.');
        setSelectedSeatsByType({});
      } else {
        setPurchaseError(message || 'Ocurrió un error al procesar tu compra');
      }
      const refreshed = await dataService.getEventById(event.id);
      setEvent(refreshed);
    } finally {
      setIsProcessing(false);
    }
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

            {/* 2. Customer Info — comes first: creates the buyer's session so
                 the seat picker below can hold seats (anon sessions can't). */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.15)', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>1</span>
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
                      disabled={sessionReady}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${formErrors.name ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`, color: 'white', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box', opacity: sessionReady ? 0.6 : 1 }}
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
                      disabled={sessionReady}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${formErrors.email ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`, color: 'white', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box', opacity: sessionReady ? 0.6 : 1 }}
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

              {registerError && (
                <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fca5a5', fontSize: '13px' }}>
                  {registerError}
                </div>
              )}

              {!sessionReady && (
                <button
                  onClick={handleContinue}
                  disabled={registering || checkingSession}
                  style={{
                    marginTop: '20px', width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: '15px',
                    cursor: (registering || checkingSession) ? 'not-allowed' : 'pointer', opacity: (registering || checkingSession) ? 0.7 : 1,
                  }}
                >
                  {registering ? 'Continuando...' : 'Continuar'}
                </button>
              )}
            </div>

            {/* 3. Ticket/Seat Selection — locked until step 1 creates a session;
                 an event can mix seat-mapped types with plain quantity-based ones. */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.15)', padding: '24px', opacity: sessionReady ? 1 : 0.4 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>2</span>
                Elige tus boletos
              </h3>

              {!sessionReady ? (
                <p style={{ fontSize: '13px', color: 'rgba(240,237,255,0.4)' }}>
                  Completa tus datos de contacto arriba para ver la disponibilidad y elegir tus boletos.
                </p>
              ) : (
              <>
              {seatError && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fca5a5', fontSize: '13px' }}>
                  {seatError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {event.ticketTypes.map((t) => {
                  if (t.hasSeatMap) {
                    return (
                      <div key={t.id}>
                        <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '10px' }}>
                          {t.name} — {t.price === 0 ? 'Gratis' : `$${t.price.toLocaleString()} MXN`}
                        </p>
                        <div style={{ background: 'white', borderRadius: '16px', padding: '16px' }}>
                          <SeatMapPicker
                            eventId={event.id}
                            ticketTypeId={t.id}
                            ticketTypes={[t]}
                            onSelectionChange={(seats) => setSelectedSeatsByType((prev) => ({ ...prev, [t.id]: seats }))}
                            onError={setSeatError}
                          />
                        </div>
                      </div>
                    );
                  }

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
                          {t.price === 0 ? 'Gratis' : `$${t.price.toLocaleString()} MXN`} · {soldOut ? 'Agotado' : `${available} disponibles`}
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
              </>
              )}
            </div>

            {/* 4. Payment Method — not needed for a $0 (free/courtesy) selection */}
            {isFree ? (
              <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '24px', border: '1px solid rgba(16,185,129,0.25)', padding: '24px', color: '#34d399', fontSize: '14px', fontWeight: 600 }}>
                Esta selección es gratuita — no se requiere método de pago.
              </div>
            ) : (
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
            )}
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

              {purchaseError && (
                <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', fontSize: '13px' }}>
                  {purchaseError}
                </div>
              )}

              {(() => {
                const canPurchase = sessionReady && totalQuantity > 0 && (isFree || !!paymentMethod);
                return (
              <button
                onClick={handlePurchase}
                disabled={isProcessing || !canPurchase}
                style={{
                  width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                  background: canPurchase ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                  color: 'white', fontWeight: 800, fontSize: '16px', cursor: (isProcessing || !canPurchase) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: canPurchase ? '0 10px 20px rgba(124,58,237,0.3)' : 'none', transition: 'all 0.3s'
                }}
              >
                {isProcessing ? 'Procesando...' : (
                  <>
                    <Sparkles size={20} />
                    Finalizar Compra
                  </>
                )}
              </button>
                );
              })()}

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
