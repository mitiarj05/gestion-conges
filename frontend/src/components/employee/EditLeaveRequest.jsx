// frontend/src/components/employee/EditLeaveRequest.jsx
import React, { useState } from 'react';

function EditLeaveRequest({ request, onSave, onCancel }) {
    console.log('=== EditLeaveRequest RENDU ===');
    console.log('Request reçue:', request);

    const [formData, setFormData] = useState({
        type_id: request?.type_id || 1,
        start_date: request?.start_date || '',
        end_date: request?.end_date || '',
        motif: request?.motif || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayDate = getTodayDate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        console.log('=== SOUMISSION FORMULAIRE ===');
        console.log('formData:', formData);
        
        if (!formData.start_date || !formData.end_date) {
            setError('Veuillez sélectionner les dates');
            setLoading(false);
            return;
        }
        
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Vérifier que la date de début n'est pas dans le passé
        if (start < today) {
            setError('La date de début ne peut pas être dans le passé. Veuillez choisir une date à partir d\'aujourd\'hui.');
            setLoading(false);
            return;
        }
        
        if (start > end) {
            setError('La date de début doit être antérieure à la date de fin');
            setLoading(false);
            return;
        }
        
        console.log('Appel de onSave avec:', formData);
        
        try {
            await onSave(formData);
        } catch (err) {
            console.error('Erreur dans handleSubmit:', err);
            setError(err.response?.data?.message || 'Erreur lors de la modification');
        } finally {
            setLoading(false);
        }
    };

    if (!request) {
        console.log('Aucune request fournie à EditLeaveRequest');
        return (
            <div>
                <h3>📝 Modifier une demande</h3>
                <div className="error-message">Aucune demande sélectionnée</div>
                <div className="btn-group">
                    <button className="btn btn-secondary" onClick={onCancel}>Fermer</button>
                </div>
            </div>
        );
    }

    // Déterminer le label du type
    const getTypeLabel = (typeId) => {
        switch(parseInt(typeId)) {
            case 1: return '🏖️ Congés Payés (CP)';
            case 2: return '⚡ Réduction du Temps de Travail (RTT)';
            case 3: return '📝 Congé sans solde';
            default: return 'Congés Payés';
        }
    };

    return (
        <div>
            <h3>✏️ Modifier ma demande de congé</h3>
            
            <div className="info-box" style={{ background: '#fff3cd', marginBottom: '20px', fontSize: '12px' }}>
                <strong>⚠️ Information importante :</strong><br/>
                • Vous modifiez une demande en attente de validation par votre manager.<br/>
                • Après modification, votre manager devra la revalider.<br/>
                • Le manager recevra une notification du changement.<br/>
                • ⚠️ Les dates doivent être aujourd'hui ou dans le futur.
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Type de congé</label>
                    <select 
                        className="form-input" 
                        value={formData.type_id} 
                        onChange={(e) => {
                            const newTypeId = parseInt(e.target.value);
                            console.log('Type changé à:', newTypeId);
                            setFormData({...formData, type_id: newTypeId});
                        }}
                    >
                        <option value="1">🏖️ Congés Payés</option>
                        <option value="2">📅 Réduction du Temps de Travail (RTT)</option>
                        <option value="3">📝 Congé sans solde</option>
                    </select>
                </div>
                
                {/* Affichage des règles selon le type */}
                <div className="info-box" style={{ background: '#e8f4fd', marginBottom: '15px', fontSize: '12px' }}>
                    <strong>📋 Règles pour {getTypeLabel(formData.type_id)} :</strong><br/>
                    {formData.type_id === 1 && (
                        <>• Max 20 jours consécutifs<br/>• Préavis minimum : 2 jours<br/>• Rémunéré : Oui</>
                    )}
                    {formData.type_id === 2 && (
                        <>• Max 10 jours consécutifs<br/>• Préavis minimum : 1 jour<br/>• Rémunéré : Oui</>
                    )}
                    {formData.type_id === 3 && (
                        <>• Max 5 jours consécutifs<br/>• Préavis minimum : 5 jours<br/>• Rémunéré : Non</>
                    )}
                    <br/>• ⚠️ Délai minimum entre deux demandes : 7 jours
                </div>
                
                <div className="form-row">
                    <div className="form-group">
                        <label>Date de début</label>
                        <input 
                            type="date" 
                            className="form-input" 
                            value={formData.start_date} 
                            onChange={(e) => {
                                console.log('Date début changée:', e.target.value);
                                setFormData({...formData, start_date: e.target.value});
                                if (formData.end_date && new Date(e.target.value) > new Date(formData.end_date)) {
                                    setFormData(prev => ({...prev, end_date: ''}));
                                }
                            }} 
                            min={todayDate}
                            required 
                        />
                        <small className="info-text">📅 Date à partir d'aujourd'hui uniquement</small>
                    </div>
                    <div className="form-group">
                        <label>Date de fin</label>
                        <input 
                            type="date" 
                            className="form-input" 
                            value={formData.end_date} 
                            onChange={(e) => {
                                console.log('Date fin changée:', e.target.value);
                                setFormData({...formData, end_date: e.target.value});
                            }} 
                            min={formData.start_date || todayDate}
                            required 
                        />
                        <small className="info-text">📅 Doit être après ou égale à la date de début</small>
                    </div>
                </div>
                
                <div className="form-group">
                    <label>Motif (optionnel)</label>
                    <textarea 
                        className="form-input" 
                        rows="2" 
                        value={formData.motif} 
                        onChange={(e) => setFormData({...formData, motif: e.target.value})} 
                        placeholder="Précisez la raison de votre demande..."
                    />
                </div>
                
                {request && (
                    <div className="form-group" style={{ marginTop: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '8px' }}>
                        <strong>📋 Demande originale :</strong><br/>
                        Dates : {request.start_date} → {request.end_date}<br/>
                        Type : {request.type || getTypeLabel(request.type_id)}<br/>
                        Motif : {request.motif || 'Non spécifié'}
                    </div>
                )}
                
                <div className="btn-group" style={{ marginTop: '20px' }}>
                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={loading}
                    >
                        {loading ? '⏳ Enregistrement...' : '💾 Enregistrer les modifications'}
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={(e) => {
                            e.preventDefault();
                            console.log('Clic sur Annuler');
                            onCancel();
                        }}
                    >
                        Annuler
                    </button>
                </div>
            </form>
        </div>
    );
}

export default EditLeaveRequest;