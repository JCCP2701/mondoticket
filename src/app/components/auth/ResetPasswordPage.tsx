import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Shield, Ticket, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import '../landing/landing-theme.css';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const { updatePassword, logout } = useAuth();

    const [checking, setChecking] = useState(true);
    const [ready, setReady] = useState(false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setReady(true);
                setChecking(false);
            }
        });
        // Defensive fallback in case the PASSWORD_RECOVERY event already
        // fired (e.g. Supabase's own recovery-session bootstrap runs on
        // client init, before this listener could attach) — an existing
        // session on this unprotected route means the recovery link worked.
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) setReady(true);
        });
        const timer = setTimeout(() => setChecking(false), 4000);
        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const passwordStrength = (() => {
        const p = password;
        let score = 0;
        if (p.length >= 8) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;
        return score;
    })();

    const strengthLabel = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][passwordStrength];
    const strengthColor = ['', '#e11d48', '#a6821f', '#4f9e3a', '#328022'][passwordStrength];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setLoading(true);
        const result = await updatePassword(password);
        setLoading(false);
        if (!result.ok) {
            setError(result.error || 'No se pudo actualizar la contraseña. Intenta de nuevo.');
            return;
        }
        logout();
        navigate('/login', { state: { passwordReset: true } });
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--mt-black)',
            padding: '24px',
        }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '24px' }}>
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

                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--mt-white)', marginBottom: '10px', letterSpacing: '-0.02em' }}>
                        Nueva <span className="mt-gradient-gold-text">contraseña</span>
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--mt-muted-on-dark)', maxWidth: '300px', margin: '0 auto' }}>
                        Elige una contraseña segura para tu cuenta.
                    </p>
                </div>

                <div style={{
                    background: 'var(--mt-white)',
                    borderRadius: '16px',
                    border: '1px solid var(--mt-line)',
                    padding: '32px',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                }}>
                    {checking && !ready ? (
                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                            <span className="login-spinner" style={{ display: 'inline-block' }} />
                            <p style={{ fontSize: '13px', color: 'var(--mt-muted)', marginTop: '14px' }}>
                                Verificando tu enlace...
                            </p>
                        </div>
                    ) : !ready ? (
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--mt-ink)', marginBottom: '8px' }}>
                                Enlace inválido o expirado
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--mt-muted)', marginBottom: '24px' }}>
                                Solicita un nuevo enlace para restablecer tu contraseña.
                            </p>
                            <Link to="/forgot-password" style={{
                                display: 'inline-block', color: 'var(--mt-ink)', textDecoration: 'none',
                                fontWeight: 700, fontSize: '14px', borderBottom: '2px solid var(--mt-gold)',
                            }}>
                                Solicitar nuevo enlace
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mt-ink)' }}>
                                    Nueva contraseña
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                                    <input
                                        id="reset-password-new"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        required
                                        className="login-input"
                                        style={{ paddingRight: '44px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', color: 'var(--mt-muted)', cursor: 'pointer', padding: '4px',
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {password && (
                                    <div style={{ marginTop: '4px' }}>
                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                            {[1, 2, 3, 4].map((level) => (
                                                <div key={level} style={{ flex: 1, height: '3px', borderRadius: '2px', background: level <= passwordStrength ? strengthColor : 'var(--mt-line)', transition: 'all 0.3s' }} />
                                            ))}
                                        </div>
                                        <p style={{ fontSize: '11px', color: strengthColor }}>{strengthLabel}</p>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mt-ink)' }}>
                                    Confirmar contraseña
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                                    <input
                                        id="reset-password-confirm"
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        placeholder="Repite tu contraseña"
                                        required
                                        className="login-input"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '11px 14px', borderRadius: '10px',
                                    background: 'rgba(244,63,94,0.08)',
                                    border: '1px solid rgba(244,63,94,0.25)',
                                    color: '#e11d48', fontSize: '13px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                }}>
                                    <Shield size={15} />
                                    {error}
                                </div>
                            )}

                            <button
                                id="reset-password-submit"
                                type="submit"
                                disabled={loading}
                                className="mt-btn-primary"
                                style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="login-spinner" /> Guardando...
                                    </span>
                                ) : (
                                    <>
                                        <span>Guardar nueva contraseña</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <style>{`
                .login-input {
                    width: 100%;
                    padding: 12px 14px 12px 40px;
                    border-radius: 10px;
                    background: var(--mt-offwhite);
                    border: 1px solid var(--mt-line);
                    color: var(--mt-ink);
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s ease;
                    box-sizing: border-box;
                }
                .login-input:focus {
                    border-color: var(--mt-gold);
                }
                .login-spinner {
                    width: 15px; height: 15px; border: 2px solid rgba(10,10,10,0.25);
                    border-top-color: var(--mt-black); border-radius: 50%; animation: login-spin 0.8s linear infinite;
                }
                @keyframes login-spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
