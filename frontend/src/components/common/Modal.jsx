// frontend/src/components/common/Modal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, title, children }) {
    const [mounted, setMounted] = useState(false);
    const modalRootRef = useRef(null);

    // Créer le conteneur de modale au montage
    useEffect(() => {
        // Vérifier si le conteneur existe déjà
        let existingRoot = document.getElementById('modal-root');
        
        if (!existingRoot) {
            const div = document.createElement('div');
            div.id = 'modal-root';
            document.body.appendChild(div);
            modalRootRef.current = div;
        } else {
            modalRootRef.current = existingRoot;
        }
        
        setMounted(true);
        
        return () => {
            // Ne pas supprimer le conteneur pour éviter les erreurs
            // Le conteneur reste dans le DOM
            modalRootRef.current = null;
        };
    }, []);

    // Gérer la fermeture avec la touche Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && onClose) {
                onClose();
            }
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Empêcher le scroll du body uniquement si la modale est ouverte
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Ne pas rendre la modale si elle n'est pas ouverte ou si on n'est pas monté
    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div 
            className="modal-overlay" 
            onClick={onClose}
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
                zIndex: 1000,
                backdropFilter: 'blur(4px)'
            }}
        >
            <div 
                className="modal" 
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-card, white)',
                    borderRadius: '16px',
                    maxWidth: '90vw',
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
                        borderBottom: '1px solid var(--border-light, #e2e8f0)'
                    }}
                >
                    <h3 style={{ margin: 0, color: 'var(--text-primary, #1e293b)' }}>{title}</h3>
                    <button 
                        className="modal-close" 
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary, #64748b)',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-hover, #f1f5f9)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        ✖
                    </button>
                </div>
                <div 
                    className="modal-body"
                    style={{
                        padding: '24px',
                        color: 'var(--text-primary, #1e293b)'
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );

    // Utiliser createPortal avec le conteneur existant
    const targetNode = modalRootRef.current || document.body;
    
    try {
        return createPortal(modalContent, targetNode);
    } catch (error) {
        console.error('Erreur lors du rendu de la modale:', error);
        // Fallback: rendre directement sans portal
        return modalContent;
    }
}

export default Modal;