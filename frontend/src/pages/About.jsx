// frontend/src/pages/About.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function About() {
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
                    <h1>À propos de nous</h1>
                    <p>Une solution moderne de gestion des congés pour les entreprises</p>
                </div>

                <div className="legal-section">
                    <h2>Notre mission</h2>
                    <p>
                        Chez Gestion Congés, nous croyons que la gestion des congés ne devrait pas être 
                        une source de stress pour les entreprises et leurs employés. Notre mission est de 
                        simplifier et d'automatiser ce processus grâce à une solution digitale intuitive, 
                        sécurisée et accessible à tous.
                    </p>
                </div>

                <div className="legal-section">
                    <h2>Notre histoire</h2>
                    <p>
                        Fondée en 2024, Gestion Congés est née du constat que de nombreuses entreprises 
                        utilisent encore des feuilles Excel ou des processus manuels pour gérer les congés 
                        de leurs employés. Notre équipe d'experts en ressources humaines et en technologies 
                        a développé une plateforme qui répond aux besoins réels des entreprises modernes.
                    </p>
                </div>

                <div className="legal-grid">
                    <div className="legal-card">
                        <div className="legal-card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </div>
                        <h3>+500 entreprises</h3>
                        <p>Nous accompagnent au quotidien</p>
                    </div>
                    <div className="legal-card">
                        <div className="legal-card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <h3>+10 000 utilisateurs</h3>
                        <p>Font confiance à notre solution</p>
                    </div>
                    <div className="legal-card">
                        <div className="legal-card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M12 8v4l3 3M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                            </svg>
                        </div>
                        <h3>99.9% de disponibilité</h3>
                        <p>Service fiable et performant</p>
                    </div>
                </div>

                <div className="legal-section">
                    <h2>Nos valeurs</h2>
                    <div className="values-list">
                        <div className="value-item">
                            <div className="value-dot"></div>
                            <div>
                                <h4>Simplicité</h4>
                                <p>Une interface intuitive qui ne nécessite aucune formation</p>
                            </div>
                        </div>
                        <div className="value-item">
                            <div className="value-dot"></div>
                            <div>
                                <h4>Sécurité</h4>
                                <p>Vos données sont protégées et confidentielles</p>
                            </div>
                        </div>
                        <div className="value-item">
                            <div className="value-dot"></div>
                            <div>
                                <h4>Innovation</h4>
                                <p>Nous améliorons constamment notre solution</p>
                            </div>
                        </div>
                        <div className="value-item">
                            <div className="value-dot"></div>
                            <div>
                                <h4>Support réactif</h4>
                                <p>Une équipe dédiée pour vous accompagner</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="legal-section">
                    <h2>Notre équipe</h2>
                    <div className="team-grid">
                        <div className="team-card">
                            <div className="team-avatar">EXEMPLE</div>
                            <h4>EXEMPLE</h4>
                            <p>CEO & Fondateur</p>
                        </div>
                        <div className="team-card">
                            <div className="team-avatar">EXEMPLE</div>
                            <h4>EXEMPLE</h4>
                            <p>Directrice Technique</p>
                        </div>
                        <div className="team-card">
                            <div className="team-avatar">EXEMPLE</div>
                            <h4>EXEMPLE</h4>
                            <p>Responsable RH</p>
                        </div>
                        <div className="team-card">
                            <div className="team-avatar">EXEMPLE</div>
                            <h4>EXEMPLE</h4>
                            <p>Support Client</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="legal-footer">
                <p>© 2026 Gestion Congés - Solution RH professionnelle</p>
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

export default About;