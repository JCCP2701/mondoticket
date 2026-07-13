import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Ticket, Shield, RefreshCw, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

const TOTP_ISSUER = 'TicketBlessing';
const TOTP_SECRET = 'JBSWY3DPEHPK3PXP'; // demo only — generate per user in production

export default function MFAPage() {
    const navigate = useNavigate();
    const { user, verifyMFA, logout } = useAuth();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [showQR, setShowQR] = useState(true);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Redirect if no pending user
    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    // Countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                const seconds = Math.floor(Date.now() / 1000) % 30;
                return 30 - seconds;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleInput = (index: number, value: string) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);
        setError('');
        if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'Enter') handleVerify();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            const newCode = pasted.split('');
            setCode(newCode);
            inputRefs.current[5]?.focus();
        }
        e.preventDefault();
    };

    const handleVerify = async () => {
        const fullCode = code.join('');
        if (fullCode.length < 6) {
            setError('Ingresa el código completo de 6 dígitos');
            return;
        }
        setLoading(true);
        await new Promise((r) => setTimeout(r, 600));
        const ok = verifyMFA(fullCode);
        setLoading(false);
        if (ok) {
            const dest =
                user?.role === 'superadmin' ? '/admin' : user?.role === 'organization' ? '/organization' : '/wallet';
            navigate(dest);
        } else {
            setError('Código incorrecto. En demo usa: 123456 o cualquier 6 dígitos.');
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    const otpAuthUrl = `otpauth://totp/${TOTP_ISSUER}:${user?.email || 'demo'}?secret=${TOTP_SECRET}&issuer=${TOTP_ISSUER}&algorithm=SHA1&digits=6&period=30`;

    const timerPercent = (timeLeft / 30) * 100;
    const timerColor = timeLeft > 10 ? '#10b981' : timeLeft > 5 ? '#f59e0b' : '#f43f5e';

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0d0b1e 0%, #1a0a3d 50%, #0d1b4d 100%)',
            padding: '24px', position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', top: '30%', left: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>
                {/* Logo */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
                            <Ticket size={24} color="white" />
                        </div>
                        <span style={{ fontSize: '22px', fontWeight: 800, color: '#f0edff' }}>
                            Ticket<span style={{ background: 'linear-gradient(135deg, #a78bfa, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Blessing</span>
                        </span>
                    </Link>
                </div>

                {/* Card */}
                <div style={{
                    background: 'rgba(19,16,42,0.95)', backdropFilter: 'blur(20px)',
                    borderRadius: '24px', border: '1px solid rgba(139,92,246,0.2)',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.5)', padding: '40px',
                }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(139,92,246,0.1))',
                            border: '1px solid rgba(139,92,246,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: 'pulse-glow 2s ease-in-out infinite',
                        }}>
                            <Shield size={30} color="#a78bfa" />
                        </div>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f0edff', marginBottom: '6px' }}>
                            Verificación MFA
                        </h2>
                        <p style={{ fontSize: '14px', color: 'rgba(240,237,255,0.5)', lineHeight: 1.6 }}>
                            Hola <strong style={{ color: '#a78bfa' }}>{user?.name}</strong>. Ingresa el código de 6 dígitos de tu app autenticadora.
                        </p>
                    </div>

                    {/* QR Code section */}
                    <div style={{ marginBottom: '28px' }}>
                        <button
                            onClick={() => setShowQR(!showQR)}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '10px',
                                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                                color: '#a78bfa', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s', marginBottom: '12px',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139,92,246,0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
                        >
                            {showQR ? 'Ocultar' : 'Configurar'} Google Authenticator (primera vez)
                        </button>

                        {showQR && (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                padding: '20px', borderRadius: '14px',
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)',
                            }}>
                                <div style={{ padding: '12px', background: 'white', borderRadius: '12px' }}>
                                    <QRCodeSVG value={otpAuthUrl} size={140} level="M" />
                                </div>
                                <p style={{ fontSize: '12px', color: 'rgba(240,237,255,0.45)', textAlign: 'center', lineHeight: 1.6 }}>
                                    Escanea con Google Authenticator, Authy o cualquier app TOTP.
                                    <br />
                                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>Demo: usa código "123456"</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Timer */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(240,237,255,0.4)', fontWeight: 500 }}>Código válido por</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: timerColor }}>{timeLeft}s</span>
                        </div>
                        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: '2px', transition: 'width 1s linear, background-color 0.5s',
                                width: `${timerPercent}%`, background: timerColor,
                            }} />
                        </div>
                    </div>

                    {/* OTP Input */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                        {code.map((digit, i) => (
                            <input
                                key={i}
                                id={`otp-${i}`}
                                ref={(el) => { inputRefs.current[i] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleInput(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                onPaste={handlePaste}
                                style={{
                                    width: '48px', height: '56px', textAlign: 'center', fontSize: '22px', fontWeight: 700,
                                    borderRadius: '12px', border: `2px solid ${digit ? '#8b5cf6' : 'rgba(139,92,246,0.2)'}`,
                                    background: digit ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                                    color: '#f0edff', outline: 'none', transition: 'all 0.15s', caretColor: '#8b5cf6',
                                }}
                                onFocus={(e) => (e.target.style.borderColor = '#8b5cf6')}
                                onBlur={(e) => (e.target.style.borderColor = digit ? '#8b5cf6' : 'rgba(139,92,246,0.2)')}
                            />
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    {/* Verify button */}
                    <button
                        id="mfa-verify"
                        onClick={handleVerify}
                        disabled={loading || code.join('').length < 6}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '12px',
                            background: code.join('').length === 6 ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : 'rgba(139,92,246,0.2)',
                            color: 'white', fontWeight: 700, fontSize: '15px', border: 'none',
                            cursor: code.join('').length === 6 ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: code.join('').length === 6 ? '0 0 20px rgba(124,58,237,0.3)' : 'none',
                            transition: 'all 0.2s', opacity: loading ? 0.7 : 1, marginBottom: '12px',
                        }}
                    >
                        {loading ? (
                            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <>
                                <Shield size={16} />
                                <span>Verificar y Acceder</span>
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>

                    {/* Back / Logout */}
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        style={{ width: '100%', background: 'none', border: 'none', color: 'rgba(240,237,255,0.35)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px' }}
                    >
                        <LogOut size={14} />
                        Volver al inicio de sesión
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.3); } 50% { box-shadow: 0 0 40px rgba(139,92,246,0.6); } }
      `}</style>
        </div>
    );
}
