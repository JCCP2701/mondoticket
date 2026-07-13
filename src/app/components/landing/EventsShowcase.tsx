import { Link } from 'react-router';
import { Calendar, MapPin, Ticket, ArrowRight, Star, Sparkles } from 'lucide-react';

const FEATURED_EVENTS = [
    {
        id: "evt_aura_2026",
        name: "Festival Aura 2026",
        category: "Música / Festival",
        date: "22 May 2026",
        venue: "Estadio Azteca, CDMX",
        price: 1850,
        image: "https://images.unsplash.com/photo-1459749411177-042180ce673c?w=800",
        color: "#6366f1",
        tag: "Agotándose"
    },
    {
        id: "evt_copa_mx",
        name: "Final Copa MX 2026",
        category: "Deportes / Fútbol",
        date: "12 Abr 2026",
        venue: "Estadio Akron, GDL",
        price: 950,
        image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800",
        color: "#2563eb",
        tag: "Popular"
    },
    {
        id: "evt_fantasma_opera",
        name: "Fantasma de la Ópera",
        category: "Teatro / Musical",
        date: "04 Jun 2026",
        venue: "Teatro Telcel, CDMX",
        price: 1200,
        image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800",
        color: "#be123c",
        tag: "Estreno"
    },
    {
        id: "evt_tech_summit",
        name: "Tech Summit 2026",
        category: "Conferencia / Tech",
        date: "15 Jul 2026",
        venue: "WTC, CDMX",
        price: 3500,
        image: "https://images.unsplash.com/photo-1540575861501-7ad0582371f3?w=800",
        color: "#8b5cf6",
        tag: "VIP"
    },
    {
        id: "evt_art_soumaya",
        name: "Avant-Garde Art",
        category: "Arte / Exposición",
        date: "08 Ago 2026",
        venue: "Museo Soumaya, CDMX",
        price: 450,
        image: "https://images.unsplash.com/photo-1492691523567-6170c367314e?w=800",
        color: "#d97706",
        tag: "Exclusivo"
    },
    {
        id: "evt_cinema_stars",
        name: "Cinema Under Stars",
        category: "Cine / Experiencia",
        date: "18 Sep 2026",
        venue: "Cineteca Nacional",
        price: 250,
        image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
        color: "#059669",
        tag: "Nuevo"
    }
];

export default function EventsShowcase() {
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

                {/* Events Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '30px' }}>
                    {FEATURED_EVENTS.map((event) => (
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
                                        src={event.image}
                                        alt={event.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease' }}
                                        className="event-image"
                                    />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(13,11,30,0.9) 100%)' }} />

                                    {/* Category Tag */}
                                    <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '8px' }}>
                                        <span style={{ padding: '6px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: 'white', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>
                                            {event.category}
                                        </span>
                                    </div>

                                    {/* Top Right Tag */}
                                    <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                                        <span style={{ padding: '6px 14px', borderRadius: '12px', background: event.color, color: 'white', fontSize: '11px', fontWeight: 800, boxShadow: `0 10px 20px ${event.color}40` }}>
                                            {event.tag}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ padding: '24px' }}>
                                    <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#f0edff', marginBottom: '16px', lineHeight: 1.2 }}>
                                        {event.name}
                                    </h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(240,237,255,0.5)', fontSize: '14px' }}>
                                            <Calendar size={16} color={event.color} />
                                            {event.date}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(240,237,255,0.5)', fontSize: '14px' }}>
                                            <MapPin size={16} color={event.color} />
                                            {event.venue}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <p style={{ fontSize: '12px', color: 'rgba(240,237,255,0.4)', marginBottom: '2px' }}>Precio desde</p>
                                            <p style={{ fontSize: '24px', fontWeight: 900, color: '#f0edff' }}>
                                                ${event.price.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600 }}>MXN</span>
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
                    ))}
                </div>

                <div style={{ marginTop: '60px', textAlign: 'center' }}>
                    <button style={{ background: 'none', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', padding: '14px 32px', borderRadius: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                        Ver Todos los Eventos
                    </button>
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
