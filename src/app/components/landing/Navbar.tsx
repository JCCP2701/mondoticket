import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Ticket, Menu, X, Zap } from 'lucide-react';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
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
                transition: 'all 0.3s ease',
                background: scrolled
                    ? 'rgba(13, 11, 30, 0.9)'
                    : 'transparent',
                backdropFilter: scrolled ? 'blur(20px)' : 'none',
                borderBottom: scrolled ? '1px solid rgba(139, 92, 246, 0.15)' : 'none',
            }}
        >
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
                    {/* Logo */}
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
                        }}>
                            <Ticket size={22} color="white" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '22px', fontWeight: 800, color: '#f0edff', fontFamily: 'Outfit, sans-serif' }}>
                                Mondo
                            </span>
                            <span style={{
                                fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit, sans-serif',
                                background: 'linear-gradient(135deg, #a78bfa, #f59e0b)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                            }}>
                                Ticket
                            </span>

                        </div>
                    </Link>

                    {/* Desktop Nav Links */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="nav-desktop">
                        {[
                            { label: 'Características', href: '#features' },
                            { label: 'Precios', href: '#pricing' },
                            { label: 'Nosotros', href: '#about' },
                        ].map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                style={{
                                    color: 'rgba(240, 237, 255, 0.7)', fontSize: '15px', fontWeight: 500,
                                    textDecoration: 'none', transition: 'color 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#f0edff')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(240, 237, 255, 0.7)')}
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>

                    {/* CTAs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.4)',
                                background: 'transparent', color: '#f0edff', fontSize: '14px', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'; }}
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            style={{
                                padding: '8px 20px', borderRadius: '8px',
                                background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                                color: 'white', fontSize: '14px', fontWeight: 600,
                                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)', display: 'flex', alignItems: 'center', gap: '6px',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(124, 58, 237, 0.5)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(124, 58, 237, 0.3)'; }}
                        >
                            <Zap size={14} />
                            Comenzar Gratis
                        </button>
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            style={{ display: 'none', background: 'none', border: 'none', color: '#f0edff', cursor: 'pointer', padding: '4px' }}
                            className="nav-mobile-btn"
                            aria-label="Toggle menu"
                        >
                            {menuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div style={{
                    background: 'rgba(13, 11, 30, 0.97)', backdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(139, 92, 246, 0.15)', padding: '20px 24px',
                }}>
                    {[
                        { label: 'Características', href: '#features' },
                        { label: 'Precios', href: '#pricing' },
                        { label: 'Nosotros', href: '#about' },
                    ].map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            style={{ display: 'block', padding: '12px 0', color: '#f0edff', textDecoration: 'none', fontSize: '16px' }}
                        >
                            {item.label}
                        </a>
                    ))}
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => navigate('/login')} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.4)', background: 'transparent', color: '#f0edff', fontSize: '15px', cursor: 'pointer' }}>Iniciar Sesión</button>
                        <button onClick={() => navigate('/register')} style={{ padding: '12px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: 'white', fontSize: '15px', border: 'none', cursor: 'pointer' }}>Comenzar Gratis</button>
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
