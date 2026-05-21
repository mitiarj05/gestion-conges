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

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div><div>Chargement...</div></div>;

    return (
        <div>
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">🔐 Gestion des codes d'inscription</h1>
                    <p className="dashboard-subtitle">Générez et gérez les codes d'accès pour les nouveaux utilisateurs</p>
                </div>
            </div>

            <div className="payroll-actions">
                <button className="btn-primary" onClick={() => handleGenerateCode('employe')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Générer code Employé
                </button>
                <button className="btn-primary" onClick={() => handleGenerateCode('manager')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Générer code Manager
                </button>
            </div>

            <div className="table-wrapper-modern">
                <table className="modern-table full-width">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Rôle</th>
                            <th>Utilisations</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {codes.map(code => (
                            <tr key={code.id}>
                                <td><code className="code-value">{code.code}</code></td>
                                <td><span className="role-badge-manager">{code.role_name}</span></td>
                                <td>{code.utilise_fois}/{code.max_utilisations || '∞'}</td>
                                <td>
                                    <button className="action-btn delete" onClick={() => handleDeleteCode(code.id, code.code)} title="Supprimer le code">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8"/>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="info-card-tip">
                <div className="tip-icon">💡</div>
                <div className="tip-content">
                    <strong>Code Admin par défaut :</strong> <code>ADMIN26</code> + <code>SUPER_SECRET_KEY_123</code> → Crée le premier compte ADMIN (une seule fois)
                </div>
            </div>
        </div>
    );
}

export default CodeManagement;