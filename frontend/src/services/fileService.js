// frontend/src/services/fileService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Upload d'un fichier justificatif
export const uploadJustificatif = async (demandeId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('demandeId', demandeId);
    
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/leaves/upload-justificatif`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
};

// Télécharger un justificatif
export const downloadJustificatif = async (fileId) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/leaves/download-justificatif/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
    });
    return response;
};

// Supprimer un justificatif
export const deleteJustificatif = async (fileId) => {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_URL}/leaves/delete-justificatif/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

// Récupérer les justificatifs d'une demande
export const getJustificatifs = async (demandeId) => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/leaves/justificatifs/${demandeId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};