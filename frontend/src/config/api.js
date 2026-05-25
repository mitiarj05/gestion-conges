// frontend/src/config/api.js
const getApiUrl = () => {
    const hostname = window.location.hostname;
    
    // Sur Render (frontend)
    if (hostname.includes('onrender.com')) {
        // URL FIXE de votre backend Render
        return 'https://gestion-conges-puhh.onrender.com/api';
    }
    
    // En développement local
    return 'http://localhost:5000/api';
};

export const API_URL = getApiUrl();

export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
};

export const getFileUploadHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
    };
};

export const getSocketUrl = () => {
    const hostname = window.location.hostname;
    if (hostname.includes('onrender.com')) {
        return 'https://gestion-conges-puhh.onrender.com';
    }
    return 'http://localhost:5000';
};

// Fonction pour obtenir l'URL de base (sans /api) pour les fichiers statiques
export const getBaseUrl = () => {
    return API_URL.replace('/api', '');
};