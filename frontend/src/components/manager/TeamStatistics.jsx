// frontend/src/components/manager/TeamStatistics.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TeamStatistics({ teamMembers, teamId }) {
    const [stats, setStats] = useState({
        totalRequests: 0,
        approvedRequests: 0,
        pendingRequests: 0,
        rejectedRequests: 0,
        totalDaysTaken: 0,
        requestsByEmployee: [],
        requestsByType: { CP: 0, RTT: 0, SS: 0 },
        monthlyData: []
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (teamMembers.length > 0) {
            fetchTeamStats();
        }
    }, [teamMembers]);

    const getAuthHeaders = () => ({ 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
    });

    const fetchTeamStats = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/api/leaves/team-stats', getAuthHeaders());
            setStats(response.data);
        } catch (error) {
            console.error('Erreur chargement stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center">Chargement des statistiques...</div>;
    }

    return (
        <div>
            <h2>📊 Statistiques de l'équipe</h2>
            
            {/* Cartes récapitulatives */}
            <div className="cards-grid">
                <div className="stat-card blue">
                    <div className="number">{stats.totalRequests}</div>
                    <div className="label">Total demandes</div>
                </div>
                <div className="stat-card green">
                    <div className="number">{stats.approvedRequests}</div>
                    <div className="label">Approuvées</div>
                </div>
                <div className="stat-card orange">
                    <div className="number">{stats.pendingRequests}</div>
                    <div className="label">En attente</div>
                </div>
                <div className="stat-card red">
                    <div className="number">{stats.rejectedRequests}</div>
                    <div className="label">Refusées</div>
                </div>
            </div>
            
            {/* Deuxième ligne */}
            <div className="cards-grid">
                <div className="card">
                    <h3>📅 Total jours pris</h3>
                    <div className="value">{stats.totalDaysTaken} jours</div>
                    <div className="small">par toute l'équipe</div>
                </div>
                <div className="card">
                    <h3>📈 Taux d'approbation</h3>
                    <div className="value">
                        {stats.totalRequests > 0 
                            ? Math.round((stats.approvedRequests / stats.totalRequests) * 100) 
                            : 0}%
                    </div>
                    <div className="small">demandes acceptées</div>
                </div>
                <div className="card">
                    <h3>👥 Moyenne par employé</h3>
                    <div className="value">
                        {teamMembers.length > 0 
                            ? (stats.totalRequests / teamMembers.length).toFixed(1) 
                            : 0}
                    </div>
                    <div className="small">demandes par employé</div>
                </div>
            </div>

            {/* Onglets */}
            <div className="statistics-tabs">
                <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    📊 Vue d'ensemble
                </button>
                <button className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
                    👥 Par employé
                </button>
                <button className={`tab-btn ${activeTab === 'types' ? 'active' : ''}`} onClick={() => setActiveTab('types')}>
                    🏷️ Par type
                </button>
            </div>

            {/* Contenu - Vue d'ensemble */}
            {activeTab === 'overview' && (
                <div className="admin-section">
                    <h3>📊 Répartition des demandes par statut</h3>
                    <div className="status-stats-grid">
                        <div className="status-card approved">
                            <div className="status-count">{stats.approvedRequests}</div>
                            <div className="status-label">✅ Approuvées</div>
                            <div className="status-percent">
                                {stats.totalRequests > 0 ? Math.round((stats.approvedRequests / stats.totalRequests) * 100) : 0}%
                            </div>
                        </div>
                        <div className="status-card pending-manager">
                            <div className="status-count">{stats.pendingRequests}</div>
                            <div className="status-label">⏳ En attente</div>
                            <div className="status-percent">
                                {stats.totalRequests > 0 ? Math.round((stats.pendingRequests / stats.totalRequests) * 100) : 0}%
                            </div>
                        </div>
                        <div className="status-card rejected">
                            <div className="status-count">{stats.rejectedRequests}</div>
                            <div className="status-label">❌ Refusées</div>
                            <div className="status-percent">
                                {stats.totalRequests > 0 ? Math.round((stats.rejectedRequests / stats.totalRequests) * 100) : 0}%
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Contenu - Par employé */}
            {activeTab === 'employees' && (
                <div className="admin-section">
                    <h3>👥 Demandes par employé</h3>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employé</th>
                                    <th>Total demandes</th>
                                    <th>Approuvées</th>
                                    <th>Refusées</th>
                                    <th>En attente</th>
                                    <th>Jours pris</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.requestsByEmployee.map((emp, idx) => (
                                    <tr key={idx}>
                                        <td>{emp.prenom} {emp.nom}</td>
                                        <td>{emp.total}</td>
                                        <td><span className="status-approved">{emp.approved}</span></td>
                                        <td><span className="status-rejected">{emp.rejected}</span></td>
                                        <td><span className="status-pending">{emp.pending}</span></td>
                                        <td>{emp.totalDays || 0} jours</td>
                                    </tr>
                                ))}
                                {stats.requestsByEmployee.length === 0 && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Aucune donnée</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Contenu - Par type */}
            {activeTab === 'types' && (
                <div className="admin-section">
                    <h3>🏷️ Répartition par type de congé</h3>
                    <div className="types-stats">
                        <div className="type-stat-item">
                            <span className="type-label">🏖️ Congés Payés (CP)</span>
                            <div className="type-bar-container">
                                <div className="type-bar-fill cp-fill" style={{ width: `${stats.totalRequests > 0 ? (stats.requestsByType.CP / stats.totalRequests) * 100 : 0}%` }}>
                                    <span className="type-value">{stats.requestsByType.CP} demandes</span>
                                </div>
                            </div>
                        </div>
                        <div className="type-stat-item">
                            <span className="type-label">📅 RTT</span>
                            <div className="type-bar-container">
                                <div className="type-bar-fill rtt-fill" style={{ width: `${stats.totalRequests > 0 ? (stats.requestsByType.RTT / stats.totalRequests) * 100 : 0}%` }}>
                                    <span className="type-value">{stats.requestsByType.RTT} demandes</span>
                                </div>
                            </div>
                        </div>
                        <div className="type-stat-item">
                            <span className="type-label">📝 Congé sans solde</span>
                            <div className="type-bar-container">
                                <div className="type-bar-fill ss-fill" style={{ width: `${stats.totalRequests > 0 ? (stats.requestsByType.SS / stats.totalRequests) * 100 : 0}%` }}>
                                    <span className="type-value">{stats.requestsByType.SS} demandes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="info-box">
                <strong>💡 Conseils :</strong><br/>
                • Surveillez les demandes en attente pour les traiter rapidement.<br/>
                • Le taux d'approbation reflète la qualité des demandes de votre équipe.
            </div>
        </div>
    );
}

export default TeamStatistics;