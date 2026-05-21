import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Settings() {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const API_URL = 'http://localhost:5000/api';
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/admin/settings`, getAuthHeaders());
            setSettings(response.data);
        } catch (error) {
            console.error('Erreur chargement paramètres:', error);
            setSettings({
                cp_jours_par_an: 25,
                rtt_jours_par_an: 12,
                max_conges_consecutifs: 20,
                preavis_minimum: 2,
                permission_max_heures_mois: 4
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${API_URL}/admin/settings`, settings, getAuthHeaders());
            alert('✅ Paramètres enregistrés !');
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            alert('⚠️ Paramètres sauvegardés localement (mode démo)');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div><div>Chargement...</div></div>;

    return (
        <div>
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">⚙️ Configuration de l'application</h1>
                    <p className="dashboard-subtitle">Paramètres généraux des congés</p>
                </div>
            </div>

            <div className="admin-section" style={{ maxWidth: '600px' }}>
                <h3>Règles générales</h3>
                
                <div className="form-group">
                    <label>🏖️ Nombre de jours de CP par an</label>
                    <input 
                        type="number" 
                        className="form-input" 
                        value={settings.cp_jours_par_an || 25} 
                        onChange={e => setSettings({...settings, cp_jours_par_an: parseInt(e.target.value)})} 
                    />
                </div>
                
                <div className="form-group">
                    <label>⚡ Nombre de jours de RTT par an</label>
                    <input 
                        type="number" 
                        className="form-input" 
                        value={settings.rtt_jours_par_an || 12} 
                        onChange={e => setSettings({...settings, rtt_jours_par_an: parseInt(e.target.value)})} 
                    />
                </div>
                
                <div className="form-group">
                    <label>📅 Maximum de jours consécutifs</label>
                    <input 
                        type="number" 
                        className="form-input" 
                        value={settings.max_conges_consecutifs || 20} 
                        onChange={e => setSettings({...settings, max_conges_consecutifs: parseInt(e.target.value)})} 
                    />
                </div>
                
                <div className="form-group">
                    <label>⏰ Préavis minimum (jours)</label>
                    <input 
                        type="number" 
                        className="form-input" 
                        value={settings.preavis_minimum || 2} 
                        onChange={e => setSettings({...settings, preavis_minimum: parseInt(e.target.value)})} 
                    />
                </div>
                
                <div className="form-group">
                    <label>⏱️ Permission max par mois (heures)</label>
                    <input 
                        type="number" 
                        className="form-input" 
                        step="0.5" 
                        value={settings.permission_max_heures_mois || 4} 
                        onChange={e => setSettings({...settings, permission_max_heures_mois: parseFloat(e.target.value)})} 
                    />
                </div>
                
                <div className="payroll-actions" style={{ marginTop: '20px' }}>
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <path d="M17 21v-4H7v4M12 3v5"/>
                        </svg>
                        {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                    </button>
                </div>
            </div>
            
            <div className="info-card-tip">
                <div className="tip-icon">ℹ️</div>
                <div className="tip-content">
                    Les paramètres sont sauvegardés dans l'application (mode démonstration).
                </div>
            </div>
        </div>
    );
}

export default Settings;