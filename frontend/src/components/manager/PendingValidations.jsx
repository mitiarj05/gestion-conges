import React, { useState } from 'react';
import axios from 'axios';

function PendingValidations({ requests, onRefresh }) {
    const [processingId, setProcessingId] = useState(null);
    
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const handleApprove = async (id) => {
        if (window.confirm('✅ Valider cette demande (1ère étape) ?\n\nAprès validation, elle sera transmise à l\'administrateur pour validation finale.')) {
            setProcessingId(id);
            try {
                await axios.put(`http://localhost:5000/api/leaves/manager-approve/${id}`, {}, getAuthHeaders());
                alert('✅ Demande pré-approuvée !\n\nElle est maintenant en attente de validation finale par l\'administrateur.');
                if (onRefresh) onRefresh();
            } catch (error) {
                console.error('Erreur approbation:', error);
                alert('Erreur lors de l\'approbation: ' + (error.response?.data?.message || error.message));
            } finally {
                setProcessingId(null);
            }
        }
    };

    const handleReject = async (id) => {
        const motif = prompt('❌ Motif du refus :\n\nVeuillez indiquer la raison du refus (cette information sera communiquée à l\'employé)');
        if (motif !== null && motif.trim() !== '') {
            setProcessingId(id);
            try {
                await axios.put(`http://localhost:5000/api/leaves/manager-reject/${id}`, { motif }, getAuthHeaders());
                alert(`❌ Demande refusée.\n\nMotif : ${motif}\n\nL'employé a été notifié.`);
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

    if (requests.length === 0) {
        return (
            <div className="info-box" style={{ background: '#d4edda', borderLeftColor: '#28a745' }}>
                ✅ Aucune demande en attente de validation. Toutes les demandes ont été traitées.
            </div>
        );
    }

    return (
        <div>
            {requests.map(req => (
                <div key={req.id} className="request-item">
                    <div className="request-info">
                        <strong>👤 {req.prenom} {req.nom}</strong>
                        <small>📅 {req.date_debut} → {req.date_fin} • {req.type_name} • {req.nombre_jours} jours</small>
                        <small style={{ display: 'block' }}>📝 Motif : {req.motif || 'Non spécifié'}</small>
                        <small style={{ display: 'block', color: '#666' }}>⏳ En attente de votre validation (1ère étape)</small>
                    </div>
                    <div className="request-actions">
                        <button 
                            onClick={() => handleApprove(req.id)} 
                            className="btn btn-success btn-sm"
                            disabled={processingId === req.id}
                        >
                            {processingId === req.id ? '⏳...' : '✅ Approuver (1ère étape)'}
                        </button>
                        <button 
                            onClick={() => handleReject(req.id)} 
                            className="btn btn-danger btn-sm"
                            disabled={processingId === req.id}
                        >
                            ❌ Refuser
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default PendingValidations;