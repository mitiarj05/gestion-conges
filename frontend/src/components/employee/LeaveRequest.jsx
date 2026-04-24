// frontend/src/components/employee/LeaveRequest.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function LeaveRequest({ onSuccess }) {
    const [formData, setFormData] = useState({ type_id: 1, start_date: '', end_date: '', motif: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

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
        
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Vous n\'êtes pas authentifié. Veuillez vous reconnecter.');
            setLoading(false);
            navigate('/login');
            return;
        }
        
        try {
            const response = await axios.post('http://localhost:5000/api/leaves/request', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.status === 201) {
                alert('✅ Demande de congé envoyée !\n\nEn attente de validation par votre manager.\n\nVous pouvez modifier ou annuler votre demande tant qu\'elle n\'a pas été validée par le manager.');
                if (onSuccess) {
                    onSuccess();
                } else {
                    navigate('/dashboard/employee/requests');
                }
            }
        } catch (err) {
            console.error('Erreur:', err);
            if (err.response?.status === 401) {
                setError('Session expirée, veuillez vous reconnecter.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(err.response?.data?.message || 'Erreur lors de la demande');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>📅 Demander un congé</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit} className="admin-section">
                <div className="form-group">
                    <label>Type de congé</label>
                    <select className="form-input" value={formData.type_id} onChange={(e) => setFormData({...formData, type_id: parseInt(e.target.value)})}>
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
                                // Si la date de fin est antérieure à la nouvelle date de début, réinitialiser
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
                    <textarea className="form-input" rows="3" value={formData.motif} onChange={(e) => setFormData({...formData, motif: e.target.value})} placeholder="Précisez la raison de votre demande..." />
                </div>
                <div className="btn-group">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Envoi en cours...' : '📤 Envoyer la demande'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard/employee')}>
                        Annuler
                    </button>
                </div>
            </form>
            <div className="info-box" style={{ marginTop: '20px', background: '#e8f4fd' }}>
                <strong>ℹ️ Processus de validation en 2 étapes :</strong><br/>
                1️⃣ Votre manager valide la demande (1ère étape)<br/>
                2️⃣ L'administrateur valide définitivement (2ème étape)<br/>
                <strong>📝 Vous pouvez modifier ou annuler votre demande tant qu'elle est en attente de validation par le manager.</strong><br/>
                <strong>⚠️ Les dates de congé doivent être aujourd'hui ou dans le futur.</strong>
            </div>
        </div>
    );
}

export default LeaveRequest;