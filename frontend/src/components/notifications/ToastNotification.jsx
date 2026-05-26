// frontend/src/components/notifications/ToastNotification.jsx
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

function ToastNotification({ toasts, removeToast }) {
    const [mounted, setMounted] = useState(false);
    const toastRootRef = useRef(null);

    useEffect(() => {
        console.log('🔧 [Toast] Montage du composant');
        
        let container = document.getElementById('toast-root');
        
        if (!container) {
            console.log('📁 [Toast] Création du conteneur #toast-root');
            container = document.createElement('div');
            container.id = 'toast-root';
            document.body.appendChild(container);
        } else {
            console.log('📁 [Toast] Conteneur existant trouvé');
        }
        
        toastRootRef.current = container;
        setMounted(true);
        
        return () => {
            console.log('🗑️ [Toast] Nettoyage - ne pas supprimer le conteneur');
            // NE PAS supprimer le conteneur
            toastRootRef.current = null;
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

    if (!mounted) return null;

    if (toasts.length === 0) return null;

    const toastContent = (
        <div 
            className="toast-container"
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}
        >
            {toasts.map(toast => (
                <div 
                    key={toast.id} 
                    className={`toast-notification toast-${toast.type}`}
                    style={{
                        backgroundColor: getBackgroundColor(toast.type),
                        color: 'white',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        minWidth: '280px',
                        maxWidth: '400px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        animation: 'slideInRight 0.3s ease-out',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div 
                        className="toast-content"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}
                    >
                        <span className="toast-icon" style={{ fontSize: '20px' }}>
                            {getIcon(toast.type)}
                        </span>
                        <span className="toast-message" style={{ flex: 1, fontSize: '14px' }}>
                            {toast.message}
                        </span>
                        <button 
                            className="toast-close" 
                            onClick={() => removeToast(toast.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '4px',
                                borderRadius: '4px',
                                opacity: 0.7
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
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            backgroundColor: 'rgba(255,255,255,0.3)'
                        }}
                    >
                        <div 
                            className="toast-progress-bar" 
                            style={{
                                height: '100%',
                                width: '100%',
                                backgroundColor: 'rgba(255,255,255,0.8)',
                                animation: `shrink ${toast.duration}ms linear forwards`
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );

    const container = toastRootRef.current || document.body;
    
    try {
        return createPortal(toastContent, container);
    } catch (error) {
        console.error('❌ [Toast] Erreur createPortal:', error);
        return toastContent;
    }
}

// Ajouter les animations CSS globalement
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes shrink {
        from {
            width: 100%;
        }
        to {
            width: 0%;
        }
    }
`;
if (!document.querySelector('#toast-animations')) {
    style.id = 'toast-animations';
    document.head.appendChild(style);
}

export default ToastNotification;