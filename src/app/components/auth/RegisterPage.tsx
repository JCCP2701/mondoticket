import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Ticket, Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../landing/landing-theme.css';

export default function RegisterPage() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const passwordStrength = (() => {
        const p = form.password;
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
        if (form.password !== form.confirm) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (form.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setLoading(true);
        const ok = await register(form.name, form.email, form.password);
        setLoading(false);
        if (ok) navigate('/mfa');
        else setError('Error al registrar. Intenta con otro correo.');
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '11px 14px 11px 38px', borderRadius: '10px',
        background: 'var(--mt-offwhite)', border: '1px solid var(--mt-line)',
        color: 'var(--mt-ink)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--mt-black)', padding: '24px',
        }}>
            <div style={{ width: '100%', maxWidth: '440px' }}>
                {/* Logo */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Ticket size={20} color="var(--mt-gold)" />
                        </div>
                        <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
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
                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--mt-ink)', marginBottom: '6px' }}>Crear cuenta</h2>
                    <p style={{ fontSize: '13px', color: 'var(--mt-muted)', marginBottom: '24px' }}>
                        Únete a MondoTicket y empieza a disfrutar eventos
                    </p>

                    {/* Benefits */}
                    <div style={{ display: 'flex', gap: '14px', marginBottom: '22px', flexWrap: 'wrap' }}>
                        {['Wallet de boletos', 'QR tickets', 'MFA seguro'].map((b) => (
                            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle size={13} color="var(--mt-green)" />
                                <span style={{ fontSize: '12px', color: 'var(--mt-muted)' }}>{b}</span>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Name */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mt-ink)', display: 'block', marginBottom: '6px' }}>Nombre completo</label>
                            <div style={{ position: 'relative' }}>
                                <User size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                                <input
                                    id="register-name"
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Tu nombre"
                                    required
                                    style={inputStyle}
                                    onFocus={(e) => (e.target.style.borderColor = 'var(--mt-gold)')}
                                    onBlur={(e) => (e.target.style.borderColor = 'var(--mt-line)')}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mt-ink)', display: 'block', marginBottom: '6px' }}>Correo electrónico</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                                <input
                                    id="register-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="correo@ejemplo.com"
                                    required
                                    style={inputStyle}
                                    onFocus={(e) => (e.target.style.borderColor = 'var(--mt-gold)')}
                                    onBlur={(e) => (e.target.style.borderColor = 'var(--mt-line)')}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mt-ink)', display: 'block', marginBottom: '6px' }}>Contraseña</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                                <input
                                    id="register-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    style={{ ...inputStyle, paddingRight: '40px' }}
                                    onFocus={(e) => (e.target.style.borderColor = 'var(--mt-gold)')}
                                    onBlur={(e) => (e.target.style.borderColor = 'var(--mt-line)')}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--mt-muted)', cursor: 'pointer' }}>
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {form.password && (
                                <div style={{ marginTop: '8px' }}>
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                        {[1, 2, 3, 4].map((level) => (
                                            <div key={level} style={{ flex: 1, height: '3px', borderRadius: '2px', background: level <= passwordStrength ? strengthColor : 'var(--mt-line)', transition: 'all 0.3s' }} />
                                        ))}
                                    </div>
                                    <p style={{ fontSize: '11px', color: strengthColor }}>{strengthLabel}</p>
                                </div>
                            )}
                        </div>

                        {/* Confirm */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--mt-ink)', display: 'block', marginBottom: '6px' }}>Confirmar contraseña</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-muted)' }} />
                                <input
                                    id="register-confirm"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.confirm}
                                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                                    placeholder="Repite tu contraseña"
                                    required
                                    style={{
                                        ...inputStyle,
                                        border: `1px solid ${form.confirm && form.confirm !== form.password ? 'rgba(225,29,72,0.4)' : form.confirm && form.confirm === form.password ? 'rgba(50,128,34,0.4)' : 'var(--mt-line)'}`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{ padding: '10px 13px', borderRadius: '8px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#e11d48', fontSize: '13px' }}>
                                {error}
                            </div>
                        )}

                        <button
                            id="register-submit"
                            type="submit"
                            disabled={loading}
                            className="mt-btn-primary"
                            style={{
                                width: '100%', padding: '13px', borderRadius: '10px',
                                fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            }}
                        >
                            {loading ? 'Creando cuenta...' : (
                                <><span>Crear cuenta y configurar MFA</span><ArrowRight size={15} /></>
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: '18px', textAlign: 'center' }}>
                        <p style={{ fontSize: '13px', color: 'var(--mt-muted)' }}>
                            ¿Ya tienes cuenta?{' '}
                            <Link to="/login" style={{ color: 'var(--mt-gold-dark)', textDecoration: 'none', fontWeight: 600 }}>
                                Iniciar sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
