// frontend/src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!email) {
            setError('Veuillez saisir votre adresse email');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
            setMessage(response.data.message);
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
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
                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            <p className="quote-text">"Un email de réinitialisation vous a été envoyé"</p>
                        </div>
                    </div>
                </div>
                <div className="login-pro-right">
                    <div className="login-pro-card">
                        <div className="login-pro-header">
                            <h2>Email envoyé !</h2>
                            <p>Vérifiez votre boîte de réception</p>
                        </div>
                        <div className="pro-success" style={{ marginBottom: '24px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            {message}
                        </div>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
                            Si vous ne recevez pas d'email dans les prochaines minutes, vérifiez vos spams ou 
                            <Link to="/forgot-password" style={{ color: '#4f46e5', textDecoration: 'none' }}> renvoyez une demande</Link>.
                        </p>
                        <Link to="/login" className="pro-login-btn" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                            Retour à la connexion
                        </Link>
                        <div className="login-pro-footer" style={{ marginTop: '32px' }}>
                            <p>© 2024 - Solution de gestion des congés</p>
                        </div>
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
                        <p className="quote-text">"Réinitialisez votre mot de passe en toute sécurité"</p>
                    </div>
                    <div className="login-pro-features">
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Réinitialisation sécurisée</span>
                        </div>
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Lien valable 1 heure</span>
                        </div>
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Support réactif 24/7</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="login-pro-right">
                <div className="login-pro-card">
                    <div className="login-pro-header">
                        <h2>Mot de passe oublié ?</h2>
                        <p>Entrez votre email pour réinitialiser votre mot de passe</p>
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

                        <button type="submit" className="pro-login-btn" disabled={loading}>
                            {loading ? (
                                <>
                                    <div className="pro-spinner"></div>
                                    Envoi en cours...
                                </>
                            ) : (
                                <>
                                    Envoyer le lien de réinitialisation
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

export default ForgotPassword;