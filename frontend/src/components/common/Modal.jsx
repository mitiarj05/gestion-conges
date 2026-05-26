// frontend/src/components/common/Modal.jsx
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, title, children }) {
    const modalRoot = useRef(null);
    
    useEffect(() => {
        // Créer un élément div pour la modale s'il n'existe pas
        if (!modalRoot.current) {
            modalRoot.current = document.createElement('div');
            modalRoot.current.id = 'modal-root';
            document.body.appendChild(modalRoot.current);
        }
        
        return () => {
            if (modalRoot.current && document.body.contains(modalRoot.current)) {
                document.body.removeChild(modalRoot.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="modal-close" onClick={onClose}>✖</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );

    // Utiliser createPortal pour éviter les problèmes de DOM
    if (modalRoot.current) {
        return createPortal(modalContent, modalRoot.current);
    }
    
    return createPortal(modalContent, document.body);
}

export default Modal;