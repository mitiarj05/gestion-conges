import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Settings() {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://localhost:5000/api';
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/admin/settings`, getAuthHeaders());
            setSettings(response.data);
        } catch (error) { console.error('Erreur:', error); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        try {
            await axios.put(`${API_URL}/admin/settings`, settings, getAuthHeaders());
            alert('Paramètres enregistrés !');
        } catch (error) { alert('Erreur lors de l\'enregistrement'); }
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div>
            <h2>⚙️ Configuration de l'application</h2>
            <div className="admin-section">
                <h3>Règles générales</h3>
                <div className="form-group"><label>🏖️ Nombre de jours de CP par an</label><input type="number" className="form-input" value={settings.cp_jours_par_an || 25} onChange={e => setSettings({...settings, cp_jours_par_an: e.target.value})} /></div>
                <div className="form-group"><label>⚡ Nombre de jours de RTT par an</label><input type="number" className="form-input" value={settings.rtt_jours_par_an || 12} onChange={e => setSettings({...settings, rtt_jours_par_an: e.target.value})} /></div>
                <div className="form-group"><label>📅 Maximum de jours consécutifs</label><input type="number" className="form-input" value={settings.max_conges_consecutifs || 20} onChange={e => setSettings({...settings, max_conges_consecutifs: e.target.value})} /></div>
                <div className="form-group"><label>⏰ Préavis minimum (jours)</label><input type="number" className="form-input" value={settings.preavis_minimum || 2} onChange={e => setSettings({...settings, preavis_minimum: e.target.value})} /></div>
                <div className="form-group"><label>⏱️ Permission max par mois (heures)</label><input type="number" className="form-input" step="0.5" value={settings.permission_max_heures_mois || 4} onChange={e => setSettings({...settings, permission_max_heures_mois: e.target.value})} /></div>
                <button className="btn btn-primary" onClick={handleSave}>💾 Enregistrer les paramètres</button>
            </div>
        </div>
    );
}

export default Settings;