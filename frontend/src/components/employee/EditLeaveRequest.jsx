// frontend/src/components/employee/EditLeaveRequest.jsx
import React, { useState } from 'react';

function EditLeaveRequest({ request, onSave, onCancel }) {
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
        
        try {
            await onSave(formData);
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la modification');
        } finally {
            setLoading(false);
        }
    };

    if (!request) {
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
                        onChange={(e) => setFormData({...formData, type_id: parseInt(e.target.value)})}
                    >
                        <option value="1">🏖️ Congés Payés</option>
                        <option value="2">📅 Réduction du Temps de Travail (RTT)</option>
                        <option value="3">📝 Congé sans solde</option>
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
                            onChange={(e) => setFormData({...formData, end_date: e.target.value})} 
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
                
                <div className="form-group" style={{ marginTop: '15px', padding: '10px', background: '#f0f0f0', borderRadius: '8px' }}>
                    <strong>📋 Demande originale :</strong><br/>
                    Dates : {request.start_date} → {request.end_date}<br/>
                    Type : {request.type}<br/>
                    Motif : {request.motif || 'Non spécifié'}
                </div>
                
                <div className="btn-group" style={{ marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Enregistrement...' : '💾 Enregistrer les modifications'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>
                        Annuler
                    </button>
                </div>
            </form>
        </div>
    );
}

export default EditLeaveRequest;