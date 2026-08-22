import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Calendar, MapPin, ArrowRight, Search, X } from 'lucide-react';
import { dataService, EventRecord } from '../../services/dataService';
import Navbar from './Navbar';
import Footer from './Footer';
import './landing-theme.css';

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

const inputStyle: React.CSSProperties = {
    padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--mt-line)',
    background: 'var(--mt-white)', color: 'var(--mt-ink)', fontSize: '14px', outline: 'none',
};

export default function AllEventsPage() {
    const [events, setEvents] = useState<EventRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [onlyUpcoming, setOnlyUpcoming] = useState(true);

    useEffect(() => {
        dataService.getEvents().then((all) => {
            setEvents(all);
            setLoading(false);
        });
    }, []);

    const categories = useMemo(() => {
        const set = new Set<string>();
        events.forEach((e) => { if (e.category) set.add(e.category); });
        return Array.from(set).sort();
    }, [events]);

    const filtered = useMemo(() => {
        return events
            .filter((e) => !onlyUpcoming || e.status === 'upcoming')
            .filter((e) => category === 'all' || e.category === category)
            .filter((e) => !dateFrom || e.date >= dateFrom)
            .filter((e) => !dateTo || e.date <= dateTo)
            .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.venueName.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [events, category, dateFrom, dateTo, search, onlyUpcoming]);

    const clearFilters = () => {
        setSearch(''); setCategory('all'); setDateFrom(''); setDateTo(''); setOnlyUpcoming(true);
    };

    const hasActiveFilters = search || category !== 'all' || dateFrom || dateTo || !onlyUpcoming;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--mt-offwhite)' }}>
            <Navbar />

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '140px 24px 60px' }}>
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '40px', fontWeight: 900, color: 'var(--mt-ink)', marginBottom: '12px', letterSpacing: '-1px' }}>
                        Todos los <span className="mt-gradient-gold-text">Eventos</span>
                    </h1>
                    <p style={{ fontSize: '16px', color: 'var(--mt-muted)' }}>
                        Explora y filtra por categoría o fecha para encontrar tu próxima experiencia.
                    </p>
                </div>

                {/* Filters */}
                <div className="mt-card" style={{
                    display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', marginBottom: '40px',
                    padding: '20px', borderRadius: '20px',
                }}>
                    <div style={{ position: 'relative', flex: '1 1 220px' }}>
                        <Search size={16} color="var(--mt-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            placeholder="Buscar por nombre o recinto..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ ...inputStyle, width: '100%', paddingLeft: '38px' }}
                        />
                    </div>

                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="all">Todas las categorías</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--mt-muted)' }}>Desde</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--mt-muted)' }}>Hasta</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--mt-muted)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={onlyUpcoming} onChange={(e) => setOnlyUpcoming(e.target.checked)} />
                        Solo próximos
                    </label>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '12px',
                                border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.08)', color: '#f43f5e',
                                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                            }}
                        >
                            <X size={14} /> Limpiar filtros
                        </button>
                    )}
                </div>

                {loading && <p style={{ textAlign: 'center', color: 'var(--mt-muted)' }}>Cargando eventos...</p>}

                {!loading && filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--mt-muted)' }}>
                        <p style={{ fontSize: '16px' }}>No se encontraron eventos con estos filtros.</p>
                    </div>
                )}

                {filtered.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '26px' }}>
                        {filtered.map((event, i) => {
                            const color = CARD_COLORS[i % CARD_COLORS.length];
                            const image = event.imageUrl || CARD_IMAGES[i % CARD_IMAGES.length];
                            return (
                                <Link
                                    key={event.id}
                                    to={`/checkout/${event.id}`}
                                    className="mt-card aep-card"
                                    style={{
                                        borderRadius: '20px', overflow: 'hidden',
                                        textDecoration: 'none', display: 'block',
                                    }}
                                >
                                    <div style={{ height: '180px', position: 'relative', overflow: 'hidden' }}>
                                        <img src={image} alt={event.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="event-image" />
                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,10,10,0.85) 100%)' }} />
                                        <div style={{ position: 'absolute', top: '14px', left: '14px' }}>
                                            <span style={{ padding: '5px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: 'white', fontSize: '10px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>
                                                {event.category || 'Evento'}
                                            </span>
                                        </div>
                                        {event.status !== 'upcoming' && (
                                            <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                                                <span style={{ padding: '5px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '10px', fontWeight: 700 }}>
                                                    {event.status === 'completed' ? 'Finalizado' : event.status === 'ongoing' ? 'En curso' : 'Cancelado'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ padding: '18px' }}>
                                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--mt-ink)', marginBottom: '10px' }}>{event.name}</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--mt-muted)', fontSize: '13px' }}>
                                                <Calendar size={14} color={color} /> {formatDate(event.date)}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--mt-muted)', fontSize: '13px' }}>
                                                <MapPin size={14} color={color} /> {event.venueName}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid var(--mt-line)' }}>
                                            <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--mt-ink)' }}>{priceFrom(event)}</p>
                                            <ArrowRight size={18} color={color} />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>

            <Footer />

            <style>{`.aep-card:hover .event-image { transform: scale(1.08); transition: transform 0.5s ease; }`}</style>
        </div>
    );
}
