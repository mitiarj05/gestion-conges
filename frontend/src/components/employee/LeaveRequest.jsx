// frontend/src/components/employee/LeaveRequest.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config/api';

function LeaveRequest({ onSuccess }) {
    const [formData, setFormData] = useState({ 
        type_id: 1, 
        start_date: '', 
        end_date: '', 
        motif: '',
        request_type: 'conges',
        date_permission: '',
        duree_heures: 1,
        est_demi_journee: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errorsList, setErrorsList] = useState([]);
    const navigate = useNavigate();

    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayDate = getTodayDate();

    const getMinPermissionDate = () => {
        const date = new Date();
        date.setHours(date.getHours() + 24);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const minPermissionDate = getMinPermissionDate();

    // ============ ICÔNES SIMPLES ET ROBUSTES ============

    // Icône Congé (calendrier)
    const IconConges = () => (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
    );

    // Icône Permission (horloge)
    const IconPermission = () => (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    );

    // Icône pour le bouton d'envoi
    const IconSend = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
        </svg>
    );

    // Icône pour le bouton annuler
    const IconCancel = () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"></path>
        </svg>
    );

    // Icône pour l'info
    const IconInfo = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setErrorsList([]);

        if (formData.request_type === 'permission') {
            if (!formData.date_permission) {
                setError('Veuillez sélectionner la date de la permission');
                setLoading(false);
                return;
            }

            const permDate = new Date(formData.date_permission);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (permDate < today) {
                setError('La date de permission ne peut pas être dans le passé');
                setLoading(false);
                return;
            }

            if (!formData.duree_heures || formData.duree_heures <= 0) {
                setError('Veuillez saisir une durée valide');
                setLoading(false);
                return;
            }

            if (formData.duree_heures > 4) {
                setError('La permission ne peut pas dépasser 4 heures');
                setLoading(false);
                return;
            }
        } else {
            if (!formData.start_date || !formData.end_date) {
                setError('Veuillez sélectionner les dates');
                setLoading(false);
                return;
            }

            const start = new Date(formData.start_date);
            const end = new Date(formData.end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (start < today) {
                setError('La date de début ne peut pas être dans le passé');
                setLoading(false);
                return;
            }

            if (start > end) {
                setError('La date de début doit être antérieure à la date de fin');
                setLoading(false);
                return;
            }
        }

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Vous n\'êtes pas authentifié');
            setLoading(false);
            navigate('/login');
            return;
        }

        try {
            let response;
            
            if (formData.request_type === 'permission') {
                response = await axios.post(`${API_URL}/leaves/permission-request`, {
                    date_permission: formData.date_permission,
                    duree_heures: parseFloat(formData.duree_heures),
                    est_demi_journee: formData.est_demi_journee,
                    motif: formData.motif
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                response = await axios.post(`${API_URL}/leaves/request`, {
                    type_id: parseInt(formData.type_id),
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    motif: formData.motif
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            if (response.status === 201) {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const userRoles = user.roles || [];
                const isManager = userRoles.includes('manager');
                const isAdmin = userRoles.includes('admin');

                let message = '';
                if (formData.request_type === 'permission') {
                    if (isManager || isAdmin) {
                        message = '✅ Votre demande de permission a été envoyée !\n\n' +
                                  '📋 Elle est en attente de validation par l\'administrateur.\n\n' +
                                  '📧 Vous recevrez une notification une fois qu\'elle sera traitée.\n\n' +
                                  '💡 Vous pouvez suivre l\'état de votre demande dans "Mes demandes".';
                    } else {
                        message = '✅ Demande de permission envoyée !\n\n' +
                                  `📅 Date : ${formData.date_permission}\n` +
                                  `⏰ Durée : ${formData.duree_heures} heure(s)\n\n` +
                                  '📋 En attente de validation par votre manager.\n\n' +
                                  '📧 Vous recevrez une notification à chaque étape.';
                    }
                } else {
                    if (isManager || isAdmin) {
                        message = '✅ Votre demande de congé a été envoyée !\n\n' +
                                  '📋 Elle est en attente de validation par l\'administrateur.\n\n' +
                                  '📧 Vous recevrez une notification par email une fois qu\'elle sera traitée.\n\n' +
                                  '💡 Vous pouvez suivre l\'état de votre demande dans "Mes demandes".';
                    } else {
                        message = formData.type_id === 1 
                            ? '✅ Demande de congés payés envoyée !'
                            : '✅ Demande de congé sans solde envoyée (non rémunéré)';
                        message += '\n\n📋 En attente de validation par votre manager.\n\n' +
                                  '✏️ Vous pouvez modifier ou annuler votre demande tant qu\'elle n\'a pas été validée.\n\n' +
                                  '📧 Vous recevrez une notification par email à chaque étape.';
                    }
                }
                alert(message);
                if (onSuccess) onSuccess();
                else navigate('/dashboard/employee/requests');
            }
        } catch (err) {
            console.error('Erreur:', err);
            if (err.response?.status === 401) {
                setError('Session expirée, veuillez vous reconnecter.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setTimeout(() => navigate('/login'), 2000);
            } else if (err.response?.data?.errors) {
                setErrorsList(err.response.data.errors);
                setError('Veuillez corriger les erreurs suivantes :');
            } else {
                setError(err.response?.data?.message || 'Erreur lors de la demande');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            type_id: 1,
            start_date: '',
            end_date: '',
            motif: '',
            request_type: 'conges',
            date_permission: '',
            duree_heures: 1,
            est_demi_journee: false
        });
        setError('');
        setErrorsList([]);
    };

    return (
        <div className="leave-request-container">
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Nouvelle demande</h1>
                    <p className="dashboard-subtitle">Choisissez le type de demande que vous souhaitez effectuer</p>
                </div>
            </div>

            {/* Sélecteur de type de demande avec icônes */}
            <div className="request-type-selector">
                <button
                    type="button"
                    className={`request-type-btn ${formData.request_type === 'conges' ? 'active' : ''}`}
                    onClick={() => {
                        resetForm();
                        setFormData(prev => ({ ...prev, request_type: 'conges' }));
                    }}
                >
                    <span className="request-type-icon"><IconConges /></span>
                    <div className="request-type-content">
                        <span className="request-type-label">Congé</span>
                        <span className="request-type-subtitle">CP ou Sans solde</span>
                    </div>
                </button>
                <button
                    type="button"
                    className={`request-type-btn ${formData.request_type === 'permission' ? 'active' : ''}`}
                    onClick={() => {
                        resetForm();
                        setFormData(prev => ({ ...prev, request_type: 'permission' }));
                    }}
                >
                    <span className="request-type-icon"><IconPermission /></span>
                    <div className="request-type-content">
                        <span className="request-type-label">Permission</span>
                        <span className="request-type-subtitle">Max 4h · 2 par mois</span>
                    </div>
                </button>
            </div>

            {/* Formulaire de congé */}
            {formData.request_type === 'conges' && (
                <>
                    <div className="info-box rules-box">
                        <strong>Règles selon le type de congé :</strong><br/>
                        {formData.type_id === 1 && (
                            <>
                                • <strong>Congés Payés</strong> : 25 jours/an, max 20 jours consécutifs<br/>
                                • Préavis minimum : 2 jours<br/>
                                • Rémunéré : <strong className="text-success">Oui</strong>
                            </>
                        )}
                        {formData.type_id === 2 && (
                            <>
                                • <strong>Congé sans solde</strong> : Pas de limite annuelle, max 5 jours consécutifs<br/>
                                • Préavis minimum : 1 jour<br/>
                                • Rémunéré : <strong className="text-danger">Non</strong>
                            </>
                        )}
                        <br/>
                        • Délai minimum entre deux demandes : 7 jours<br/>
                        • Dates à partir d'aujourd'hui uniquement
                    </div>

                    <form onSubmit={handleSubmit} className="admin-section leave-request-form">
                        {error && <div className="error-message">{error}</div>}

                        {errorsList.length > 0 && (
                            <div className="error-message">
                                <strong>{errorsList.length} règle(s) non respectée(s) :</strong>
                                <ul style={{ marginTop: '10px', marginLeft: '20px' }}>
                                    {errorsList.map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Type de congé</label>
                            <select 
                                className="form-input" 
                                value={formData.type_id} 
                                onChange={(e) => {
                                    setFormData({...formData, type_id: parseInt(e.target.value)});
                                    setErrorsList([]);
                                    setError('');
                                }}
                            >
                                <option value="1">Congés Payés (25j/an - Rémunéré)</option>
                                <option value="2">Congé sans solde (Non rémunéré - 5j max)</option>
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Date de début</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={formData.start_date} 
                                    onChange={(e) => {
                                        setFormData({...formData, start_date: e.target.value});
                                        if (formData.end_date && new Date(e.target.value) > new Date(formData.end_date)) {
                                            setFormData(prev => ({...prev, end_date: ''}));
                                        }
                                        setErrorsList([]);
                                        setError('');
                                    }} 
                                    min={todayDate}
                                    required 
                                />
                                <small className="info-text">Date à partir d'aujourd'hui uniquement</small>
                            </div>
                            <div className="form-group">
                                <label>Date de fin</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={formData.end_date} 
                                    onChange={(e) => {
                                        setFormData({...formData, end_date: e.target.value});
                                        setErrorsList([]);
                                        setError('');
                                    }} 
                                    min={formData.start_date || todayDate}
                                    required 
                                />
                                <small className="info-text">Doit être après ou égale à la date de début</small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Motif (optionnel)</label>
                            <textarea 
                                className="form-input" 
                                rows="3" 
                                value={formData.motif} 
                                onChange={(e) => setFormData({...formData, motif: e.target.value})} 
                                placeholder="Précisez la raison de votre demande..."
                            />
                        </div>

                        {formData.type_id === 2 && (
                            <div className="info-box warning-box">
                                Attention : Le congé sans solde n'est <strong>PAS RÉMUNÉRÉ</strong>. 
                                Votre salaire sera diminué proportionnellement aux jours d'absence.
                            </div>
                        )}

                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading}>
                                <IconSend />
                                {loading ? 'Envoi en cours...' : 'Envoyer la demande de congé'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard/employee')}>
                                <IconCancel />
                                Annuler
                            </button>
                        </div>
                    </form>
                </>
            )}

            {/* Formulaire de permission */}
            {formData.request_type === 'permission' && (
                <>
                    <div className="info-box rules-box permission-rules">
                        <strong>Règles pour les permissions :</strong><br/>
                        • Durée maximale : <strong>4 heures</strong><br/>
                        • Maximum : <strong>2 permissions par mois</strong><br/>
                        • Préavis minimum : <strong>24 heures</strong><br/>
                        • Rémunéré : <strong className="text-success">Oui</strong><br/>
                        • Pas de limite annuelle
                    </div>

                    <form onSubmit={handleSubmit} className="admin-section leave-request-form permission-form">
                        {error && <div className="error-message">{error}</div>}

                        {errorsList.length > 0 && (
                            <div className="error-message">
                                <strong>{errorsList.length} règle(s) non respectée(s) :</strong>
                                <ul style={{ marginTop: '10px', marginLeft: '20px' }}>
                                    {errorsList.map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Date de la permission <span className="required">*</span></label>
                            <input 
                                type="date" 
                                className="form-input" 
                                value={formData.date_permission} 
                                onChange={(e) => {
                                    setFormData({...formData, date_permission: e.target.value});
                                    setErrorsList([]);
                                    setError('');
                                }} 
                                min={minPermissionDate}
                                required 
                            />
                            <small className="info-text">
                                Préavis minimum : 24h (date à partir du {minPermissionDate})
                            </small>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Durée (heures) <span className="required">*</span></label>
                                <select 
                                    className="form-input" 
                                    value={formData.duree_heures} 
                                    onChange={(e) => {
                                        setFormData({...formData, duree_heures: parseFloat(e.target.value)});
                                        setErrorsList([]);
                                        setError('');
                                    }}
                                    required
                                >
                                    <option value="0.5">0.5 heure (30 min)</option>
                                    <option value="1">1 heure</option>
                                    <option value="1.5">1.5 heures</option>
                                    <option value="2">2 heures</option>
                                    <option value="2.5">2.5 heures</option>
                                    <option value="3">3 heures</option>
                                    <option value="3.5">3.5 heures</option>
                                    <option value="4">4 heures (maximum)</option>
                                </select>
                                <small className="info-text">Maximum 4 heures par permission</small>
                            </div>
                            <div className="form-group">
                                <label>Demi-journée</label>
                                <div className="checkbox-wrapper">
                                    <label className="checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.est_demi_journee} 
                                            onChange={(e) => setFormData({...formData, est_demi_journee: e.target.checked})}
                                        />
                                        <span className="checkbox-text">Demi-journée (matin ou après-midi)</span>
                                    </label>
                                </div>
                                <small className="info-text">Cochez si la permission concerne une demi-journée</small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Motif (optionnel)</label>
                            <textarea 
                                className="form-input" 
                                rows="3" 
                                value={formData.motif} 
                                onChange={(e) => setFormData({...formData, motif: e.target.value})} 
                                placeholder="Précisez la raison de votre permission..."
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading}>
                                <IconSend />
                                {loading ? 'Envoi en cours...' : 'Envoyer la demande de permission'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard/employee')}>
                                <IconCancel />
                                Annuler
                            </button>
                        </div>
                    </form>
                </>
            )}

            <div className="info-card-tip">
                <div className="tip-icon">
                    <IconInfo />
                </div>
                <div className="tip-content">
                    <strong>Processus de validation :</strong><br/>
                    • <strong>Employé :</strong> Manager → Administrateur<br/>
                    • <strong>Manager / Admin :</strong> Directement administrateur<br/>
                    • Vous pouvez modifier ou annuler votre demande tant qu'elle n'a pas été validée par l'étape suivante.
                </div>
            </div>
        </div>
    );
}

export default LeaveRequest;