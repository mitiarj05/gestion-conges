// frontend/src/components/common/Modal.jsx
import React, { useEffect, useState, useRef } from 'react';

function Modal({ isOpen, onClose, title, children }) {
    const [isMounted, setIsMounted] = useState(false);
    const modalRef = useRef(null);
    const closeTimeoutRef = useRef(null);

    console.log(`🔧 [Modal] Rendu - isOpen: ${isOpen}, title: ${title}`);

    useEffect(() => {
        console.log(`📦 [Modal] Montage du composant Modal`);
        setIsMounted(true);
        
        return () => {
            console.log(`🗑️ [Modal] Démontage du composant Modal`);
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && onClose) {
                console.log(`🔑 [Modal] Fermeture par touche Escape`);
                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = setTimeout(() => {
                    onClose();
                    closeTimeoutRef.current = null;
                }, 10);
            }
        };
        
        if (isOpen) {
            console.log(`👁️ [Modal] Modale ouverte, blocage du scroll`);
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            if (isOpen) {
                console.log(`👁️ [Modal] Modale fermée, restauration du scroll`);
            }
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !isMounted) {
        console.log(`⏭️ [Modal] Rendu ignoré - isOpen: ${isOpen}, isMounted: ${isMounted}`);
        return null;
    }

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && onClose) {
            console.log(`🖱️ [Modal] Clic sur l'overlay, fermeture`);
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = setTimeout(() => {
                onClose();
                closeTimeoutRef.current = null;
            }, 10);
        }
    };

    console.log(`🎨 [Modal] Rendu du contenu visuel`);

    return (
        <div 
            className="modal-overlay" 
            onClick={handleOverlayClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                backdropFilter: 'blur(4px)'
            }}
        >
            <div 
                className="modal" 
                ref={modalRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    width: '90%',
                    maxWidth: '550px',
                    maxHeight: '85vh',
                    overflow: 'auto',
                    boxShadow: '0 20px 35px -8px rgba(0, 0, 0, 0.2)',
                    animation: 'fadeInScale 0.2s ease'
                }}
            >
                <div 
                    className="modal-header"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 20px',
                        borderBottom: '1px solid #e2e8f0',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: 'white',
                        borderRadius: '20px 20px 0 0'
                    }}
                >
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                        {title}
                    </h3>
                    <button 
                        className="modal-close" 
                        onClick={() => {
                            console.log(`❌ [Modal] Clic sur bouton fermer`);
                            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                            closeTimeoutRef.current = setTimeout(() => {
                                onClose();
                                closeTimeoutRef.current = null;
                            }, 10);
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            fontSize: '20px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '50%',
                            transition: 'background 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                        ✕
                    </button>
                </div>
                <div 
                    className="modal-body"
                    style={{
                        padding: '24px',
                        color: '#1e293b'
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Modal;