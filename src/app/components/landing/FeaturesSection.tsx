import { ShieldCheck, Zap, BarChart3, Building2, CreditCard, QrCode } from 'lucide-react';

const features = [
    {
        icon: <Zap size={28} color="#8b5cf6" />,
        title: 'Venta Online Instantánea',
        desc: 'Publica tu evento y empieza a vender en minutos. Sin configuraciones complicadas.',
        gradient: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(139,92,246,0.05))',
        glow: 'rgba(124,58,237,0.2)',
    },
    {
        icon: <QrCode size={28} color="#f59e0b" />,
        title: 'Boletos con QR Único',
        desc: 'Cada boleto genera un código QR único e infalsificable. Escaneo rápido en acceso.',
        gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.05))',
        glow: 'rgba(245,158,11,0.2)',
    },
    {
        icon: <BarChart3 size={28} color="#10b981" />,
        title: 'Analytics en Tiempo Real',
        desc: 'Visualiza ventas, ingresos y métricas de tus eventos en dashboards interactivos.',
        gradient: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.05))',
        glow: 'rgba(16,185,129,0.2)',
    },
    {
        icon: <Building2 size={28} color="#a78bfa" />,
        title: 'Multi-Organización',
        desc: 'Administra múltiples organizadores y eventos desde un solo panel de control.',
        gradient: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(196,181,253,0.05))',
        glow: 'rgba(167,139,250,0.2)',
    },
    {
        icon: <CreditCard size={28} color="#f43f5e" />,
        title: 'Pagos con Stripe',
        desc: 'Integración nativa con Stripe. Acepta tarjetas, OXXO y más. Liquidaciones automáticas.',
        gradient: 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(251,113,133,0.05))',
        glow: 'rgba(244,63,94,0.2)',
    },
    {
        icon: <ShieldCheck size={28} color="#06b6d4" />,
        title: 'Seguridad con MFA',
        desc: 'Autenticación de doble factor para todos los roles. Tu plataforma siempre protegida.',
        gradient: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(34,211,238,0.05))',
        glow: 'rgba(6,182,212,0.2)',
    },
];

export default function FeaturesSection() {
    return (
        <section
            id="features"
            style={{
                padding: '100px 24px',
                background: 'linear-gradient(180deg, #0d0b1e 0%, #0f0d26 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Background decoration */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '800px', height: '800px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
                {/* Section header */}
                <div style={{ textAlign: 'center', marginBottom: '72px' }}>
                    <span style={{
                        display: 'inline-block', padding: '4px 16px', borderRadius: '20px', marginBottom: '16px',
                        background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
                        fontSize: '13px', fontWeight: 600, color: '#a78bfa', letterSpacing: '0.08em',
                    }}>
                        ✦ FUNCIONALIDADES
                    </span>
                    <h2 style={{
                        fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#f0edff',
                        marginBottom: '16px', lineHeight: 1.15,
                    }}>
                        Todo lo que necesitas para{' '}
                        <span className="tb-gradient-text">triunfar</span>
                    </h2>
                    <p style={{ fontSize: '18px', color: 'rgba(240,237,255,0.55)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
                        TicketBlessing combina tecnología de punta con una UX impecable para llevar tus eventos al siguiente nivel.
                    </p>
                </div>

                {/* Features grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '24px',
                }} className="features-grid">
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className="tb-card-hover"
                            style={{
                                padding: '32px', borderRadius: '20px',
                                background: f.gradient,
                                border: `1px solid ${f.glow}`,
                                position: 'relative', overflow: 'hidden',
                            }}
                        >
                            {/* Glow accent */}
                            <div style={{
                                position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px',
                                borderRadius: '50%', background: f.glow, filter: 'blur(30px)', opacity: 0.4, pointerEvents: 'none',
                            }} />

                            <div style={{
                                width: '56px', height: '56px', borderRadius: '14px',
                                background: 'rgba(13,11,30,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '20px', backdropFilter: 'blur(10px)',
                            }}>
                                {f.icon}
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f0edff', marginBottom: '10px' }}>
                                {f.title}
                            </h3>
                            <p style={{ fontSize: '14px', color: 'rgba(240,237,255,0.55)', lineHeight: 1.7 }}>
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        @media (max-width: 1024px) { .features-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .features-grid { grid-template-columns: 1fr !important; } }
      `}</style>
        </section>
    );
}
