import { useNavigate } from 'react-router';
import { Zap, Shield, ChevronDown } from 'lucide-react';

// Floating ticket visual
function FloatingTicket() {
    return (
        <div className="animate-float" style={{ perspective: '1000px' }}>
            <div style={{
                width: '340px', maxWidth: '90vw',
                background: 'linear-gradient(135deg, #13102a, #1a1535)',
                borderRadius: '20px', overflow: 'hidden', position: 'relative',
                boxShadow: '0 30px 80px rgba(124, 58, 237, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.2)',
                transform: 'rotate(-4deg) rotateX(8deg)',
            }}>
                {/* Holographic shimmer overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(135deg, transparent 40%, rgba(139,92,246,0.08) 50%, transparent 60%)',
                    pointerEvents: 'none',
                }} />

                {/* Top gradient band */}
                <div style={{
                    height: '6px',
                    background: 'linear-gradient(90deg, #7c3aed, #f59e0b, #10b981, #7c3aed)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s linear infinite',
                }} />

                <div style={{ padding: '24px' }}>
                    {/* Event badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(245,158,11,0.3)' }}>
                            ✦ PREMIUM
                        </span>
                        <span style={{ fontSize: '12px', color: 'rgba(240,237,255,0.5)' }}>ID: #TB-7821</span>
                    </div>

                    {/* Event name */}
                    <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#f0edff', marginBottom: '6px' }}>
                        Festival Conexión MX
                    </h3>
                    <p style={{ fontSize: '13px', color: 'rgba(240,237,255,0.6)', marginBottom: '20px' }}>
                        📍 Foro Sol, CDMX &nbsp;·&nbsp; 🗓 15 Ago 2025
                    </p>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ flex: 1, height: '1px', background: 'repeating-linear-gradient(90deg, rgba(139,92,246,0.3) 0px, rgba(139,92,246,0.3) 6px, transparent 6px, transparent 12px)' }} />
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0d0b1e' }} />
                        <div style={{ flex: 1, height: '1px', background: 'repeating-linear-gradient(90deg, rgba(139,92,246,0.3) 0px, rgba(139,92,246,0.3) 6px, transparent 6px, transparent 12px)' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* QR placeholder */}
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '10px',
                            background: 'white', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                            padding: '8px', gap: '2px',
                        }}>
                            {Array.from({ length: 49 }).map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: [0, 1, 2, 7, 9, 14, 21, 22, 27, 28, 29, 35, 42, 43, 44, 45, 47, 48].includes(i) ? '#0d0b1e' : 'white',
                                        borderRadius: '1px',
                                    }}
                                />
                            ))}
                        </div>
                        {/* Ticket info */}
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '12px', color: 'rgba(240,237,255,0.5)', marginBottom: '4px' }}>GENERAL</p>
                            <p style={{ fontSize: '28px', fontWeight: 800, color: '#f0edff' }}>$850</p>
                            <p style={{ fontSize: '12px', color: 'rgba(240,237,255,0.4)' }}>MXN</p>
                        </div>
                    </div>
                </div>

                <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
            </div>
        </div>
    );
}

export default function HeroSection() {
    const navigate = useNavigate();

    return (
        <section style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0d0b1e 0%, #1a0a3d 40%, #0d1b4d 70%, #0d0b1e 100%)',
            display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden',
            paddingTop: '72px',
        }}>
            {/* Animated background orbs */}
            <div style={{
                position: 'absolute', top: '20%', left: '5%', width: '500px', height: '500px',
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
                filter: 'blur(40px)', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px',
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)',
                filter: 'blur(40px)', pointerEvents: 'none',
            }} />

            {/* Grid pattern */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.03,
                backgroundImage: 'linear-gradient(#8b5cf6 1px, transparent 1px), linear-gradient(90deg, #8b5cf6 1px, transparent 1px)',
                backgroundSize: '60px 60px', pointerEvents: 'none',
            }} />

            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 24px', width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}
                    className="hero-grid">

                    {/* Left: Text */}
                    <div>
                        {/* Badge */}
                        <div className="animate-fade-in" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '6px 16px', borderRadius: '30px', marginBottom: '28px',
                            background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)',
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s infinite' }} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b' }}>
                                La plataforma #1 de boletos en México
                            </span>
                        </div>

                        <h1 className="animate-slide-up" style={{
                            fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05,
                            color: '#f0edff', marginBottom: '24px',
                            fontFamily: 'Outfit, sans-serif',
                        }}>
                            Vende boletos con{' '}
                            <span className="tb-gradient-text">
                                magia y seguridad
                            </span>
                        </h1>

                        <p className="animate-slide-up" style={{
                            fontSize: '18px', lineHeight: 1.7, color: 'rgba(240,237,255,0.65)',
                            marginBottom: '40px', maxWidth: '480px',
                            animationDelay: '0.1s', opacity: 0, animation: 'slide-in-up 0.6s ease-out 0.1s forwards',
                        }}>
                            Crea eventos, vende entradas, gestiona organizaciones y protege el acceso con MFA.
                            Todo en una plataforma diseñada para el futuro.
                        </p>

                        {/* Trust badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
                            {[
                                { icon: '🔐', label: 'MFA Protegido' },
                                { icon: '💳', label: 'Stripe Payments' },
                                { icon: '🎟️', label: 'QR Tickets' },
                            ].map((b) => (
                                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '16px' }}>{b.icon}</span>
                                    <span style={{ fontSize: '13px', color: 'rgba(240,237,255,0.5)', fontWeight: 500 }}>{b.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTAs */}
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <button
                                id="hero-cta-start"
                                onClick={() => navigate('/register')}
                                style={{
                                    padding: '14px 32px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                                    color: 'white', fontSize: '16px', fontWeight: 700, border: 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                    boxShadow: '0 0 30px rgba(124,58,237,0.4)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(124,58,237,0.6)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(124,58,237,0.4)'; }}
                            >
                                <Zap size={18} />
                                Comenzar Gratis
                            </button>
                            <button
                                id="hero-cta-login"
                                onClick={() => navigate('/login')}
                                style={{
                                    padding: '14px 32px', borderRadius: '12px',
                                    border: '1px solid rgba(139,92,246,0.35)', background: 'rgba(139,92,246,0.08)',
                                    color: '#f0edff', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)'; e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; }}
                            >
                                <Shield size={18} />
                                Iniciar Sesión
                            </button>
                        </div>
                    </div>

                    {/* Right: Floating Ticket */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="hero-visual">
                        <FloatingTicket />
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                <span style={{ fontSize: '12px', color: '#f0edff', letterSpacing: '0.1em' }}>DESCUBRE MÁS</span>
                <ChevronDown size={20} color="#f0edff" style={{ animation: 'float 2s ease-in-out infinite' }} />
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
          .hero-visual { display: none !important; }
        }
      `}</style>
        </section>
    );
}
