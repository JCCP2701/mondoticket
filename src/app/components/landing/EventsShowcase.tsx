import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { dataService, EventRecord } from '../../services/dataService';

const CARD_COLORS = ['#a6821f', '#328022', '#13120f'];
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
        <section id="events" style={{ padding: '100px 24px', position: 'relative', background: 'var(--mt-offwhite)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                {/* Section Header */}
                <div style={{ marginBottom: '52px', textAlign: 'center' }}>
                    <span className="mt-badge" style={{ marginBottom: '16px' }}>
                        Próximos eventos
                    </span>
                    <h2 style={{ fontSize: 'clamp(30px, 3.6vw, 44px)', fontWeight: 800, color: 'var(--mt-ink)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                        Vive experiencias <span className="mt-gradient-gold-text">inolvidables</span>
                    </h2>
                    <p style={{ fontSize: '17px', color: 'var(--mt-muted)', maxWidth: '560px', margin: '0 auto' }}>
                        Elige entre los eventos más exclusivos y adquiere tus boletos en segundos, sin complicaciones.
                    </p>
                </div>

                {loading && (
                    <p style={{ textAlign: 'center', color: 'var(--mt-muted)' }}>Cargando eventos...</p>
                )}

                {!loading && events.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mt-muted)' }}>
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
                                    className="mt-card mt-event-card"
                                    style={{
                                        borderRadius: '14px', overflow: 'hidden',
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
                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,10,10,0.85) 100%)' }} />

                                            {/* Category Tag */}
                                            <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px' }}>
                                                <span style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.9)', color: 'var(--mt-ink)', fontSize: '11px', fontWeight: 700 }}>
                                                    {event.category || 'Evento'}
                                                </span>
                                            </div>

                                            {/* Top Right Tag */}
                                            {soldRatio >= 0.85 && (
                                                <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                                                    <span style={{ padding: '5px 12px', borderRadius: '6px', background: color, color: 'white', fontSize: '11px', fontWeight: 800 }}>
                                                        Agotándose
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ padding: '24px' }}>
                                            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--mt-ink)', marginBottom: '16px', lineHeight: 1.2 }}>
                                                {event.name}
                                            </h3>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--mt-muted)', fontSize: '14px' }}>
                                                    <Calendar size={16} color={color} />
                                                    {formatDate(event.date)}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--mt-muted)', fontSize: '14px' }}>
                                                    <MapPin size={16} color={color} />
                                                    {event.venueName}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid var(--mt-line)' }}>
                                                <div>
                                                    <p style={{ fontSize: '12px', color: 'var(--mt-muted)', marginBottom: '2px' }}>Precio desde</p>
                                                    <p style={{ fontSize: '24px', fontWeight: 900, color: 'var(--mt-ink)' }}>
                                                        {priceFrom(event)}
                                                    </p>
                                                </div>

                                                <div
                                                    style={{
                                                        width: '40px', height: '40px', borderRadius: '8px',
                                                        background: 'var(--mt-ink)', border: '1px solid var(--mt-ink)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mt-white)',
                                                        transition: 'all 0.3s'
                                                    }}
                                                    className="buy-btn"
                                                >
                                                    <ArrowRight size={18} />
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
                            display: 'inline-block', background: 'none', border: '1px solid var(--mt-line)', color: 'var(--mt-ink)',
                            padding: '13px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.3s', textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mt-black)'; e.currentTarget.style.color = 'var(--mt-gold)'; e.currentTarget.style.borderColor = 'var(--mt-black)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--mt-ink)'; e.currentTarget.style.borderColor = 'var(--mt-line)'; }}
                    >
                        Ver Todos los Eventos
                    </Link>
                </div>
            </div>

            <style>{`
        .mt-event-card:hover .event-image { transform: scale(1.1); }
        .mt-event-card:hover .buy-btn { background: var(--mt-gold-gradient) !important; border-color: var(--mt-gold) !important; color: var(--mt-black) !important; transform: translateX(4px); }
        @media (max-width: 768px) {
          h2 { fontSize: '32px' !important; }
        }
      `}</style>
        </section>
    );
}
