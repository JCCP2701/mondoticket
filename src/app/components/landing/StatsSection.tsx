import { useEffect, useRef, useState } from 'react';

const stats = [
    { value: 2500000, label: 'Boletos Vendidos', suffix: '+', prefix: '' },
    { value: 8400, label: 'Eventos Realizados', suffix: '+', prefix: '' },
    { value: 340, label: 'Organizaciones', suffix: '+', prefix: '' },
    { value: 99.9, label: 'Uptime Garantizado', suffix: '%', prefix: '' },
];

function useCountUp(target: number, duration = 2000, started: boolean) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!started) return;
        const startTime = performance.now();
        const isDecimal = target % 1 !== 0;

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = target * eased;
            setCount(isDecimal ? Math.round(current * 10) / 10 : Math.floor(current));
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [started, target, duration]);

    return count;
}

function StatCard({ stat, delay, started }: { stat: typeof stats[0]; delay: number; started: boolean }) {
    const count = useCountUp(stat.value, 2000 + delay * 200, started);

    const formatted =
        stat.value >= 1000000
            ? `${(count / 1000000).toFixed(1)}M`
            : stat.value >= 1000
                ? `${(count / 1000).toFixed(0)}K`
                : count.toString();

    return (
        <div
            className="tb-card-hover"
            style={{
                padding: '40px 32px', textAlign: 'center', borderRadius: '20px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)',
                backdropFilter: 'blur(10px)',
                animationDelay: `${delay * 0.15}s`,
            }}
        >
            <div style={{
                fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 900, lineHeight: 1,
                marginBottom: '12px', fontFamily: 'Outfit, sans-serif',
            }}>
                <span style={{
                    background: 'linear-gradient(135deg, #a78bfa, #f59e0b)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                    {stat.prefix}{formatted}{stat.suffix}
                </span>
            </div>
            <p style={{ fontSize: '15px', color: 'rgba(240,237,255,0.55)', fontWeight: 500 }}>
                {stat.label}
            </p>
        </div>
    );
}

export default function StatsSection() {
    const ref = useRef<HTMLDivElement>(null);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setStarted(true); },
            { threshold: 0.3 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section
            style={{
                padding: '80px 24px',
                background: 'linear-gradient(180deg, #0f0d26 0%, #12103a 50%, #0f0d26 100%)',
                position: 'relative',
            }}
        >
            <div ref={ref} style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{ fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 800, color: '#f0edff', marginBottom: '12px' }}>
                        Números que hablan por sí solos
                    </h2>
                    <p style={{ color: 'rgba(240,237,255,0.5)', fontSize: '16px' }}>
                        La confianza de miles de organizadores y compradores avala nuestra plataforma.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }} className="stats-grid">
                    {stats.map((stat, i) => (
                        <StatCard key={i} stat={stat} delay={i} started={started} />
                    ))}
                </div>
            </div>

            <style>{`
        @media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .stats-grid { grid-template-columns: 1fr !important; } }
      `}</style>
        </section>
    );
}
