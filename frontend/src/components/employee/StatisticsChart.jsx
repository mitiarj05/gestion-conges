// frontend/src/components/employee/StatisticsChart.jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function StatisticsChart({ requests, balance }) {
    const [activeTab, setActiveTab] = useState('monthly');
    const [monthlyData, setMonthlyData] = useState([]);
    const [typeStats, setTypeStats] = useState([]);
    const [statusStats, setStatusStats] = useState([]);
    const [totalDemandes, setTotalDemandes] = useState(0);
    const [totalJoursPris, setTotalJoursPris] = useState(0);
    const [tauxApprobation, setTauxApprobation] = useState(0);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    useEffect(() => {
        calculateStats();
    }, [requests, balance]);

    const calculateStats = () => {
        // 1. Données mensuelles
        const months = {};
        const currentYear = new Date().getFullYear();
        const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        
        // Initialiser tous les mois à 0
        for (let i = 0; i < 12; i++) {
            months[moisNoms[i]] = 0;
        }
        
        // Compter les jours pris par mois (uniquement demandes approuvées)
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
        
        // 2. Total des demandes et jours pris
        const validRequests = requests.filter(r => r.request_type !== 'permission');
        setTotalDemandes(validRequests.length);
        
        const totalJours = validRequests
            .filter(r => r.status === 'approved')
            .reduce((sum, r) => sum + (r.duration || 0), 0);
        setTotalJoursPris(totalJours);
        
        // 3. Taux d'approbation
        const approuvees = validRequests.filter(r => r.status === 'approved').length;
        setTauxApprobation(validRequests.length > 0 ? Math.round((approuvees / validRequests.length) * 100) : 0);
        
        // 4. Statistiques par type (2 types seulement)
        const cpPris = validRequests
            .filter(r => r.status === 'approved' && (r.type_id === 1 || r.type === 'Congés Payés'))
            .reduce((sum, r) => sum + (r.duration || 0), 0);
        
        const sansSoldePris = validRequests
            .filter(r => r.status === 'approved' && (r.type_id === 2 || r.type === 'Congé sans solde'))
            .reduce((sum, r) => sum + (r.duration || 0), 0);
        
        setTypeStats([
            { name: 'Congés Payés', value: cpPris, total: balance.cp_total || 25, color: '#10b981' },
            { name: 'Congé sans solde', value: sansSoldePris, total: 0, color: '#f59e0b' }
        ]);
        
        // 5. Statistiques par statut
        const pendingManager = validRequests.filter(r => r.status === 'pending_manager').length;
        const pendingAdmin = validRequests.filter(r => r.status === 'pending_admin').length;
        const approved = validRequests.filter(r => r.status === 'approved').length;
        const rejected = validRequests.filter(r => r.status === 'rejected').length;
        
        setStatusStats([
            { name: 'Approuvées', value: approved, color: '#10b981' },
            { name: 'En attente manager', value: pendingManager, color: '#3b82f6' },
            { name: 'En attente admin', value: pendingAdmin, color: '#f59e0b' },
            { name: 'Refusées', value: rejected, color: '#ef4444' }
        ]);
    };

    // Formater le tooltip
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

    return (
        <div>
            <h2>Mes statistiques personnelles</h2>
            
            {/* Cartes de statistiques en haut */}
            <div className="stats-cards-grid">
                <div className="stat-card blue">
                    <div className="stat-card-number">{totalDemandes}</div>
                    <div className="stat-card-label">Total demandes</div>
                </div>
                <div className="stat-card green">
                    <div className="stat-card-number">{statusStats.find(s => s.name === 'Approuvées')?.value || 0}</div>
                    <div className="stat-card-label">Approuvées</div>
                </div>
                <div className="stat-card orange">
                    <div className="stat-card-number">{(statusStats.find(s => s.name === 'En attente manager')?.value || 0) + (statusStats.find(s => s.name === 'En attente admin')?.value || 0)}</div>
                    <div className="stat-card-label">En attente</div>
                </div>
                <div className="stat-card red">
                    <div className="stat-card-number">{statusStats.find(s => s.name === 'Refusées')?.value || 0}</div>
                    <div className="stat-card-label">Refusées</div>
                </div>
            </div>
            
            {/* Deuxième ligne de cartes */}
            <div className="stats-cards-grid secondary">
                <div className="info-card">
                    <div className="info-card-title">Taux d'approbation</div>
                    <div className="info-card-value">{tauxApprobation}%</div>
                    <div className="info-card-sub">{statusStats.find(s => s.name === 'Approuvées')?.value || 0} approuvées sur {totalDemandes} demandes</div>
                </div>
                <div className="info-card">
                    <div className="info-card-title">Total jours pris</div>
                    <div className="info-card-value">{totalJoursPris} jours</div>
                    <div className="info-card-sub">depuis le début</div>
                </div>
                <div className="info-card">
                    <div className="info-card-title">Utilisation CP</div>
                    <div className="info-card-value">{balance.cp_total > 0 ? Math.round((balance.cp_pris / balance.cp_total) * 100) : 0}%</div>
                    <div className="info-card-sub">{balance.cp_pris || 0}/{balance.cp_total || 25} jours</div>
                </div>
            </div>
            
            {/* Onglets */}
            <div className="statistics-tabs-container">
                <div className="statistics-tabs">
                    <button className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`} onClick={() => setActiveTab('monthly')}>
                        Par mois
                    </button>
                    <button className={`tab-btn ${activeTab === 'types' ? 'active' : ''}`} onClick={() => setActiveTab('types')}>
                        Par type
                    </button>
                    <button className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
                        Par statut
                    </button>
                </div>
            </div>
            
            {/* Graphiques */}
            <div className="charts-container">
                {/* Graphique à barres verticales - Par mois */}
                {activeTab === 'monthly' && (
                    <div className="chart-card">
                        <h3>Jours pris par mois - {new Date().getFullYear()}</h3>
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
                                    <YAxis 
                                        tick={{ fontSize: 12 }}
                                        label={{ value: 'Jours', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar 
                                        dataKey="jours" 
                                        fill="#667eea" 
                                        name="Jours de congés" 
                                        radius={[8, 8, 0, 0]}
                                        barSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="info-box text-center">
                                Aucune donnée de congés pour cette année
                            </div>
                        )}
                    </div>
                )}
                
                {/* Graphique à barres horizontales - Par type */}
                {activeTab === 'types' && (
                    <div className="chart-card">
                        <h3>Répartition par type de congé</h3>
                        <div className="horizontal-bars-container">
                            {typeStats.map((stat, index) => (
                                <div key={index} className="horizontal-bar-item">
                                    <div className="horizontal-bar-label">{stat.name}</div>
                                    <div className="horizontal-bar-wrapper">
                                        <div 
                                            className="horizontal-bar-fill"
                                            style={{ 
                                                width: `${stat.total > 0 ? Math.min((stat.value / stat.total) * 100, 100) : stat.value > 0 ? 100 : 0}%`,
                                                backgroundColor: stat.color
                                            }}
                                        >
                                            <span className="horizontal-bar-value">{stat.value} jour(s)</span>
                                        </div>
                                    </div>
                                    {stat.total > 0 && (
                                        <div className="horizontal-bar-percent">
                                            {Math.round((stat.value / stat.total) * 100)}%
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {typeStats.every(s => s.value === 0) && (
                            <div className="info-box text-center" style={{ marginTop: '20px' }}>
                                Aucune donnée de congés pour cette année
                            </div>
                        )}
                    </div>
                )}
                
                {/* Graphique circulaire - Par statut */}
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
                                    <Legend 
                                        layout="vertical" 
                                        align="right" 
                                        verticalAlign="middle"
                                        formatter={(value, entry) => {
                                            const item = statusStats.find(s => s.name === value);
                                            return `${value} (${item?.value || 0})`;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="info-box text-center">
                                Aucune donnée de demande pour le moment
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="info-box">
                <strong>Conseils :</strong><br/>
                • Utilisez l'onglet "Par mois" pour voir votre consommation de congés dans l'année.<br/>
                • Le taux d'approbation vous aide à suivre l'acceptation de vos demandes.<br/>
                • Pensez à planifier vos congés avant la fin de l'année pour ne pas perdre vos jours.
            </div>
        </div>
    );
}

export default StatisticsChart;