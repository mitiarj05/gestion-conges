// frontend/src/components/employee/PermissionRequest.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function PermissionRequest({ onSuccess }) {
    const [formData, setFormData] = useState({
        date_permission: '',
        heure_debut: '',
        heure_fin: '',
        duree_heures: 0,
        motif: ''
    });
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

    const calculateDuration = (debut, fin) => {
        if (!debut || !fin) return 0;
        const [hDebut, mDebut] = debut.split(':');
        const [hFin, mFin] = fin.split(':');
        const debutMinutes = parseInt(hDebut) * 60 + parseInt(mDebut);
        const finMinutes = parseInt(hFin) * 60 + parseInt(mFin);
        const diffMinutes = finMinutes - debutMinutes;
        return parseFloat((diffMinutes / 60).toFixed(1));
    };

    const handleTimeChange = (field, value) => {
        const newFormData = { ...formData, [field]: value };
        if (field === 'heure_debut' || field === 'heure_fin') {
            newFormData.duree_heures = calculateDuration(newFormData.heure_debut, newFormData.heure_fin);
        }
        setFormData(newFormData);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!formData.date_permission) {
            setError('Veuillez sélectionner une date');
            setLoading(false);
            return;
        }

        // Vérifier que la date n'est pas dans le passé
        const selectedDate = new Date(formData.date_permission);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            setError('La date de permission ne peut pas être dans le passé. Veuillez choisir une date à partir d\'aujourd\'hui.');
            setLoading(false);
            return;
        }

        if (!formData.heure_debut || !formData.heure_fin) {
            setError('Veuillez sélectionner les heures');
            setLoading(false);
            return;
        }

        if (formData.duree_heures <= 0) {
            setError('La durée de permission doit être positive');
            setLoading(false);
            return;
        }

        if (formData.duree_heures > 4) {
            setError('La durée de permission ne peut excéder 4 heures');
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
            const response = await axios.post('http://localhost:5000/api/leaves/permission-request', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status === 201) {
                alert('✅ Demande de permission envoyée !\n\nEn attente de validation par votre manager.');
                if (onSuccess) onSuccess();
                else navigate('/dashboard/employee');
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
            <h2>⏰ Demander une permission</h2>
            <div className="info-box" style={{ background: '#e8f4fd', marginBottom: '20px' }}>
                <strong>ℹ️ Règles :</strong><br/>
                • La permission permet de s'absenter quelques heures (max 4h par mois)<br/>
                • Une permission est validée en 2 étapes (manager puis admin)<br/>
                • Vous pouvez modifier ou annuler votre demande tant qu'elle n'est pas validée<br/>
                • ⚠️ Les dates de permission doivent être aujourd'hui ou dans le futur
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="admin-section">
                <div className="form-group">
                    <label>Date de la permission</label>
                    <input 
                        type="date" 
                        className="form-input" 
                        value={formData.date_permission} 
                        onChange={(e) => setFormData({...formData, date_permission: e.target.value})} 
                        min={todayDate}
                        required 
                    />
                    <small className="info-text">📅 Date à partir d'aujourd'hui uniquement</small>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Heure de début</label>
                        <input 
                            type="time" 
                            className="form-input" 
                            value={formData.heure_debut} 
                            onChange={(e) => handleTimeChange('heure_debut', e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>Heure de fin</label>
                        <input 
                            type="time" 
                            className="form-input" 
                            value={formData.heure_fin} 
                            onChange={(e) => handleTimeChange('heure_fin', e.target.value)} 
                            required 
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Durée calculée</label>
                    <div className="form-input" style={{ background: '#f0f0f0' }}>
                        {formData.duree_heures > 0 ? `${formData.duree_heures} heure(s)` : '--'}
                    </div>
                    {formData.duree_heures > 4 && (
                        <small className="error-message" style={{ display: 'block', marginTop: '5px' }}>
                            ⚠️ La durée dépasse 4 heures (maximum autorisé)
                        </small>
                    )}
                </div>

                <div className="form-group">
                    <label>Motif (optionnel)</label>
                    <textarea 
                        className="form-input" 
                        rows="3" 
                        value={formData.motif} 
                        onChange={(e) => setFormData({...formData, motif: e.target.value})} 
                        placeholder="Raison de la permission..."
                    />
                </div>

                <div className="btn-group">
                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={loading || formData.duree_heures > 4}
                    >
                        {loading ? 'Envoi en cours...' : '📤 Envoyer la demande'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard/employee')}>
                        Annuler
                    </button>
                </div>
            </form>
        </div>
    );
}

export default PermissionRequest;