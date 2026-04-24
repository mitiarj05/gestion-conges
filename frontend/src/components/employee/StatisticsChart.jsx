// frontend/src/components/employee/StatisticsChart.jsx
import React, { useState } from 'react';

function StatisticsChart({ requests, balance }) {
    const [activeTab, setActiveTab] = useState('overview');

    // Calculer les jours pris par mois
    const getMonthlyData = () => {
        const months = {};
        const currentYear = new Date().getFullYear();
        
        // Initialiser tous les mois de l'année
        for (let i = 1; i <= 12; i++) {
            const monthName = new Date(currentYear, i - 1, 1).toLocaleDateString('fr-FR', { month: 'long' });
            months[monthName] = 0;
        }
        
        requests.filter(r => r.status === 'approved').forEach(r => {
            const date = new Date(r.start_date);
            if (date.getFullYear() === currentYear) {
                const monthName = date.toLocaleDateString('fr-FR', { month: 'long' });
                months[monthName] = (months[monthName] || 0) + r.duration;
            }
        });
        
        return Object.entries(months).map(([month, jours]) => ({ month, jours }));
    };

    // Calculer les statistiques par type
    const getTypeStats = () => {
        const types = {};
        requests.filter(r => r.status === 'approved').forEach(r => {
            types[r.type] = (types[r.type] || 0) + r.duration;
        });
        return types;
    };

    // Données pour les statuts
    const getStatusStats = () => {
        const statusCounts = {
            approved: 0,
            pending_manager: 0,
            pending_admin: 0,
            rejected: 0
        };
        
        const statusTotal = {
            approved: 0,
            pending_manager: 0,
            pending_admin: 0,
            rejected: 0
        };
        
        requests.forEach(r => {
            statusCounts[r.status]++;
            if (r.status === 'approved') {
                statusTotal.approved += r.duration;
            }
        });
        
        return { counts: statusCounts, total: statusTotal };
    };

    const monthlyData = getMonthlyData();
    const typeStats = getTypeStats();
    const statusStats = getStatusStats();
    
    const maxMonthlyJours = Math.max(...monthlyData.map(d => d.jours), 1);
    const totalJoursPris = requests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + r.duration, 0);
    const tauxApprobation = requests.length > 0 
        ? Math.round((statusStats.counts.approved / requests.length) * 100) 
        : 0;

    return (
        <div>
            <h2>📊 Mes statistiques personnelles</h2>
            
            {/* Cartes de statistiques */}
            <div className="cards-grid" style={{ marginBottom: '30px' }}>
                <div className="stat-card blue">
                    <div className="number">{requests.length}</div>
                    <div className="label">Total demandes</div>
                </div>
                <div className="stat-card green">
                    <div className="number">{statusStats.counts.approved}</div>
                    <div className="label">Demandes approuvées</div>
                </div>
                <div className="stat-card orange">
                    <div className="number">{statusStats.counts.pending_manager + statusStats.counts.pending_admin}</div>
                    <div className="label">En attente</div>
                </div>
                <div className="stat-card red">
                    <div className="number">{statusStats.counts.rejected}</div>
                    <div className="label">Demandes refusées</div>
                </div>
            </div>
            
            {/* Deuxième ligne de cartes */}
            <div className="cards-grid" style={{ marginBottom: '30px' }}>
                <div className="card">
                    <h3>📈 Taux d'approbation</h3>
                    <div className="value">{tauxApprobation}%</div>
                    <div className="small">{statusStats.counts.approved} approuvées sur {requests.length} demandes</div>
                </div>
                <div className="card">
                    <h3>🏖️ Total jours pris</h3>
                    <div className="value">{totalJoursPris} jours</div>
                    <div className="small">depuis le début</div>
                </div>
                <div className="card">
                    <h3>💰 Taux d'utilisation CP</h3>
                    <div className="value">{balance.cp_total > 0 ? Math.round((balance.cp_pris / balance.cp_total) * 100) : 0}%</div>
                    <div className="small">{balance.cp_pris || 0}/{balance.cp_total || 25} jours utilisés</div>
                </div>
                <div className="card">
                    <h3>⚡ Taux d'utilisation RTT</h3>
                    <div className="value">{balance.rtt_total > 0 ? Math.round((balance.rtt_pris / balance.rtt_total) * 100) : 0}%</div>
                    <div className="small">{balance.rtt_pris || 0}/{balance.rtt_total || 12} jours utilisés</div>
                </div>
            </div>
            
            {/* Onglets */}
            <div className="statistics-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 Aperçu général
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
                    onClick={() => setActiveTab('monthly')}
                >
                    📅 Par mois
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'types' ? 'active' : ''}`}
                    onClick={() => setActiveTab('types')}
                >
                    🏷️ Par type
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
                    onClick={() => setActiveTab('status')}
                >
                    📋 Par statut
                </button>
            </div>
            
            {/* Contenu des onglets */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="admin-section">
                        <h3>📊 Résumé de l'année {new Date().getFullYear()}</h3>
                        <div className="stats-summary">
                            <div className="summary-item">
                                <span className="summary-label">Jours de CP utilisés</span>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill cp-fill"
                                        style={{ width: `${balance.cp_total > 0 ? (balance.cp_pris / balance.cp_total) * 100 : 0}%` }}
                                    />
                                </div>
                                <span className="summary-value">{balance.cp_pris || 0} / {balance.cp_total || 25} jours</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Jours de RTT utilisés</span>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill rtt-fill"
                                        style={{ width: `${balance.rtt_total > 0 ? (balance.rtt_pris / balance.rtt_total) * 100 : 0}%` }}
                                    />
                                </div>
                                <span className="summary-value">{balance.rtt_pris || 0} / {balance.rtt_total || 12} jours</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Jours restants (total)</span>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill remaining-fill"
                                        style={{ width: `${(balance.cp_total + balance.rtt_total) > 0 ? ((balance.cp_restant + balance.rtt_restant) / (balance.cp_total + balance.rtt_total)) * 100 : 0}%` }}
                                    />
                                </div>
                                <span className="summary-value">{balance.cp_restant + balance.rtt_restant} / {balance.cp_total + balance.rtt_total} jours</span>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'monthly' && (
                    <div className="admin-section">
                        <h3>📅 Jours pris par mois - {new Date().getFullYear()}</h3>
                        {monthlyData.map((data, index) => (
                            <div key={index} className="monthly-bar-item">
                                <div className="monthly-label">{data.month}</div>
                                <div className="monthly-bar-container">
                                    <div 
                                        className="monthly-bar-fill"
                                        style={{ width: `${(data.jours / maxMonthlyJours) * 100}%` }}
                                    >
                                        <span className="monthly-value">{data.jours} jours</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {monthlyData.every(d => d.jours === 0) && (
                            <div className="info-box">Aucune donnée pour cette année</div>
                        )}
                    </div>
                )}
                
                {activeTab === 'types' && (
                    <div className="admin-section">
                        <h3>🏷️ Répartition par type de congé</h3>
                        <div className="types-stats">
                            {Object.entries(typeStats).map(([type, jours]) => (
                                <div key={type} className="type-stat-item">
                                    <span className="type-label">{type}</span>
                                    <div className="type-bar-container">
                                        <div 
                                            className="type-bar-fill"
                                            style={{ width: `${totalJoursPris > 0 ? (jours / totalJoursPris) * 100 : 0}%` }}
                                        >
                                            <span className="type-value">{jours} jours</span>
                                        </div>
                                    </div>
                                    <span className="type-percent">
                                        {totalJoursPris > 0 ? Math.round((jours / totalJoursPris) * 100) : 0}%
                                    </span>
                                </div>
                            ))}
                            {Object.keys(typeStats).length === 0 && (
                                <div className="info-box">Aucune donnée disponible</div>
                            )}
                        </div>
                    </div>
                )}
                
                {activeTab === 'status' && (
                    <div className="admin-section">
                        <h3>📋 Répartition par statut</h3>
                        <div className="status-stats-grid">
                            <div className="status-card approved">
                                <div className="status-count">{statusStats.counts.approved}</div>
                                <div className="status-label">✅ Approuvées</div>
                                <div className="status-percent">{requests.length > 0 ? Math.round((statusStats.counts.approved / requests.length) * 100) : 0}%</div>
                            </div>
                            <div className="status-card pending-manager">
                                <div className="status-count">{statusStats.counts.pending_manager}</div>
                                <div className="status-label">⏳ En attente manager</div>
                                <div className="status-percent">{requests.length > 0 ? Math.round((statusStats.counts.pending_manager / requests.length) * 100) : 0}%</div>
                            </div>
                            <div className="status-card pending-admin">
                                <div className="status-count">{statusStats.counts.pending_admin}</div>
                                <div className="status-label">🕐 En attente admin</div>
                                <div className="status-percent">{requests.length > 0 ? Math.round((statusStats.counts.pending_admin / requests.length) * 100) : 0}%</div>
                            </div>
                            <div className="status-card rejected">
                                <div className="status-count">{statusStats.counts.rejected}</div>
                                <div className="status-label">❌ Refusées</div>
                                <div className="status-percent">{requests.length > 0 ? Math.round((statusStats.counts.rejected / requests.length) * 100) : 0}%</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="info-box">
                <strong>💡 Conseils :</strong><br/>
                • Utilisez l'onglet "Par mois" pour voir votre consommation de congés dans l'année.<br/>
                • Le taux d'approbation vous aide à suivre l'acceptation de vos demandes.<br/>
                • Pensez à planifier vos congés avant la fin de l'année pour ne pas perdre vos jours.
            </div>
        </div>
    );
}

export default StatisticsChart;