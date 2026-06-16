// frontend/src/components/manager/PendingValidations.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';

function PendingValidations({ requests, onRefresh }) {
    const [processingId, setProcessingId] = useState(null);
    
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const handleApprove = async (id, request_type) => {
        const typeLabel = request_type === 'permission' ? 'permission' : 'congé';
        if (window.confirm(`✅ Valider cette demande de ${typeLabel} (1ère étape) ?\n\nAprès validation, elle sera transmise à l'administrateur pour validation finale.`)) {
            setProcessingId(id);
            try {
                await axios.put(`${API_URL}/leaves/manager-approve/${id}`, 
                    { request_type },
                    getAuthHeaders()
                );
                alert(`✅ Demande de ${typeLabel} pré-approuvée !\n\nElle est maintenant en attente de validation finale par l'administrateur.`);
                if (onRefresh) onRefresh();
            } catch (error) {
                console.error('Erreur approbation:', error);
                alert('Erreur lors de l\'approbation: ' + (error.response?.data?.message || error.message));
            } finally {
                setProcessingId(null);
            }
        }
    };

    const handleReject = async (id, request_type) => {
        const typeLabel = request_type === 'permission' ? 'permission' : 'congé';
        const motif = prompt(`❌ Motif du refus de la ${typeLabel} :\n\nVeuillez indiquer la raison du refus (cette information sera communiquée à l'employé)`);
        if (motif !== null && motif.trim() !== '') {
            setProcessingId(id);
            try {
                await axios.put(`${API_URL}/leaves/manager-reject/${id}`, 
                    { motif, request_type },
                    getAuthHeaders()
                );
                alert(`❌ Demande de ${typeLabel} refusée.\n\nMotif : ${motif}\n\nL'employé a été notifié.`);
                if (onRefresh) onRefresh();
            } catch (error) {
                console.error('Erreur rejet:', error);
                alert('Erreur lors du refus: ' + (error.response?.data?.message || error.message));
            } finally {
                setProcessingId(null);
            }
        } else if (motif !== null && motif.trim() === '') {
            alert('Veuillez fournir un motif de refus');
        }
    };

    const getDisplayInfo = (req) => {
        const isPermission = req.isPermission || req.type_conge_id === 3 || req.request_type === 'permission';
        
        if (isPermission) {
            return {
                dates: `📅 ${req.date_permission || req.date_debut}`,
                duration: `⏰ ${req.duree_heures || req.nombre_jours || 0} heure(s)`,
                type: '⏰ Permission',
                details: req.est_demi_journee ? ' (Demi-journée)' : ''
            };
        }
        return {
            dates: `📅 ${req.date_debut} → ${req.date_fin}`,
            duration: `📊 ${req.nombre_jours || 0} jours`,
            type: req.type_name || 'Congé',
            details: ''
        };
    };

    if (!Array.isArray(requests) || requests.length === 0) {
        return (
            <div className="empty-state-card">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                <p>Aucune demande en attente</p>
                <span>Toutes les demandes ont été traitées</span>
            </div>
        );
    }

    return (
        <div className="requests-list-modern">
            {requests.map(req => {
                const info = getDisplayInfo(req);
                const isPermission = req.isPermission || req.type_conge_id === 3 || req.request_type === 'permission';
                
                return (
                    <div key={`${req.request_type}-${req.id}`} className="request-card">
                        <div className="request-card-info">
                            <div className="request-employee">
                                <div className="employee-avatar" style={{ background: isPermission ? '#f59e0b' : '#667eea' }}>
                                    {req.prenom?.charAt(0)}{req.nom?.charAt(0)}
                                </div>
                                <div>
                                    <div className="employee-name">{req.prenom} {req.nom}</div>
                                    <div className="request-details">
                                        {info.dates} • {info.type} • {info.duration}
                                        {info.details}
                                    </div>
                                    {req.motif && (
                                        <div className="request-motive">
                                            📝 Motif : {req.motif}
                                        </div>
                                    )}
                                    {isPermission && (
                                        <div className="request-type-badge" style={{ 
                                            display: 'inline-block',
                                            background: '#fef3c7', 
                                            color: '#92400e',
                                            padding: '2px 10px',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            marginTop: '6px'
                                        }}>
                                            ⏰ Permission
                                        </div>
                                    )}
                                    <div className="request-status-info" style={{ color: '#f59e0b', fontSize: '12px', marginTop: '6px' }}>
                                        ⏳ En attente de votre validation (1ère étape)
                                    </div>
                                    <div className="request-process-info" style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                                        Après validation, la demande sera transmise à l'administrateur
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="request-card-actions">
                            <button 
                                onClick={() => handleApprove(req.id, req.request_type)} 
                                className="btn-approve"
                                disabled={processingId === req.id}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5"/>
                                </svg>
                                {processingId === req.id ? '...' : 'Approuver'}
                            </button>
                            <button 
                                onClick={() => handleReject(req.id, req.request_type)} 
                                className="btn-reject"
                                disabled={processingId === req.id}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                                Refuser
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default PendingValidations;