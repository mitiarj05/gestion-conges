// frontend/src/components/common/FileUpload.jsx
import React, { useState } from 'react';
import { uploadJustificatif } from '../../services/fileService';

function FileUpload({ demandeId, onUploadComplete }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Vérifier la taille (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Le fichier ne doit pas dépasser 5MB');
                setSelectedFile(null);
                return;
            }
            // Vérifier le type
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
            await uploadJustificatif(demandeId, selectedFile);
            alert('✅ Justificatif uploadé avec succès !');
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
                    className="btn btn-sm btn-secondary"
                    style={{ cursor: 'pointer', marginRight: '10px' }}
                >
                    📎 Choisir un fichier
                </label>
                {selectedFile && (
                    <span style={{ fontSize: '12px', marginRight: '10px' }}>
                        {selectedFile.name}
                    </span>
                )}
                <button 
                    className="btn btn-sm btn-primary" 
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    style={{ background: '#28a745' }}
                >
                    {uploading ? '⏳ Envoi...' : '📤 Uploader'}
                </button>
            </div>
            {error && <small style={{ color: '#dc3545', display: 'block', marginTop: '5px' }}>{error}</small>}
            <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                Formats acceptés : PDF, JPEG, PNG, DOC (max 5MB)
            </small>
        </div>
    );
}

export default FileUpload;