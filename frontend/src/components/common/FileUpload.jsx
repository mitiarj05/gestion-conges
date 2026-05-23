// frontend/src/components/common/FileUpload.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';

function FileUpload({ demandeId, onUploadComplete }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Le fichier ne doit pas dépasser 5MB');
                setSelectedFile(null);
                return;
            }
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                setError('Format non supporté. Utilisez PDF, JPEG, PNG ou DOC');
                setSelectedFile(null);
                return;
            }
            setError('');
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Veuillez sélectionner un fichier');
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('justificatif', selectedFile);
            formData.append('demandeId', demandeId);
            
            const response = await axios.post(`${API_URL}/leaves/upload-justificatif`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            alert('Justificatif uploadé avec succès !');
            setSelectedFile(null);
            if (onUploadComplete) onUploadComplete();
        } catch (error) {
            console.error('Erreur upload:', error);
            setError(error.response?.data?.message || 'Erreur lors de l\'upload');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="file-upload">
            <div className="file-upload-area">
                <input
                    type="file"
                    id={`file-${demandeId}`}
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    style={{ display: 'none' }}
                />
                <label 
                    htmlFor={`file-${demandeId}`} 
                    className="btn-upload"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                        <polyline points="13 2 13 9 20 9"/>
                    </svg>
                    Choisir un fichier
                </label>
                {selectedFile && (
                    <span className="selected-file">
                        {selectedFile.name}
                    </span>
                )}
                <button 
                    className="btn-upload-submit" 
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                >
                    {uploading ? (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="6" x2="12" y2="12"/>
                                <line x1="12" y1="12" x2="16" y2="14"/>
                            </svg>
                            Envoi...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            Uploader
                        </>
                    )}
                </button>
            </div>
            {error && <small className="upload-error">{error}</small>}
            <small className="upload-info">
                Formats acceptés : PDF, JPEG, PNG, DOC (max 5MB)
            </small>
        </div>
    );
}

export default FileUpload;