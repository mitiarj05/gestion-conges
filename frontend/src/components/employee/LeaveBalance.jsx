// frontend/src/components/employee/LeaveBalance.jsx
import React from 'react';

function LeaveBalance({ balance }) {
    const utilisationCP = balance.cp_total > 0 ? Math.round((balance.cp_pris / balance.cp_total) * 100) : 0;
    
    return (
        <div className="stats-dashboard">
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Mon solde de congés</h1>
                    <p className="dashboard-subtitle">État détaillé de vos droits à congés</p>
                </div>
            </div>
            
            <div className="stats-cards-grid">
                <div className="stat-card-progress">
                    <div className="stat-card-progress-header">
                        <span className="stat-card-progress-title">Congés Payés</span>
                        <span className="stat-card-progress-value">{balance.cp_restant || 0} jours</span>
                    </div>
                    <div className="progress-circle-container">
                        <svg viewBox="0 0 120 120" className="progress-circle" width="100" height="100">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#10b981" strokeWidth="8" 
                                strokeDasharray={`${2 * Math.PI * 54}`} 
                                strokeDashoffset={`${2 * Math.PI * 54 * (1 - (balance.cp_pris || 0) / (balance.cp_total || 25))}`}
                                transform="rotate(-90 60 60)"
                                strokeLinecap="round"
                            />
                            <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#10b981">{utilisationCP}%</text>
                        </svg>
                    </div>
                    <div className="stat-card-progress-footer">
                        Total: {balance.cp_total || 25} jours · Pris: {balance.cp_pris || 0} jours
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon-wrapper blue">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
                        </svg>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">Illimité</div>
                        <div className="kpi-label">Congé sans solde</div>
                        <div className="kpi-trend neutral">Non rémunéré · max 5j consécutifs</div>
                    </div>
                </div>
            </div>
            
            <div className="info-card-tip">
                <div className="tip-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                </div>
                <div className="tip-content">
                    <strong>Détail :</strong> Les Congés Payés (CP) s'acquièrent à raison de 2.08 jours par mois (25 jours par an). 
                    Le congé sans solde est sur autorisation, non rémunéré, avec un maximum de 5 jours consécutifs. 
                    Les demandes de congé ne peuvent être faites que pour des dates à partir d'aujourd'hui.
                </div>
            </div>
        </div>
    );
}

export default LeaveBalance;