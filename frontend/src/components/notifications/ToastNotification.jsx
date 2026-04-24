// frontend/src/components/notifications/ToastNotification.jsx
import React from 'react';

function ToastNotification({ toasts, removeToast }) {
    const getIcon = (type) => {
        switch(type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    };

    const getBackgroundColor = (type) => {
        switch(type) {
            case 'success': return '#28a745';
            case 'error': return '#dc3545';
            case 'warning': return '#ffc107';
            default: return '#0f3460';
        }
    };

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div 
                    key={toast.id} 
                    className={`toast-notification toast-${toast.type}`}
                    style={{ backgroundColor: getBackgroundColor(toast.type) }}
                >
                    <div className="toast-content">
                        <span className="toast-icon">{getIcon(toast.type)}</span>
                        <span className="toast-message">{toast.message}</span>
                        <button className="toast-close" onClick={() => removeToast(toast.id)}>✖</button>
                    </div>
                    <div className="toast-progress">
                        <div 
                            className="toast-progress-bar" 
                            style={{ animationDuration: `${toast.duration}ms` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ToastNotification;