// frontend/src/pages/Register.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { authService } from '../services/apiService';
import { API_URL } from '../config/api';

function Register() {
    const [formData, setFormData] = useState({
        nom: '', prenom: '', email: '', password: '', confirmPassword: '', 
        telephone: '', role_souhaite: 'employe', adminCode: '', adminSecretKey: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [adminAlreadyExists, setAdminAlreadyExists] = useState(true);
    const [checkingAdmin, setCheckingAdmin] = useState(true);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
    const checkAdminExists = async () => {
        try {
            console.log('Vérification admin sur:', `${API_URL}/auth/admin-exists`);
            const response = await authService.adminExists();
            setAdminAlreadyExists(response.data.adminExists);
            setConnectionError(false);
        } catch (err) { 
            console.error('Erreur vérification admin:', err);
            if (err.code === 'ERR_NETWORK') {
                setConnectionError(true);
                setError('Impossible de contacter le serveur. Vérifiez que le backend est démarré.');
            } else {
                setError(err.response?.data?.message || 'Erreur de connexion au serveur');
            }
        } finally { 
            setCheckingAdmin(false); 
        }
    };
    checkAdminExists();
}, []);

// Dans handleSubmit
const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        setLoading(false);
        return;
    }
    if (formData.password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        setLoading(false);
        return;
    }
    if (!acceptTerms) {
        setError('Vous devez accepter les conditions d\'utilisation');
        setLoading(false);
        return;
    }

    try {
        const payload = {
            nom: formData.nom, prenom: formData.prenom, email: formData.email,
            password: formData.password, telephone: formData.telephone, 
            role_souhaite: formData.role_souhaite
        };
        if (formData.role_souhaite === 'admin') {
            payload.adminCode = formData.adminCode;
            payload.adminSecretKey = formData.adminSecretKey;
        }
        console.log('Envoi inscription à:', `${API_URL}/auth/register`);
        const response = await authService.register(payload);
        
        if (response.status === 201) {
            setSuccess(response.data.message);
            setTimeout(() => navigate('/login'), 2000);
        }
    } catch (err) {
        console.error('Erreur inscription:', err);
        if (err.code === 'ERR_NETWORK') {
            setError('Impossible de contacter le serveur. Vérifiez que le backend est démarré.');
        } else {
            setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
        }
    } finally { 
        setLoading(false); 
    }
};

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleRoleChange = (role) => {
        setFormData({ ...formData, role_souhaite: role, adminCode: '', adminSecretKey: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }
        if (formData.password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            setLoading(false);
            return;
        }
        if (!acceptTerms) {
            setError('Vous devez accepter les conditions d\'utilisation');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                nom: formData.nom, prenom: formData.prenom, email: formData.email,
                password: formData.password, telephone: formData.telephone, 
                role_souhaite: formData.role_souhaite
            };
            if (formData.role_souhaite === 'admin') {
                payload.adminCode = formData.adminCode;
                payload.adminSecretKey = formData.adminSecretKey;
            }
            console.log('Envoi inscription à:', `${API_URL}/auth/register`);
            const response = await axios.post(`${API_URL}/auth/register`, payload);
            
            if (response.status === 201) {
                setSuccess(response.data.message);
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (err) {
            console.error('Erreur inscription:', err);
            if (err.code === 'ERR_NETWORK') {
                setError('Impossible de contacter le serveur. Vérifiez que le backend est démarré.');
            } else {
                setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
            }
        } finally { 
            setLoading(false); 
        }
    };

    if (checkingAdmin) {
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
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 8v4l3 3"/>
                            </svg>
                            <p className="quote-text">"Créez votre compte et gérez vos congés en toute simplicité"</p>
                        </div>
                    </div>
                </div>
                <div className="login-pro-right">
                    <div className="login-pro-card">
                        <div className="loading-state">Chargement...</div>
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
                        <p className="quote-text">"Rejoignez plus de 500 entreprises qui nous font confiance"</p>
                        <p className="quote-author">— Solution RH certifiée</p>
                    </div>
                    
                    <div className="login-pro-features">
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Gratuit pour les employés</span>
                        </div>
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Configuration en 5 minutes</span>
                        </div>
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Support prioritaire</span>
                        </div>
                        <div className="feature-item">
                            <div className="feature-dot"></div>
                            <span>Mises à jour régulières</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="login-pro-right">
                <div className="login-pro-card">
                    <div className="login-pro-tabs">
                        <button 
                            className="pro-tab"
                            onClick={() => navigate('/login')}
                        >
                            Connexion
                        </button>
                        <button className="pro-tab active">
                            Inscription
                        </button>
                    </div>

                    <div className="login-pro-header">
                        <h2>Créer un compte</h2>
                        <p>Rejoignez l'espace de gestion des congés</p>
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
                        
                        {success && (
                            <div className="pro-success">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5"/>
                                </svg>
                                {success}
                            </div>
                        )}

                        <div className="register-row">
                            <div className="pro-input-group">
                                <label>Nom</label>
                                <div className="pro-input-wrapper">
                                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                    <input
                                        type="text"
                                        name="nom"
                                        value={formData.nom}
                                        onChange={handleChange}
                                        placeholder="Dupont"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="pro-input-group">
                                <label>Prénom</label>
                                <div className="pro-input-wrapper">
                                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                    <input
                                        type="text"
                                        name="prenom"
                                        value={formData.prenom}
                                        onChange={handleChange}
                                        placeholder="Jean"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pro-input-group">
                            <label>Email professionnel</label>
                            <div className="pro-input-wrapper">
                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="jean.dupont@entreprise.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pro-input-group">
                            <label>Téléphone (optionnel)</label>
                            <div className="pro-input-wrapper">
                                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                                <input
                                    type="tel"
                                    name="telephone"
                                    value={formData.telephone}
                                    onChange={handleChange}
                                    placeholder="+261 38 98 154 87"
                                />
                            </div>
                        </div>

                        <div className="register-row">
                            <div className="pro-input-group">
                                <label>Mot de passe</label>
                                <div className="pro-input-wrapper">
                                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
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
                            <div className="pro-input-group">
                                <label>Confirmer</label>
                                <div className="pro-input-wrapper">
                                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
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
                        </div>

                        <div className="pro-input-group">
                            <label>Type de compte</label>
                            <div className="role-selector">
                                <button
                                    type="button"
                                    className={`role-btn ${formData.role_souhaite === 'employe' ? 'active' : ''}`}
                                    onClick={() => handleRoleChange('employe')}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                    Employé
                                </button>
                                {!adminAlreadyExists && (
                                    <button
                                        type="button"
                                        className={`role-btn ${formData.role_souhaite === 'admin' ? 'active' : ''}`}
                                        onClick={() => handleRoleChange('admin')}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                        Administrateur
                                    </button>
                                )}
                            </div>
                            {adminAlreadyExists && (
                                <small className="info-text-register">
                                    ℹ️ L'option Admin n'est plus disponible car un administrateur existe déjà.
                                </small>
                            )}
                        </div>

                        {formData.role_souhaite === 'admin' && !adminAlreadyExists && (
                            <div className="admin-fields">
                                <div className="pro-input-group">
                                    <label>Code Admin</label>
                                    <div className="pro-input-wrapper">
                                        <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                        <input
                                            type="password"
                                            name="adminCode"
                                            value={formData.adminCode}
                                            onChange={handleChange}
                                            placeholder="Code d'activation admin"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="pro-input-group">
                                    <label>Clé secrète</label>
                                    <div className="pro-input-wrapper">
                                        <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10"/>
                                        </svg>
                                        <input
                                            type="password"
                                            name="adminSecretKey"
                                            value={formData.adminSecretKey}
                                            onChange={handleChange}
                                            placeholder="Clé secrète"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pro-checkbox-group">
                            <label className="pro-checkbox">
                                <input
                                    type="checkbox"
                                    checked={acceptTerms}
                                    onChange={(e) => setAcceptTerms(e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                J'accepte les <Link to="/terms">conditions générales d'utilisation</Link> et la 
                                <Link to="/privacy">politique de confidentialité</Link>
                            </label>
                        </div>

                        <button type="submit" className="pro-login-btn" disabled={loading}>
                            {loading ? (
                                <>
                                    <div className="pro-spinner"></div>
                                    Création du compte...
                                </>
                            ) : (
                                <>
                                    Créer mon compte
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7"/>
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-pro-footer">
                        <p>© 2024 - Solution de gestion des congés</p>
                        <div className="footer-links">
                            <Link to="/about">À propos</Link>
                            <span>•</span>
                            <Link to="/privacy">Confidentialité</Link>
                            <span>•</span>
                            <Link to="/contact">Contact</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;