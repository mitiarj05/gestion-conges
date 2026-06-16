// frontend/src/components/employee/StatisticsChart.jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function StatisticsChart({ requests, balance }) {
    const [activeTab, setActiveTab] = useState('monthly');
    const [monthlyData, setMonthlyData] = useState([]);
    const [typeStats, setTypeStats] = useState([]);
    const [statusStats, setStatusStats] = useState([]);
    const [totalDemandes, setTotalDemandes] = useState(0);
    const [totalConges, setTotalConges] = useState(0);
    const [totalJoursPris, setTotalJoursPris] = useState(0);
    const [totalPermissionHeures, setTotalPermissionHeures] = useState(0);
    const [totalPermissions, setTotalPermissions] = useState(0);
    const [tauxApprobation, setTauxApprobation] = useState(0);

    const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    useEffect(() => {
        calculateStats();
    }, [requests, balance]);

    const formatNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? '0' : num.toFixed(0);
    };

    const calculateStats = () => {
        // 1. Données mensuelles
        const months = {};
        const currentYear = new Date().getFullYear();
        const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        
        for (let i = 0; i < 12; i++) {
            months[moisNoms[i]] = 0;
        }
        
        requests.forEach(req => {
            if (req.status === 'approved' && req.request_type !== 'permission' && req.start_date) {
                const date = new Date(req.start_date);
                if (date.getFullYear() === currentYear) {
                    const monthName = moisNoms[date.getMonth()];
                    months[monthName] = (months[monthName] || 0) + (req.duration || 0);
                }
            }
        });
        
        const monthlyDataArray = Object.entries(months).map(([month, jours]) => ({
            month,
            jours: parseFloat(jours) || 0
        }));
        setMonthlyData(monthlyDataArray);
        
        // 2. Total des demandes
        const conges = requests.filter(r => r.request_type !== 'permission' && !r.isPermission);
        const permissions = requests.filter(r => r.isPermission || r.type_id === 3);
        
        setTotalConges(conges.length);
        setTotalPermissions(permissions.length);
        setTotalDemandes(conges.length + permissions.length);
        
        // 3. Jours pris et heures de permission
        const totalJours = conges
            .filter(r => r.status === 'approved')
            .reduce((sum, r) => sum + (r.duration || 0), 0);
        setTotalJoursPris(totalJours);
        
        const totalHeures = permissions
            .filter(r => r.status === 'approved')
            .reduce((sum, r) => sum + (r.duree_heures || r.duration || 0), 0);
        setTotalPermissionHeures(totalHeures);
        
        // 4. Taux d'approbation (uniquement sur les congés)
        const approuvees = conges.filter(r => r.status === 'approved').length;
        setTauxApprobation(conges.length > 0 ? Math.round((approuvees / conges.length) * 100) : 0);
        
        // 5. Statistiques par type
        const cpPris = conges
            .filter(r => r.status === 'approved' && (r.type_id === 1 || r.type === 'Congés Payés'))
            .reduce((sum, r) => sum + (r.duration || 0), 0);
        
        const sansSoldePris = conges
            .filter(r => r.status === 'approved' && (r.type_id === 2 || r.type === 'Congé sans solde'))
            .reduce((sum, r) => sum + (r.duration || 0), 0);
        
        const permCount = permissions.filter(r => r.status === 'approved').length;
        const permHeures = permissions.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.duree_heures || r.duration || 0), 0);
        
        setTypeStats([
            { name: '🏖️ Congés Payés', value: cpPris, total: balance.cp_total || 25, color: '#667eea' },
            { name: '📝 Congé sans solde', value: sansSoldePris, total: 0, color: '#10b981' },
            { name: '⏰ Permissions', value: permCount, total: balance.permissions_max || 2, color: '#f59e0b', heures: permHeures }
        ]);
        
        // 6. Statistiques par statut (uniquement sur les congés)
        const pendingManager = conges.filter(r => r.status === 'pending_manager').length;
        const pendingAdmin = conges.filter(r => r.status === 'pending_admin').length;
        const approved = conges.filter(r => r.status === 'approved').length;
        const rejected = conges.filter(r => r.status === 'rejected').length;
        
        // Ajouter les permissions en attente
        const permPending = permissions.filter(r => r.status === 'pending_manager' || r.status === 'pending_admin').length;
        const permApproved = permissions.filter(r => r.status === 'approved').length;
        
        setStatusStats([
            { name: 'Approuvées', value: approved + permApproved, color: '#10b981' },
            { name: 'En attente manager', value: pendingManager, color: '#3b82f6' },
            { name: 'En attente admin', value: pendingAdmin + permPending, color: '#f59e0b' },
            { name: 'Refusées', value: rejected, color: '#ef4444' }
        ]);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
                    <p style={{ margin: '5px 0 0 0', color: '#667eea' }}>
                        {payload[0].value} jour(s)
                    </p>
                </div>
            );
        }
        return null;
    };

    const utilisationCP = balance.cp_total > 0 ? Math.round((balance.cp_pris / balance.cp_total) * 100) : 0;
    const totalEnAttente = (statusStats.find(s => s.name === 'En attente manager')?.value || 0) + 
                           (statusStats.find(s => s.name === 'En attente admin')?.value || 0);
    const totalRefusees = statusStats.find(s => s.name === 'Refusées')?.value || 0;
    const totalApprouvees = statusStats.find(s => s.name === 'Approuvées')?.value || 0;

    return (
        <div className="stats-dashboard">
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Mes statistiques personnelles</h1>
                    <p className="dashboard-subtitle">Analyse détaillée de vos congés et permissions</p>
                </div>
            </div>
            
            {/* Cartes KPI modernes */}
            <div className="stats-cards-grid">
                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Total demandes</span>
                        <span className="stat-card-progress-value">{totalDemandes}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#667eea" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - totalDemandes / Math.max(totalDemandes, 100))}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#667eea">{totalDemandes}</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">demandes totales</div>
                </div>

                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">🏖️ Congés</span>
                        <span className="stat-card-progress-value">{totalConges}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#667eea" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - totalConges / Math.max(totalConges, 100))}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#667eea">{totalConges}</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">{totalJoursPris} jours pris</div>
                </div>

                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">⏰ Permissions</span>
                        <span className="stat-card-progress-value">{totalPermissions}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#f59e0b" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - totalPermissions / Math.max(totalPermissions, 10))}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#f59e0b">{totalPermissions}</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">{totalPermissionHeures}h utilisées</div>
                </div>

                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Approuvées</span>
                        <span className="stat-card-progress-value">{totalApprouvees}</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#10b981" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - tauxApprobation / 100)}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#10b981">{tauxApprobation}%</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">taux d'approbation</div>
                </div>
            </div>

            {/* Deuxième ligne */}
            <div className="stats-cards-grid secondary">
                <div className="kpi-card">
                    <div className="kpi-icon-wrapper blue">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/>
                        </svg>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{tauxApprobation}%</div>
                        <div className="kpi-label">Taux d'approbation</div>
                        <div className="kpi-trend positive">{totalApprouvees} / {totalDemandes} approuvées</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon-wrapper green">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
                        </svg>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{formatNumber(totalJoursPris)} jours</div>
                        <div className="kpi-label">Total jours de congés pris</div>
                        <div className="kpi-trend neutral">depuis le début</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon-wrapper orange">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{utilisationCP}%</div>
                        <div className="kpi-label">Utilisation CP</div>
                        <div className="kpi-trend neutral">{balance.cp_pris || 0}/{balance.cp_total || 25} jours</div>
                    </div>
                </div>
            </div>
            
            {/* Onglets */}
            <div className="statistics-tabs-container">
                <div className="statistics-tabs">
                    <button className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`} onClick={() => setActiveTab('monthly')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Par mois
                    </button>
                    <button className={`tab-btn ${activeTab === 'types' ? 'active' : ''}`} onClick={() => setActiveTab('types')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/>
                        </svg>
                        Par type
                    </button>
                    <button className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                            <path d="M2 12L7 2M22 12L17 2M12 2v20M2 12h20M2 12a10 10 0 0020 0M2 12a10 10 0 0120 0"/>
                        </svg>
                        Par statut
                    </button>
                </div>
            </div>
            
            {/* Graphiques */}
            <div className="charts-container">
                {activeTab === 'monthly' && (
                    <div className="chart-card">
                        <h3>Jours de congés pris par mois - {new Date().getFullYear()}</h3>
                        {monthlyData.some(d => d.jours > 0) ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis 
                                        dataKey="month" 
                                        tick={{ fontSize: 12 }}
                                        interval={0}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} label={{ value: 'Jours', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="jours" fill="#667eea" name="Jours de congés" radius={[8, 8, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="info-box text-center">Aucune donnée de congés pour cette année</div>
                        )}
                    </div>
                )}
                
                {activeTab === 'types' && (
                    <div className="chart-card">
                        <h3>Répartition par type</h3>
                        <div className="horizontal-bars-container">
                            {typeStats.map((stat, index) => {
                                const total = typeStats.reduce((sum, s) => sum + s.value, 0);
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
                                                <span className="horizontal-bar-value">
                                                    {stat.name === '⏰ Permissions' ? `${stat.value} perm. (${stat.heures || 0}h)` : `${stat.value} jour(s)`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="horizontal-bar-percent">{percentage}%</div>
                                    </div>
                                );
                            })}
                        </div>
                        {typeStats.every(s => s.value === 0) && (
                            <div className="info-box text-center" style={{ marginTop: '20px' }}>
                                Aucune donnée disponible
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'status' && (
                    <div className="chart-card">
                        <h3>Répartition par statut</h3>
                        {statusStats.some(s => s.value > 0) ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        data={statusStats.filter(s => s.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={true}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {statusStats.filter(s => s.value > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} demande(s)`, 'Nombre']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="info-box text-center">Aucune donnée de demande pour le moment</div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="info-card-tip">
                <div className="tip-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                </div>
                <div className="tip-content">
                    <strong>Conseils :</strong> Utilisez l'onglet "Par mois" pour voir votre consommation de congés dans l'année. 
                    Le taux d'approbation vous aide à suivre l'acceptation de vos demandes. 
                    Les <strong>congés</strong> (🏖️) et les <strong>permissions</strong> (⏰) sont maintenant inclus dans vos statistiques.
                </div>
            </div>
        </div>
    );
}

export default StatisticsChart;