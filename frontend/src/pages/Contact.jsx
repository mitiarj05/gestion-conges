// frontend/src/pages/Contact.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';

function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (!formData.name || !formData.email || !formData.message) {
            setError('Veuillez remplir tous les champs obligatoires');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/contact/send`, formData);
            setSuccess('Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (err) {
            setError('Une erreur est survenue. Veuillez réessayer plus tard.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="legal-page-container">
            <div className="legal-page-header">
                <Link to="/login" className="legal-back-link">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Retour à l'accueil
                </Link>
                <div className="legal-logo">
                    <div className="legal-logo-icon">
                        <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
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
                    <span className="legal-logo-text">Gestion<span>Congés</span></span>
                </div>
            </div>

            <div className="legal-content">
                <div className="legal-hero">
                    <h1>Contactez-nous</h1>
                    <p>Une question ? Un besoin ? Notre équipe est à votre écoute</p>
                </div>

                <div className="contact-grid">
                    <div className="contact-info-side">
                        <h2>Nos coordonnées</h2>
                        
                        <div className="contact-info-item">
                            <div className="contact-info-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                            </div>
                            <div>
                                <h4>Téléphone</h4>
                                <p>+261 38 98 154 87</p>
                                <small>Lun-Ven, 9h-18h</small>
                            </div>
                        </div>

                        <div className="contact-info-item">
                            <div className="contact-info-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                            </div>
                            <div>
                                <h4>Email</h4>
                                <p>support@gestion-conges.com</p>
                                <small>Réponse sous 24h</small>
                            </div>
                        </div>

                        <div className="contact-info-item">
                            <div className="contact-info-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                </svg>
                            </div>
                            <div>
                                <h4>Adresse</h4>
                                <p>Analakely<br/> Antananarivo 101 Entreprises</p>
                            </div>
                        </div>

                        <div className="contact-hours">
                            <h4>Horaires d'ouverture</h4>
                            <p>Lundi - Vendredi : 9h00 - 18h00</p>
                            <p>Samedi - Dimanche : Fermé</p>
                        </div>
                    </div>

                    <div className="contact-form-side">
                        <form onSubmit={handleSubmit} className="contact-form">
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

                            <div className="contact-form-row">
                                <div className="pro-input-group">
                                    <label>Nom complet *</label>
                                    <div className="pro-input-wrapper">
                                        <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Jean Dupont"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="pro-input-group">
                                    <label>Email *</label>
                                    <div className="pro-input-wrapper">
                                        <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                            <polyline points="22,6 12,13 2,6"/>
                                        </svg>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="contact@entreprise.com"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pro-input-group">
                                <label>Sujet</label>
                                <div className="pro-input-wrapper">
                                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                    <input
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        placeholder="Question sur l'application..."
                                    />
                                </div>
                            </div>

                            <div className="pro-input-group">
                                <label>Message *</label>
                                <div className="pro-textarea-wrapper">
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        rows="5"
                                        placeholder="Décrivez votre demande ou votre question..."
                                        required
                                    ></textarea>
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
                                        Envoyer le message
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="faq-section">
                    <h2>Questions fréquentes</h2>
                    <div className="faq-grid">
                        <div className="faq-item">
                            <h4>Comment créer un compte ?</h4>
                            <p>Utilisez le lien "Créer un compte" sur la page de connexion et suivez les instructions.</p>
                        </div>
                        <div className="faq-item">
                            <h4>Comment faire une demande de congé ?</h4>
                            <p>Connectez-vous, allez dans "Nouvelle demande" et remplissez le formulaire.</p>
                        </div>
                        <div className="faq-item">
                            <h4>Mon manager ne reçoit pas ma demande ?</h4>
                            <p>Vérifiez que votre manager est bien assigné à votre profil. Contactez l'administrateur si nécessaire.</p>
                        </div>
                        <div className="faq-item">
                            <h4>Comment consulter mon solde de congés ?</h4>
                            <p>Rendez-vous dans "Mon solde" depuis votre tableau de bord.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="legal-footer">
                <p>© 2024 Gestion Congés - Solution RH professionnelle</p>
                <div className="legal-footer-links">
                    <Link to="/about">À propos</Link>
                    <span>•</span>
                    <Link to="/privacy">Confidentialité</Link>
                    <span>•</span>
                    <Link to="/contact">Contact</Link>
                </div>
            </div>
        </div>
    );
}

export default Contact;