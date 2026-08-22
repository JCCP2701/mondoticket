import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Ticket, QrCode, Calendar, MapPin, ExternalLink, LogOut, Filter, ChevronRight, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService, MyTicketRecord } from '../../services/dataService';
import { QRCodeSVG } from 'qrcode.react';

const STATUS_LABEL: Record<MyTicketRecord['status'], string> = { valid: 'Válido', used: 'Usado', cancelled: 'Reembolsado' };
const STATUS_COLOR: Record<MyTicketRecord['status'], string> = {
    valid: 'rgba(16,185,129,0.9)',
    used: 'rgba(59,130,246,0.9)',
    cancelled: 'rgba(244,63,94,0.9)',
};

function TicketCard({ ticket, isUpcoming }: { ticket: MyTicketRecord; isUpcoming: boolean }) {
    const [showQR, setShowQR] = useState(false);
    const [walletLoading, setWalletLoading] = useState(false);
    const [walletError, setWalletError] = useState("");

    const handleAddToGoogleWallet = async () => {
        setWalletError("");
        setWalletLoading(true);
        try {
            const saveUrl = await dataService.getGoogleWalletSaveUrl(ticket.id);
            window.open(saveUrl, '_blank');
        } catch (e: any) {
            setWalletError(e?.message || 'No se pudo agregar a Google Wallet.');
        } finally {
            setWalletLoading(false);
        }
    };

    return (
        <div style={{
            borderRadius: '20px', overflow: 'hidden',
            background: 'rgba(19,16,42,0.8)', border: '1px solid rgba(139,92,246,0.2)',
            boxShadow: isUpcoming ? '0 10px 40px rgba(124,58,237,0.15)' : 'none',
            transition: 'all 0.3s ease',
            opacity: ticket.status === 'cancelled' ? 0.6 : isUpcoming ? 1 : 0.85,
        }}>
            {/* Header */}
            <div style={{
                height: '80px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
                background: ticket.eventImageUrl ? `linear-gradient(180deg, rgba(13,11,30,0.2), rgba(13,11,30,0.75)), url(${ticket.eventImageUrl}) center/cover` : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase' }}>{ticket.eventCategory || 'Evento'}</span>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>{ticket.ticketTypeName}</span>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>{ticket.unitPrice === 0 ? 'Gratis' : `$${ticket.unitPrice.toLocaleString()} MXN`}</span>
                </div>
                <div style={{
                    position: 'absolute', top: '12px', left: '12px',
                    padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                    background: STATUS_COLOR[ticket.status], color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                }}>{STATUS_LABEL[ticket.status]}</div>
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
                        <span style={{ fontSize: '12px', color: 'rgba(240,237,255,0.5)' }}>
                            {ticket.eventDate ? new Date(ticket.eventDate + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha por confirmar'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} color="rgba(240,237,255,0.4)" />
                        <span style={{ fontSize: '12px', color: 'rgba(240,237,255,0.5)' }}>{ticket.venueName || 'Recinto por confirmar'}</span>
                    </div>
                    {ticket.seatLabel && (
                        <div style={{ fontSize: '12px', color: 'rgba(240,237,255,0.5)' }}>Asiento {ticket.seatLabel}</div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setShowQR(!showQR)}
                        disabled={ticket.status === 'cancelled'}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: ticket.status === 'cancelled' ? 'not-allowed' : 'pointer',
                            background: showQR ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.15)',
                            color: '#a78bfa', fontSize: '13px', fontWeight: 600, opacity: ticket.status === 'cancelled' ? 0.5 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <QrCode size={15} />
                        {showQR ? 'Ocultar' : 'Ver QR'}
                    </button>
                    <Link
                        to={`/ticket/${ticket.orderId}`}
                        style={{
                            width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.2)',
                            background: 'rgba(255,255,255,0.03)', color: 'rgba(240,237,255,0.6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                        }}
                        title="Ver boleto completo"
                    >
                        <ExternalLink size={15} />
                    </Link>
                </div>

                {showQR && ticket.status !== 'cancelled' && (
                    <div style={{
                        marginTop: '16px', padding: '16px', borderRadius: '12px',
                        background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                    }}>
                        <div style={{ padding: '10px', background: 'white', borderRadius: '10px' }}>
                            <QRCodeSVG value={ticket.qrCode} size={120} level="H" />
                        </div>
                        <p style={{ fontSize: '11px', color: 'rgba(240,237,255,0.35)', textAlign: 'center' }}>
                            Presenta este QR en el acceso
                        </p>
                        <button
                            onClick={handleAddToGoogleWallet}
                            disabled={walletLoading}
                            style={{ background: 'white', color: '#0d0b1e', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: walletLoading ? 'default' : 'pointer', opacity: walletLoading ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            Google Wallet
                        </button>
                        {walletError && <p style={{ fontSize: '11px', color: '#f43f5e', textAlign: 'center' }}>{walletError}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function UserWallet() {
    const { user, logout } = useAuth();
    const [tickets, setTickets] = useState<MyTicketRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

    useEffect(() => {
        dataService.getTicketsForOwner().then((t) => { setTickets(t); setLoading(false); });
    }, []);

    const today = new Date().toISOString().slice(0, 10);
    const isUpcoming = (t: MyTicketRecord) => !t.eventDate || t.eventDate >= today;

    const filtered = tickets.filter((t) => filter === 'all' || (filter === 'upcoming' ? isUpcoming(t) : !isUpcoming(t)));
    const upcomingCount = tickets.filter(isUpcoming).length;
    const totalInvested = tickets.filter((t) => t.status !== 'cancelled').reduce((s, t) => s + t.unitPrice, 0);

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
                            Mondo<span style={{ background: 'linear-gradient(135deg, #a78bfa, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Ticket</span>
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
                        {upcomingCount} boleto(s) próximos • {tickets.length - upcomingCount} pasados
                    </p>
                </div>

                {/* Stats bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }} className="wallet-stats">
                    {[
                        { label: 'Total boletos', value: tickets.length, color: '#a78bfa', emoji: '🎟️' },
                        { label: 'Próximos eventos', value: upcomingCount, color: '#10b981', emoji: '📅' },
                        { label: 'Total invertido', value: `$${totalInvested.toLocaleString()} MXN`, color: '#f59e0b', emoji: '💰' },
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
                            to="/events"
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

                {loading && <p style={{ color: 'rgba(240,237,255,0.4)' }}>Cargando tus boletos...</p>}

                {/* Tickets grid */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
                        {filtered.map((ticket) => (
                            <TicketCard key={ticket.id} ticket={ticket} isUpcoming={isUpcoming(ticket)} />
                        ))}
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                        <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>🎟️</span>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f0edff', marginBottom: '8px' }}>No tienes boletos aquí</h3>
                        <p style={{ color: 'rgba(240,237,255,0.5)', marginBottom: '24px' }}>¡Explora eventos increíbles y compra tu primer boleto!</p>
                        <Link to="/events" style={{ padding: '12px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: 'white', textDecoration: 'none', fontWeight: 700 }}>
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
