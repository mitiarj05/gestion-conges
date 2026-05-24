// frontend/src/services/apiService.js
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../config/api';

// Client axios configuré
const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 30000,
});

// Intercepteur pour ajouter le token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        config.headers['Content-Type'] = 'application/json';
        console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
    },
    (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
    (response) => {
        console.log(`✅ API Response: ${response.config.url}`, response.status);
        return response;
    },
    (error) => {
        console.error(`❌ API Error: ${error.config?.url}`, error.message);
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ============ AUTHENTIFICATION ============
export const authService = {
    login: (email, password) => apiClient.post('/auth/login', { email, password }),
    register: (userData) => apiClient.post('/auth/register', userData),
    forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
    resetPassword: (token, password, confirmPassword) => apiClient.post(`/auth/reset-password/${token}`, { password, confirmPassword }),
    verifyResetToken: (token) => apiClient.get(`/auth/verify-reset-token/${token}`),
    adminExists: () => apiClient.get('/auth/admin-exists'),
};

// ============ CONGÉS ============
export const leaveService = {
    getBalance: () => apiClient.get('/leaves/balance'),
    getMyRequests: () => apiClient.get('/leaves/my-requests'),
    createRequest: (data) => apiClient.post('/leaves/request', data),
    updateRequest: (id, data) => apiClient.put(`/leaves/update-request/${id}`, data),
    cancelRequest: (id) => apiClient.delete(`/leaves/cancel-request/${id}`),
    cancelApprovedRequest: (id, motif) => apiClient.put(`/leaves/cancel-approved-request/${id}`, { motif_annulation: motif }),
    getTeamPending: () => apiClient.get('/leaves/team-pending'),
    getTeamPendingFiltered: (periode) => apiClient.get(`/leaves/team-pending-filtered?periode=${periode}`),
    managerApprove: (id) => apiClient.put(`/leaves/manager-approve/${id}`),
    managerReject: (id, motif) => apiClient.put(`/leaves/manager-reject/${id}`, { motif }),
    getTeamAbsences: () => apiClient.get('/leaves/team-absences'),
    getAllAbsences: () => apiClient.get('/leaves/all-absences'),
    getTeamStats: () => apiClient.get('/leaves/team-stats'),
    getManagerDashboardStats: () => apiClient.get('/leaves/manager-dashboard-stats'),
    getNotifications: () => apiClient.get('/leaves/notifications'),
    markNotificationRead: (id) => apiClient.put(`/leaves/notifications/${id}/read`),
    getJustificatifs: (demandeId) => apiClient.get(`/leaves/justificatifs/${demandeId}`),
    uploadJustificatif: (demandeId, file) => {
        const formData = new FormData();
        formData.append('justificatif', file);
        formData.append('demandeId', demandeId);
        return apiClient.post('/leaves/upload-justificatif', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    downloadJustificatif: (demandeId) => apiClient.get(`/leaves/download-justificatif/${demandeId}`, { responseType: 'blob' }),
};

// ============ ADMIN ============
export const adminService = {
    getStats: () => apiClient.get('/admin/stats'),
    getUsers: () => apiClient.get('/admin/users'),
    createEmployee: (data) => apiClient.post('/admin/create-employee', data),
    updateUser: (id, data) => apiClient.put(`/admin/users/${id}`, data),
    deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
    resetPassword: (id, password) => apiClient.put(`/admin/users/${id}/reset-password`, { password }),
    promoteToManager: (userId) => apiClient.post('/admin/promote-to-manager', { userId }),
    assignManager: (employeeId, managerId) => apiClient.put(`/admin/assign-manager/${employeeId}`, { managerId }),
    getPendingApprovals: () => apiClient.get('/admin/pending-approvals'),
    finalApprove: (id) => apiClient.put(`/admin/final-approve/${id}`),
    finalReject: (id, motif) => apiClient.put(`/admin/final-reject/${id}`, { motif }),
    getStatsByMonth: (year) => apiClient.get(`/admin/stats-by-month?year=${year}`),
    getStatsByType: () => apiClient.get('/admin/stats-by-type'),
    getAvailableYears: () => apiClient.get('/admin/available-years'),
    getManagersList: () => apiClient.get('/admin/managers-list'),
    getEmployeesOnly: () => apiClient.get('/admin/employees-only'),
    getEmployeesForPayroll: () => apiClient.get('/admin/employees-for-payroll'),
    exportUsers: () => apiClient.get('/admin/export-users', { responseType: 'blob' }),
    exportDemandes: () => apiClient.get('/admin/export-demandes', { responseType: 'blob' }),
    getSettings: () => apiClient.get('/admin/settings'),
    updateSettings: (settings) => apiClient.put('/admin/settings', settings),
    getNotifications: () => apiClient.get('/admin/notifications'),
    markNotificationRead: (id) => apiClient.put(`/admin/notifications/${id}/read`),
    getLeaveRequests: () => apiClient.get('/admin/leave-requests'),
    getLeaveRequestsFiltered: (periode) => apiClient.get(`/admin/leave-requests-filtered?periode=${periode}`),
};

// ============ PAIE ============
export const payrollService = {
    getMyBulletins: () => apiClient.get('/payroll/mes-bulletins'),
    getAllBulletins: () => apiClient.get('/payroll/tous-bulletins'),
    generateBulletin: (data) => apiClient.post('/payroll/generer-bulletin', data),
    generateAllBulletins: (mois, annee) => apiClient.post('/payroll/generer-bulletins-equipe', { mois, annee }),
    markAsPaid: (id) => apiClient.put(`/payroll/marquer-paye/${id}`),
    updateBulletin: (id, data) => apiClient.put(`/payroll/bulletin/${id}`, data),
    deleteBulletin: (id) => apiClient.delete(`/payroll/bulletin/${id}`),
    getStats: () => apiClient.get('/payroll/stats'),
};

// ============ UTILISATEURS ============
export const userService = {
    getMyTeam: () => apiClient.get('/users/my-team'),
    getMyManager: () => apiClient.get('/users/my-manager'),
    getAvailableEmployees: () => apiClient.get('/users/available-employees'),
    addTeamMember: (employeeId) => apiClient.post('/users/add-team-member', { employee_id: employeeId }),
    removeTeamMember: (employeeId) => apiClient.delete(`/users/remove-team-member/${employeeId}`),
};

export default apiClient;