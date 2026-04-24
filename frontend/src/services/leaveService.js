import api from './api';

export const leaveService = {
    getBalance: () => api.get('/leaves/balance'),
    getMyRequests: () => api.get('/leaves/my-requests'),
    createRequest: (data) => api.post('/leaves/request', data),
    getTeamPending: () => api.get('/leaves/team-pending'),
    managerApprove: (id) => api.put(`/leaves/manager-approve/${id}`),
    managerReject: (id, motif) => api.put(`/leaves/manager-reject/${id}`, { motif }),
};

export default leaveService;