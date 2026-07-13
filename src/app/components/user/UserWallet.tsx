import { useState } from 'react';
import { Link } from 'react-router';
import { Ticket, QrCode, Calendar, MapPin, Download, Share2, LogOut, Filter, ChevronRight, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

// Mock data for demo
const MOCK_TICKETS = [
    {
        id: 'tb_7821', eventName: 'Festival Conexión MX', date: '15 Ago 2025', venue: 'Foro Sol, CDMX',
        type: 'General', price: 850, status: 'upcoming',
        gradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
        emoji: '🎸',
    },
    {
        id: 'tb_6543', eventName: 'Cumbre Líderes 2025', date: '22 Sep 2025', venue: 'Centro Banamex, CDMX',
        type: 'VIP', price: 2500, status: 'upcoming',
        gradient: 'linear-gradient(135deg, #d97706, #b45309)',
        emoji: '🏆',
    },
    {
        id: 'tb_5102', eventName: 'Night Glow EDM', date: '10 Mar 2025', venue: 'Pepsi Center, CDMX',
        type: 'Early Bird', price: 450, status: 'past',
        gradient: 'linear-gradient(135deg, #0891b2, #0e7490)',
        emoji: '🎧',
    },
    {
        id: 'tb_4891', eventName: 'Expo Gastronómica MX', date: '28 Feb 2025', venue: 'World Trade Center, CDMX',
        type: 'General', price: 300, status: 'past',
        gradient: 'linear-gradient(135deg, #16a34a, #15803d)',
        emoji: '🍽️',
    },
];

function TicketCard({ ticket }: { ticket: typeof MOCK_TICKETS[0] }) {
    const [showQR, setShowQR] = useState(false);
    const qrData = `ticketblessing://verify/${ticket.id}`;

    return (
        <div style={{
            borderRadius: '20px', overflow: 'hidden',
            background: 'rgba(19,16,42,0.8)', border: '1px solid rgba(139,92,246,0.2)',
            boxShadow: ticket.status === 'upcoming' ? '0 10px 40px rgba(124,58,237,0.15)' : 'none',
            transition: 'all 0.3s ease',
            opacity: ticket.status === 'past' ? 0.75 : 1,
        }}
            onMouseEnter={(e) => { if (ticket.status === 'upcoming') e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(124,58,237,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ticket.status === 'upcoming' ? '0 10px 40px rgba(124,58,237,0.15)' : 'none'; }}>

            {/* Color header */}
            <div style={{ height: '80px', background: ticket.gradient, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'relative' }}>
                <span style={{ fontSize: '36px' }}>{ticket.emoji}</span>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>{ticket.type}</span>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>${ticket.price.toLocaleString()} MXN</span>
                </div>
                {ticket.status === 'upcoming' && (
                    <div style={{
                        position: 'absolute', top: '12px', left: '12px',
                        padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                        background: 'rgba(16,185,129,0.9)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                    }}>● PRÓXIMO</div>
                )}
            </div>

            {/* Dashed divider */}
            <div style={{ position: 'relative', height: '1px', margin: '0 16px', background: 'repeating-linear-gradient(90deg, rgba(139,92,246,0.3) 0px, rgba(139,92,246,0.3) 8px, transparent 8px, transparent 16px)' }}>
                <div style={{ position: 'absolute', left: '-16px', top: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: '#0d0b1e' }} />
                <div style={{ position: 'absolute', right: '-16px', top: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: '#0d0b1e' }} />
            </div>

            {/* Bottom */}
            <div style={{ padding: '16px 20px 20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f0edff', marginBottom: '8px', lineHeight: 1.3 }}>
                    {ticket.eventName}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} color="rgba(240,237,255,0.4)" />
                        <span style={{ fontSize: '12px', color: 'rgba(240,237,255,0.5)' }}>{ticket.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} color="rgba(240,237,255,0.4)" />
                        <span style={{ fontSize: '12px', color: 'rgba(240,237,255,0.5)' }}>{ticket.venue}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setShowQR(!showQR)}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                            background: showQR ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.15)',
                            color: '#a78bfa', fontSize: '13px', fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <QrCode size={15} />
                        {showQR ? 'Ocultar' : 'Ver QR'}
                    </button>
                    <button
                        style={{
                            width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.2)',
                            background: 'rgba(255,255,255,0.03)', color: 'rgba(240,237,255,0.4)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                        }}
                        title="Descargar boleto"
                    >
                        <Download size={15} />
                    </button>
                    <button
                        style={{
                            width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.2)',
                            background: 'rgba(255,255,255,0.03)', color: 'rgba(240,237,255,0.4)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                        }}
                        title="Compartir boleto"
                    >
                        <Share2 size={15} />
                    </button>
                </div>

                {/* QR Expand */}
                {showQR && (
                    <div style={{
                        marginTop: '16px', padding: '16px', borderRadius: '12px',
                        background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                    }}>
                        <div style={{ padding: '10px', background: 'white', borderRadius: '10px' }}>
                            <QRCodeSVG value={qrData} size={120} level="H" />
                        </div>
                        <p style={{ fontSize: '11px', color: 'rgba(240,237,255,0.35)', textAlign: 'center' }}>
                            ID: {ticket.id} • Presenta este QR en el acceso
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function UserWallet() {
    const { user, logout } = useAuth();
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

    const filtered = MOCK_TICKETS.filter((t) => filter === 'all' || t.status === filter);

    return (
        <div style={{ minHeight: '100vh', background: '#0d0b1e' }}>
            {/* Top Nav */}
            <nav style={{ background: 'rgba(13,11,30,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(139,92,246,0.15)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Ticket size={18} color="white" />
                        </div>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#f0edff' }}>
                            Ticket<span style={{ background: 'linear-gradient(135deg, #a78bfa, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Blessing</span>
                        </span>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white' }}>
                                {user?.avatar}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f0edff' }}>{user?.name}</span>
                        </div>
                        <button
                            onClick={() => logout()}
                            style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <LogOut size={14} />
                            Salir
                        </button>
                    </div>
                </div>
            </nav>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
                {/* Hero header */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <Wallet size={28} color="#a78bfa" />
                        <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#f0edff' }}>
                            Mi <span className="tb-gradient-text">Wallet</span>
                        </h1>
                    </div>
                    <p style={{ color: 'rgba(240,237,255,0.5)', fontSize: '15px' }}>
                        {MOCK_TICKETS.filter(t => t.status === 'upcoming').length} boleto(s) próximos • {MOCK_TICKETS.filter(t => t.status === 'past').length} usados
                    </p>
                </div>

                {/* Stats bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }} className="wallet-stats">
                    {[
                        { label: 'Total boletos', value: MOCK_TICKETS.length, color: '#a78bfa', emoji: '🎟️' },
                        { label: 'Próximos eventos', value: MOCK_TICKETS.filter(t => t.status === 'upcoming').length, color: '#10b981', emoji: '📅' },
                        { label: 'Total invertido', value: `$${MOCK_TICKETS.reduce((s, t) => s + t.price, 0).toLocaleString()} MXN`, color: '#f59e0b', emoji: '💰' },
                    ].map((s) => (
                        <div key={s.label} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <span style={{ fontSize: '28px' }}>{s.emoji}</span>
                            <div>
                                <p style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</p>
                                <p style={{ fontSize: '12px', color: 'rgba(240,237,255,0.45)' }}>{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', alignItems: 'center' }}>
                    <Filter size={16} color="rgba(240,237,255,0.4)" />
                    {(['all', 'upcoming', 'past'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                                background: filter === f ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                                color: filter === f ? 'white' : 'rgba(240,237,255,0.5)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {{ all: 'Todos', upcoming: 'Próximos', past: 'Pasados' }[f]}
                        </button>
                    ))}
                    <div style={{ marginLeft: 'auto' }}>
                        <Link
                            to="/checkout/evt_001"
                            style={{
                                padding: '8px 18px', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
                                background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)',
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}
                        >
                            <Ticket size={14} />
                            Comprar boletos
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                {/* Tickets grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
                    {filtered.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} />
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                        <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>🎟️</span>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f0edff', marginBottom: '8px' }}>No tienes boletos aquí</h3>
                        <p style={{ color: 'rgba(240,237,255,0.5)', marginBottom: '24px' }}>¡Explora eventos increíbles y compra tu primer boleto!</p>
                        <Link to="/checkout/evt_001" style={{ padding: '12px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: 'white', textDecoration: 'none', fontWeight: 700 }}>
                            Ver Eventos
                        </Link>
                    </div>
                )}
            </div>

            <style>{`
        @media (max-width: 640px) { .wallet-stats { grid-template-columns: 1fr !important; } }
      `}</style>
        </div>
    );
}
