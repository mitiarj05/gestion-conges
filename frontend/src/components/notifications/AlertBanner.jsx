// frontend/src/components/notifications/AlertBanner.jsx
import React, { useState, useEffect } from 'react';
import { hasLowBalanceAlert, getBalanceAlertMessage } from '../../utils/dateUtils';

function AlertBanner({ balance }) {
    const [alerts, setAlerts] = useState([]);
    const [dismissed, setDismissed] = useState(false);

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