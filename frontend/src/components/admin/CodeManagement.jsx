import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CodeManagement() {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://localhost:5000/api';
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => { fetchCodes(); }, []);

    const fetchCodes = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/admin/codes`, getAuthHeaders());
            setCodes(response.data);
        } catch (error) { console.error('Erreur:', error); }
        finally { setLoading(false); }
    };

    const handleGenerateCode = async (role) => {
        try {
            const response = await axios.post(`${API_URL}/admin/generate-code`, { role, max_utilisations: 10 }, getAuthHeaders());
            alert(`Code généré : ${response.data.code}`);
            fetchCodes();
        } catch (error) { alert('Erreur lors de la génération'); }
    };

    const handleDeleteCode = async (id, code) => {
        if (window.confirm(`Supprimer le code ${code} ?`)) {
            try {
                await axios.delete(`${API_URL}/admin/codes/${id}`, getAuthHeaders());
                alert('Code supprimé');
                fetchCodes();
            } catch (error) { alert('Erreur'); }
        }
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div>
            <h2>🔐 Gestion des codes d'inscription</h2>
            <div className="actions-bar">
                <button className="btn btn-primary" onClick={() => handleGenerateCode('employe')}>➕ Générer code Employé</button>
                <button className="btn btn-primary" onClick={() => handleGenerateCode('manager')}>➕ Générer code Manager</button>
            </div>
            <div className="code-list">
                {codes.map(code => (
                    <code key={code.id}>
                        {code.code} → Rôle {code.role_name} ({code.utilise_fois}/{code.max_utilisations || '∞'} utilisations)
                        <button className="btn btn-sm btn-danger" style={{ marginLeft: '10px' }} onClick={() => handleDeleteCode(code.id, code.code)}>🗑️</button>
                    </code>
                ))}
            </div>
            <div className="info-box">
                <strong>💡 Code Admin par défaut :</strong><br/>
                <code>ADMIN26</code> + <code>SUPER_SECRET_KEY_123</code> → Crée le premier compte ADMIN (une seule fois)
            </div>
        </div>
    );
}

export default CodeManagement;