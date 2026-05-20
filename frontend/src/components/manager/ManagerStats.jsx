// frontend/src/components/manager/ManagerStats.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ManagerStats() {
    const [stats, setStats] = useState({
        totalDemandes: 0,
        approuvees: 0,
        enAttente: 0,
        refusees: 0,
        demandesParMois: [],
        demandesParEmploye: []
    });
    const [loading, setLoading] = useState(true);

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    useEffect(() => {
        fetchManagerStats();
    }, []);

    const fetchManagerStats = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/leaves/manager-dashboard-stats', getAuthHeaders());
            setStats(response.data);
        } catch (error) {
            console.error('Erreur chargement stats manager:', error);
        } finally {
            setLoading(false);
        }
    };

    const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    if (loading) {
        return <div className="text-center">Chargement des statistiques...</div>;
    }

    if (stats.totalDemandes === 0) {
        return (
            <div className="info-box">
                <strong>📊 Aucune donnée disponible pour le moment.</strong><br/>
                Les statistiques s'afficheront une fois que votre équipe aura fait des demandes.
            </div>
        );
    }

    return (
        <div>
            <h3>📊 Statistiques de votre équipe</h3>
            
            {/* Cartes statistiques */}
            <div className="cards-grid">
                <div className="stat-card blue">
                    <div className="number">{stats.totalDemandes}</div>
                    <div className="label">Total demandes</div>
                </div>
                <div className="stat-card green">
                    <div className="number">{stats.approuvees}</div>
                    <div className="label">Approuvées</div>
                </div>
                <div className="stat-card orange">
                    <div className="number">{stats.enAttente}</div>
                    <div className="label">En attente</div>
                </div>
                <div className="stat-card red">
                    <div className="number">{stats.refusees}</div>
                    <div className="label">Refusées</div>
                </div>
            </div>

            {/* Graphique des demandes par mois */}
            {stats.demandesParMois.length > 0 && (
                <div className="admin-section" style={{ marginTop: '20px' }}>
                    <h4>📈 Évolution des demandes par mois</h4>
                    <div className="monthly-stats">
                        {stats.demandesParMois.map((item, index) => {
                            const maxValue = Math.max(...stats.demandesParMois.map(i => i.total), 1);
                            const width = (item.total / maxValue) * 100;
                            return (
                                <div key={index} className="monthly-bar-item">
                                    <div className="monthly-label">{moisNoms[item.mois - 1]} {item.annee}</div>
                                    <div className="monthly-bar-container">
                                        <div className="monthly-bar-fill" style={{ width: `${width}%` }}>
                                            <span className="monthly-value">{item.total} demande(s)</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Taux d'approbation */}
            <div className="admin-section" style={{ marginTop: '20px' }}>
                <h4>📊 Taux d'approbation global</h4>
                <div className="stats-summary">
                    <div className="summary-item">
                        <span className="summary-label">Taux d'approbation</span>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill cp-fill" 
                                style={{ width: `${stats.totalDemandes > 0 ? (stats.approuvees / stats.totalDemandes) * 100 : 0}%` }}
                            >
                                {stats.totalDemandes > 0 ? Math.round((stats.approuvees / stats.totalDemandes) * 100) : 0}%
                            </div>
                        </div>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Taux de refus</span>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill rejected-fill" 
                                style={{ width: `${stats.totalDemandes > 0 ? (stats.refusees / stats.totalDemandes) * 100 : 0}%`, background: '#dc3545' }}
                            >
                                {stats.totalDemandes > 0 ? Math.round((stats.refusees / stats.totalDemandes) * 100) : 0}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top demandes par employé */}
            {stats.demandesParEmploye.length > 0 && (
                <div className="table-container" style={{ marginTop: '20px' }}>
                    <h4 style={{ padding: '15px' }}>👥 Demandes par employé</h4>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Employé</th>
                                <th>Total demandes</th>
                                <th>Approuvées</th>
                                <th>En attente</th>
                                <th>Refusées</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.demandesParEmploye.map((emp, idx) => (
                                <tr key={idx}>
                                    <td>{emp.prenom} {emp.nom}</td>
                                    <td>{emp.total}</td>
                                    <td><span className="status-approved">{emp.approuvees}</span></td>
                                    <td><span className="status-pending-manager">{emp.enAttente}</span></td>
                                    <td><span className="status-rejected">{emp.refusees}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default ManagerStats;