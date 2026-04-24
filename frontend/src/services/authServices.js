import api from './api';

export const authService = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (userData) => api.post('/auth/register', userData),
    checkAdminExists: () => api.get('/auth/admin-exists'),
};

export default authService;