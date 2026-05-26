// frontend/src/hooks/useToast.js
import { useState, useCallback, useRef, useEffect } from 'react';

console.log('📁 [useToast] Hook chargé');

const useToast = () => {
    const [toasts, setToasts] = useState([]);
    const isMounted = useRef(true);
    const timeoutsRef = useRef({});

    useEffect(() => {
        isMounted.current = true;
        console.log('📦 [useToast] Montage');
        
        return () => {
            console.log('🗑️ [useToast] Démontage - nettoyage des timeouts');
            isMounted.current = false;
            // Nettoyer tous les timeouts
            Object.values(timeoutsRef.current).forEach(timeout => {
                if (timeout) clearTimeout(timeout);
            });
            timeoutsRef.current = {};
        };
    }, []);

    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        if (!isMounted.current) return;
        
        const id = Date.now() + Math.random();
        console.log(`📢 [useToast] Ajout toast: ${message} (${type})`);
        
        setToasts(prev => [...prev, { id, message, type, duration }]);
        
        // Auto-supprimer après la durée
        const timeoutId = setTimeout(() => {
            if (isMounted.current) {
                console.log(`⏰ [useToast] Auto-suppression toast ${id}`);
                setToasts(prev => prev.filter(toast => toast.id !== id));
                delete timeoutsRef.current[id];
            }
        }, duration);
        
        timeoutsRef.current[id] = timeoutId;
    }, []);

    const removeToast = useCallback((id) => {
        if (!isMounted.current) return;
        
        console.log(`❌ [useToast] Suppression toast ${id}`);
        // Nettoyer le timeout si existe
        if (timeoutsRef.current[id]) {
            clearTimeout(timeoutsRef.current[id]);
            delete timeoutsRef.current[id];
        }
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
    const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
    const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);
    const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);

    return { toasts, addToast, removeToast, success, error, warning, info };
};

export default useToast;