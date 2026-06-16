// frontend/src/components/employee/EditLeaveRequest.jsx
import React, { useState } from 'react';

function EditLeaveRequest({ request, onSave, onCancel }) {
    console.log('=== EditLeaveRequest RENDU ===');
    console.log('Request reçue:', request);

    const isPermission = request?.isPermission || request?.type_id === 3 || request?.request_type === 'permission';

    const [formData, setFormData] = useState({
        type_id: request?.type_id || 1,
        start_date: request?.start_date || '',
        end_date: request?.end_date || '',
        date_permission: request?.date_permission || '',
        duree_heures: request?.duree_heures || 1,
        est_demi_journee: request?.est_demi_journee || false,
        motif: request?.motif || '',
        isPermission: isPermission
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        console.log('=== SOUMISSION FORMULAIRE MODIFICATION ===');
        console.log('formData:', formData);
        
        if (formData.isPermission) {
            if (!formData.date_permission) {
                setError('Veuillez sélectionner la date de la permission');
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
                setError('La date de début ne peut pas être dans le passé.');
                setLoading(false);
                return;
            }
            
            if (start > end) {
                setError('La date de début doit être antérieure à la date de fin');
                setLoading(false);
                return;
            }
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

    const getTypeLabel = (typeId) => {
        switch(parseInt(typeId)) {
            case 1: return '🏖️ Congés Payés (CP)';
            case 2: return '📝 Congé sans solde';
            case 3: return '⏰ Permission';
            default: return 'Congés Payés';
        }
    };

    return (
        <div>
            <h3>✏️ Modifier ma demande</h3>
            
            {isPermission ? (
                <div className="info-box" style={{ background: '#fef3c7', marginBottom: '20px', fontSize: '12px' }}>
                    <strong>⚠️ Modification d'une permission :</strong><br/>
                    • Vous modifiez une permission en attente de validation.<br/>
                    • Après modification, votre manager devra la revalider.<br/>
                    • ⚠️ La date doit être aujourd'hui ou dans le futur (préavis 24h).
                </div>
            ) : (
                <div className="info-box" style={{ background: '#fff3cd', marginBottom: '20px', fontSize: '12px' }}>
                    <strong>⚠️ Information importante :</strong><br/>
                    • Vous modifiez une demande en attente de validation par votre manager.<br/>
                    • Après modification, votre manager devra la revalider.<br/>
                    • Le manager recevra une notification du changement.<br/>
                    • ⚠️ Les dates doivent être aujourd'hui ou dans le futur.
                </div>
            )}
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
                {!isPermission && (
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
                            <option value="2">📝 Congé sans solde</option>
                        </select>
                    </div>
                )}

                {!isPermission && (
                    <>
                        <div className="info-box" style={{ background: '#e8f4fd', marginBottom: '15px', fontSize: '12px' }}>
                            <strong>📋 Règles pour {getTypeLabel(formData.type_id)} :</strong><br/>
                            {formData.type_id === 1 && (
                                <>• Max 20 jours consécutifs<br/>• Préavis minimum : 2 jours<br/>• Rémunéré : Oui</>
                            )}
                            {formData.type_id === 2 && (
                                <>• Max 5 jours consécutifs<br/>• Préavis minimum : 1 jour<br/>• Rémunéré : Non</>
                            )}
                            <br/>• Délai minimum entre deux demandes : 7 jours
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
                    </>
                )}

                {isPermission && (
                    <>
                        <div className="info-box" style={{ background: '#e8f4fd', marginBottom: '15px', fontSize: '12px' }}>
                            <strong>📋 Règles pour les permissions :</strong><br/>
                            • Max 4 heures<br/>
                            • Préavis minimum : 24h<br/>
                            • Rémunéré : Oui<br/>
                            • Max 2 permissions par mois
                        </div>

                        <div className="form-group">
                            <label>Date de la permission</label>
                            <input 
                                type="date" 
                                className="form-input" 
                                value={formData.date_permission} 
                                onChange={(e) => {
                                    console.log('Date permission changée:', e.target.value);
                                    setFormData({...formData, date_permission: e.target.value});
                                }} 
                                min={minPermissionDate}
                                required 
                            />
                            <small className="info-text">⏰ Préavis minimum : 24h</small>
                        </div>

                        <div className="form-group">
                            <label>Durée (heures)</label>
                            <select 
                                className="form-input" 
                                value={formData.duree_heures} 
                                onChange={(e) => {
                                    setFormData({...formData, duree_heures: parseFloat(e.target.value)});
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
                                <option value="4">4 heures (max)</option>
                            </select>
                            <small className="info-text">⏰ Maximum 4 heures par permission</small>
                        </div>

                        <div className="form-group">
                            <label>Demi-journée</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.est_demi_journee} 
                                        onChange={(e) => setFormData({...formData, est_demi_journee: e.target.checked})}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '14px', color: '#475569' }}>Demi-journée (matin ou après-midi)</span>
                                </label>
                            </div>
                            <small className="info-text">📋 Cochez si la permission concerne une demi-journée</small>
                        </div>
                    </>
                )}
                
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