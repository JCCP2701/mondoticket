import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Shield, Building2, User, Eye, EyeOff, Ticket, ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth, UserRole } from '../../context/AuthContext';



export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const accentColor = "#a78bfa";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const ok = await login(email, password);
        setLoading(false);
        if (ok) {
            navigate('/mfa', { state: { from: '/' } });
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
            background: '#030014',
            position: 'relative',
            overflow: 'hidden',
            padding: '24px',
        }}>
            {/* Animated Mesh Gradient Background */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: `
                    radial-gradient(circle at 20% 30%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
                    radial-gradient(circle at 80% 70%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
                    radial-gradient(circle at 50% 50%, rgba(15, 12, 41, 1) 0%, rgba(3, 0, 20, 1) 100%)
                `,
                zIndex: 0
            }} />

            {/* Floating Orbs */}
            <div className="login-orb-1" />
            <div className="login-orb-2" />

            <div style={{
                width: '100%',
                maxWidth: '440px',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Logo & Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none', marginBottom: '24px' }}>
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 30px rgba(124,58,237,0.5)',
                            transform: 'rotate(-5deg)'
                        }}>
                            <Ticket size={28} color="white" />
                        </div>
                        <span style={{ fontSize: '30px', fontWeight: 900, color: '#f0edff', letterSpacing: '-1px' }}>
                            Ticket<span style={{ color: '#f59e0b' }}>Blessing</span>
                        </span>
                    </Link>

                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', marginBottom: '12px', letterSpacing: '-0.5px' }}>
                        Bienvenido de <span className="tb-gradient-text">vuelta</span>
                    </h1>
                    <p style={{ fontSize: '15px', color: 'rgba(248, 250, 252, 0.5)', maxWidth: '300px', margin: '0 auto' }}>
                        Accede a la plataforma de boletos más segura y avanzada.
                    </p>
                </div>

                {/* Login Card */}
                <div style={{
                    background: 'rgba(15, 12, 41, 0.65)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    borderRadius: '32px',
                    border: '1px solid rgba(167, 139, 250, 0.2)',
                    padding: '44px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(248, 250, 252, 0.8)', marginLeft: '4px' }}>
                                Correo electrónico
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(167, 139, 250, 0.5)' }} />
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tunombre@ejemplo.com"
                                    required
                                    className="login-input-premium"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '4px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(248, 250, 252, 0.8)', marginLeft: '4px' }}>
                                    Contraseña
                                </label>
                                <a href="#" style={{ fontSize: '12px', color: accentColor, textDecoration: 'none', fontWeight: 500, opacity: 0.8 }}>¿Olvidaste tu contraseña?</a>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(167, 139, 250, 0.5)' }} />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    required
                                    className="login-input-premium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', color: 'rgba(167, 139, 250, 0.5)', cursor: 'pointer',
                                        padding: '4px', borderRadius: '50%', transition: 'all 0.2s'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                padding: '12px 16px', borderRadius: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5', fontSize: '13px',
                                display: 'flex', alignItems: 'center', gap: '10px'
                            }}>
                                <Shield size={16} />
                                {error}
                            </div>
                        )}

                        <button
                            id="login-submit"
                            type="submit"
                            disabled={loading}
                            className="login-btn-premium"
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span className="spinner-small" /> Verificando...
                                </span>
                            ) : (
                                <>
                                    <span>Ingresar a mi Wallet</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px solid rgba(167, 139, 250, 0.1)', paddingTop: '24px' }}>
                        <p style={{ fontSize: '14px', color: 'rgba(248, 250, 252, 0.4)' }}>
                            ¿Eres nuevo en TicketBlessing?
                        </p>
                        <Link to="/register" style={{
                            display: 'inline-block', marginTop: '8px',
                            color: '#fff', textDecoration: 'none', fontWeight: 700,
                            fontSize: '15px', borderBottom: `2px solid ${accentColor}`
                        }}>
                            Crea tu cuenta gratis
                        </Link>
                    </div>
                </div>

                {/* Footer Security Badges */}
                <div style={{
                    marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '24px',
                    opacity: 0.5, filter: 'grayscale(1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#fff' }}>
                        <Shield size={14} /> 256-bit SSL
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#fff' }}>
                        <Lock size={14} /> MFA Secure
                    </div>
                </div>
            </div>

            <style>{`
                .login-input-premium {
                    width: 100%; 
                    padding: 16px 16px 16px 48px; 
                    border-radius: 16px;
                    background: rgba(255, 255, 255, 0.03); 
                    border: 1px solid rgba(167, 139, 250, 0.15);
                    color: #fff; 
                    font-size: 15px; 
                    outline: none; 
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-sizing: border-box;
                }
                .login-input-premium:focus {
                    background: rgba(167, 139, 250, 0.05);
                    border-color: #a78bfa;
                    box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.15);
                }
                .login-btn-premium {
                    width: 100%; 
                    padding: 18px; 
                    border-radius: 18px;
                    background: linear-gradient(135deg, #7c3aed, #6366f1);
                    color: white; 
                    font-weight: 700; 
                    font-size: 16px; 
                    border: none;
                    cursor: pointer;
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: '12px';
                    transition: all 0.3s; 
                    box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.4);
                }
                .login-btn-premium:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 30px -5px rgba(124, 58, 237, 0.5);
                    filter: brightness(1.1);
                }
                .login-btn-premium:active:not(:disabled) {
                    transform: translateY(0);
                }
                .login-btn-premium:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .login-orb-1 {
                    position: absolute; top: -100px; left: -100px; width: 400px; height: 400px;
                    background: radial-gradient(circle, rgba(124, 58, 237, 0.2), transparent 70%);
                    filter: blur(60px); animation: orbital 20s infinite linear;
                }
                .login-orb-2 {
                    position: absolute; bottom: -100px; right: -100px; width: 400px; height: 400px;
                    background: radial-gradient(circle, rgba(245, 158, 11, 0.15), transparent 70%);
                    filter: blur(60px); animation: orbital 25s reverse infinite linear;
                }
                @keyframes orbital {
                    from { transform: rotate(0deg) translate(50px) rotate(0deg); }
                    to { transform: rotate(360deg) translate(50px) rotate(-360deg); }
                }
                .spinner-small {
                    width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
