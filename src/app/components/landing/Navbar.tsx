import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Ticket, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Características', href: '#features' },
    { label: 'Eventos', href: '#events' },
    { label: 'Precios', href: '#pricing' },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 8);
        handleScroll();
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'rgba(10, 10, 10, 0.92)',
                backdropFilter: 'blur(12px)',
                borderBottom: scrolled ? '1px solid var(--mt-line-dark)' : '1px solid transparent',
                transition: 'border-color 0.2s ease',
            }}
        >
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
                    {/* Logo */}
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <div style={{
                            width: '30px', height: '30px', borderRadius: '7px',
                            background: 'rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Ticket size={16} color="var(--mt-gold)" />
                        </div>
                        <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.01em' }}>
                            <span style={{ color: 'var(--mt-green-light)' }}>mondo</span>
                            <span className="mt-gradient-gold-text">ticket</span>
                        </span>
                    </Link>

                    {/* Desktop Nav Links */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="nav-desktop">
                        {NAV_ITEMS.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                style={{
                                    color: 'var(--mt-muted-on-dark)', fontSize: '14px', fontWeight: 500,
                                    textDecoration: 'none', transition: 'color 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mt-white)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mt-muted-on-dark)')}
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>

                    {/* CTAs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button
                            onClick={() => navigate('/login')}
                            className="nav-desktop"
                            style={{
                                background: 'none', border: 'none', color: 'var(--mt-white)', fontSize: '14px', fontWeight: 500,
                                cursor: 'pointer', padding: 0,
                            }}
                        >
                            Iniciar sesión
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            className="mt-btn-primary"
                            style={{
                                padding: '9px 18px', borderRadius: '8px',
                                fontSize: '14px', fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Comenzar gratis
                        </button>
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--mt-white)', cursor: 'pointer', padding: '4px' }}
                            className="nav-mobile-btn"
                            aria-label="Toggle menu"
                        >
                            {menuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div style={{
                    background: 'var(--mt-black)', borderTop: '1px solid var(--mt-line-dark)', padding: '16px 24px',
                }}>
                    {NAV_ITEMS.map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            style={{ display: 'block', padding: '10px 0', color: 'var(--mt-white)', textDecoration: 'none', fontSize: '15px' }}
                        >
                            {item.label}
                        </a>
                    ))}
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => navigate('/login')} style={{ padding: '11px', borderRadius: '8px', border: '1px solid var(--mt-line-dark)', background: 'transparent', color: 'var(--mt-white)', fontSize: '14px', cursor: 'pointer' }}>Iniciar sesión</button>
                        <button onClick={() => navigate('/register')} className="mt-btn-primary" style={{ padding: '11px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>Comenzar gratis</button>
                    </div>
                </div>
            )}

            <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: block !important; }
        }
      `}</style>
        </nav>
    );
}
