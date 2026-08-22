import { useEffect, useRef, useState } from 'react';

const stats = [
    { value: 2500000, label: 'Boletos vendidos', suffix: '+', prefix: '' },
    { value: 8400, label: 'Eventos realizados', suffix: '+', prefix: '' },
    { value: 340, label: 'Organizaciones', suffix: '+', prefix: '' },
    { value: 99.9, label: 'Uptime garantizado', suffix: '%', prefix: '' },
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

function Stat({ stat, delay, started }: { stat: typeof stats[0]; delay: number; started: boolean }) {
    const count = useCountUp(stat.value, 1600 + delay * 150, started);

    const formatted =
        stat.value >= 1000000
            ? `${(count / 1000000).toFixed(1)}M`
            : stat.value >= 1000
                ? `${(count / 1000).toFixed(0)}K`
                : count.toString();

    return (
        <div style={{ textAlign: 'center', padding: '0 20px' }}>
            <p className="mt-gradient-gold-text" style={{
                fontSize: 'clamp(30px, 3.4vw, 42px)', fontWeight: 800, lineHeight: 1,
                marginBottom: '8px', fontFamily: 'Outfit, sans-serif',
            }}>
                {stat.prefix}{formatted}{stat.suffix}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--mt-muted)', fontWeight: 500 }}>
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
        <section style={{ padding: '72px 24px', background: 'var(--mt-offwhite)', borderTop: '1px solid var(--mt-line)', borderBottom: '1px solid var(--mt-line)' }}>
            <div ref={ref} style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div
                    style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    }}
                    className="stats-row"
                >
                    {stats.map((stat, i) => (
                        <div key={i} style={{ borderLeft: i > 0 ? '1px solid var(--mt-line)' : 'none' }} className="stat-cell">
                            <Stat stat={stat} delay={i} started={started} />
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        @media (max-width: 720px) { .stats-row { grid-template-columns: repeat(2, 1fr) !important; row-gap: 32px; } .stat-cell:nth-child(3) { border-left: none !important; } }
        @media (max-width: 420px) { .stats-row { grid-template-columns: 1fr !important; } .stat-cell { border-left: none !important; } }
      `}</style>
        </section>
    );
}
