// frontend/src/components/employee/LeaveRequest.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function LeaveRequest({ onSuccess }) {
    const [formData, setFormData] = useState({ 
        type_id: 1, 
        start_date: '', 
        end_date: '', 
        motif: '' 
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setErrorsList([]);
        
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
        
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Vous n\'êtes pas authentifié');
            setLoading(false);
            navigate('/login');
            return;
        }
        
        try {
            const response = await axios.post('http://localhost:5000/api/leaves/request', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 201) {
                const message = formData.type_id === 1 
                    ? 'Demande de congés payés envoyée !'
                    : 'Demande de congé sans solde envoyée (non rémunéré)';
                alert(message + '\n\nEn attente de validation par votre manager.\n\nVous pouvez modifier ou annuler votre demande tant qu\'elle n\'a pas été validée.');
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

    return (
        <div>
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Demander un congé</h1>
                    <p className="dashboard-subtitle">Soumettez une nouvelle demande de congé</p>
                </div>
            </div>
            
            <div className="info-box" style={{ background: '#e8f4fd', marginBottom: '20px' }}>
                <strong>Règles selon le type de congé :</strong><br/>
                {formData.type_id === 1 && (
                    <>
                        • <strong>Congés Payés</strong> : 25 jours/an, max 20 jours consécutifs<br/>
                        • Préavis minimum : 2 jours<br/>
                        • Rémunéré : <strong style={{ color: '#28a745' }}>Oui</strong>
                    </>
                )}
                {formData.type_id === 2 && (
                    <>
                        • <strong>Congé sans solde</strong> : Pas de limite annuelle, max 5 jours consécutifs<br/>
                        • Préavis minimum : 1 jour<br/>
                        • Rémunéré : <strong style={{ color: '#dc3545' }}>Non</strong>
                    </>
                )}
                <br/>
                • Délai minimum entre deux demandes : 7 jours<br/>
                • Dates à partir d'aujourd'hui uniquement
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            {errorsList.length > 0 && (
                <div className="error-message" style={{ background: '#f8d7da', borderLeftColor: '#dc3545' }}>
                    <strong>{errorsList.length} règle(s) non respectée(s) :</strong>
                    <ul style={{ marginTop: '10px', marginLeft: '20px' }}>
                        {errorsList.map((err, idx) => (
                            <li key={idx}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="admin-section" style={{ maxWidth: '600px' }}>
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
                        <small className="info-text">📅 Date à partir d'aujourd'hui uniquement</small>
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
                        <small className="info-text">📅 Doit être après ou égale à la date de début</small>
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
                    <div className="info-box" style={{ background: '#fff3cd', borderLeftColor: '#ffc107', marginBottom: '15px' }}>
                        Attention : Le congé sans solde n'est <strong>PAS RÉMUNÉRÉ</strong>. 
                        Votre salaire sera diminué proportionnellement aux jours d'absence.
                    </div>
                )}
                
                <div className="payroll-actions" style={{ marginTop: '20px' }}>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                        </svg>
                        {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard/employee')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        Annuler
                    </button>
                </div>
            </form>
            
            <div className="info-card-tip">
                <div className="tip-icon">ℹ️</div>
                <div className="tip-content">
                    <strong>Processus de validation en 2 étapes :</strong><br/>
                    1ère étape : Votre manager valide la demande<br/>
                    2ème étape : L'administrateur valide définitivement<br/>
                    <strong>Vous pouvez modifier ou annuler votre demande tant qu'elle est en attente de validation par le manager.</strong>
                </div>
            </div>
        </div>
    );
}

export default LeaveRequest;