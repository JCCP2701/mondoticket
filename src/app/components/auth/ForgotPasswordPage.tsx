import { useState } from 'react';
import { Link } from 'react-router';
import { Shield, Ticket, ArrowRight, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../landing/landing-theme.css';

export default function ForgotPasswordPage() {
    const { sendPasswordReset } = useAuth();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await sendPasswordReset(email.trim());
        setLoading(false);
        if (result.ok) {
            setSent(true);
        } else {
            setError(result.error || 'No se pudo enviar el correo. Intenta de nuevo.');
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
                        Recupera tu <span className="mt-gradient-gold-text">acceso</span>
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--mt-muted-on-dark)', maxWidth: '300px', margin: '0 auto' }}>
                        Te enviaremos un enlace a tu correo para restablecer tu contraseña.
                    </p>
                </div>

                <div style={{
                    background: 'var(--mt-white)',
                    borderRadius: '16px',
                    border: '1px solid var(--mt-line)',
                    padding: '32px',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                }}>
                    {sent ? (
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '50%',
                                background: 'rgba(50,128,34,0.1)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                            }}>
                                <CheckCircle size={26} color="var(--mt-green)" />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--mt-ink)', marginBottom: '8px' }}>
                                Revisa tu correo
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--mt-muted)', marginBottom: '24px' }}>
                                Si {email.trim()} tiene una cuenta con nosotros, te llegará un enlace para restablecer tu contraseña.
                            </p>
                            <Link to="/login" style={{
                                display: 'inline-block', color: 'var(--mt-ink)', textDecoration: 'none',
                                fontWeight: 700, fontSize: '14px', borderBottom: '2px solid var(--mt-gold)',
                            }}>
                                Volver a iniciar sesión
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mt-ink)' }}>
                                    Correo electrónico
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                                    <input
                                        id="forgot-password-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tunombre@ejemplo.com"
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
                                id="forgot-password-submit"
                                type="submit"
                                disabled={loading}
                                className="mt-btn-primary"
                                style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="login-spinner" /> Enviando...
                                    </span>
                                ) : (
                                    <>
                                        <span>Enviar enlace de recuperación</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {!sent && (
                        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid var(--mt-line)', paddingTop: '20px' }}>
                            <Link to="/login" style={{
                                display: 'inline-block',
                                color: 'var(--mt-ink)', textDecoration: 'none', fontWeight: 700,
                                fontSize: '14px', borderBottom: '2px solid var(--mt-gold)',
                            }}>
                                Volver a iniciar sesión
                            </Link>
                        </div>
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
