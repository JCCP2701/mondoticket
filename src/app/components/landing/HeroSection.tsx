import { useNavigate } from 'react-router';
import { ShieldCheck, CreditCard, QrCode, LayoutDashboard, Ticket, Users, BarChart3, ArrowRight } from 'lucide-react';

const TRUST_ITEMS = [
    { icon: ShieldCheck, label: 'Seguridad con MFA' },
    { icon: CreditCard, label: 'Pagos seguros con OrkestaPay' },
    { icon: QrCode, label: 'QR antifraude' },
];

const MOCK_EVENTS = [
    { name: 'Festival Conexión MX', date: '15 Ago', status: 'Activo', statusTone: 'green' as const },
    { name: 'Noche de Jazz — Foro Sol', date: '22 Ago', status: 'Activo', statusTone: 'green' as const },
    { name: 'Copa MX Final', date: '02 Sep', status: 'Agotado', statusTone: 'gold' as const },
];

function DashboardMock() {
    return (
        <div style={{
            background: 'var(--mt-white)',
            border: '1px solid var(--mt-line)',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(19,18,15,0.08)',
            display: 'flex',
            width: '100%',
            maxWidth: '460px',
        }}>
            {/* Icon rail */}
            <div style={{
                width: '52px', background: 'var(--mt-black)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '20px', padding: '20px 0', flexShrink: 0,
            }}>
                <LayoutDashboard size={17} color="var(--mt-gold)" />
                <Ticket size={17} color="rgba(255,255,255,0.4)" />
                <Users size={17} color="rgba(255,255,255,0.4)" />
                <BarChart3 size={17} color="rgba(255,255,255,0.4)" />
            </div>

            <div style={{ flex: 1, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--mt-ink)' }}>Mis eventos</span>
                    <span style={{ fontSize: '11px', color: 'var(--mt-green)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--mt-green)' }} />
                        En vivo
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                    {MOCK_EVENTS.map((ev) => (
                        <div key={ev.name} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', borderRadius: '8px', background: 'var(--mt-offwhite)',
                        }}>
                            <div>
                                <p style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mt-ink)', marginBottom: '2px' }}>{ev.name}</p>
                                <p style={{ fontSize: '11px', color: 'var(--mt-muted)' }}>{ev.date}</p>
                            </div>
                            <span style={{
                                fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                                background: ev.statusTone === 'green' ? 'var(--mt-green-wash)' : 'var(--mt-gold-wash)',
                                color: ev.statusTone === 'green' ? 'var(--mt-green-dark)' : 'var(--mt-gold-dark)',
                            }}>
                                {ev.status}
                            </span>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '16px', paddingTop: '14px', borderTop: '1px solid var(--mt-line)' }}>
                    {[
                        { value: '2.5M+', label: 'Vendidos' },
                        { value: '340+', label: 'Eventos' },
                        { value: '99.9%', label: 'Uptime' },
                    ].map((s) => (
                        <div key={s.label}>
                            <p className="mt-gradient-gold-text" style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>{s.value}</p>
                            <p style={{ fontSize: '10.5px', color: 'var(--mt-muted)' }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function HeroSection() {
    const navigate = useNavigate();

    return (
        <section style={{ background: 'var(--mt-black)', paddingTop: '148px', paddingBottom: '90px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '64px', alignItems: 'center' }} className="hero-grid">

                    {/* Left: Text */}
                    <div>
                        <span style={{
                            display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--mt-gold)',
                            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '20px',
                        }}>
                            La forma más rápida de vender boletos
                        </span>

                        <h1 style={{
                            fontSize: 'clamp(36px, 4.2vw, 56px)', fontWeight: 800, lineHeight: 1.08,
                            color: 'var(--mt-white)', marginBottom: '20px', letterSpacing: '-0.02em',
                            fontFamily: 'Outfit, sans-serif',
                        }}>
                            Vende boletos rápido,{' '}
                            <span className="mt-gradient-gold-text">sin comisiones ocultas</span>
                        </h1>

                        <p style={{
                            fontSize: '17px', lineHeight: 1.65, color: 'var(--mt-muted-on-dark)',
                            marginBottom: '32px', maxWidth: '440px',
                        }}>
                            Publica tu evento en minutos, cobra con OrkestaPay sin demoras y ten el control total
                            de cada venta. Protegido con autenticación multifactor de principio a fin.
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px', flexWrap: 'wrap' }}>
                            <button
                                id="hero-cta-start"
                                onClick={() => navigate('/register')}
                                className="mt-btn-primary"
                                style={{
                                    padding: '13px 26px', borderRadius: '8px',
                                    fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                                }}
                            >
                                Crea tu evento gratis
                            </button>
                            <button
                                id="hero-cta-login"
                                onClick={() => navigate('/login')}
                                style={{
                                    padding: '13px 22px', borderRadius: '8px',
                                    border: '1px solid var(--mt-line-dark)', background: 'transparent',
                                    color: 'var(--mt-white)', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px', transition: 'border-color 0.15s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--mt-line-dark)'; }}
                            >
                                Iniciar sesión
                                <ArrowRight size={15} />
                            </button>
                        </div>

                        {/* Trust row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                            {TRUST_ITEMS.map((t, i) => (
                                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <t.icon size={15} color={i % 2 === 0 ? 'var(--mt-gold)' : 'var(--mt-green-light)'} />
                                    <span style={{ fontSize: '13px', color: 'var(--mt-muted-on-dark)', fontWeight: 500 }}>{t.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Dashboard mock */}
                    <div style={{ display: 'flex', justifyContent: 'center' }} className="hero-visual">
                        <DashboardMock />
                    </div>
                </div>
            </div>

            <style>{`
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
          .hero-visual { display: none !important; }
        }
      `}</style>
        </section>
    );
}
