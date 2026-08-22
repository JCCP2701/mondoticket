import { ShieldCheck, Zap, BarChart3, Building2, CreditCard, QrCode } from 'lucide-react';

const features = [
    {
        icon: <Zap size={28} />,
        title: 'Venta Online Instantánea',
        desc: 'Publica tu evento y empieza a vender en minutos. Sin configuraciones complicadas.',
        accent: 'var(--mt-gold)',
    },
    {
        icon: <QrCode size={28} />,
        title: 'Boletos con QR Único',
        desc: 'Cada boleto genera un código QR único e infalsificable. Escaneo rápido en acceso.',
        accent: 'var(--mt-green)',
    },
    {
        icon: <BarChart3 size={28} />,
        title: 'Analytics en Tiempo Real',
        desc: 'Visualiza ventas, ingresos y métricas de tus eventos en dashboards interactivos.',
        accent: 'var(--mt-gold)',
    },
    {
        icon: <Building2 size={28} />,
        title: 'Multi-Organización',
        desc: 'Administra múltiples organizadores y eventos desde un solo panel de control.',
        accent: 'var(--mt-green)',
    },
    {
        icon: <CreditCard size={28} />,
        title: 'Pagos con Stripe',
        desc: 'Integración nativa con Stripe. Acepta tarjetas, OXXO y más. Liquidaciones automáticas.',
        accent: 'var(--mt-gold)',
    },
    {
        icon: <ShieldCheck size={28} />,
        title: 'Seguridad con MFA',
        desc: 'Autenticación de doble factor para todos los roles. Tu plataforma siempre protegida.',
        accent: 'var(--mt-green)',
    },
];

export default function FeaturesSection() {
    return (
        <section
            id="features"
            style={{
                padding: '100px 24px',
                background: 'var(--mt-black)',
                position: 'relative',
            }}
        >
            <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
                {/* Section header */}
                <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                    <span className="mt-badge mt-badge-on-dark" style={{ marginBottom: '16px' }}>
                        Funcionalidades
                    </span>
                    <h2 style={{
                        fontSize: 'clamp(30px, 3.6vw, 46px)', fontWeight: 800, color: 'var(--mt-white)',
                        marginBottom: '16px', lineHeight: 1.15, letterSpacing: '-0.02em',
                    }}>
                        Todo lo que necesitas para{' '}
                        <span className="mt-gradient-gold-text">triunfar</span>
                    </h2>
                    <p style={{ fontSize: '17px', color: 'var(--mt-muted-on-dark)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
                        MondoTicket combina tecnología de punta con una UX impecable para llevar tus eventos al siguiente nivel.
                    </p>
                </div>

                {/* Features grid — plain icon + text, no card chrome */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    columnGap: '32px',
                    rowGap: '48px',
                }} className="features-grid">
                    {features.map((f, i) => (
                        <div key={i}>
                            <div style={{ color: f.accent, marginBottom: '16px' }}>
                                {f.icon}
                            </div>
                            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--mt-white)', marginBottom: '8px' }}>
                                {f.title}
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--mt-muted-on-dark)', lineHeight: 1.65 }}>
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
