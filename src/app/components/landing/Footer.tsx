import { Link } from 'react-router';
import { Ticket, Twitter, Instagram, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
    const year = new Date().getFullYear();

    const links: Record<string, { label: string; to: string }[]> = {
        Producto: [
            { label: 'Características', to: '/#features' },
            { label: 'Precios', to: '/#pricing' },
            { label: 'Integraciones', to: '#' },
            { label: 'API Docs', to: '#' },
        ],
        Empresa: [
            { label: 'Nosotros', to: '/#about' },
            { label: 'Blog', to: '#' },
            { label: 'Prensa', to: '#' },
            { label: 'Empleos', to: '#' },
        ],
        Soporte: [
            { label: 'Centro de Ayuda', to: '#' },
            { label: 'Contacto', to: 'mailto:soporte@mondoticket.com' },
            { label: 'Status', to: '#' },
            { label: 'Seguridad', to: '#' },
        ],
        Legal: [
            { label: 'Privacidad', to: '/privacidad' },
            { label: 'Términos', to: '/terminos' },
            { label: 'Cookies', to: '/privacidad' },
            { label: 'GDPR', to: '/privacidad' },
        ],
    };

    return (
        <footer style={{
            background: '#080614', borderTop: '1px solid rgba(139,92,246,0.1)', padding: '60px 24px 32px',
        }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '40px', marginBottom: '48px' }}
                    className="footer-grid">

                    {/* Brand column */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '8px',
                                background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Ticket size={18} color="white" />
                            </div>
                            <span style={{ fontSize: '20px', fontWeight: 800, color: '#f0edff' }}>
                                Mondo<span style={{ background: 'linear-gradient(135deg, #a78bfa, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Ticket</span>
                            </span>
                        </div>
                        <p style={{ fontSize: '14px', color: 'rgba(240,237,255,0.45)', lineHeight: 1.8, maxWidth: '260px', marginBottom: '24px' }}>
                            La plataforma de venta y gestión de boletos más avanzada de México. Seguridad MFA, pagos Stripe y QR tickets.
                        </p>
                        {/* Social icons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {[
                                { icon: <Twitter size={18} />, label: 'Twitter' },
                                { icon: <Instagram size={18} />, label: 'Instagram' },
                                { icon: <Linkedin size={18} />, label: 'LinkedIn' },
                                { icon: <Mail size={18} />, label: 'Email' },
                            ].map((s) => (
                                <button
                                    key={s.label}
                                    title={s.label}
                                    style={{
                                        width: '36px', height: '36px', borderRadius: '8px',
                                        background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'rgba(240,237,255,0.5)', cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; e.currentTarget.style.color = '#a78bfa'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.color = 'rgba(240,237,255,0.5)'; }}
                                >
                                    {s.icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(links).map(([category, items]) => (
                        <div key={category}>
                            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f0edff', marginBottom: '16px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                {category}
                            </h4>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {items.map((item) => {
                                    const linkStyle = { fontSize: '14px', color: 'rgba(240,237,255,0.4)', textDecoration: 'none', transition: 'color 0.2s' };
                                    const hoverIn = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = '#a78bfa');
                                    const hoverOut = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = 'rgba(240,237,255,0.4)');
                                    const isExternal = item.to.startsWith('mailto:') || item.to.startsWith('http');
                                    return (
                                        <li key={item.label}>
                                            {isExternal ? (
                                                <a href={item.to} style={linkStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                                                    {item.label}
                                                </a>
                                            ) : (
                                                <Link to={item.to} style={linkStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                                                    {item.label}
                                                </Link>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div style={{
                    paddingTop: '24px', borderTop: '1px solid rgba(139,92,246,0.1)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
                }}>
                    <p style={{ fontSize: '13px', color: 'rgba(240,237,255,0.3)' }}>
                        © {year} MondoTicket. Todos los derechos reservados.
                    </p>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                        <span style={{ fontSize: '13px', color: 'rgba(240,237,255,0.35)' }}>Todos los sistemas operativos</span>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 1024px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 480px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
        </footer>
    );
}
