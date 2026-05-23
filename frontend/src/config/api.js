// frontend/src/config/api.js
const getApiUrl = () => {
    // Détection automatique de l'environnement
    const hostname = window.location.hostname;
    
    // Si on est sur Render (domaine .onrender.com)
    if (hostname.includes('onrender.com')) {
        return 'https://gestion-conges-puhh.onrender.com/api';
    }
    
    // Si on est en développement local
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }
    
    // Par défaut, utiliser le backend Render
    return 'https://gestion-conges-puhh.onrender.com/api';
};

export const API_URL = getApiUrl();

// Helper pour obtenir les headers d'authentification
export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

// Helper pour les requêtes avec fichiers
export const getFileUploadHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
    };
};