// frontend/src/components/manager/ManagerStats.jsx
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
import { API_URL } from '../../config/api';

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
    const [activeChart, setActiveChart] = useState('bar');

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    useEffect(() => {
        fetchManagerStats();
    }, []);

    const fetchManagerStats = async () => {
        try {
            console.log('📊 Chargement des stats manager...');
            const response = await axios.get(`${API_URL}/leaves/manager-dashboard-stats`, getAuthHeaders());
            console.log('📊 Stats manager reçues:', response.data);
            setStats(response.data);
        } catch (error) {
            console.error('❌ Erreur chargement stats manager:', error);
            if (error.response) {
                console.error('Réponse erreur:', error.response.data);
            }
        } finally {
            setLoading(false);
        }
    };

    const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

    // Préparer les données pour le graphique circulaire des statuts
    const statusData = [
        { name: 'Approuvées', value: stats.approuvees, color: '#10b981' },
        { name: 'En attente', value: stats.enAttente, color: '#f59e0b' },
        { name: 'Refusées', value: stats.refusees, color: '#ef4444' }
    ].filter(s => s.value > 0);

    if (loading) {
        return (
            <div className="text-center" style={{ padding: '30px' }}>
                <div className="loading-spinner" style={{ width: '30px', height: '30px', margin: '0 auto 15px' }}></div>
                <div>Chargement des statistiques...</div>
            </div>
        );
    }

    if (stats.totalDemandes === 0) {
        return (
            <div className="info-box">
                <strong>📊 Aucune donnée disponible pour le moment.</strong><br/>
                Les statistiques s'afficheront une fois que votre équipe aura fait des demandes.
            </div>
        );
    }

    const tauxApprobation = stats.totalDemandes > 0 ? Math.round((stats.approuvees / stats.totalDemandes) * 100) : 0;
    const tauxRefus = stats.totalDemandes > 0 ? Math.round((stats.refusees / stats.totalDemandes) * 100) : 0;
    const tauxEnAttente = stats.totalDemandes > 0 ? Math.round((stats.enAttente / stats.totalDemandes) * 100) : 0;

    // Données pour le graphique à barres des demandes par mois
    const monthlyChartData = stats.demandesParMois.map(item => ({
        mois: `${moisNoms[item.mois - 1]} ${item.annee}`,
        total: item.total
    })).reverse();

    return (
        <div className="manager-stats-container">
            <h3>Statistiques de votre équipe</h3>
            
            {/* Cartes statistiques avec barres de progression circulaires */}
            <div className="stats-cards-grid manager-stats-cards">
                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Total demandes</span>
                        <span className="stat-card-progress-value">{stats.totalDemandes}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#667eea" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - stats.totalDemandes / Math.max(stats.totalDemandes, 100))}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#667eea">{stats.totalDemandes}</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">demandes totales</div>
                </div>

                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Approuvées</span>
                        <span className="stat-card-progress-value">{stats.approuvees}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#10b981" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - stats.approuvees / Math.max(stats.totalDemandes, 1))}`}
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
                        <span className="stat-card-progress-value">{stats.enAttente}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#f59e0b" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - stats.enAttente / Math.max(stats.totalDemandes, 1))}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#f59e0b">{tauxEnAttente}%</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">taux d'attente</div>
                </div>

                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Refusées</span>
                        <span className="stat-card-progress-value">{stats.refusees}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#ef4444" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - stats.refusees / Math.max(stats.totalDemandes, 1))}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#ef4444">{tauxRefus}%</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">taux de refus</div>
                </div>
            </div>

            {/* Deuxième ligne - indicateurs clés */}
            <div className="stats-cards-grid secondary manager-kpi-cards">
                <div className="kpi-card">
                    <div className="kpi-icon">📈</div>
                    <div className="kpi-content">
                        <div className="kpi-value">{tauxApprobation}%</div>
                        <div className="kpi-label">Taux d'approbation</div>
                        <div className="kpi-trend positive">{stats.approuvees} / {stats.totalDemandes} approuvées</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon">⏳</div>
                    <div className="kpi-content">
                        <div className="kpi-value">{stats.enAttente}</div>
                        <div className="kpi-label">Demandes en attente</div>
                        <div className="kpi-trend neutral">à traiter</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon">👥</div>
                    <div className="kpi-content">
                        <div className="kpi-value">{stats.demandesParEmploye.length}</div>
                        <div className="kpi-label">Employés actifs</div>
                        <div className="kpi-trend neutral">ont fait des demandes</div>
                    </div>
                </div>
            </div>

            {/* Graphique des demandes par mois avec bascule */}
            {stats.demandesParMois.length > 0 && (
                <div className="manager-chart-card">
                    <div className="chart-header">
                        <h4>Évolution des demandes par mois</h4>
                        <div className="chart-toggle">
                            <button 
                                className={`toggle-btn ${activeChart === 'bar' ? 'active' : ''}`}
                                onClick={() => setActiveChart('bar')}
                            >
                                📊 Barres
                            </button>
                            <button 
                                className={`toggle-btn ${activeChart === 'line' ? 'active' : ''}`}
                                onClick={() => setActiveChart('line')}
                            >
                                📈 Ligne
                            </button>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        {activeChart === 'bar' ? (
                            <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip 
                                    formatter={(value) => [`${value} demande(s)`, 'Nombre']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="total" fill="#667eea" name="Demandes" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        ) : (
                            <LineChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip 
                                    formatter={(value) => [`${value} demande(s)`, 'Nombre']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="total" stroke="#667eea" name="Demandes" strokeWidth={3} dot={{ r: 6, fill: '#667eea' }} />
                            </LineChart>
                        )}
                    </ResponsiveContainer>
                </div>
            )}

            {/* Graphique circulaire des statuts */}
            {statusData.length > 0 && (
                <div className="manager-chart-card">
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

            {/* Tableau des demandes par employé */}
            {stats.demandesParEmploye.length > 0 && (
                <div className="manager-table-container">
                    <h4>👥 Demandes par employé</h4>
                    <div className="table-responsive">
                        <table className="manager-stats-table">
                            <thead>
                                <tr>
                                    <th>Employé</th>
                                    <th>Total</th>
                                    <th>Approuvées</th>
                                    <th>En attente</th>
                                    <th>Refusées</th>
                                    <th>Taux succès</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.demandesParEmploye.map((emp, idx) => {
                                    const taux = emp.total > 0 ? Math.round((emp.approuvees / emp.total) * 100) : 0;
                                    return (
                                        <tr key={idx}>
                                            <td><strong>{emp.prenom} {emp.nom}</strong></td>
                                            <td>{emp.total}</td>
                                            <td><span className="status-badge approved">{emp.approuvees}</span></td>
                                            <td><span className="status-badge pending">{emp.enAttente}</span></td>
                                            <td><span className="status-badge rejected">{emp.refusees}</span></td>
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
        </div>
    );
}

export default ManagerStats;