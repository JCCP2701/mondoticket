import { useNavigate } from 'react-router';
import { Ticket } from 'lucide-react';

export default function CtaBanner() {
    const navigate = useNavigate();

    return (
        <section style={{ background: 'var(--mt-black)', padding: '40px 24px' }}>
            <div style={{
                maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap',
            }} className="cta-banner-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Ticket size={20} color="var(--mt-gold)" />
                    </div>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--mt-white)', letterSpacing: '-0.01em' }}>
                        Empieza hoy y transforma la venta de tus eventos.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/register')}
                    style={{
                        padding: '13px 26px', borderRadius: '8px', flexShrink: 0,
                        background: 'var(--mt-gold-gradient)', color: 'var(--mt-black)',
                        fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer',
                        transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                    Comenzar gratis
                </button>
            </div>

            <style>{`
        @media (max-width: 640px) { .cta-banner-row { justify-content: center; text-align: center; } }
      `}</style>
        </section>
    );
}
