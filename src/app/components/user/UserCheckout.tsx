import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Minus, Plus, CreditCard, Banknote, MapPin, Calendar, User, Mail, Phone, Ticket, ShieldCheck, Sparkles } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { dataService, EventRecord } from "../../services/dataService";
import { supabase } from "../../services/supabaseClient";
import SeatMapPicker, { SelectedSeat } from "./SeatMapPicker";
import "../landing/landing-theme.css";

function formatHoldDuration(minutes: number): string {
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? 'día' : 'días'}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  return `${minutes} minutos`;
}

export default function UserCheckout() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { requestGuestOtp, verifyGuestOtp } = useAuth();
  const [canceledNotice, setCanceledNotice] = useState(false);

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // Org-configurable, fetched separately since `organizations` is
  // RLS-restricted to members/superadmin — see getEventHoldMinutes.
  const [holdMinutes, setHoldMinutes] = useState(4320);

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
        if (resolved) {
          dataService.getEventHoldMinutes(resolved.id)
            .then((mins) => { if (!cancelled) setHoldMinutes(mins); })
            .catch(() => {});
        }
      } catch (err: any) {
        if (!cancelled) setLoadError(err.message || "No se pudo cargar el evento");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  // Landing back here with ?orkesta=canceled means the buyer backed out of
  // OrkestaPay's hosted page — free the reservation right away instead of
  // waiting for it to lazily reclaim on someone else's next visit, so the
  // inventory is bookable immediately.
  useEffect(() => {
    if (searchParams.get('orkesta') !== 'canceled') return;
    const canceledOrderId = searchParams.get('orderId');
    setCanceledNotice(true);
    if (canceledOrderId) {
      dataService.releaseOrder(canceledOrderId).catch((err) => console.warn('releaseOrder failed', err));
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('orkesta');
      next.delete('orderId');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selection, setSelection] = useState<Record<string, number>>({});
  const [selectedSeatsByType, setSelectedSeatsByType] = useState<Record<string, SelectedSeat[]>>({});
  const [seatError, setSeatError] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  // Generated once per cart attempt (not per click) so a double-click or a
  // retried network request can't create two orders for the same
  // selection — the RPC returns the original order id instead of buying
  // twice. Regenerated whenever the selection itself is reset below, since
  // reusing the same key for a genuinely different cart would silently
  // return the old order.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
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

  // Passwordless guest checkout: a one-time 6-digit code sent by email
  // replaces the old shared hardcoded password. `otpSent` gates a second
  // input (the code) before the session actually opens.
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);

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

  const handleSendCode = async () => {
    if (sessionReady) return;
    if (!validateForm()) return;
    setRegistering(true);
    setRegisterError("");
    try {
      const result = await requestGuestOtp(formData.email, formData.name);
      if (!result.ok) throw new Error(result.error || "No se pudo enviar el código");
      setOtpSent(true);
    } catch (err: any) {
      setRegisterError(err.message || "No se pudo enviar el código a tu correo");
    } finally {
      setRegistering(false);
    }
  };

  const handleVerifyCode = async () => {
    if (sessionReady || otpCode.trim().length < 6) return;
    setVerifyingCode(true);
    setRegisterError("");
    try {
      const profile = await verifyGuestOtp(formData.email, otpCode.trim());
      if (!profile) throw new Error("Código incorrecto o expirado. Verifica tu correo e intenta de nuevo.");
      setSessionReady(true);
    } catch (err: any) {
      setRegisterError(err.message || "No se pudo verificar el código");
    } finally {
      setVerifyingCode(false);
    }
  };

  const selectedSeats = useMemo(
    () => Object.values(selectedSeatsByType).flat(),
    [selectedSeatsByType]
  );

  const setQty = (typeId: string, qty: number, max: number) => {
    setSelection((prev) => ({ ...prev, [typeId]: Math.max(0, Math.min(max, qty)) }));
  };

  // `selection[t.id]` means "how many I want" for every ticket type now —
  // for a seat-mapped type it's the target the seat map is capped at, not
  // just an actual click count. Summing it alone (no `+ selectedSeats`)
  // reflects the buyer's intent immediately, before they've picked exactly
  // which seats — the seat map itself still enforces that they can't
  // select more than this, and seatSelectionsComplete (below) still blocks
  // checkout until the actual seats match this number.
  const totalQuantity = useMemo(
    () => Object.values(selection).reduce((sum, q) => sum + q, 0),
    [selection]
  );

  // A seat-mapped type with a target quantity must have exactly that many
  // seats actually selected before checkout can proceed — SeatMapPicker
  // itself caps selection at the target, so this only ever catches "fewer
  // than asked for," never "more."
  const seatSelectionsComplete = useMemo(
    () => (event?.ticketTypes ?? [])
      .filter((t) => t.hasSeatMap)
      .every((t) => (selection[t.id] || 0) === (selectedSeatsByType[t.id]?.length || 0)),
    [event, selection, selectedSeatsByType]
  );

  // Priced off the desired quantity for every type (see totalQuantity above)
  // so the total reflects intent as soon as it's set, not just confirmed
  // seats — ticket-type price is uniform regardless of which specific seat
  // ends up chosen, so this never mismatches what actually gets charged.
  const subtotal = useMemo(() => {
    if (!event) return 0;
    return event.ticketTypes.reduce((sum, t) => sum + (selection[t.id] || 0) * t.price, 0);
  }, [event, selection]);

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

    setIsProcessing(true);
    setPurchaseError("");

    try {
      // The buyer's session was already created in step 1, before
      // ticket/seat selection.
      const { data: { user: authedUser } } = await supabase.auth.getUser();
      if (!authedUser) throw new Error("Tu sesión expiró, recarga la página e intenta de nuevo");

      const items = event.ticketTypes
        .filter((t) => !t.hasSeatMap && (selection[t.id] || 0) > 0)
        .map((t) => ({ ticketTypeId: t.id, quantity: selection[t.id] }));
      const seatIds = selectedSeats.length > 0 ? selectedSeats.map((s) => s.seatId) : undefined;

      if (isFree) {
        const orderId = await dataService.createOrder({
          eventId: event.id,
          organizationId: event.organizationId,
          userId: authedUser.id,
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          paymentIntentId: `free_${authedUser.id}_${Date.now()}`,
          items: items.length > 0 ? items : undefined,
          seatIds,
          idempotencyKey,
        });
        navigate(`/ticket/${orderId}`);
        return;
      }

      // Real-money purchase: reserve inventory/seats first (a 'pending'
      // order, no tickets minted yet), then hand off to OrkestaPay's
      // hosted checkout page. confirm_order_paid — and the tickets it
      // mints — only ever runs from the webhook, never from this browser
      // code path.
      const orderId = await dataService.reserveOrder({
        eventId: event.id,
        organizationId: event.organizationId,
        userId: authedUser.id,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        items: items.length > 0 ? items : undefined,
        seatIds,
        idempotencyKey,
      });

      const checkoutRedirectUrl = await dataService.createOrkestaCheckout(orderId);
      window.location.href = checkoutRedirectUrl; // full navigation — leaves the SPA
    } catch (err: any) {
      const message: string = err.message || '';
      if (message.includes('SOLD_OUT')) {
        setPurchaseError('Uno de los tipos de boleto se agotó justo ahora. Ajusta tu selección e intenta de nuevo.');
        setSelection({});
        setIdempotencyKey(crypto.randomUUID());
      } else if (message.includes('HOLD_EXPIRED')) {
        setPurchaseError('Tu reserva de asientos expiró. Vuelve a seleccionarlos.');
        setSelectedSeatsByType({});
        setIdempotencyKey(crypto.randomUUID());
      } else if (message.includes('NOT_ON_SALE')) {
        setPurchaseError('La preventa de este evento todavía no abre.');
      } else if (message.includes('EVENT_CANCELLED')) {
        setPurchaseError('Este evento fue cancelado y ya no se pueden comprar boletos.');
      } else {
        // Gateway-unreachable / order no longer pending / reservation
        // expired all land here. Deliberately don't reset the selection or
        // idempotencyKey — the reservation is likely still valid, so
        // retrying reuses the same pending order via the same key.
        setPurchaseError(message || 'No pudimos conectar con la pasarela de pago. Intenta de nuevo.');
      }
      const refreshed = await dataService.getEventById(event.id);
      setEvent(refreshed);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--mt-offwhite)', color: 'var(--mt-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Cargando evento...
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--mt-offwhite)', color: 'var(--mt-ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p>{loadError || 'No hay eventos disponibles todavía.'}</p>
        <Link to="/" style={{ color: 'var(--mt-gold-dark)' }}>Volver al inicio</Link>
      </div>
    );
  }

  const stepBadgeStyle: React.CSSProperties = {
    width: '28px', height: '28px', borderRadius: '50%', background: 'var(--mt-gold-wash)', color: 'var(--mt-gold-dark)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700,
  };
  const cardStyle: React.CSSProperties = { background: 'var(--mt-white)', borderRadius: '16px', border: '1px solid var(--mt-line)' };
  const qtyBtnBase: React.CSSProperties = {
    width: '32px', height: '32px', borderRadius: '9px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mt-offwhite)', color: 'var(--mt-ink)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 60px' }}>

        {canceledNotice && (
          <div style={{ marginBottom: '24px', padding: '13px 16px', borderRadius: '12px', background: 'var(--mt-gold-wash)', border: '1px solid var(--mt-gold-border)', color: 'var(--mt-gold-dark)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <span>Pago cancelado — puedes intentarlo de nuevo cuando quieras.</span>
            <button onClick={() => setCanceledNotice(false)} style={{ background: 'none', border: 'none', color: 'var(--mt-gold-dark)', cursor: 'pointer', fontWeight: 800, fontSize: '14px' }}>×</button>
          </div>
        )}

        {/* Header Navigation */}
        <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--mt-muted)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            <ArrowLeft size={17} />
            Volver a Eventos
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'var(--mt-black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={15} color="var(--mt-gold)" />
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
              <span style={{ color: 'var(--mt-green)' }}>mondo</span>
              <span className="mt-gradient-gold-text">ticket</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }} className="checkout-grid">

          {/* Main Checkout Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* 1. Event Selection (Visual confirmation) */}
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              {event.imageUrl && (
                <div style={{ height: '200px', overflow: 'hidden' }}>
                  <img src={event.imageUrl} alt={event.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ padding: '22px' }}>
                <span style={{ background: 'var(--mt-black)', color: 'var(--mt-gold)', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px', display: 'inline-block' }}>{event.category || 'Evento'}</span>
                <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '14px' }}>{event.name}</h1>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--mt-muted)', fontSize: '13px' }}>
                    <Calendar size={14} color="var(--mt-gold-dark)" />
                    {new Date(event.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--mt-muted)', fontSize: '13px' }}>
                    <MapPin size={14} color="var(--mt-green)" />
                    {event.venueName}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Customer Info — comes first: creates the buyer's session so
                 the seat picker below can hold seats (anon sessions can't). */}
            <div style={{ ...cardStyle, padding: '22px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={stepBadgeStyle}>1</span>
                Tus datos para el boleto
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="form-grid">
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--mt-muted)', marginBottom: '6px', display: 'block' }}>Nombre Completo</label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={formData.name}
                      disabled={otpSent}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '11px 12px 11px 34px', borderRadius: '10px', background: 'var(--mt-offwhite)', border: `1px solid ${formErrors.name ? '#e11d48' : 'var(--mt-line)'}`, color: 'var(--mt-ink)', outline: 'none', boxSizing: 'border-box', opacity: otpSent ? 0.6 : 1 }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--mt-muted)', marginBottom: '6px', display: 'block' }}>Correo Electrónico</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                    <input
                      type="email"
                      placeholder="juan@ejemplo.com"
                      value={formData.email}
                      disabled={otpSent}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '11px 12px 11px 34px', borderRadius: '10px', background: 'var(--mt-offwhite)', border: `1px solid ${formErrors.email ? '#e11d48' : 'var(--mt-line)'}`, color: 'var(--mt-ink)', outline: 'none', boxSizing: 'border-box', opacity: otpSent ? 0.6 : 1 }}
                    />
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px', color: 'var(--mt-muted)', marginBottom: '6px', display: 'block' }}>Teléfono de contacto</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                    <input
                      type="tel"
                      placeholder="55 1234 5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ width: '100%', padding: '11px 12px 11px 34px', borderRadius: '10px', background: 'var(--mt-offwhite)', border: `1px solid ${formErrors.phone ? '#e11d48' : 'var(--mt-line)'}`, color: 'var(--mt-ink)', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {registerError && (
                <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#e11d48', fontSize: '13px' }}>
                  {registerError}
                </div>
              )}

              {!sessionReady && otpSent && (
                <div style={{ marginTop: '18px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--mt-muted)', marginBottom: '6px', display: 'block' }}>
                    Código de 6 dígitos enviado a {formData.email}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'var(--mt-offwhite)', border: '1px solid var(--mt-line)', color: 'var(--mt-ink)', outline: 'none', boxSizing: 'border-box', letterSpacing: '4px', fontSize: '17px', textAlign: 'center' }}
                  />
                </div>
              )}

              {!sessionReady && (
                <button
                  onClick={otpSent ? handleVerifyCode : handleSendCode}
                  disabled={registering || checkingSession || verifyingCode || (otpSent && otpCode.trim().length < 6)}
                  className="mt-btn-primary"
                  style={{
                    marginTop: '18px', width: '100%', padding: '13px', borderRadius: '11px', fontSize: '14px',
                    cursor: (registering || checkingSession || verifyingCode) ? 'not-allowed' : 'pointer', opacity: (registering || checkingSession || verifyingCode || (otpSent && otpCode.trim().length < 6)) ? 0.6 : 1,
                  }}
                >
                  {registering ? 'Enviando código...' : verifyingCode ? 'Verificando...' : otpSent ? 'Verificar código' : 'Enviar código'}
                </button>
              )}

              {!sessionReady && otpSent && (
                <button
                  onClick={handleSendCode}
                  disabled={registering}
                  style={{ marginTop: '10px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'var(--mt-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Reenviar código
                </button>
              )}
            </div>

            {/* 3. Ticket/Seat Selection — locked until step 1 creates a session;
                 an event can mix seat-mapped types with plain quantity-based ones. */}
            <div style={{ ...cardStyle, padding: '22px', opacity: sessionReady ? 1 : 0.4 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={stepBadgeStyle}>2</span>
                Elige tus boletos
              </h3>

              {!sessionReady ? (
                <p style={{ fontSize: '13px', color: 'var(--mt-muted)' }}>
                  Completa tus datos de contacto arriba para ver la disponibilidad y elegir tus boletos.
                </p>
              ) : (
              <>
              {seatError && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#e11d48', fontSize: '13px' }}>
                  {seatError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {event.ticketTypes.map((t) => {
                  if (t.hasSeatMap) {
                    const available = t.capacity - t.sold;
                    const qty = selection[t.id] || 0;
                    const soldOut = available <= 0;
                    return (
                      <div key={t.id}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                          padding: '14px 16px', borderRadius: '12px', background: 'var(--mt-offwhite)', border: '1px solid var(--mt-line)',
                          opacity: soldOut ? 0.5 : 1, marginBottom: '12px',
                        }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '14px' }}>{t.name}</p>
                            <p style={{ fontSize: '13px', color: 'var(--mt-muted)' }}>
                              {t.price === 0 ? 'Gratis' : `$${t.price.toLocaleString()} MXN`} · {soldOut ? 'Agotado' : `${available} disponibles`}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--mt-white)', padding: '6px', borderRadius: '11px', border: '1px solid var(--mt-line)' }}>
                            <button
                              onClick={() => setQty(t.id, qty - 1, available)}
                              disabled={qty === 0}
                              style={{ ...qtyBtnBase, background: 'var(--mt-offwhite)', color: 'var(--mt-ink)', cursor: qty === 0 ? 'not-allowed' : 'pointer', opacity: qty === 0 ? 0.4 : 1 }}
                            >
                              <Minus size={14} />
                            </button>
                            <span style={{ fontSize: '15px', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                            <button
                              onClick={() => setQty(t.id, qty + 1, available)}
                              disabled={soldOut || qty >= available}
                              className={!(soldOut || qty >= available) ? 'mt-btn-primary' : undefined}
                              style={{ ...qtyBtnBase, background: (soldOut || qty >= available) ? 'var(--mt-offwhite)' : undefined, color: (soldOut || qty >= available) ? 'var(--mt-ink)' : undefined, cursor: (soldOut || qty >= available) ? 'not-allowed' : 'pointer', opacity: (soldOut || qty >= available) ? 0.4 : 1 }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                        {qty > 0 && (
                          <div style={{ background: 'var(--mt-white)', borderRadius: '12px', padding: '14px', border: '1px solid var(--mt-line)' }}>
                            <SeatMapPicker
                              eventId={event.id}
                              ticketTypeId={t.id}
                              ticketTypes={[t]}
                              maxSeats={qty}
                              theme="light"
                              onSelectionChange={(seats) => setSelectedSeatsByType((prev) => ({ ...prev, [t.id]: seats }))}
                              onError={setSeatError}
                            />
                          </div>
                        )}
                      </div>
                    );
                  }

                  const available = t.capacity - t.sold;
                  const qty = selection[t.id] || 0;
                  const soldOut = available <= 0;
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                      padding: '14px 16px', borderRadius: '12px', background: 'var(--mt-offwhite)', border: '1px solid var(--mt-line)',
                      opacity: soldOut ? 0.5 : 1,
                    }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '14px' }}>{t.name}</p>
                        <p style={{ fontSize: '13px', color: 'var(--mt-muted)' }}>
                          {t.price === 0 ? 'Gratis' : `$${t.price.toLocaleString()} MXN`} · {soldOut ? 'Agotado' : `${available} disponibles`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--mt-white)', padding: '6px', borderRadius: '11px', border: '1px solid var(--mt-line)' }}>
                        <button
                          onClick={() => setQty(t.id, qty - 1, available)}
                          disabled={qty === 0}
                          style={{ ...qtyBtnBase, background: 'var(--mt-offwhite)', color: 'var(--mt-ink)', cursor: qty === 0 ? 'not-allowed' : 'pointer', opacity: qty === 0 ? 0.4 : 1 }}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontSize: '15px', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                        <button
                          onClick={() => setQty(t.id, qty + 1, available)}
                          disabled={soldOut || qty >= available}
                          className={!(soldOut || qty >= available) ? 'mt-btn-primary' : undefined}
                          style={{ ...qtyBtnBase, background: (soldOut || qty >= available) ? 'var(--mt-offwhite)' : undefined, color: (soldOut || qty >= available) ? 'var(--mt-ink)' : undefined, cursor: (soldOut || qty >= available) ? 'not-allowed' : 'pointer', opacity: (soldOut || qty >= available) ? 0.4 : 1 }}
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
              <div style={{ background: 'var(--mt-green-wash)', borderRadius: '16px', border: '1px solid var(--mt-green-border)', padding: '22px', color: 'var(--mt-green-dark)', fontSize: '14px', fontWeight: 600 }}>
                Esta selección es gratuita — no se requiere método de pago.
              </div>
            ) : (
            <div style={{ ...cardStyle, padding: '22px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={stepBadgeStyle}>3</span>
                Métodos de pago disponibles
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--mt-muted)', marginBottom: '16px' }}>Elegirás uno de estos en la siguiente pantalla, con nuestra pasarela de pago segura.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { id: 'card', name: 'Tarjeta', icon: <CreditCard size={19} />, sub: 'Crédito / Débito' },
                  { id: 'transfer', name: 'SPEI', icon: <CreditCard size={19} />, sub: 'Transferencia' },
                  { id: 'cash', name: 'Efectivo', icon: <Banknote size={19} />, sub: 'OXXO / Pay' }
                ].map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '14px', borderRadius: '12px', border: '1px solid var(--mt-line)',
                      background: 'var(--mt-offwhite)',
                      color: 'var(--mt-ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                    }}
                  >
                    {m.icon}
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '13px', fontWeight: 700 }}>{m.name}</p>
                      <p style={{ fontSize: '10px', color: 'var(--mt-muted)' }}>{m.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>


          <div style={{ position: 'sticky', top: '24px', height: 'fit-content' }}>
            <div style={{ background: 'var(--mt-black)', border: '2px solid var(--mt-gold)', borderRadius: '16px', padding: '22px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '18px', color: 'var(--mt-white)' }}>Resumen de Compra</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginBottom: '22px', borderBottom: '1px solid var(--mt-line-dark)', paddingBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--mt-muted-on-dark)' }}>Subtotal ({totalQuantity} boletos)</span>
                  <span style={{ fontWeight: 600, color: 'var(--mt-white)' }}>${subtotal.toLocaleString()} MXN</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--mt-muted-on-dark)' }}>Cargos por servicio</span>
                  <span style={{ fontWeight: 600, color: 'var(--mt-white)' }}>${serviceFee.toLocaleString()} MXN</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: !isFree ? '12px' : '28px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--mt-white)' }}>Total</span>
                <span className="mt-gradient-gold-text" style={{ fontSize: '26px', fontWeight: 800 }}>${total.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600 }}>MXN</span></span>
              </div>

              {!isFree && (
                <p style={{ marginBottom: '16px', fontSize: '12px', color: 'var(--mt-muted-on-dark)', textAlign: 'center' }}>
                  Tus boletos quedan reservados por {formatHoldDuration(holdMinutes)} mientras completas el pago.
                </p>
              )}

              {purchaseError && (
                <div style={{ marginBottom: '16px', padding: '11px 13px', borderRadius: '10px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: '#fca5a5', fontSize: '13px' }}>
                  {purchaseError}
                </div>
              )}

              {(() => {
                const canPurchase = sessionReady && totalQuantity > 0 && seatSelectionsComplete;
                return (
              <>
              {sessionReady && totalQuantity > 0 && !seatSelectionsComplete && (
                <p style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--mt-gold)', textAlign: 'center' }}>
                  Todavía te faltan asientos por elegir en el mapa de arriba.
                </p>
              )}
              <button
                onClick={handlePurchase}
                disabled={isProcessing || !canPurchase}
                className={canPurchase ? 'mt-btn-primary' : undefined}
                style={{
                  width: '100%', padding: '15px', borderRadius: '12px', border: 'none',
                  background: canPurchase ? undefined : 'rgba(255,255,255,0.1)',
                  color: canPurchase ? undefined : 'rgba(255,255,255,0.4)', fontWeight: 800, fontSize: '15px', cursor: (isProcessing || !canPurchase) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                }}
              >
                {isProcessing ? 'Procesando...' : (
                  <>
                    <Sparkles size={19} />
                    Finalizar Compra
                  </>
                )}
              </button>
              </>
                );
              })()}

              <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--mt-green-light)', fontSize: '12px', fontWeight: 600 }}>
                <ShieldCheck size={15} />
                Compra segura y encriptada
              </div>
            </div>

            <div style={{ marginTop: '18px', padding: '15px', borderRadius: '12px', background: 'var(--mt-gold-wash)', border: '1px solid var(--mt-gold-border)', fontSize: '12px', color: 'var(--mt-gold-dark)', lineHeight: 1.5 }}>
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
