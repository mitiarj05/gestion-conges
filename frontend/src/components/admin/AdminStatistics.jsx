// frontend/src/components/admin/AdminStatistics.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

function AdminStatistics() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('global');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState([]);
    
    // Statistiques globales
    const [globalStats, setGlobalStats] = useState({
        totalEmployees: 0,
        totalManagers: 0,
        totalRequests: 0,
        approvedRequests: 0,
        pendingRequests: 0,
        rejectedRequests: 0,
        totalDaysTaken: 0,
        avgRequestsPerEmployee: 0
    });
    
    // Données graphiques
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [typeStats, setTypeStats] = useState([]);
    const [employeeStats, setEmployeeStats] = useState([]);
    const [serviceStats, setServiceStats] = useState([]);

    const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    useEffect(() => {
        fetchAllData();
        fetchAvailableYears();
    }, [selectedYear]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchGlobalStats(),
                fetchMonthlyStats(),
                fetchTypeStats(),
                fetchEmployeeStats(),
                fetchServiceStats()
            ]);
        } catch (error) {
            console.error('Erreur chargement statistiques:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalStats = async () => {
        try {
            const statsRes = await axios.get(`${API_URL}/admin/stats`, getAuthHeaders());
            const leaveStatsRes = await axios.get(`${API_URL}/admin/leave-requests`, getAuthHeaders());
            const leaves = leaveStatsRes.data;
            
            const approved = leaves.filter(l => l.statut === 'approved').length;
            const pending = leaves.filter(l => l.statut === 'pending_manager' || l.statut === 'pending_admin').length;
            const rejected = leaves.filter(l => l.statut === 'rejected').length;
            const totalDays = leaves.filter(l => l.statut === 'approved').reduce((sum, l) => sum + (l.nombre_jours || 0), 0);
            
            setGlobalStats({
                totalEmployees: statsRes.data.employees || 0,
                totalManagers: statsRes.data.managers || 0,
                totalRequests: leaves.length,
                approvedRequests: approved,
                pendingRequests: pending,
                rejectedRequests: rejected,
                totalDaysTaken: totalDays,
                avgRequestsPerEmployee: statsRes.data.employees > 0 ? (leaves.length / statsRes.data.employees).toFixed(1) : 0
            });
        } catch (error) {
            console.error('Erreur global stats:', error);
        }
    };

    const fetchMonthlyStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/stats-by-month?year=${selectedYear}`, getAuthHeaders());
            const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
            const data = response.data.map(item => ({
                ...item,
                moisCourt: moisNoms[item.mois_num - 1]?.substring(0, 3) || item.mois_nom?.substring(0, 3)
            }));
            setMonthlyStats(data);
        } catch (error) {
            console.error('Erreur monthly stats:', error);
        }
    };

    const fetchTypeStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/stats-by-type`, getAuthHeaders());
            setTypeStats(response.data);
        } catch (error) {
            console.error('Erreur type stats:', error);
        }
    };

    const fetchEmployeeStats = async () => {
        try {
            const usersRes = await axios.get(`${API_URL}/admin/users`, getAuthHeaders());
            const leavesRes = await axios.get(`${API_URL}/admin/leave-requests`, getAuthHeaders());
            const leaves = leavesRes.data;
            
            const employeeStatsMap = {};
            usersRes.data.forEach(user => {
                if (user.roles && (user.roles.includes('employe') || user.roles.includes('manager'))) {
                    const userLeaves = leaves.filter(l => l.utilisateur_id === user.id);
                    employeeStatsMap[user.id] = {
                        id: user.id,
                        nom: user.nom,
                        prenom: user.prenom,
                        service: user.service || '-',
                        role: user.roles.includes('manager') ? 'Manager' : 'Employé',
                        totalRequests: userLeaves.length,
                        approved: userLeaves.filter(l => l.statut === 'approved').length,
                        pending: userLeaves.filter(l => l.statut === 'pending_manager' || l.statut === 'pending_admin').length,
                        rejected: userLeaves.filter(l => l.statut === 'rejected').length,
                        totalDays: userLeaves.filter(l => l.statut === 'approved').reduce((sum, l) => sum + (l.nombre_jours || 0), 0)
                    };
                }
            });
            
            const sortedStats = Object.values(employeeStatsMap).sort((a, b) => b.totalRequests - a.totalRequests);
            setEmployeeStats(sortedStats.slice(0, 10));
        } catch (error) {
            console.error('Erreur employee stats:', error);
        }
    };

    const fetchServiceStats = async () => {
        try {
            const usersRes = await axios.get(`${API_URL}/admin/users`, getAuthHeaders());
            const leavesRes = await axios.get(`${API_URL}/admin/leave-requests`, getAuthHeaders());
            const leaves = leavesRes.data;
            
            const serviceStatsMap = {};
            usersRes.data.forEach(user => {
                const service = user.service || 'Sans service';
                if (!serviceStatsMap[service]) {
                    serviceStatsMap[service] = { totalRequests: 0, totalEmployees: 0 };
                }
                serviceStatsMap[service].totalEmployees++;
                const userLeaves = leaves.filter(l => l.utilisateur_id === user.id);
                serviceStatsMap[service].totalRequests += userLeaves.length;
            });
            
            const sortedStats = Object.entries(serviceStatsMap)
                .map(([service, data]) => ({
                    service,
                    totalRequests: data.totalRequests,
                    totalEmployees: data.totalEmployees,
                    avgRequestsPerEmployee: (data.totalRequests / data.totalEmployees).toFixed(1)
                }))
                .sort((a, b) => b.totalRequests - a.totalRequests);
            
            setServiceStats(sortedStats);
        } catch (error) {
            console.error('Erreur service stats:', error);
        }
    };

    const fetchAvailableYears = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/available-years`, getAuthHeaders());
            setAvailableYears(response.data);
        } catch (error) {
            setAvailableYears([2024, 2025, 2026]);
        }
    };

    const formatNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? '0' : num.toLocaleString();
    };

    const tauxApprobation = globalStats.totalRequests > 0 
        ? Math.round((globalStats.approvedRequests / globalStats.totalRequests) * 100) 
        : 0;

    const pendingData = [
        { name: 'Approuvées', value: globalStats.approvedRequests, color: '#10b981' },
        { name: 'En attente', value: globalStats.pendingRequests, color: '#f59e0b' },
        { name: 'Refusées', value: globalStats.rejectedRequests, color: '#ef4444' }
    ].filter(s => s.value > 0);

    const maxMonthly = Math.max(...monthlyStats.map(m => m.total || 0), 1);

    if (loading) {
        return (
            <div className="loading-container" style={{ minHeight: '400px' }}>
                <div className="loading-spinner"></div>
                <div>Chargement des statistiques...</div>
            </div>
        );
    }

    return (
        <div className="admin-stats-container">
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">📊 Statistiques globales</h1>
                    <p className="dashboard-subtitle">Analyse complète des congés de l'entreprise</p>
                </div>
            </div>

            {/* Cartes KPI */}
            <div className="stats-cards-grid">
                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Employés</span>
                        <span className="stat-card-progress-value">{globalStats.totalEmployees + globalStats.totalManagers}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#667eea" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - (globalStats.totalEmployees + globalStats.totalManagers) / 100)}`}
                                transform="rotate(-90 60 60)" strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#667eea">{globalStats.totalEmployees + globalStats.totalManagers}</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">total utilisateurs</div>
                </div>

                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Total demandes</span>
                        <span className="stat-card-progress-value">{globalStats.totalRequests}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#667eea" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - globalStats.totalRequests / Math.max(globalStats.totalRequests, 100))}`}
                                transform="rotate(-90 60 60)" strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#667eea">{globalStats.totalRequests}</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">demandes totales</div>
                </div>

                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Taux approbation</span>
                        <span className="stat-card-progress-value">{tauxApprobation}%</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#10b981" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - tauxApprobation / 100)}`}
                                transform="rotate(-90 60 60)" strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#10b981">{tauxApprobation}%</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">des demandes approuvées</div>
                </div>

                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Jours pris</span>
                        <span className="stat-card-progress-value">{globalStats.totalDaysTaken}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#f59e0b" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - globalStats.totalDaysTaken / Math.max(globalStats.totalDaysTaken, 500))}`}
                                transform="rotate(-90 60 60)" strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#f59e0b">{globalStats.totalDaysTaken}</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">jours de congés pris</div>
                </div>
            </div>

            {/* Deuxième ligne KPI */}
            <div className="stats-cards-grid secondary">
                <div className="kpi-card">
                    <div className="kpi-icon-wrapper blue">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{globalStats.avgRequestsPerEmployee}</div>
                        <div className="kpi-label">Moyenne par employé</div>
                        <div className="kpi-trend neutral">demandes/employé</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon-wrapper green">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{globalStats.totalManagers}</div>
                        <div className="kpi-label">Managers</div>
                        <div className="kpi-trend neutral">encadrement</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon-wrapper orange">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{globalStats.pendingRequests}</div>
                        <div className="kpi-label">Demandes en attente</div>
                        <div className="kpi-trend neutral">à traiter</div>
                    </div>
                </div>
            </div>

            {/* Onglets */}
            <div className="statistics-tabs-container">
                <div className="statistics-tabs">
                    <button className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`} onClick={() => setActiveTab('global')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/>
                        </svg>
                        Évolution
                    </button>
                    <button className={`tab-btn ${activeTab === 'distribution' ? 'active' : ''}`} onClick={() => setActiveTab('distribution')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/>
                        </svg>
                        Répartition
                    </button>
                    <button className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        Par employé
                    </button>
                    <button className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        Par service
                    </button>
                </div>
            </div>

            {/* Contenu des onglets */}
            {activeTab === 'global' && (
                <div className="charts-container">
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <h3>Évolution des demandes par mois</h3>
                            <div className="year-selector">
                                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                                    {availableYears.map(year => (<option key={year} value={year}>{year}</option>))}
                                </select>
                            </div>
                        </div>
                        {monthlyStats.length > 0 && monthlyStats.some(m => m.total > 0) ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={monthlyStats} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="moisCourt" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, maxMonthly + 1]} />
                                    <Tooltip formatter={(value) => [`${value} demande(s)`, 'Nombre']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Legend />
                                    <Bar dataKey="total" fill="#667eea" name="Demandes" radius={[8, 8, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="info-box text-center">Aucune donnée de demandes pour {selectedYear}</div>
                        )}
                    </div>

                    <div className="chart-card">
                        <h3>Évolution linéaire des demandes</h3>
                        {monthlyStats.length > 0 && monthlyStats.some(m => m.total > 0) ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={monthlyStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="moisCourt" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(value) => [`${value} demande(s)`, 'Nombre']} />
                                    <Legend />
                                    <Line type="monotone" dataKey="total" stroke="#667eea" name="Demandes" strokeWidth={3} dot={{ r: 6, fill: '#667eea' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="info-box text-center">Aucune donnée disponible</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'distribution' && (
                <div className="charts-container">
                    <div className="charts-row-modern" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className="chart-card">
                            <h3>Répartition par statut</h3>
                            {pendingData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={pendingData} cx="50%" cy="50%" labelLine={true} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value" nameKey="name">
                                            {pendingData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${value} demande(s)`, 'Nombre']} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="info-box text-center">Aucune donnée</div>
                            )}
                        </div>

                        <div className="chart-card">
                            <h3>Répartition par type de congé</h3>
                            {typeStats.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={typeStats} cx="50%" cy="50%" labelLine={true} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="total" nameKey="type">
                                            {typeStats.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${value} demande(s)`, 'Nombre']} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="info-box text-center">Aucune donnée</div>
                            )}
                        </div>
                    </div>

                    <div className="chart-card">
                        <h3>Répartition par statut (barres)</h3>
                        <div className="horizontal-bars-container">
                            {pendingData.map((stat, index) => {
                                const total = globalStats.totalRequests;
                                const percentage = total > 0 ? Math.round((stat.value / total) * 100) : 0;
                                return (
                                    <div key={index} className="horizontal-bar-item">
                                        <div className="horizontal-bar-label">{stat.name}</div>
                                        <div className="horizontal-bar-wrapper">
                                            <div className="horizontal-bar-fill" style={{ width: `${percentage}%`, backgroundColor: stat.color }}>
                                                <span className="horizontal-bar-value">{stat.value} demande(s)</span>
                                            </div>
                                        </div>
                                        <div className="horizontal-bar-percent">{percentage}%</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'employees' && (
                <div className="team-table-container">
                    <h4>Top 10 des employés les plus demandeurs</h4>
                    <div className="table-responsive">
                        <table className="team-stats-table">
                            <thead>
                                <tr>
                                    <th>Employé</th>
                                    <th>Service</th>
                                    <th>Rôle</th>
                                    <th>Total demandes</th>
                                    <th>Approuvées</th>
                                    <th>Refusées</th>
                                    <th>En attente</th>
                                    <th>Jours pris</th>
                                    <th>Taux succès</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeStats.map((emp, idx) => {
                                    const taux = emp.totalRequests > 0 ? Math.round((emp.approved / emp.totalRequests) * 100) : 0;
                                    return (
                                        <tr key={emp.id}>
                                            <td><strong>{emp.prenom} {emp.nom}</strong></td>
                                            <td>{emp.service}</td>
                                            <td><span className={`role-badge-${emp.role === 'Manager' ? 'manager' : 'employee'}`}>{emp.role}</span></td>
                                            <td>{emp.totalRequests}</td>
                                            <td><span className="status-badge approved">{emp.approved}</span></td>
                                            <td><span className="status-badge rejected">{emp.rejected}</span></td>
                                            <td><span className="status-badge pending">{emp.pending}</span></td>
                                            <td>{emp.totalDays} jours</td>
                                            <td>
                                                <div className="mini-progress">
                                                    <div className="mini-progress-bar" style={{ width: `${taux}%`, background: taux >= 70 ? '#10b981' : taux >= 40 ? '#f59e0b' : '#ef4444' }}></div>
                                                    <span className="mini-progress-text">{taux}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {employeeStats.length === 0 && (
                                    <tr><td colSpan="9" className="text-center" style={{ padding: '40px' }}>Aucune donnée disponible</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'services' && (
                <div className="team-table-container">
                    <h4>Statistiques par service</h4>
                    <div className="table-responsive">
                        <table className="team-stats-table">
                            <thead>
                                <tr>
                                    <th>Service</th>
                                    <th>Employés</th>
                                    <th>Total demandes</th>
                                    <th>Moyenne/employé</th>
                                    <th>Proportion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serviceStats.map((service, idx) => {
                                    const totalRequestsAll = serviceStats.reduce((sum, s) => sum + s.totalRequests, 0);
                                    const percentage = totalRequestsAll > 0 ? Math.round((service.totalRequests / totalRequestsAll) * 100) : 0;
                                    return (
                                        <tr key={idx}>
                                            <td><strong>{service.service}</strong></td>
                                            <td>{service.totalEmployees}</td>
                                            <td>{service.totalRequests}</td>
                                            <td>{service.avgRequestsPerEmployee} demande(s)</td>
                                            <td>
                                                <div className="mini-progress">
                                                    <div className="mini-progress-bar" style={{ width: `${percentage}%`, background: '#667eea' }}></div>
                                                    <span className="mini-progress-text">{percentage}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {serviceStats.length === 0 && (
                                    <tr><td colSpan="5" className="text-center" style={{ padding: '40px' }}>Aucune donnée disponible</td></tr>
                                )}
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
                    <strong>Analyse :</strong> Ces statistiques vous permettent de suivre l'activité des congés dans l'entreprise. 
                    Utilisez les filtres pour analyser par période et identifier les tendances.
                </div>
            </div>
        </div>
    );
}

export default AdminStatistics;