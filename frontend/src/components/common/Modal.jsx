// frontend/src/components/common/Modal.jsx
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, title, children }) {
    const [mounted, setMounted] = useState(false);
    const modalContainerRef = useRef(null);
    const isClosingRef = useRef(false);

    // Création du conteneur de modale au montage (une seule fois)
    useEffect(() => {
        console.log('🔧 [Modal] Montage du composant');
        
        let container = document.getElementById('react-modal-root');
        
        if (!container) {
            console.log('📁 [Modal] Création du conteneur #react-modal-root');
            container = document.createElement('div');
            container.id = 'react-modal-root';
            document.body.appendChild(container);
        } else {
            console.log('📁 [Modal] Conteneur existant trouvé');
        }
        
        modalContainerRef.current = container;
        setMounted(true);
        
        return () => {
            console.log('🗑️ [Modal] Nettoyage - ne pas supprimer le conteneur');
            // NE PAS supprimer le conteneur ici pour éviter les erreurs
            modalContainerRef.current = null;
        };
    }, []);

    // Gestion de la fermeture par Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && onClose && !isClosingRef.current) {
                console.log('🔑 [Modal] Fermeture par touche Escape');
                isClosingRef.current = true;
                onClose();
                setTimeout(() => {
                    isClosingRef.current = false;
                }, 100);
            }
        };
        
        if (isOpen) {
            console.log('👁️ [Modal] Modale ouverte, ajout des listeners');
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            if (isOpen) {
                console.log('👁️ [Modal] Modale fermée, nettoyage des listeners');
            }
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Ne pas rendre si pas ouvert ou pas monté
    if (!isOpen || !mounted) {
        return null;
    }

    console.log('🎨 [Modal] Rendu du contenu de la modale');

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !isClosingRef.current) {
            console.log('🖱️ [Modal] Clic sur l\'overlay, fermeture');
            isClosingRef.current = true;
            onClose();
            setTimeout(() => {
                isClosingRef.current = false;
            }, 100);
        }
    };

    const modalContent = (
        <div 
            className="modal-overlay" 
            onClick={handleOverlayClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                backdropFilter: 'blur(4px)'
            }}
        >
            <div 
                className="modal" 
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-card, white)',
                    borderRadius: '16px',
                    width: '90%',
                    maxWidth: '600px',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
                }}
            >
                <div 
                    className="modal-header"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '20px 24px',
                        borderBottom: '1px solid var(--border-light, #e2e8f0)',
                        backgroundColor: 'var(--bg-card, white)',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px'
                    }}
                >
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary, #1e293b)' }}>
                        {title}
                    </h3>
                    <button 
                        className="modal-close" 
                        onClick={() => {
                            console.log('❌ [Modal] Clic sur le bouton fermer');
                            if (!isClosingRef.current) {
                                isClosingRef.current = true;
                                onClose();
                                setTimeout(() => {
                                    isClosingRef.current = false;
                                }, 100);
                            }
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary, #64748b)',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            lineHeight: 1
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)';
                            e.currentTarget.style.color = 'var(--text-primary, #1e293b)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary, #64748b)';
                        }}
                    >
                        ✕
                    </button>
                </div>
                <div 
                    className="modal-body"
                    style={{
                        padding: '24px',
                        color: 'var(--text-primary, #1e293b)',
                        backgroundColor: 'var(--bg-card, white)'
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );

    // Utiliser un conteneur stable
    const container = modalContainerRef.current || document.body;
    
    try {
        console.log('📦 [Modal] Portal vers le conteneur:', container.id || 'body');
        return createPortal(modalContent, container);
    } catch (error) {
        console.error('❌ [Modal] Erreur createPortal:', error);
        // Fallback: rendre directement
        return modalContent;
    }
}

export default Modal;