import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Shield, Eye, EyeOff, Ticket, ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth, dashboardPathForRole } from '../../context/AuthContext';
import '../landing/landing-theme.css';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const profile = await login(email, password);
        setLoading(false);
        if (profile) {
            // Demo accounts (mfa_exempt) are already fully authenticated at
            // this point — skip the MFA screen entirely instead of routing
            // through it just to bounce back.
            navigate(profile.mfaExempt ? dashboardPathForRole(profile.role) : '/mfa', { state: { from: '/' } });
        } else {
            setError('Credenciales incorrectas. Verifica tu email y contraseña.');
        }
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
                {/* Logo & Header */}
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
                        Bienvenido de <span className="mt-gradient-gold-text">vuelta</span>
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--mt-muted-on-dark)', maxWidth: '300px', margin: '0 auto' }}>
                        Accede a la plataforma de boletos más segura y avanzada.
                    </p>
                </div>

                {/* Login Card */}
                <div style={{
                    background: 'var(--mt-white)',
                    borderRadius: '16px',
                    border: '1px solid var(--mt-line)',
                    padding: '32px',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mt-ink)' }}>
                                Correo electrónico
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tunombre@ejemplo.com"
                                    required
                                    className="login-input"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mt-ink)' }}>
                                    Contraseña
                                </label>
                                <a href="#" style={{ fontSize: '12px', color: 'var(--mt-gold-dark)', textDecoration: 'none', fontWeight: 500 }}>¿Olvidaste tu contraseña?</a>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
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
                            id="login-submit"
                            type="submit"
                            disabled={loading}
                            className="mt-btn-primary"
                            style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="login-spinner" /> Verificando...
                                </span>
                            ) : (
                                <>
                                    <span>Ingresar a mi Wallet</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid var(--mt-line)', paddingTop: '20px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--mt-muted)' }}>
                            ¿Eres nuevo en MondoTicket?
                        </p>
                        <Link to="/register" style={{
                            display: 'inline-block', marginTop: '6px',
                            color: 'var(--mt-ink)', textDecoration: 'none', fontWeight: 700,
                            fontSize: '14px', borderBottom: '2px solid var(--mt-gold)',
                        }}>
                            Crea tu cuenta gratis
                        </Link>
                    </div>
                </div>

                {/* Footer Security Badges */}
                <div style={{
                    marginTop: '28px', display: 'flex', justifyContent: 'center', gap: '20px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--mt-muted-on-dark)' }}>
                        <Shield size={13} /> 256-bit SSL
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--mt-muted-on-dark)' }}>
                        <Lock size={13} /> MFA Secure
                    </div>
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
