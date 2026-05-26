// frontend/src/components/notifications/ToastNotification.jsx
import React, { useEffect, useState } from 'react';

function ToastNotification({ toasts, removeToast }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        
        // Ajouter les styles d'animation si nécessaire
        if (!document.querySelector('#toast-animation-style')) {
            const style = document.createElement('style');
            style.id = 'toast-animation-style';
            style.textContent = `
                @keyframes toastSlideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes toastProgress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `;
            document.head.appendChild(style);
        }
        
        return () => {
            setMounted(false);
        };
    }, []);

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
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            case 'warning': return '#f59e0b';
            default: return '#3b82f6';
        }
    };

    if (!mounted || toasts.length === 0) return null;

    return (
        <div 
            className="toast-container"
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 10001,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: '380px'
            }}
        >
            {toasts.map(toast => (
                <div 
                    key={toast.id} 
                    className={`toast-notification toast-${toast.type}`}
                    style={{
                        backgroundColor: getBackgroundColor(toast.type),
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden',
                        animation: 'toastSlideIn 0.3s ease'
                    }}
                >
                    <div 
                        className="toast-content"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 16px',
                            gap: '12px',
                            color: 'white'
                        }}
                    >
                        <span className="toast-icon" style={{ fontSize: '18px' }}>
                            {getIcon(toast.type)}
                        </span>
                        <span className="toast-message" style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>
                            {toast.message}
                        </span>
                        <button 
                            className="toast-close" 
                            onClick={() => removeToast(toast.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                fontSize: '14px',
                                cursor: 'pointer',
                                padding: '4px',
                                opacity: 0.7,
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        >
                            ✕
                        </button>
                    </div>
                    <div 
                        className="toast-progress"
                        style={{
                            height: '3px',
                            backgroundColor: 'rgba(255, 255, 255, 0.3)'
                        }}
                    >
                        <div 
                            className="toast-progress-bar" 
                            style={{
                                height: '100%',
                                width: '100%',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                animation: `toastProgress ${toast.duration}ms linear forwards`
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ToastNotification;