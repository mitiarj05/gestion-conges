// frontend/src/components/manager/TeamStatistics.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell,
    LineChart,
    Line
} from 'recharts';

function TeamStatistics({ teamMembers }) {
    const [stats, setStats] = useState({
        totalRequests: 0,
        approvedRequests: 0,
        pendingRequests: 0,
        rejectedRequests: 0,
        totalDaysTaken: 0,
        requestsByEmployee: [],
        requestsByType: { CP: 0, SANS_SOLDE: 0 },
        monthlyData: []
    });
    const [loading, setLoading] = useState(true);
    const [activeChart, setActiveChart] = useState('bar');

    const getAuthHeaders = () => ({ 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
    });

    useEffect(() => {
        fetchTeamStats();
    }, []);

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

    const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444'];

    if (loading) {
        return (
            <div className="text-center" style={{ padding: '40px' }}>
                <div className="loading-spinner" style={{ width: '30px', height: '30px', margin: '0 auto 20px' }}></div>
                <div>Chargement des statistiques...</div>
            </div>
        );
    }

    const tauxApprobation = stats.totalRequests > 0 
        ? Math.round((stats.approvedRequests / stats.totalRequests) * 100) 
        : 0;

    const statusData = [
        { name: 'Approuvées', value: stats.approvedRequests, color: '#10b981' },
        { name: 'En attente', value: stats.pendingRequests, color: '#f59e0b' },
        { name: 'Refusées', value: stats.rejectedRequests, color: '#ef4444' }
    ].filter(s => s.value > 0);

    const typeData = [
        { name: 'Congés Payés', value: stats.requestsByType.CP, color: '#667eea' },
        { name: 'Congé sans solde', value: stats.requestsByType.SANS_SOLDE, color: '#f59e0b' }
    ].filter(s => s.value > 0);

    const monthlyChartData = stats.monthlyData.map(item => ({
        mois: moisNoms[item.mois - 1],
        moisCourt: moisNoms[item.mois - 1].substring(0, 3),
        total: item.total,
        annee: item.annee
    }));

    const maxTotal = Math.max(...monthlyChartData.map(d => d.total), 1);

    return (
        <div className="team-stats-container">
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Statistiques de l'équipe</h1>
                    <p className="dashboard-subtitle">Analyse des demandes de votre équipe</p>
                </div>
            </div>
            
            {/* Cartes récapitulatives */}
            <div className="stats-cards-grid team-stats-cards">
                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Total demandes</span>
                        <span className="stat-card-progress-value">{stats.totalRequests}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#667eea" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - stats.totalRequests / Math.max(stats.totalRequests, 100))}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#667eea">{stats.totalRequests}</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">demandes totales</div>
                </div>

                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Approuvées</span>
                        <span className="stat-card-progress-value">{stats.approvedRequests}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#10b981" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - stats.approvedRequests / Math.max(stats.totalRequests, 1))}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#10b981">{tauxApprobation}%</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">taux d'approbation</div>
                </div>

                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">En attente</span>
                        <span className="stat-card-progress-value">{stats.pendingRequests}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#f59e0b" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - stats.pendingRequests / Math.max(stats.totalRequests, 1))}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#f59e0b">{stats.pendingRequests}</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">demandes en attente</div>
                </div>

                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Refusées</span>
                        <span className="stat-card-progress-value">{stats.rejectedRequests}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#ef4444" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - stats.rejectedRequests / Math.max(stats.totalRequests, 1))}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#ef4444">{stats.rejectedRequests}</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">demandes refusées</div>
                </div>
            </div>

            {/* Deuxième ligne - indicateurs clés SANS EMOJIS */}
            <div className="stats-cards-grid secondary team-kpi-cards">
                <div className="kpi-card">
                    <div className="kpi-icon-wrapper blue">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
                        </svg>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{stats.totalDaysTaken} jours</div>
                        <div className="kpi-label">Total jours pris</div>
                        <div className="kpi-trend neutral">par toute l'équipe</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon-wrapper green">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/>
                        </svg>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{tauxApprobation}%</div>
                        <div className="kpi-label">Taux d'approbation</div>
                        <div className="kpi-trend positive">{stats.approvedRequests} / {stats.totalRequests} approuvées</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon-wrapper orange">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{teamMembers.length > 0 ? (stats.totalRequests / teamMembers.length).toFixed(1) : 0}</div>
                        <div className="kpi-label">Moyenne par employé</div>
                        <div className="kpi-trend neutral">demandes par employé</div>
                    </div>
                </div>
            </div>

            {/* Graphique des demandes par mois */}
            <div className="team-chart-card">
                <div className="chart-header">
                    <h4>Évolution des demandes par mois</h4>
                    <div className="chart-toggle">
                        <button 
                            className={`toggle-btn ${activeChart === 'bar' ? 'active' : ''}`}
                            onClick={() => setActiveChart('bar')}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            </svg>
                            Barres
                        </button>
                        <button 
                            className={`toggle-btn ${activeChart === 'line' ? 'active' : ''}`}
                            onClick={() => setActiveChart('line')}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            Ligne
                        </button>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                    {activeChart === 'bar' ? (
                        <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="moisCourt" 
                                tick={{ fontSize: 11 }}
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis 
                                tick={{ fontSize: 11 }} 
                                allowDecimals={false}
                                domain={[0, maxTotal + 1]}
                            />
                            <Tooltip 
                                formatter={(value) => [`${value} demande(s)`, 'Nombre']}
                                labelFormatter={(label) => `${label}`}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend />
                            <Bar 
                                dataKey="total" 
                                fill="#667eea" 
                                name="Demandes" 
                                radius={[8, 8, 0, 0]} 
                                barSize={40}
                            />
                        </BarChart>
                    ) : (
                        <LineChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="moisCourt" 
                                tick={{ fontSize: 11 }}
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis 
                                tick={{ fontSize: 11 }} 
                                allowDecimals={false}
                                domain={[0, maxTotal + 1]}
                            />
                            <Tooltip 
                                formatter={(value) => [`${value} demande(s)`, 'Nombre']}
                                labelFormatter={(label) => `${label}`}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="total" 
                                stroke="#667eea" 
                                name="Demandes" 
                                strokeWidth={3} 
                                dot={{ r: 6, fill: '#667eea' }}
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
                {monthlyChartData.every(d => d.total === 0) && (
                    <div className="info-box text-center" style={{ marginTop: '15px' }}>
                        Aucune demande de congé pour cette année
                    </div>
                )}
            </div>

            {/* Graphique circulaire des statuts */}
            {statusData.length > 0 && (
                <div className="team-chart-card">
                    <h4>Répartition des demandes par statut</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} demande(s)`, 'Nombre']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Graphique des types de congé */}
            {typeData.length > 0 && (
                <div className="team-chart-card">
                    <h4>Répartition par type de congé</h4>
                    <div className="horizontal-bars-container">
                        {typeData.map((stat, index) => {
                            const total = stats.requestsByType.CP + stats.requestsByType.SANS_SOLDE;
                            const percentage = total > 0 ? Math.round((stat.value / total) * 100) : 0;
                            return (
                                <div key={index} className="horizontal-bar-item">
                                    <div className="horizontal-bar-label">{stat.name}</div>
                                    <div className="horizontal-bar-wrapper">
                                        <div 
                                            className="horizontal-bar-fill"
                                            style={{ 
                                                width: `${percentage}%`,
                                                backgroundColor: stat.color
                                            }}
                                        >
                                            <span className="horizontal-bar-value">{stat.value} demande(s)</span>
                                        </div>
                                    </div>
                                    <div className="horizontal-bar-percent">{percentage}%</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tableau des demandes par employé SANS EMOJI */}
            {stats.requestsByEmployee.length > 0 && (
                <div className="team-table-container">
                    <h4>Demandes par employé</h4>
                    <div className="table-responsive">
                        <table className="team-stats-table">
                            <thead>
                                <tr>
                                    <th>Employé</th>
                                    <th>Total demandes</th>
                                    <th>Approuvées</th>
                                    <th>Refusées</th>
                                    <th>En attente</th>
                                    <th>Jours pris</th>
                                    <th>Taux succès</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.requestsByEmployee.map((emp, idx) => {
                                    const taux = emp.total > 0 ? Math.round((emp.approved / emp.total) * 100) : 0;
                                    return (
                                        <tr key={idx}>
                                            <td><strong>{emp.prenom} {emp.nom}</strong></td>
                                            <td>{emp.total}</td>
                                            <td><span className="status-badge approved">{emp.approved}</span></td>
                                            <td><span className="status-badge rejected">{emp.rejected}</span></td>
                                            <td><span className="status-badge pending">{emp.pending}</span></td>
                                            <td>{emp.totalDays || 0} jours</td>
                                            <td>
                                                <div className="mini-progress">
                                                    <div className="mini-progress-bar" style={{ width: `${taux}%` }}></div>
                                                    <span className="mini-progress-text">{taux}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="info-card-tip">
                <div className="tip-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                </div>
                <div className="tip-content">
                    <strong>Conseils :</strong> Surveillez les demandes en attente pour les traiter rapidement. 
                    Le taux d'approbation reflète la qualité des demandes de votre équipe.
                </div>
            </div>
        </div>
    );
}

export default TeamStatistics;