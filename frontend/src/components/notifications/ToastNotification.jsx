// frontend/src/components/notifications/ToastNotification.jsx
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

function ToastNotification({ toasts, removeToast }) {
    const [mounted, setMounted] = useState(false);
    const toastRoot = useRef(null);

    useEffect(() => {
        setMounted(true);
        
        // Créer un conteneur pour les toasts s'il n'existe pas
        if (!toastRoot.current) {
            toastRoot.current = document.createElement('div');
            toastRoot.current.id = 'toast-root';
            document.body.appendChild(toastRoot.current);
        }
        
        return () => {
            setMounted(false);
            if (toastRoot.current && document.body.contains(toastRoot.current) && toasts.length === 0) {
                document.body.removeChild(toastRoot.current);
            }
        };
    }, [toasts.length]);

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

    if (!mounted) return null;

    const toastContent = (
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

    const targetRoot = toastRoot.current || document.body;
    return createPortal(toastContent, targetRoot);
}

export default ToastNotification;