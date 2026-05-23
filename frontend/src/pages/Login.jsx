// frontend/src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';

function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [activeTab, setActiveTab] = useState('login');
    const [quoteIndex, setQuoteIndex] = useState(0);
    const navigate = useNavigate();

    const quotes = [
        { text: "Les vacances sont essentielles pour recharger ses batteries et revenir plus performant.", author: "Richard Branson" },
        { text: "Un bon équilibre entre vie professionnelle et vie personnelle est la clé de la productivité.", author: "Arianna Huffington" },
        { text: "Prendre soin de ses collaborateurs, c'est aussi respecter leur droit au repos.", author: "Tony Hsieh" },
        { text: "Les congés ne sont pas une pause dans le travail, mais une pause pour mieux travailler.", author: "Management & RH" },
        { text: "Une équipe reposée est une équipe plus créative et plus efficace.", author: "Harvard Business Review" }
    ];

    useEffect(() => {
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
        
        const interval = setInterval(() => {
            setQuoteIndex((prev) => (prev + 1) % quotes.length);
        }, 5000);
        
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/auth/login`, { email, password });
            const { token, user } = response.data;
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            if (rememberMe) {
                localStorage.setItem('savedEmail', email);
            } else {
                localStorage.removeItem('savedEmail');
            }
            
            if (onLogin) onLogin();

            const roles = user.roles || [];
            if (roles.includes('admin')) navigate('/dashboard/admin', { replace: true });
            else if (roles.includes('manager')) navigate('/dashboard/manager', { replace: true });
            else navigate('/dashboard/employee', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Email ou mot de passe incorrect');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-pro-container">
            {/* Section gauche - Branding RH/Congés */}
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
                            <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"/>
                        </svg>
                        <p className="quote-text">"{quotes[quoteIndex].text}"</p>
                        <p className="quote-author">— {quotes[quoteIndex].author}</p>
                    </div>
                    
                    <div className="login-pro-features">
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Demandes de congés 100% dématérialisées</span>
                        </div>
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Validation manager + RH en 2 étapes</span>
                        </div>
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Suivi du solde en temps réel</span>
                        </div>
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Calendrier collectif des absences</span>
                        </div>
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Génération automatique des bulletins de paie</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section droite - Formulaire */}
            <div className="login-pro-right">
                <div className="login-pro-card">
                    <div className="login-pro-tabs">
                        <button 
                            className={`pro-tab ${activeTab === 'login' ? 'active' : ''}`}
                            onClick={() => setActiveTab('login')}
                        >
                            Connexion
                        </button>
                        <button 
                            className={`pro-tab ${activeTab === 'register' ? 'active' : ''}`}
                            onClick={() => navigate('/register')}
                        >
                            Inscription
                        </button>
                    </div>

                    <div className="login-pro-header">
                        <h2>Espace Congés</h2>
                        <p>Connectez-vous pour gérer vos demandes</p>
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
                            <label>Email professionnel</label>
                            <div className="pro-input-wrapper">
                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="prenom.nom@entreprise.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pro-input-group">
                            <label>Mot de passe</label>
                            <div className="pro-input-wrapper">
                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                        </div>

                        <div className="pro-options">
                            <label className="pro-checkbox">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                Se souvenir de moi
                            </label>
                            <Link to="/forgot-password" className="forgot-link">Mot de passe oublié ?</Link>
                        </div>

                        <button type="submit" className="pro-login-btn" disabled={loading}>
                            {loading ? (
                                <>
                                    <div className="pro-spinner"></div>
                                    Connexion en cours
                                </>
                            ) : (
                                <>
                                    Accéder à mon espace
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7"/>
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-pro-footer">
                        <p>© 2026 - Solution de gestion des congés</p>
                        <div className="footer-links">
                            <Link to="/about">À propos</Link>
                            <span>•</span>
                            <Link to="/privacy">Confidentialité</Link>
                            <span>•</span>
                            <Link to="/contact">Contact support</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;