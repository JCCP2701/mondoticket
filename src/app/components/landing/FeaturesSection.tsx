import { ShieldCheck, Zap, BarChart3, Building2, CreditCard, QrCode } from 'lucide-react';

const features = [
    {
        icon: <Zap size={28} />,
        title: 'De cero a vendiendo en minutos',
        desc: 'Publica tu evento y arranca la venta al instante, sin integraciones ni configuraciones complicadas.',
        accent: 'var(--mt-gold)',
    },
    {
        icon: <QrCode size={28} />,
        title: 'Cero boletos falsificados',
        desc: 'Cada entrada lleva un QR único e infalsificable: evitas fraudes y agilizas el acceso el día del evento.',
        accent: 'var(--mt-green)',
    },
    {
        icon: <BarChart3 size={28} />,
        title: 'Decisiones con datos, no corazonadas',
        desc: 'Sigue ventas e ingresos en tiempo real y ajusta tu estrategia antes de que el evento termine.',
        accent: 'var(--mt-gold)',
    },
    {
        icon: <Building2 size={28} />,
        title: 'Escala sin perder el control',
        desc: 'Administra equipos, organizadores y decenas de eventos desde un solo panel, sin hojas de cálculo.',
        accent: 'var(--mt-green)',
    },
    {
        icon: <CreditCard size={28} />,
        title: 'Cobra sin fricción',
        desc: 'Acepta tarjeta, SPEI y OXXO con OrkestaPay, y recibe tus liquidaciones de forma automática.',
        accent: 'var(--mt-gold)',
    },
    {
        icon: <ShieldCheck size={28} />,
        title: 'Tu cuenta, blindada',
        desc: 'Doble factor de autenticación en cada rol, para que nadie más controle tus eventos ni tus ingresos.',
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
                        <span className="mt-gradient-gold-text">vender más</span>
                    </h2>
                    <p style={{ fontSize: '17px', color: 'var(--mt-muted-on-dark)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
                        Cada función de MondoTicket está pensada para que vendas más boletos con menos esfuerzo y cero dolores de cabeza.
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
