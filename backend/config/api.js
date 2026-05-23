// frontend/src/config/api.js
const getApiUrl = () => {
    if (process.env.NODE_ENV === 'production') {
        // En production, utiliser l'URL de Render
        return process.env.REACT_APP_API_URL || 'https://gestion-conges-backend.onrender.com/api';
    }
    // En développement, utiliser localhost
    return 'http://localhost:5000/api';
};

export const API_URL = getApiUrl();