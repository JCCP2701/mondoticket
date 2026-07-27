import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function LegalPageLayout({ title, updatedAt, children }: { title: string; updatedAt: string; children: ReactNode }) {
    return (
        <div style={{ minHeight: '100vh', background: '#0d0b1e' }}>
            <Navbar />
            <main style={{ maxWidth: '820px', margin: '0 auto', padding: '140px 24px 80px', color: 'rgba(240,237,255,0.75)' }}>
                <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#f0edff', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                    {title}
                </h1>
                <p style={{ fontSize: '13px', color: 'rgba(240,237,255,0.4)', marginBottom: '48px' }}>
                    Última actualización: {updatedAt}
                </p>
                <div className="legal-content">{children}</div>
            </main>
            <Footer />
            <style>{`
        .legal-content h2 { font-size: 20px; font-weight: 800; color: #f0edff; margin: 36px 0 14px; }
        .legal-content p { font-size: 15px; line-height: 1.8; margin-bottom: 14px; }
        .legal-content ul { margin: 0 0 14px; padding-left: 22px; }
        .legal-content li { font-size: 15px; line-height: 1.8; margin-bottom: 8px; }
        .legal-content a { color: #a78bfa; }
      `}</style>
        </div>
    );
}
