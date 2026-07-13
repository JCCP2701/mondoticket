import { useNavigate } from 'react-router';
import { Check, Zap, Star } from 'lucide-react';

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
        gradient: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(167,139,250,0.04))',
        border: 'rgba(139,92,246,0.2)',
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
        gradient: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(139,92,246,0.1))',
        border: '#8b5cf6',
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
        gradient: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.05))',
        border: 'rgba(245,158,11,0.3)',
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
            alert('Contacta a ventas@ticketblessing.com para Enterprise');
        } else {
            navigate('/register');
        }
    };

    return (
        <section
            id="pricing"
            style={{
                padding: '100px 24px',
                background: 'linear-gradient(180deg, #0f0d26 0%, #0d0b1e 100%)',
            }}
        >
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '72px' }}>
                    <span style={{
                        display: 'inline-block', padding: '4px 16px', borderRadius: '20px', marginBottom: '16px',
                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                        fontSize: '13px', fontWeight: 600, color: '#f59e0b', letterSpacing: '0.08em',
                    }}>✦ PRECIOS</span>
                    <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#f0edff', marginBottom: '16px' }}>
                        Elige el plan{' '}
                        <span className="tb-gradient-text-gold">perfecto</span> para ti
                    </h2>
                    <p style={{ color: 'rgba(240,237,255,0.55)', fontSize: '18px', maxWidth: '500px', margin: '0 auto' }}>
                        Sin contratos, cancela cuando quieras. Todos los planes incluyen acceso a Stripe Payments.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', alignItems: 'center' }} className="pricing-grid">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            style={{
                                padding: plan.highlight ? '40px 32px' : '32px',
                                borderRadius: '24px',
                                background: plan.gradient,
                                border: `${plan.highlight ? '2px' : '1px'} solid ${plan.border}`,
                                position: 'relative',
                                transform: plan.highlight ? 'scale(1.05)' : 'scale(1)',
                                boxShadow: plan.highlight ? '0 0 60px rgba(139,92,246,0.2)' : 'none',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {plan.badge && (
                                <div style={{
                                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                                    padding: '4px 16px', borderRadius: '20px',
                                    background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                                    fontSize: '11px', fontWeight: 700, color: 'white', whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 15px rgba(124,58,237,0.4)',
                                }}>
                                    {plan.badge}
                                </div>
                            )}

                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    {plan.highlight && <Star size={16} color="#f59e0b" fill="#f59e0b" />}
                                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f0edff' }}>{plan.name}</h3>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: plan.price === 'Custom' ? '32px' : '44px', fontWeight: 900, color: plan.highlight ? '#a78bfa' : '#f0edff', fontFamily: 'Outfit, sans-serif' }}>
                                        {plan.price}
                                    </span>
                                    {plan.period && <span style={{ fontSize: '14px', color: 'rgba(240,237,255,0.4)' }}>{plan.period}</span>}
                                </div>
                                <p style={{ fontSize: '13px', color: 'rgba(240,237,255,0.5)', lineHeight: 1.6 }}>{plan.description}</p>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {plan.features.map((feat, j) => (
                                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <Check size={16} color={plan.highlight ? '#a78bfa' : '#10b981'} style={{ marginTop: '1px', flexShrink: 0 }} />
                                        <span style={{ fontSize: '14px', color: 'rgba(240,237,255,0.7)' }}>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                id={`pricing-cta-${plan.name.toLowerCase()}`}
                                onClick={() => handleCTA(plan)}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: '12px',
                                    background: plan.highlight ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : 'rgba(139,92,246,0.15)',
                                    color: 'white', fontWeight: 700, fontSize: '15px', border: plan.highlight ? 'none' : '1px solid rgba(139,92,246,0.3)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    boxShadow: plan.highlight ? '0 0 30px rgba(124,58,237,0.3)' : 'none',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.opacity = '0.9'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.opacity = '1'; }}
                            >
                                {plan.highlight && <Zap size={16} />}
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>

                <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '13px', color: 'rgba(240,237,255,0.35)' }}>
                    Todos los planes incluyen SSL, uptime 99.9% y soporte técnico.
                    Precios sujetos a IVA. Las comisiones de Stripe se aplican de forma adicional.
                </p>
            </div>

            <style>{`
        @media (max-width: 1024px) { .pricing-grid { grid-template-columns: 1fr !important; } .pricing-grid > div { transform: scale(1) !important; } }
      `}</style>
        </section>
    );
}
