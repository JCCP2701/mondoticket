const COMPANIES = ['Nortek', 'Vantia', 'Kaelio', 'Bravado Live', 'Fluxora', 'Orenda', 'Cursiva', 'Altiva'];

export default function TrustedBy() {
    const track = [...COMPANIES, ...COMPANIES];

    return (
        <section style={{ background: 'var(--mt-offwhite)', padding: '40px 24px', borderBottom: '1px solid var(--mt-line)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <p style={{
                    textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--mt-muted)',
                    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px',
                }}>
                    Marcas que ya venden con MondoTicket
                </p>

                <div className="mt-logo-marquee">
                    <div className="mt-logo-track">
                        {track.map((name, i) => (
                            <span key={`${name}-${i}`} className="mt-logo-item">{name}</span>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
        .mt-logo-marquee {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
        }
        .mt-logo-track {
          display: flex;
          align-items: center;
          width: max-content;
          gap: 56px;
          animation: mt-marquee 28s linear infinite;
        }
        .mt-logo-marquee:hover .mt-logo-track { animation-play-state: paused; }
        .mt-logo-item {
          font-family: Outfit, sans-serif;
          font-size: 19px;
          font-weight: 700;
          color: var(--mt-muted);
          opacity: 0.55;
          white-space: nowrap;
          transition: opacity 0.2s ease, color 0.2s ease;
        }
        .mt-logo-item:hover {
          opacity: 1;
          color: var(--mt-ink);
        }
        @keyframes mt-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
        </section>
    );
}
