// frontend/src/components/employee/LeaveBalance.jsx
import React from 'react';

function LeaveBalance({ balance }) {
    return (
        <div>
            <h2>Mon solde de congés</h2>
            <div className="cards-grid">
                <div className="card">
                    <h3>Congés Payés</h3>
                    <div className="value">{balance.cp_restant || 0} jours</div>
                    <div className="small">
                        Total annuel: {balance.cp_total || 25} jours<br/>
                        Pris: {balance.cp_pris || 0} jours
                    </div>
                </div>
                <div className="card">
                    <h3>Congé sans solde</h3>
                    <div className="value">Illimité</div>
                    <div className="small">
                        Non rémunéré<br/>
                        Maximum 5 jours consécutifs
                    </div>
                </div>
            </div>
            <div className="info-box">
                <strong>Detail :</strong><br/>
                • <strong>Congés Payés (CP)</strong> : acquisition de 2.08 jours par mois (25 jours par an)<br/>
                • <strong>Congé sans solde</strong> : sur autorisation, non rémunéré, max 5 jours consécutifs<br/>
                • Les demandes de congé ne peuvent être faites que pour des dates à partir d'aujourd'hui.
            </div>
        </div>
    );
}

export default LeaveBalance;