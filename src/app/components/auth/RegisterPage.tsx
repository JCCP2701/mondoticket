import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Ticket, Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
    const strengthColor = ['', '#f43f5e', '#f59e0b', '#3b82f6', '#10b981'][passwordStrength];

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

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0d0b1e 0%, #1a0a3d 50%, #0d1b4d 100%)',
            padding: '24px', position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', top: '20%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: '460px' }}>
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
                    <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#f0edff', marginBottom: '6px' }}>Crear cuenta</h2>
                    <p style={{ fontSize: '14px', color: 'rgba(240,237,255,0.45)', marginBottom: '28px' }}>
                        Únete a TicketBlessing y empieza a disfrutar eventos
                    </p>

                    {/* Benefits */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        {['Wallet de boletos', 'QR tickets', 'MFA seguro'].map((b) => (
                            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle size={14} color="#10b981" />
                                <span style={{ fontSize: '12px', color: 'rgba(240,237,255,0.55)' }}>{b}</span>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Name */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(240,237,255,0.7)', display: 'block', marginBottom: '6px' }}>Nombre completo</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,237,255,0.3)' }} />
                                <input
                                    id="register-name"
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Tu nombre"
                                    required
                                    style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.2)', color: '#f0edff', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                    onFocus={(e) => (e.target.style.borderColor = '#8b5cf6')}
                                    onBlur={(e) => (e.target.style.borderColor = 'rgba(139,92,246,0.2)')}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(240,237,255,0.7)', display: 'block', marginBottom: '6px' }}>Correo electrónico</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,237,255,0.3)' }} />
                                <input
                                    id="register-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="correo@ejemplo.com"
                                    required
                                    style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.2)', color: '#f0edff', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                    onFocus={(e) => (e.target.style.borderColor = '#8b5cf6')}
                                    onBlur={(e) => (e.target.style.borderColor = 'rgba(139,92,246,0.2)')}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(240,237,255,0.7)', display: 'block', marginBottom: '6px' }}>Contraseña</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,237,255,0.3)' }} />
                                <input
                                    id="register-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    style={{ width: '100%', padding: '12px 42px 12px 40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.2)', color: '#f0edff', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                    onFocus={(e) => (e.target.style.borderColor = '#8b5cf6')}
                                    onBlur={(e) => (e.target.style.borderColor = 'rgba(139,92,246,0.2)')}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(240,237,255,0.3)', cursor: 'pointer' }}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {form.password && (
                                <div style={{ marginTop: '8px' }}>
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                        {[1, 2, 3, 4].map((level) => (
                                            <div key={level} style={{ flex: 1, height: '3px', borderRadius: '2px', background: level <= passwordStrength ? strengthColor : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
                                        ))}
                                    </div>
                                    <p style={{ fontSize: '11px', color: strengthColor }}>{strengthLabel}</p>
                                </div>
                            )}
                        </div>

                        {/* Confirm */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(240,237,255,0.7)', display: 'block', marginBottom: '6px' }}>Confirmar contraseña</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,237,255,0.3)' }} />
                                <input
                                    id="register-confirm"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.confirm}
                                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                                    placeholder="Repite tu contraseña"
                                    required
                                    style={{
                                        width: '100%', padding: '12px 14px 12px 40px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${form.confirm && form.confirm !== form.password ? 'rgba(244,63,94,0.5)' : form.confirm && form.confirm === form.password ? 'rgba(16,185,129,0.5)' : 'rgba(139,92,246,0.2)'}`,
                                        color: '#f0edff', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', fontSize: '13px' }}>
                                {error}
                            </div>
                        )}

                        <button
                            id="register-submit"
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '14px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                                color: 'white', fontWeight: 700, fontSize: '15px', border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: '0 0 20px rgba(124,58,237,0.3)', transition: 'all 0.2s',
                            }}
                        >
                            {loading ? 'Creando cuenta...' : (
                                <><span>Crear cuenta y configurar MFA</span><ArrowRight size={16} /></>
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', color: 'rgba(240,237,255,0.4)' }}>
                            ¿Ya tienes cuenta?{' '}
                            <Link to="/login" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>
                                Iniciar sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
