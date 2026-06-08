import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContextObject';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(usuario, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Credenciales incorrectas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* Background Overlay */}
            <div style={styles.overlay}></div>

            <div style={styles.contentWrapper}>
                {/* Left Column - Branding */}
                <div style={styles.leftColumn}>
                    <div style={styles.decorLine}></div>
                    <h1 style={styles.title}>
                        Librería Bazar<br/>
                        <span style={styles.titleHighlight}>El Educando</span>
                    </h1>
                    <p style={styles.subtitle}>
                        Sistema moderno de Punto de Venta usando las mejores herramientas. Optimiza tu inventario, agiliza tus ventas y toma el control de tu negocio hoy mismo.
                    </p>
                </div>

                {/* Right Column - Login Form */}
                <div style={styles.rightColumn}>
                    <div style={styles.loginCard}>
                        <h2 style={styles.cardTitle}>Bienvenido de nuevo</h2>
                        <p style={styles.cardSubtitle}>
                            Ingresa tus credenciales para acceder al panel
                        </p>

                        <form onSubmit={handleSubmit} style={styles.form}>
                            {error && (
                                <div style={styles.errorAlert}>
                                    {error}
                                </div>
                            )}
                            
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Usuario</label>
                                <div style={styles.inputWrapper}>
                                    <User size={18} style={styles.inputIcon} />
                                    <input 
                                        type="text" 
                                        value={usuario}
                                        onChange={(e) => setUsuario(e.target.value)}
                                        placeholder="Nombre de usuario"
                                        style={styles.input}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Contraseña</label>
                                <div style={styles.inputWrapper}>
                                    <Lock size={18} style={styles.inputIcon} />
                                    <input 
                                        type="password" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Tu contraseña"
                                        style={styles.input}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={styles.captchaContainer}>
                                <label style={styles.captchaCheckboxLabel}>
                                    <input 
                                        type="checkbox" 
                                        style={styles.captchaCheckbox} 
                                        required
                                    />
                                    <span>No soy un robot</span>
                                </label>
                                <div style={styles.captchaLogo}>
                                    <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" width="32" alt="reCAPTCHA" />
                                    <div style={{fontSize: '0.55rem', color: '#94A3B8', marginTop: '4px'}}>
                                        Privacidad - Condiciones
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="submit-btn"
                                style={styles.submitBtn} 
                                disabled={loading}
                            >
                                {loading ? 'PROCESANDO...' : 'INICIAR SESIÓN'}
                                {!loading && <ArrowRight size={18} style={{ marginLeft: '8px' }} />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Injected Styles */}
            <style dangerouslySetInnerHTML={{__html: `
                .submit-btn:hover {
                    box-shadow: 0 8px 25px rgba(255, 75, 43, 0.5) !important;
                    transform: translateY(-2px);
                    opacity: 0.95;
                }
                .forgot-pass:hover {
                    color: #FF4B2B !important;
                    text-decoration: underline;
                }
                input:focus {
                    border-color: #FF4B2B !important;
                    box-shadow: 0 0 0 3px rgba(255, 75, 43, 0.15) !important;
                }
            `}} />
        </div>
    );
};

const styles = {
    container: {
        width: '100vw',
        height: '100vh',
        display: 'flex',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
        overflow: 'hidden',
        // High quality background image relevant to books/office
        backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000&auto=format&fit=crop')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // Elegant dark gradient overlay
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.75) 50%, rgba(15, 23, 42, 0.4) 100%)',
        zIndex: 1
    },
    contentWrapper: {
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        width: '100%',
        height: '100%'
    },
    leftColumn: {
        flex: 1.2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 8%',
        color: 'white'
    },
    decorLine: {
        width: '60px',
        height: '5px',
        background: 'linear-gradient(90deg, #FF4B2B, #FF416C)',
        marginBottom: '2.5rem',
        borderRadius: '3px'
    },
    title: {
        fontSize: '4.5rem',
        fontWeight: '800',
        lineHeight: 1.1,
        marginBottom: '1.5rem',
        letterSpacing: '-1.5px',
        textShadow: '0 4px 20px rgba(0,0,0,0.3)'
    },
    titleHighlight: {
        color: '#FF4B2B',
        background: 'linear-gradient(to right, #FF4B2B, #FF416C)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    },
    subtitle: {
        fontSize: '1.1rem',
        color: '#D1D5DB',
        maxWidth: '480px',
        lineHeight: 1.7,
        fontWeight: '400',
        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
    },
    rightColumn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
    },
    loginCard: {
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--surface)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '3.5rem',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column'
    },
    cardTitle: {
        fontSize: '2rem',
        fontWeight: '700',
        color: 'var(--text-main)',
        marginBottom: '0.5rem',
        textAlign: 'center',
        letterSpacing: '-0.5px'
    },
    cardSubtitle: {
        color: '#94A3B8',
        fontSize: '0.95rem',
        textAlign: 'center',
        marginBottom: '2.5rem'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
    },
    errorAlert: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#FECACA',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        padding: '0.85rem',
        borderRadius: '10px',
        fontSize: '0.85rem',
        textAlign: 'center',
        fontWeight: '500'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    label: {
        color: 'var(--text-main)',
        fontSize: '0.85rem',
        fontWeight: '600',
        marginLeft: '4px'
    },
    inputWrapper: {
        position: 'relative',
        width: '100%'
    },
    inputIcon: {
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#64748B'
    },
    input: {
        width: '100%',
        backgroundColor: 'var(--bg-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1rem 1rem 1rem 3.2rem',
        color: 'var(--text-main)',
        fontSize: '0.95rem',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.3s ease'
    },
    captchaContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '3px',
        padding: '0.5rem 0.8rem',
        marginTop: '0.5rem',
        boxShadow: 'var(--shadow-sm)'
    },
    captchaCheckboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        color: 'var(--text-main)',
        fontSize: '0.85rem',
        fontWeight: '500',
        userSelect: 'none'
    },
    captchaCheckbox: {
        width: '28px',
        height: '28px',
        cursor: 'pointer',
        background: '#fff',
        border: '2px solid #c1c1c1',
        borderRadius: '2px'
    },
    captchaLogo: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    forgotPass: {
        cursor: 'pointer',
        transition: 'color 0.2s ease',
        color: '#94A3B8',
        fontWeight: '500'
    },
    submitBtn: {
        marginTop: '1.5rem',
        padding: '1.1rem',
        background: 'linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontWeight: '700',
        fontSize: '1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 8px 20px rgba(255, 75, 43, 0.3)',
        transition: 'all 0.3s ease',
        letterSpacing: '1px'
    }
};

export default Login;
