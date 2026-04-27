// frontend/src/components/manager/PendingValidations.jsx
import React, { useState } from 'react';
import axios from 'axios';

function PendingValidations({ requests, onRefresh }) {
    const [processingId, setProcessingId] = useState(null);
    
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const handleApprove = async (id, request_type) => {
        const typeLabel = request_type === 'permission' ? 'permission' : 'congé';
        if (window.confirm(`✅ Valider cette demande de ${typeLabel} (1ère étape) ?\n\nAprès validation, elle sera transmise à l'administrateur pour validation finale.`)) {
            setProcessingId(id);
            try {
                await axios.put(`http://localhost:5000/api/leaves/manager-approve/${id}`, 
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
                await axios.put(`http://localhost:5000/api/leaves/manager-reject/${id}`, 
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
        if (req.request_type === 'permission') {
            return {
                dates: `${req.date_permission || req.date_debut}`,
                duration: `${req.duree_heures || req.nombre_jours} heures`,
                type: '⏰ Permission'
            };
        }
        return {
            dates: `${req.date_debut} → ${req.date_fin}`,
            duration: `${req.nombre_jours} jours`,
            type: req.type_name
        };
    };

    if (requests.length === 0) {
        return (
            <div className="info-box" style={{ background: '#d4edda', borderLeftColor: '#28a745' }}>
                ✅ Aucune demande en attente de validation. Toutes les demandes ont été traitées.
            </div>
        );
    }

    return (
        <div>
            {requests.map(req => {
                const info = getDisplayInfo(req);
                return (
                    <div key={`${req.request_type}-${req.id}`} className="request-item">
                        <div className="request-info">
                            <strong>👤 {req.prenom} {req.nom}</strong>
                            <small>📅 {info.dates} • {info.type} • {info.duration}</small>
                            <small style={{ display: 'block' }}>📝 Motif : {req.motif || 'Non spécifié'}</small>
                            <small style={{ display: 'block', color: '#666' }}>
                                ⏳ En attente de votre validation (1ère étape)
                                {req.request_type === 'permission' && ' - Permission horaire'}
                            </small>
                        </div>
                        <div className="request-actions">
                            <button 
                                onClick={() => handleApprove(req.id, req.request_type)} 
                                className="btn btn-success btn-sm"
                                disabled={processingId === req.id}
                            >
                                {processingId === req.id ? '⏳...' : `✅ Approuver (1ère étape)`}
                            </button>
                            <button 
                                onClick={() => handleReject(req.id, req.request_type)} 
                                className="btn btn-danger btn-sm"
                                disabled={processingId === req.id}
                            >
                                ❌ Refuser
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default PendingValidations;