import React from 'react';

function LeaveBalance({ balance }) {
    return (
        <div>
            <h2>💰 Mon solde de congés</h2>
            <div className="cards-grid">
                <div className="card">
                    <h3>🏖️ Congés Payés</h3>
                    <div className="value">{balance.cp_restant || 0} jours</div>
                    <div className="small">
                        Total annuel: {balance.cp_total || 25} jours<br/>
                        Pris: {balance.cp_pris || 0} jours
                    </div>
                </div>
                <div className="card">
                    <h3>📅 Réduction du Temps de Travail (RTT)</h3>
                    <div className="value">{balance.rtt_restant || 0} jours</div>
                    <div className="small">
                        Total annuel: {balance.rtt_total || 12} jours<br/>
                        Pris: {balance.rtt_pris || 0} jours
                    </div>
                </div>
                <div className="card">
                    <h3>⏰ Permissions</h3>
                    <div className="value">{balance.permission || 0}h</div>
                    <div className="small">Restantes ce mois / 4h max</div>
                </div>
            </div>
            <div className="info-box">
                <strong>📊 Détail :</strong><br/>
                • Congés Payés (CP) : acquisition de 2.08 jours par mois (25 jours par an)<br/>
                • Réduction du Temps de Travail (RTT) : environ 1 jour par mois (12 jours par an selon accord)<br/>
                • Permission : maximum 4 heures par mois<br/>
                • 📅 ⚠️ Les demandes de congé ne peuvent être faites que pour des dates **aujourd'hui ou dans le futur**.
            </div>
        </div>
    );
}

export default LeaveBalance;