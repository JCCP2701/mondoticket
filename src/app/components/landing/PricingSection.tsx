import { useNavigate } from 'react-router';
import { Check, Star } from 'lucide-react';

const plans = [
    {
        name: 'Básico',
        price: 'Gratis',
        period: '',
        description: 'Perfecto para empezar a vender tus primeros eventos.',
        priceId: 'price_basic_free',
        badge: null,
        features: [
            '3 eventos activos',
            'Hasta 200 boletos por evento',
            'QR tickets básicos',
            'Pagos con Stripe (5% comisión)',
            'Dashboard básico',
            'Soporte por email',
        ],
        cta: 'Comenzar Gratis',
        highlight: false,
    },
    {
        name: 'Pro',
        price: '$999',
        period: '/mes MXN',
        description: 'Para organizadores que quieren escalar sus operaciones.',
        priceId: 'price_pro_monthly_mxn',
        badge: '⭐ MÁS POPULAR',
        features: [
            'Eventos ilimitados',
            'Boletos ilimitados',
            'QR premium + wallet',
            'Pagos Stripe (2.9% comisión)',
            'Analytics avanzados',
            'Múltiples tipos de ticket',
            'MFA para todo el equipo',
            'Soporte prioritario 24/7',
        ],
        cta: 'Activar Pro',
        highlight: true,
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        description: 'Solución a medida para grandes organizaciones y festivales.',
        priceId: 'price_enterprise_custom',
        badge: null,
        features: [
            'Todo lo de Pro',
            'White-label / marca propia',
            'API acceso completo',
            'Manager de cuenta dedicado',
            'SLA 99.9% garantizado',
            'Stripe Connect personalizado',
            'Integración con sistemas externos',
        ],
        cta: 'Contactar Ventas',
        highlight: false,
    },
];

export default function PricingSection() {
    const navigate = useNavigate();

    const handleCTA = (plan: typeof plans[0]) => {
        // TODO Stripe: Use plan.priceId to create Stripe checkout session
        // const session = await fetch('/api/create-checkout-session', {
        //   method: 'POST',
        //   body: JSON.stringify({ priceId: plan.priceId }),
        // });
        if (plan.name === 'Enterprise') {
            alert('Contacta a ventas@mondoticket.com para Enterprise');
        } else {
            navigate('/register');
        }
    };

    return (
        <section
            id="pricing"
            style={{
                padding: '100px 24px',
                background: 'var(--mt-offwhite)',
            }}
        >
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                    <span className="mt-badge" style={{ marginBottom: '16px' }}>Precios</span>
                    <h2 style={{ fontSize: 'clamp(30px, 3.6vw, 46px)', fontWeight: 800, color: 'var(--mt-ink)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                        Elige el plan{' '}
                        <span className="mt-gradient-gold-text">perfecto</span> para ti
                    </h2>
                    <p style={{ color: 'var(--mt-muted)', fontSize: '17px', maxWidth: '500px', margin: '0 auto' }}>
                        Sin contratos, cancela cuando quieras. Todos los planes incluyen acceso a Stripe Payments.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', alignItems: 'stretch' }} className="pricing-grid">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className="mt-card"
                            style={{
                                padding: '32px', borderRadius: '14px',
                                border: plan.highlight ? '1.5px solid var(--mt-ink)' : undefined,
                                position: 'relative',
                            }}
                        >
                            {plan.badge && (
                                <div style={{
                                    position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                                    padding: '4px 14px', borderRadius: '20px',
                                    background: 'var(--mt-gold-gradient)',
                                    fontSize: '11px', fontWeight: 700, color: 'var(--mt-black)', whiteSpace: 'nowrap',
                                }}>
                                    {plan.badge}
                                </div>
                            )}

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    {plan.highlight && <Star size={16} color="var(--mt-gold-dark)" fill="var(--mt-gold)" />}
                                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--mt-ink)' }}>{plan.name}</h3>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                                    <span
                                        className={plan.highlight ? 'mt-gradient-gold-text' : undefined}
                                        style={{
                                            fontSize: plan.price === 'Custom' ? '32px' : '44px',
                                            fontWeight: 800,
                                            color: plan.highlight ? undefined : 'var(--mt-ink)',
                                            fontFamily: 'Outfit, sans-serif',
                                        }}
                                    >
                                        {plan.price}
                                    </span>
                                    {plan.period && <span style={{ fontSize: '14px', color: 'var(--mt-muted)' }}>{plan.period}</span>}
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--mt-muted)', lineHeight: 1.6 }}>{plan.description}</p>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {plan.features.map((feat, j) => (
                                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <Check size={16} color="var(--mt-green)" style={{ marginTop: '1px', flexShrink: 0 }} />
                                        <span style={{ fontSize: '14px', color: 'var(--mt-muted)' }}>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                id={`pricing-cta-${plan.name.toLowerCase()}`}
                                onClick={() => handleCTA(plan)}
                                style={{
                                    width: '100%', padding: '13px', borderRadius: '8px',
                                    background: plan.highlight ? 'var(--mt-black)' : 'transparent',
                                    color: plan.highlight ? 'var(--mt-white)' : 'var(--mt-ink)',
                                    fontWeight: 600, fontSize: '15px',
                                    border: plan.highlight ? 'none' : '1px solid var(--mt-line)',
                                    cursor: 'pointer', transition: 'opacity 0.15s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                            >
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>

                <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '13px', color: 'var(--mt-muted)' }}>
                    Todos los planes incluyen SSL, uptime 99.9% y soporte técnico.
                    Precios sujetos a IVA. Las comisiones de Stripe se aplican de forma adicional.
                </p>
            </div>

            <style>{`
        @media (max-width: 1024px) { .pricing-grid { grid-template-columns: 1fr !important; } }
      `}</style>
        </section>
    );
}
