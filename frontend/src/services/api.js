// frontend/src/services/api.js
import axios from 'axios';
import { API_URL } from '../config/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Intercepteur pour gérer les erreurs 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Services d'authentification
export const authService = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (userData) => api.post('/auth/register', userData),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, password, confirmPassword) => api.post(`/auth/reset-password/${token}`, { password, confirmPassword }),
    verifyResetToken: (token) => api.get(`/auth/verify-reset-token/${token}`),
};

// Services utilisateurs
export const userService = {
    getAll: () => api.get('/users'),
    getById: (id) => api.get(`/users/${id}`),
    create: (userData) => api.post('/users', userData),
    update: (id, userData) => api.put(`/users/${id}`, userData),
    delete: (id) => api.delete(`/users/${id}`),
};

// Services congés
export const leaveService = {
    getBalance: () => api.get('/leaves/balance'),
    getMyRequests: () => api.get('/leaves/my-requests'),
    createRequest: (data) => api.post('/leaves/request', data),
    updateRequest: (id, data) => api.put(`/leaves/update-request/${id}`, data),
    cancelRequest: (id) => api.delete(`/leaves/cancel-request/${id}`),
    cancelApprovedRequest: (id, motif) => api.put(`/leaves/cancel-approved-request/${id}`, { motif_annulation: motif }),
    getTeamPending: () => api.get('/leaves/team-pending'),
    managerApprove: (id) => api.put(`/leaves/manager-approve/${id}`),
    managerReject: (id, motif) => api.put(`/leaves/manager-reject/${id}`, { motif }),
    getTeamAbsences: () => api.get('/leaves/team-absences'),
    getAllAbsences: () => api.get('/leaves/all-absences'),
    getTeamStats: () => api.get('/leaves/team-stats'),
};

// Services admin
export const adminService = {
    getStats: () => api.get('/admin/stats'),
    getUsers: () => api.get('/admin/users'),
    createEmployee: (data) => api.post('/admin/create-employee', data),
    updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
    deleteUser: (id) => api.delete(`/admin/users/${id}`),
    resetPassword: (id, password) => api.put(`/admin/users/${id}/reset-password`, { password }),
    promoteToManager: (userId) => api.post('/admin/promote-to-manager', { userId }),
    assignManager: (employeeId, managerId) => api.put(`/admin/assign-manager/${employeeId}`, { managerId }),
    getPendingApprovals: () => api.get('/admin/pending-approvals'),
    finalApprove: (id) => api.put(`/admin/final-approve/${id}`),
    finalReject: (id, motif) => api.put(`/admin/final-reject/${id}`, { motif }),
    getStatsByMonth: (year) => api.get(`/admin/stats-by-month?year=${year}`),
    getStatsByType: () => api.get('/admin/stats-by-type'),
    getAvailableYears: () => api.get('/admin/available-years'),
    getManagersList: () => api.get('/admin/managers-list'),
    getEmployeesOnly: () => api.get('/admin/employees-only'),
    getEmployeesForPayroll: () => api.get('/admin/employees-for-payroll'),
    exportUsers: () => api.get('/admin/export-users', { responseType: 'blob' }),
    exportDemandes: () => api.get('/admin/export-demandes', { responseType: 'blob' }),
    getSettings: () => api.get('/admin/settings'),
    updateSettings: (settings) => api.put('/admin/settings', settings),
};

// Services paie
export const payrollService = {
    getMyBulletins: () => api.get('/payroll/mes-bulletins'),
    getAllBulletins: () => api.get('/payroll/tous-bulletins'),
    generateBulletin: (data) => api.post('/payroll/generer-bulletin', data),
    generateAllBulletins: (mois, annee) => api.post('/payroll/generer-bulletins-equipe', { mois, annee }),
    markAsPaid: (id) => api.put(`/payroll/marquer-paye/${id}`),
    updateBulletin: (id, data) => api.put(`/payroll/bulletin/${id}`, data),
    deleteBulletin: (id) => api.delete(`/payroll/bulletin/${id}`),
    getStats: () => api.get('/payroll/stats'),
};

// Services fichiers
export const fileService = {
    uploadJustificatif: (demandeId, file) => {
        const formData = new FormData();
        formData.append('justificatif', file);
        formData.append('demandeId', demandeId);
        return api.post('/leaves/upload-justificatif', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    getJustificatifs: (demandeId) => api.get(`/leaves/justificatifs/${demandeId}`),
    downloadJustificatif: (demandeId) => api.get(`/leaves/download-justificatif/${demandeId}`, { responseType: 'blob' }),
};

export default api;