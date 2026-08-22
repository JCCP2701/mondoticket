import { Link, useParams } from "react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle2,
  Share2,
  Sparkles
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../services/supabaseClient";
import { dataService } from "../../services/dataService";

interface OrderView {
  id: string;
  status: string;
  event_id: string;
  total: number;
  customer_name: string;
  customer_email: string;
  created_at: string;
  events: { name: string; event_date: string; venues: { name: string } | null } | null;
}

const MAX_POLL_ATTEMPTS = 30; // 30 x 2s ~= 60s — comfortable margin over typical webhook latency

interface TicketView {
  id: string;
  qr_code: string;
  status: string;
  event_ticket_types: { name: string } | null;
}

export default function UserTicket() {
  const { ticketId: orderId } = useParams();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [walletLoadingId, setWalletLoadingId] = useState<string | null>(null);
  const [walletError, setWalletError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let attempt = 0;

    const fetchOnce = async () => {
      const [{ data: orderData, error: orderError }, { data: ticketData }] = await Promise.all([
        supabase.from('orders').select('id, status, event_id, total, customer_name, customer_email, created_at, events(name, event_date, venues(name))').eq('id', orderId).single(),
        supabase.from('tickets').select('id, qr_code, status, event_ticket_types(name)').eq('order_id', orderId).order('created_at'),
      ]);
      if (cancelled) return;
      if (orderError || !orderData) {
        setError('No encontramos esta orden. Verifica el enlace o inicia sesión con la cuenta que hizo la compra.');
        setLoading(false);
        return;
      }
      setOrder(orderData as any);
      setTickets((ticketData as any) || []);
      setLoading(false);

      // A real-money purchase's tickets/QR only exist once the OrkestaPay
      // webhook confirms payment (confirm_order_paid) — that can lag a few
      // seconds behind this page loading, so poll instead of assuming the
      // order is already settled.
      if ((orderData as any).status === 'pending' && !cancelled) {
        attempt++;
        if (attempt < MAX_POLL_ATTEMPTS) setTimeout(fetchOnce, 2000);
        else setPollTimedOut(true);
      }
    };

    fetchOnce();
    return () => { cancelled = true; };
  }, [orderId]);

  const handleCheckAgain = () => {
    setPollTimedOut(false);
    if (!orderId) return;
    (async () => {
      const [{ data: orderData }, { data: ticketData }] = await Promise.all([
        supabase.from('orders').select('id, status, event_id, total, customer_name, customer_email, created_at, events(name, event_date, venues(name))').eq('id', orderId).single(),
        supabase.from('tickets').select('id, qr_code, status, event_ticket_types(name)').eq('order_id', orderId).order('created_at'),
      ]);
      if (orderData) setOrder(orderData as any);
      setTickets((ticketData as any) || []);
      if ((orderData as any)?.status === 'pending') setPollTimedOut(true);
    })();
  };

  const handleAddToAppleWallet = () => {
    alert("Función de Apple Wallet (pendiente: requiere cuenta Apple Developer y certificados)");
  };

  const handleAddToGoogleWallet = async (ticketId: string) => {
    setWalletError("");
    setWalletLoadingId(ticketId);
    try {
      const saveUrl = await dataService.getGoogleWalletSaveUrl(ticketId);
      window.open(saveUrl, "_blank");
    } catch (e: any) {
      setWalletError(e?.message || "No se pudo agregar a Google Wallet.");
    } finally {
      setWalletLoadingId(null);
    }
  };

  const handleAddToGoogleCalendar = () => {
    if (!order?.events) return;
    const start = order.events.event_date.replace(/-/g, '');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      order.events.name
    )}&dates=${start}/${start}&location=${encodeURIComponent(order.events.venues?.name || '')}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0b1e', color: '#f0edff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Cargando boleto...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0b1e', color: '#f0edff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px', textAlign: 'center' }}>
        <p>{error}</p>
        <Link to="/" style={{ color: '#a78bfa' }}>Volver al inicio</Link>
      </div>
    );
  }

  if (order.status === 'pending') {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0b1e', color: '#f0edff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '24px', textAlign: 'center' }}>
        {!pollTimedOut ? (
          <>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(139,92,246,0.2)', borderTopColor: '#a78bfa', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: '16px', fontWeight: 700 }}>Confirmando tu pago...</p>
            <p style={{ fontSize: '13px', color: 'rgba(240,237,255,0.5)', maxWidth: '340px' }}>Esto normalmente toma unos segundos.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        ) : (
          <>
            <p style={{ fontSize: '16px', fontWeight: 700 }}>Seguimos confirmando tu pago</p>
            <p style={{ fontSize: '13px', color: 'rgba(240,237,255,0.5)', maxWidth: '340px' }}>
              Esto puede tardar unos minutos si pagaste con SPEI o en efectivo. Revisa tu correo o vuelve a esta página más tarde.
            </p>
            <button
              onClick={handleCheckAgain}
              style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(167,139,250,0.4)', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
              Verificar de nuevo
            </button>
          </>
        )}
        <Link to="/" style={{ color: 'rgba(240,237,255,0.4)', fontSize: '13px' }}>Volver al inicio</Link>
      </div>
    );
  }

  if (order.status === 'failed') {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0b1e', color: '#f0edff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '16px', fontWeight: 700 }}>Tu pago no se completó</p>
        <p style={{ fontSize: '13px', color: 'rgba(240,237,255,0.5)', maxWidth: '340px' }}>No se realizó ningún cargo. Puedes intentar la compra de nuevo cuando quieras.</p>
        <Link to={`/checkout/${order.event_id}`} style={{ padding: '10px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
          Intentar de nuevo
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0b1e', color: '#f0edff', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Top Actions */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'rgba(240,237,255,0.6)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <ArrowLeft size={18} />
            Inicio
          </Link>
          <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }} title="Compartir">
            <Share2 size={18} />
          </button>
        </div>

        {/* Ticket Card Container */}
        <div style={{ background: 'rgba(19,16,42,0.95)', borderRadius: '32px', border: '1px solid rgba(139,92,246,0.25)', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', position: 'relative' }}>

          {/* Header Section */}
          <div style={{ background: 'linear-gradient(135deg, #7c3aed, #4338ca)', padding: '32px 24px', position: 'relative', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: '30px', color: 'white', fontSize: '12px', fontWeight: 700, marginBottom: '16px', backdropFilter: 'blur(10px)' }}>
              <CheckCircle2 size={14} />
              BOLETO CONFIRMADO
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.3)', marginBottom: '8px' }}>{order.events?.name}</h1>
            <p style={{ fontSize: '14px', opacity: 0.8, fontWeight: 500 }}>Orden: {order.id.slice(0, 8).toUpperCase()}</p>
          </div>

          <div style={{ height: '32px', position: 'relative', background: 'rgba(19,16,42,1)', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: '-16px', width: '32px', height: '32px', borderRadius: '50%', background: '#0d0b1e', border: '1px solid rgba(139,92,246,0.25)' }} />
            <div style={{ flex: 1, borderTop: '2px dashed rgba(139,92,246,0.2)', margin: '0 16px' }} />
            <div style={{ position: 'absolute', right: '-16px', width: '32px', height: '32px', borderRadius: '50%', background: '#0d0b1e', border: '1px solid rgba(139,92,246,0.25)' }} />
          </div>

          <div style={{ padding: '0 32px 32px' }}>

            {/* Main Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '16px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(240,237,255,0.4)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Fecha</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                  <Calendar size={14} color="#a78bfa" />
                  {order.events && new Date(order.events.event_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div style={{ gridColumn: 'span 1' }}>
                <p style={{ fontSize: '11px', color: 'rgba(240,237,255,0.4)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Lugar</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                  <MapPin size={14} color="#a78bfa" />
                  {order.events?.venues?.name}
                </div>
              </div>
            </div>

            {/* QR Codes — one per ticket in this order */}
            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {tickets.map((t, i) => (
                <div key={t.id} style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.15)', textAlign: 'center' }}>
                  {t.status === 'cancelled' ? (
                    <p style={{ fontSize: '13px', color: '#f43f5e', fontWeight: 700, padding: '40px 0' }}>Este boleto fue reembolsado y ya no es válido.</p>
                  ) : (
                    <div style={{ background: 'white', padding: '16px', borderRadius: '16px', display: 'inline-block', marginBottom: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                      <QRCodeSVG value={t.qr_code} size={160} level="H" />
                    </div>
                  )}
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa' }}>{t.event_ticket_types?.name || 'Boleto'} #{i + 1}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(240,237,255,0.4)', fontWeight: 600, marginBottom: t.status === 'cancelled' ? 0 : '12px' }}>Presenta este código al ingresar</p>
                  {t.status !== 'cancelled' && (
                    <button
                      onClick={() => handleAddToGoogleWallet(t.id)}
                      disabled={walletLoadingId === t.id}
                      style={{ background: 'white', color: '#0d0b1e', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: walletLoadingId === t.id ? 'default' : 'pointer', opacity: walletLoadingId === t.id ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Google Wallet
                    </button>
                  )}
                </div>
              ))}
            </div>
            {walletError && <p style={{ fontSize: '12px', color: '#f43f5e', marginTop: '12px', textAlign: 'center' }}>{walletError}</p>}

            {/* Customer & Payment Info */}
            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(240,237,255,0.4)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Titular</p>
                  <p style={{ fontSize: '15px', fontWeight: 700 }}>{order.customer_name}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(240,237,255,0.4)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Boletos</p>
                  <p style={{ fontSize: '15px', fontWeight: 700 }}>{tickets.length}</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(139,92,246,0.05)', borderRadius: '16px', border: '1px solid rgba(139,92,246,0.1)' }}>
                <div>
                  <p style={{ fontSize: '10px', color: 'rgba(240,237,255,0.4)', fontWeight: 700 }}>Total pagado</p>
                  <p style={{ fontSize: '16px', fontWeight: 900, color: '#a78bfa' }}>${Number(order.total).toLocaleString()} <span style={{ fontSize: '12px' }}>MXN</span></p>
                </div>
                <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  LIQUIDADO
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={handleAddToAppleWallet}
                style={{ background: 'black', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                Apple Wallet
              </button>
              <button
                onClick={handleAddToGoogleCalendar}
                style={{ background: 'white', color: '#0d0b1e', border: 'none', padding: '12px', borderRadius: '14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Calendar size={18} />
                Calendario
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: '32px', textAlign: 'center', color: 'rgba(240,237,255,0.3)', fontSize: '12px', lineHeight: 1.6 }}>
          <p>© 2026 MondoTicket. Todos los derechos reservados.</p>
          <p>Este boleto es personal e intransferible. Una vez escaneado pierde validez.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px', color: '#a78bfa', fontWeight: 600 }}>
            <Sparkles size={14} />
            MondoTicket — Powered by Magic
          </div>
        </div>
      </div>
    </div>
  );
}
