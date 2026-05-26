// frontend/src/hooks/useSafePortal.js
import { useEffect, useRef, useState } from 'react';

export const useSafePortal = (containerId) => {
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        console.log(`🔧 [Portal:${containerId}] Initialisation`);
        
        const getContainer = () => {
            let container = document.getElementById(containerId);
            
            if (!container) {
                console.log(`📁 [Portal:${containerId}] Création du conteneur`);
                container = document.createElement('div');
                container.id = containerId;
                document.body.appendChild(container);
            }
            
            return container;
        };
        
        containerRef.current = getContainer();
        setMounted(true);
        
        return () => {
            console.log(`🗑️ [Portal:${containerId}] Nettoyage - garder le conteneur`);
            // On garde le conteneur pour éviter les erreurs
            containerRef.current = null;
        };
    }, [containerId]);

    return { mounted, container: containerRef.current };
};

export default useSafePortal;