// frontend/src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [validToken, setValidToken] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [passwordStrength, setPasswordStrength] = useState(0);

    useEffect(() => {
        verifyToken();
    }, [token]);

    const verifyToken = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/auth/verify-reset-token/${token}`);
            if (response.data.valid) {
                setValidToken(true);
                setUserEmail(response.data.email);
                setUserName(response.data.userName);
            } else {
                setValidToken(false);
                setError(response.data.message || 'Lien invalide ou expiré');
            }
        } catch (err) {
            setValidToken(false);
            setError(err.response?.data?.message || 'Lien de réinitialisation invalide ou expiré');
        } finally {
            setLoading(false);
        }
    };

    const checkPasswordStrength = (pwd) => {
        let strength = 0;
        if (pwd.length >= 6) strength++;
        if (pwd.length >= 10) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[^A-Za-z0-9]/.test(pwd)) strength++;
        return Math.min(strength, 4);
    };

    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        setPasswordStrength(checkPasswordStrength(newPassword));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            setSubmitting(false);
            return;
        }

        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            setSubmitting(false);
            return;
        }

        try {
            const response = await axios.post(`http://localhost:5000/api/auth/reset-password/${token}`, {
                password,
                confirmPassword
            });
            setMessage(response.data.message);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Une erreur est survenue');
        } finally {
            setSubmitting(false);
        }
    };

    const getStrengthColor = () => {
        const colors = ['#ef4444', '#f59e0b', '#eab308', '#10b981'];
        return colors[passwordStrength] || '#e2e8f0';
    };

    const getStrengthText = () => {
        const texts = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
        return texts[passwordStrength];
    };

    if (loading) {
        return (
            <div className="login-pro-container">
                <div className="login-pro-left">
                    <div className="login-pro-brand">
                        <div className="login-pro-logo">
                            <div className="logo-mark">
                                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                                    <rect width="36" height="36" rx="10" fill="url(#logoGradient)"/>
                                    <path d="M10 14L16 20L26 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M12 22V26H24V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <defs>
                                        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#6366f1"/>
                                            <stop offset="100%" stopColor="#8b5cf6"/>
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <span className="logo-text">Gestion<span>Congés</span></span>
                        </div>
                        <div className="loading-state">Vérification du lien...</div>
                    </div>
                </div>
                <div className="login-pro-right">
                    <div className="login-pro-card">
                        <div className="loading-state" style={{ textAlign: 'center', padding: '60px' }}>
                            <div className="pro-spinner" style={{ margin: '0 auto 16px' }}></div>
                            <p>Vérification en cours...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!validToken) {
        return (
            <div className="login-pro-container">
                <div className="login-pro-left">
                    <div className="login-pro-brand">
                        <div className="login-pro-logo">
                            <div className="logo-mark">
                                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                                    <rect width="36" height="36" rx="10" fill="url(#logoGradient)"/>
                                    <path d="M10 14L16 20L26 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M12 22V26H24V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <defs>
                                        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#6366f1"/>
                                            <stop offset="100%" stopColor="#8b5cf6"/>
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <span className="logo-text">Gestion<span>Congés</span></span>
                        </div>
                    </div>
                </div>
                <div className="login-pro-right">
                    <div className="login-pro-card">
                        <div className="login-pro-header">
                            <h2>Lien invalide</h2>
                            <p>Ce lien de réinitialisation n'est plus valide</p>
                        </div>
                        <div className="pro-error" style={{ marginBottom: '24px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            {error}
                        </div>
                        <Link to="/forgot-password" className="pro-login-btn" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                            Nouvelle demande
                        </Link>
                        <div className="login-pro-footer" style={{ marginTop: '32px' }}>
                            <p><Link to="/login" style={{ color: '#4f46e5', textDecoration: 'none' }}>← Retour à la connexion</Link></p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (message) {
        return (
            <div className="login-pro-container">
                <div className="login-pro-left">
                    <div className="login-pro-brand">
                        <div className="login-pro-logo">
                            <div className="logo-mark">
                                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                                    <rect width="36" height="36" rx="10" fill="url(#logoGradient)"/>
                                    <path d="M10 14L16 20L26 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M12 22V26H24V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <defs>
                                        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#6366f1"/>
                                            <stop offset="100%" stopColor="#8b5cf6"/>
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <span className="logo-text">Gestion<span>Congés</span></span>
                        </div>
                    </div>
                </div>
                <div className="login-pro-right">
                    <div className="login-pro-card">
                        <div className="login-pro-header">
                            <h2>Mot de passe modifié !</h2>
                            <p>Votre mot de passe a été mis à jour avec succès</p>
                        </div>
                        <div className="pro-success" style={{ marginBottom: '24px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            {message}
                        </div>
                        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '24px' }}>
                            Vous allez être redirigé vers la page de connexion...
                        </p>
                        <Link to="/login" className="pro-login-btn" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                            Se connecter
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-pro-container">
            <div className="login-pro-left">
                <div className="login-pro-brand">
                    <div className="login-pro-logo">
                        <div className="logo-mark">
                            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                                <rect width="36" height="36" rx="10" fill="url(#logoGradient)"/>
                                <path d="M10 14L16 20L26 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 22V26H24V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <defs>
                                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#6366f1"/>
                                        <stop offset="100%" stopColor="#8b5cf6"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <span className="logo-text">Gestion<span>Congés</span></span>
                    </div>
                    <div className="login-pro-quote">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        <p className="quote-text">"Choisissez un mot de passe sécurisé"</p>
                        <p className="quote-author">— Bonjour {userName}</p>
                    </div>
                </div>
            </div>

            <div className="login-pro-right">
                <div className="login-pro-card">
                    <div className="login-pro-header">
                        <h2>Nouveau mot de passe</h2>
                        <p>Pour {userEmail}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-pro-form">
                        {error && (
                            <div className="pro-error">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="pro-input-group">
                            <label>Nouveau mot de passe</label>
                            <div className="pro-input-wrapper">
                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={handlePasswordChange}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    className="pro-password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                            <line x1="1" y1="1" x2="23" y2="23"/>
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {password && (
                                <div className="password-strength">
                                    <div className="strength-bar">
                                        <div className="strength-fill" style={{ width: `${(passwordStrength + 1) * 20}%`, background: getStrengthColor() }}></div>
                                    </div>
                                    <span className="strength-text" style={{ color: getStrengthColor() }}>{getStrengthText()}</span>
                                </div>
                            )}
                        </div>

                        <div className="pro-input-group">
                            <label>Confirmer le mot de passe</label>
                            <div className="pro-input-wrapper">
                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    className="pro-password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                            <line x1="1" y1="1" x2="23" y2="23"/>
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="pro-login-btn" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <div className="pro-spinner"></div>
                                    Modification en cours...
                                </>
                            ) : (
                                <>
                                    Réinitialiser le mot de passe
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7"/>
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-pro-footer">
                        <p><Link to="/login" style={{ color: '#4f46e5', textDecoration: 'none' }}>← Retour à la connexion</Link></p>
                        <p>© 2024 - Solution de gestion des congés</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;