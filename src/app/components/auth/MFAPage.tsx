import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Ticket, Shield, RefreshCw, ArrowRight, LogOut } from 'lucide-react';
import { useAuth, dashboardPathForRole } from '../../context/AuthContext';
import '../landing/landing-theme.css';

export default function MFAPage() {
    const navigate = useNavigate();
    const { user, verifyMFA, logout, isFirstMFASetup, mfaQrCode } = useAuth();
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
            setTimeLeft(() => {
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
        const ok = await verifyMFA(fullCode);
        setLoading(false);
        if (ok) {
            navigate(dashboardPathForRole(user?.role));
        } else {
            setError('Código incorrecto. Verifica el código de tu app autenticadora.');
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    const timerPercent = (timeLeft / 30) * 100;
    const timerColor = timeLeft > 10 ? 'var(--mt-green)' : timeLeft > 5 ? 'var(--mt-gold)' : '#e11d48';

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--mt-black)', padding: '24px',
        }}>
            <div style={{ width: '100%', maxWidth: '440px' }}>
                {/* Logo */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '11px',
                            background: 'rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Ticket size={22} color="var(--mt-gold)" />
                        </div>
                        <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                            <span style={{ color: 'var(--mt-green-light)' }}>mondo</span>
                            <span className="mt-gradient-gold-text">ticket</span>
                        </span>
                    </Link>
                </div>

                {/* Card */}
                <div style={{
                    background: 'var(--mt-white)',
                    borderRadius: '16px', border: '1px solid var(--mt-line)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.35)', padding: '32px',
                }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '26px' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 14px',
                            background: 'var(--mt-gold-wash)',
                            border: '1px solid var(--mt-gold-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Shield size={26} color="var(--mt-gold-dark)" />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--mt-ink)', marginBottom: '6px' }}>
                            Verificación MFA
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--mt-muted)', lineHeight: 1.6 }}>
                            Hola <strong style={{ color: 'var(--mt-ink)' }}>{user?.name}</strong>. Ingresa el código de 6 dígitos de tu app autenticadora.
                        </p>
                    </div>

                    {/* QR Code section — only shown on first-time TOTP enrollment */}
                    {isFirstMFASetup && mfaQrCode && (
                        <div style={{ marginBottom: '24px' }}>
                            <button
                                onClick={() => setShowQR(!showQR)}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '10px',
                                    background: 'var(--mt-gold-wash)', border: '1px solid var(--mt-gold-border)',
                                    color: 'var(--mt-gold-dark)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    marginBottom: '12px',
                                }}
                            >
                                {showQR ? 'Ocultar' : 'Configurar'} app autenticadora (primera vez)
                            </button>

                            {showQR && (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                    padding: '20px', borderRadius: '14px',
                                    background: 'var(--mt-offwhite)', border: '1px solid var(--mt-line)',
                                }}>
                                    <div style={{ padding: '12px', background: 'white', borderRadius: '12px' }}>
                                        <img src={mfaQrCode} alt="Código QR para configurar MFA" width={180} height={180} />
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--mt-muted)', textAlign: 'center', lineHeight: 1.6 }}>
                                        Escanea con Google Authenticator, Authy o cualquier app TOTP y luego ingresa el código de 6 dígitos.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Timer */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--mt-muted)', fontWeight: 500 }}>Código válido por</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: timerColor }}>{timeLeft}s</span>
                        </div>
                        <div style={{ height: '4px', borderRadius: '2px', background: 'var(--mt-line)', overflow: 'hidden' }}>
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
                                    width: '46px', height: '54px', textAlign: 'center', fontSize: '20px', fontWeight: 700,
                                    borderRadius: '10px', border: `2px solid ${digit ? 'var(--mt-gold)' : 'var(--mt-line)'}`,
                                    background: digit ? 'var(--mt-gold-wash)' : 'var(--mt-offwhite)',
                                    color: 'var(--mt-ink)', outline: 'none', transition: 'all 0.15s', caretColor: 'var(--mt-gold-dark)',
                                }}
                                onFocus={(e) => (e.target.style.borderColor = 'var(--mt-gold)')}
                                onBlur={(e) => (e.target.style.borderColor = digit ? 'var(--mt-gold)' : 'var(--mt-line)')}
                            />
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#e11d48', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    {/* Verify button */}
                    <button
                        id="mfa-verify"
                        onClick={handleVerify}
                        disabled={loading || code.join('').length < 6}
                        className="mt-btn-primary"
                        style={{
                            width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px',
                            cursor: (loading || code.join('').length < 6) ? 'not-allowed' : 'pointer',
                            opacity: (loading || code.join('').length < 6) ? 0.6 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            marginBottom: '12px',
                        }}
                    >
                        {loading ? (
                            <RefreshCw size={16} style={{ animation: 'mfa-spin 1s linear infinite' }} />
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
                        style={{ width: '100%', background: 'none', border: 'none', color: 'var(--mt-muted)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px' }}
                    >
                        <LogOut size={14} />
                        Volver al inicio de sesión
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes mfa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
