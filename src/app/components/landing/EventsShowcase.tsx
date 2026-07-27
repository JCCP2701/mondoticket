import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Calendar, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { dataService, EventRecord } from '../../services/dataService';

const CARD_COLORS = ['#6366f1', '#2563eb', '#be123c', '#8b5cf6', '#d97706', '#059669'];
const CARD_IMAGES = [
    'https://images.unsplash.com/photo-1459749411177-042180ce673c?w=800',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
    'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800',
    'https://images.unsplash.com/photo-1540575861501-7ad0582371f3?w=800',
    'https://images.unsplash.com/photo-1492691523567-6170c367314e?w=800',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
];

function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function priceFrom(event: EventRecord): string {
    if (event.ticketTypes.length === 0) return 'N/A';
    const min = Math.min(...event.ticketTypes.map((t) => t.price));
    return min === 0 ? 'Gratis' : `$${min.toLocaleString()} MXN`;
}

export default function EventsShowcase() {
    const [events, setEvents] = useState<EventRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dataService.getEvents().then((all) => {
            const upcoming = all
                .filter((e) => e.status === 'upcoming')
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 6);
            setEvents(upcoming);
            setLoading(false);
        });
    }, []);

    return (
        <section id="events" style={{ padding: '100px 24px', position: 'relative', background: '#0d0b1e' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                {/* Section Header */}
                <div style={{ marginBottom: '60px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '30px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa', fontSize: '13px', fontWeight: 700, marginBottom: '20px' }}>
                        <Sparkles size={14} />
                        PRÓXIMOS EVENTOS
                    </div>
                    <h2 style={{ fontSize: '48px', fontWeight: 900, color: '#f0edff', marginBottom: '20px', letterSpacing: '-1px' }}>
                        Vive experiencias <span className="tb-gradient-text">Inolvidables</span>
                    </h2>
                    <p style={{ fontSize: '18px', color: 'rgba(240,237,255,0.5)', maxWidth: '600px', margin: '0 auto' }}>
                        Elige entre los eventos más exclusivos y adquiere tus boletos en segundos, sin complicaciones.
                    </p>
                </div>

                {loading && (
                    <p style={{ textAlign: 'center', color: 'rgba(240,237,255,0.4)' }}>Cargando eventos...</p>
                )}

                {!loading && events.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(240,237,255,0.4)' }}>
                        <p style={{ fontSize: '16px' }}>Todavía no hay eventos próximos publicados. Vuelve pronto.</p>
                    </div>
                )}

                {/* Events Grid */}
                {events.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '30px' }}>
                        {events.map((event, i) => {
                            const color = CARD_COLORS[i % CARD_COLORS.length];
                            const image = event.imageUrl || CARD_IMAGES[i % CARD_IMAGES.length];
                            const soldRatio = event.ticketTypes.length > 0
                                ? event.ticketTypes.reduce((s, t) => s + t.sold, 0) / Math.max(1, event.ticketTypes.reduce((s, t) => s + t.capacity, 0))
                                : 0;
                            return (
                                <div
                                    key={event.id}
                                    className="tb-card-hover"
                                    style={{
                                        borderRadius: '24px', overflow: 'hidden', background: 'rgba(19,16,42,0.8)',
                                        border: '1px solid rgba(139,92,246,0.15)', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        position: 'relative'
                                    }}
                                >
                                    <Link to={`/checkout/${event.id}`} style={{ textDecoration: 'none' }}>
                                        <div style={{ height: '240px', position: 'relative', overflow: 'hidden' }}>
                                            <img
                                                src={image}
                                                alt={event.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease' }}
                                                className="event-image"
                                            />
                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(13,11,30,0.9) 100%)' }} />

                                            {/* Category Tag */}
                                            <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '8px' }}>
                                                <span style={{ padding: '6px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: 'white', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    {event.category || 'Evento'}
                                                </span>
                                            </div>

                                            {/* Top Right Tag */}
                                            {soldRatio >= 0.85 && (
                                                <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                                                    <span style={{ padding: '6px 14px', borderRadius: '12px', background: color, color: 'white', fontSize: '11px', fontWeight: 800, boxShadow: `0 10px 20px ${color}40` }}>
                                                        Agotándose
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ padding: '24px' }}>
                                            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#f0edff', marginBottom: '16px', lineHeight: 1.2 }}>
                                                {event.name}
                                            </h3>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(240,237,255,0.5)', fontSize: '14px' }}>
                                                    <Calendar size={16} color={color} />
                                                    {formatDate(event.date)}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(240,237,255,0.5)', fontSize: '14px' }}>
                                                    <MapPin size={16} color={color} />
                                                    {event.venueName}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div>
                                                    <p style={{ fontSize: '12px', color: 'rgba(240,237,255,0.4)', marginBottom: '2px' }}>Precio desde</p>
                                                    <p style={{ fontSize: '24px', fontWeight: 900, color: '#f0edff' }}>
                                                        {priceFrom(event)}
                                                    </p>
                                                </div>

                                                <div
                                                    style={{
                                                        width: '48px', height: '48px', borderRadius: '16px',
                                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                                                        transition: 'all 0.3s'
                                                    }}
                                                    className="buy-btn"
                                                >
                                                    <ArrowRight size={20} />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ marginTop: '60px', textAlign: 'center' }}>
                    <Link
                        to="/events"
                        style={{
                            display: 'inline-block', background: 'none', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa',
                            padding: '14px 32px', borderRadius: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.3s', textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                        Ver Todos los Eventos
                    </Link>
                </div>
            </div>

            <style>{`
        .tb-card-hover:hover .event-image { transform: scale(1.1); }
        .tb-card-hover:hover .buy-btn { background: #7c3aed !important; border-color: #8b5cf6 !important; transform: translateX(4px); box-shadow: 0 10px 20px rgba(124,58,237,0.4); }
        @media (max-width: 768px) {
          h2 { fontSize: '32px' !important; }
        }
      `}</style>
        </section>
    );
}
