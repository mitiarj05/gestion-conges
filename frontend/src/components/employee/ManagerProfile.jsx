// frontend/src/components/employee/ManagerProfile.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';

function ManagerProfile() {
    const [manager, setManager] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchManagerInfo();
    }, []);

    const fetchManagerInfo = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Vous n\'êtes pas authentifié');
                setLoading(false);
                return;
            }
            
            const response = await axios.get(`${API_URL}/users/my-manager`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setManager(response.data);
            setError('');
        } catch (error) {
            console.error('Erreur fetchManager:', error);
            if (error.response?.status === 404) {
                setError(error.response?.data?.message || 'Vous n\'avez pas de manager assigné. Veuillez contacter votre administrateur.');
            } else {
                setError('Impossible de récupérer les informations du manager. Veuillez réessayer plus tard.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loader-container">
                <div className="loader-spinner">
                    <div className="loader-ring"></div>
                    <div className="loader-ring"></div>
                    <div className="loader-ring"></div>
                </div>
                <div className="loader-text">Chargement des informations...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <div className="dashboard-header">
                    <div className="dashboard-header-content">
                        <h1 className="dashboard-title">Mon manager</h1>
                        <p className="dashboard-subtitle">Informations sur votre responsable hiérarchique</p>
                    </div>
                </div>
                <div className="info-card-tip" style={{ background: '#fef3c7', borderLeftColor: '#f59e0b' }}>
                    <div className="tip-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <div className="tip-content">
                        <strong>{error}</strong>
                        <br/><br/>
                        <p>Pour être rattaché à un manager :</p>
                        <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
                            <li>Contactez votre administrateur</li>
                            <li>Demandez à être ajouté à l'équipe d'un manager</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    if (!manager) {
        return (
            <div>
                <div className="dashboard-header">
                    <div className="dashboard-header-content">
                        <h1 className="dashboard-title">Mon manager</h1>
                        <p className="dashboard-subtitle">Informations sur votre responsable hiérarchique</p>
                    </div>
                </div>
                <div className="info-card-tip" style={{ background: '#fef3c7', borderLeftColor: '#f59e0b' }}>
                    <div className="tip-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <div className="tip-content">
                        <strong>Aucun manager trouvé</strong>
                        <br/>
                        Vous n'êtes actuellement rattaché à aucun manager. Veuillez contacter votre administrateur.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Mon manager</h1>
                    <p className="dashboard-subtitle">Informations sur votre responsable hiérarchique</p>
                </div>
            </div>

            <div className="manager-profile-card">
                {/* En-tête avec avatar */}
                <div className="manager-profile-header">
                    <div className="manager-avatar-large">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </div>
                    <div className="manager-profile-title">
                        <h2>{manager.prenom} {manager.nom}</h2>
                        <span className="manager-badge">Manager</span>
                    </div>
                </div>

                {/* Informations de contact */}
                <div className="manager-info-section">
                    <h3>Coordonnées</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <div className="info-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                            </div>
                            <div className="info-details">
                                <span className="info-label">Email</span>
                                <a href={`mailto:${manager.email}`} className="info-value-link">{manager.email}</a>
                            </div>
                        </div>
                        {manager.telephone && (
                            <div className="info-item">
                                <div className="info-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                                    </svg>
                                </div>
                                <div className="info-details">
                                    <span className="info-label">Téléphone</span>
                                    <a href={`tel:${manager.telephone}`} className="info-value-link">{manager.telephone}</a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Informations professionnelles */}
                <div className="manager-info-section">
                    <h3>Informations professionnelles</h3>
                    <div className="info-grid">
                        {manager.service && (
                            <div className="info-item">
                                <div className="info-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                                    </svg>
                                </div>
                                <div className="info-details">
                                    <span className="info-label">Service</span>
                                    <span className="info-value">{manager.service}</span>
                                </div>
                            </div>
                        )}
                        {manager.poste && (
                            <div className="info-item">
                                <div className="info-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                    </svg>
                                </div>
                                <div className="info-details">
                                    <span className="info-label">Poste</span>
                                    <span className="info-value">{manager.poste}</span>
                                </div>
                            </div>
                        )}
                        <div className="info-item">
                            <div className="info-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                            <div className="info-details">
                                <span className="info-label">Équipe</span>
                                <span className="info-value">{manager.team_count || 0} employé(s)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Conseils */}
                <div className="manager-tips">
                    <div className="tips-header">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4M12 8h.01"/>
                        </svg>
                        <span>Conseils utiles</span>
                    </div>
                    <ul className="tips-list">
                        <li>Pour toute question sur vos congés, n'hésitez pas à contacter votre manager par email ou téléphone.</li>
                        <li>Les demandes de congé sont validées en 2 étapes (manager puis administrateur).</li>
                        <li>Vous serez notifié à chaque étape de validation.</li>
                        <li>Si vous avez besoin de changer de manager, contactez l'administrateur.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default ManagerProfile;