// frontend/src/config/api.js
const getApiUrl = () => {
    // En production (Render)
    if (process.env.NODE_ENV === 'production') {
        return 'https://gestion-conges-puhh.onrender.com/api';
    }
    // En développement local
    return 'http://localhost:5000/api';
};

export const API_URL = getApiUrl();