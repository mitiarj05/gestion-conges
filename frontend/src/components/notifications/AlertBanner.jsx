// frontend/src/components/notifications/AlertBanner.jsx
import React, { useState, useEffect } from 'react';

function AlertBanner({ balance }) {
    const [alerts, setAlerts] = useState([]);
    const [dismissed, setDismissed] = useState(false);

    const hasLowBalanceAlert = (balance, threshold = 5) => {
        return balance.cp_restant < threshold;
    };

    const getBalanceAlertMessage = (balance) => {
        const alerts = [];
        if (balance.cp_restant < 5) {
            alerts.push(`⚠️ Congés Payés : il vous reste ${balance.cp_restant} jours`);
        }
        return alerts;
    };

    useEffect(() => {
        if (balance && hasLowBalanceAlert(balance)) {
            setAlerts(getBalanceAlertMessage(balance));
        } else {
            setAlerts([]);
        }
    }, [balance]);

    if (alerts.length === 0 || dismissed) return null;

    return (
        <div className="alert-banner">
            <div className="alert-content">
                <span className="alert-icon">⚠️</span>
                <div className="alert-messages">
                    {alerts.map((alert, index) => (
                        <div key={index}>{alert}</div>
                    ))}
                </div>
                <button className="alert-close" onClick={() => setDismissed(true)}>✖</button>
            </div>
        </div>
    );
}

export default AlertBanner;