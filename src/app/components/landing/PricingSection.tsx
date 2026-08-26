import { useNavigate } from 'react-router';
import { Check, Star } from 'lucide-react';

const plans = [
    {
        name: 'Básico',
        price: 'Gratis',
        period: '',
        description: 'Ideal para vender tus primeros boletos sin arriesgar nada.',
        priceId: 'price_basic_free',
        badge: null,
        features: [
            'Hasta 3 eventos activos a la vez',
            'Hasta 200 boletos por evento',
            'Boletos con QR, listos para usar',
            'Cobra con OrkestaPay (5% de comisión)',
            'Panel de control esencial',
            'Resuelve dudas sin perder ventas',
        ],
        cta: 'Empezar gratis',
        highlight: false,
    },
    {
        name: 'Pro',
        price: '$999',
        period: '/mes MXN',
        description: 'Para organizadores que quieren vender más y trabajar menos.',
        priceId: 'price_pro_monthly_mxn',
        badge: '⭐ MÁS POPULAR',
        features: [
            'Eventos ilimitados, sin límite de escala',
            'Vende boletos ilimitados, sin topes',
            'QR premium + integración con wallet',
            'Cobra con OrkestaPay (2.9% de comisión)',
            'Analytics avanzados para vender mejor',
            'Múltiples tipos de boleto por evento',
            'MFA para todo tu equipo',
            'Soporte prioritario 24/7, nunca pierdes una venta',
        ],
        cta: 'Escalar con Pro',
        highlight: true,
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        description: 'Infraestructura a la medida para festivales y operaciones masivas.',
        priceId: 'price_enterprise_custom',
        badge: null,
        features: [
            'Todo lo de Pro',
            'White-label: tu marca en cada boleto',
            'API completa para tus propios desarrollos',
            'Manager de cuenta dedicado',
            'SLA de 99.9% garantizado por contrato',
            'Liquidaciones directas a tu medida',
            'Conecta con tus sistemas externos',
        ],
        cta: 'Contactar Ventas',
        highlight: false,
    },
];

export default function PricingSection() {
    const navigate = useNavigate();

    const handleCTA = (plan: typeof plans[0]) => {
        // TODO: Use plan.priceId to create an OrkestaPay checkout for the subscription
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
                        Sin contratos ni letras chiquitas. Cancela cuando quieras y empieza a cobrar hoy mismo con OrkestaPay.
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
                    Todos los planes incluyen SSL, 99.9% de uptime y soporte técnico real.
                    Precios más IVA; las comisiones de OrkestaPay se aplican por separado.
                </p>
            </div>

            <style>{`
        @media (max-width: 1024px) { .pricing-grid { grid-template-columns: 1fr !important; } }
      `}</style>
        </section>
    );
}
