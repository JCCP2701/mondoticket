import { Link, useLocation, useParams } from "react-router";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  User,
  Hash,
  CheckCircle2,
  Download,
  Share2,
  CreditCard,
  Banknote,
  Sparkles
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function UserTicket() {
  const { ticketId } = useParams();
  const location = useLocation();

  // Get data from navigation state (passed from UserCheckout)
  const ticketData = location.state || {
    event: {
      name: "Festival Aura 2026",
      date: "Viernes, 22 de Mayo 2026",
      time: "14:00 hrs",
      venue: "Estadio Azteca, CDMX",
      price: 1850,
    },
    quantity: 1,
    paymentMethod: "card",
    total: 1998,
    purchaseDate: new Date().toISOString(),
    customerInfo: {
      name: "Invitado TicketBlessing",
      email: "guest@example.com",
      phone: "55 0000 0000"
    },
    isGuest: true
  };

  const handleAddToAppleWallet = () => {
    alert("Función de Apple Wallet (requiere archivo .pkpass en producción)");
  };

  const handleAddToGoogleWallet = () => {
    alert("Función de Google Wallet (requiere integración con API)");
  };

  const handleAddToGoogleCalendar = () => {
    const event = {
      title: ticketData.event.name,
      details: `Boleto TicketBlessing #${ticketId} para ${ticketData.customerInfo.name}`,
      location: ticketData.event.venue,
      start: "20260522T140000",
      end: "20260523T020000",
    };
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title
    )}&dates=${event.start}/${event.end}&details=${encodeURIComponent(
      event.details
    )}&location=${encodeURIComponent(event.location)}`;
    window.open(url, "_blank");
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0b1e', color: '#f0edff', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Top Actions */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'rgba(240,237,255,0.6)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <ArrowLeft size={18} />
            Inicio
          </Link>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }} title="Compartir">
              <Share2 size={18} />
            </button>
            <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer' }} title="Descargar PDF">
              <Download size={18} />
            </button>
          </div>
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
            <h1 style={{ fontSize: '28px', fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.3)', marginBottom: '8px' }}>{ticketData.event.name}</h1>
            <p style={{ fontSize: '14px', opacity: 0.8, fontWeight: 500 }}>ID: {ticketId}</p>
          </div>

          {/* Scalloped edge simulation */}
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
                  {ticketData.event.date}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(240,237,255,0.4)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Hora</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                  <Clock size={14} color="#a78bfa" />
                  {ticketData.event.time}
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <p style={{ fontSize: '11px', color: 'rgba(240,237,255,0.4)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Lugar</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                  <MapPin size={14} color="#a78bfa" />
                  {ticketData.event.venue}
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div style={{ marginTop: '32px', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(139,92,246,0.15)', textAlign: 'center' }}>
              <div style={{ background: 'white', padding: '16px', borderRadius: '16px', display: 'inline-block', marginBottom: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <QRCodeSVG
                  value={`TB-${ticketId}-${ticketData.customerInfo.email}`}
                  size={160}
                  level="H"
                />
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(240,237,255,0.4)', fontWeight: 600 }}>Presenta este código al ingresar</p>
            </div>

            {/* Customer & Payment Info */}
            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(240,237,255,0.4)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Titular</p>
                  <p style={{ fontSize: '15px', fontWeight: 700 }}>{ticketData.customerInfo.name}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(240,237,255,0.4)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Boletos</p>
                  <p style={{ fontSize: '15px', fontWeight: 700 }}>{ticketData.quantity} x General</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(139,92,246,0.05)', borderRadius: '16px', border: '1px solid rgba(139,92,246,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                    {ticketData.paymentMethod === 'card' ? <CreditCard size={20} /> : <Banknote size={20} />}
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', color: 'rgba(240,237,255,0.4)', fontWeight: 700 }}>Pagado vía {ticketData.paymentMethod === 'card' ? 'Tarjeta' : 'Efectivo/SPEI'}</p>
                    <p style={{ fontSize: '16px', fontWeight: 900, color: '#a78bfa' }}>${ticketData.total} <span style={{ fontSize: '12px' }}>MXN</span></p>
                  </div>
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
          <p>© 2026 TicketBlessing. Todos los derechos reservados.</p>
          <p>Este boleto es personal e intransferible. Una vez escaneado pierde validez.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px', color: '#a78bfa', fontWeight: 600 }}>
            <Sparkles size={14} />
            TicketBlessing — Powered by Magic
          </div>
        </div>
      </div>
    </div>
  );
}
