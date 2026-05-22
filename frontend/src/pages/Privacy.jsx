// frontend/src/pages/Privacy.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function Privacy() {
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
                    <h1>Politique de confidentialité</h1>
                    <p>Dernière mise à jour : 1er janvier 2024</p>
                </div>

                <div className="legal-section">
                    <h2>1. Collecte des informations</h2>
                    <p>
                        Nous collectons les informations que vous nous fournissez directement, notamment :
                    </p>
                    <ul>
                        <li>Informations d'identification (nom, prénom, email, téléphone)</li>
                        <li>Informations professionnelles (poste, service, manager)</li>
                        <li>Historique des demandes de congé</li>
                        <li>Données de connexion et d'utilisation</li>
                    </ul>
                </div>

                <div className="legal-section">
                    <h2>2. Utilisation des informations</h2>
                    <p>Vos informations sont utilisées pour :</p>
                    <ul>
                        <li>Gérer vos demandes de congé</li>
                        <li>Communiquer avec vous concernant vos demandes</li>
                        <li>Améliorer notre service et votre expérience utilisateur</li>
                        <li>Respecter nos obligations légales</li>
                    </ul>
                </div>

                <div className="legal-section">
                    <h2>3. Protection des données</h2>
                    <p>
                        Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles 
                        appropriées pour protéger vos données contre tout accès non autorisé, perte, 
                        destruction ou divulgation. Vos mots de passe sont cryptés et nos serveurs 
                        sont protégés par des pare-feu avancés.
                    </p>
                </div>

                <div className="legal-section">
                    <h2>4. Partage des informations</h2>
                    <p>
                        Vos informations ne sont partagées qu'avec :
                    </p>
                    <ul>
                        <li>Votre manager (pour la validation des demandes)</li>
                        <li>L'administrateur de l'application</li>
                        <li>Les autorités légales si requis par la loi</li>
                    </ul>
                    <p>
                        Nous ne vendons jamais vos données personnelles à des tiers.
                    </p>
                </div>

                <div className="legal-section">
                    <h2>5. Conservation des données</h2>
                    <p>
                        Vos données sont conservées aussi longtemps que votre compte est actif. 
                        En cas de suppression de compte, vos données sont anonymisées ou supprimées 
                        conformément à la réglementation en vigueur.
                    </p>
                </div>

                <div className="legal-section">
                    <h2>6. Vos droits</h2>
                    <p>
                        Conformément au RGPD, vous disposez des droits suivants :
                    </p>
                    <ul>
                        <li>Droit d'accès à vos données</li>
                        <li>Droit de rectification</li>
                        <li>Droit à l'effacement ("droit à l'oubli")</li>
                        <li>Droit à la limitation du traitement</li>
                        <li>Droit à la portabilité des données</li>
                    </ul>
                    <p>
                        Pour exercer ces droits, contactez-nous à <a href="mailto:privacy@gestion-conges.com">privacy@gestion-conges.com</a>
                    </p>
                </div>

                <div className="legal-section">
                    <h2>7. Cookies</h2>
                    <p>
                        Notre application utilise des cookies essentiels pour votre authentification 
                        et le bon fonctionnement du service. Nous n'utilisons pas de cookies de suivi 
                        ou de publicité.
                    </p>
                </div>

                <div className="legal-section">
                    <h2>8. Modifications de la politique</h2>
                    <p>
                        Nous nous réservons le droit de modifier cette politique de confidentialité 
                        à tout moment. Les modifications entrent en vigueur dès leur publication sur 
                        cette page. Nous vous informerons des changements importants par email.
                    </p>
                </div>

                <div className="legal-section">
                    <h2>9. Contact</h2>
                    <p>
                        Pour toute question concernant cette politique ou vos données personnelles, 
                        contactez notre Délégué à la Protection des Données (DPO) :
                    </p>
                    <div className="contact-info-box">
                        <p>📧 Email : <a href="mailto:dpo@gestion-conges.com">dpo@gestion-conges.com</a></p>
                        <p>📞 Téléphone : +261 38 98 154 87</p>
                        <p>📍 Adresse : Analakely Antananarivo 101 Entreprises</p>
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

export default Privacy;