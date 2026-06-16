// frontend/src/components/common/Profile.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL, getBaseUrl } from '../../config/api';
import ToastNotification from '../notifications/ToastNotification';
import useToast from '../../hooks/useToast';

function Profile({ user: currentUser, role, onLogout, onProfileUpdate }) {
    const [user, setUser] = useState(currentUser || {});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const fileInputRef = useRef(null);
    
    const [editForm, setEditForm] = useState({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        service: ''
    });
    
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteError, setDeleteError] = useState('');
    
    const { toasts, removeToast, success, error: toastError } = useToast();

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const getFullPhotoUrl = (photoUrl) => {
        if (!photoUrl) return null;
        if (photoUrl.startsWith('http')) return photoUrl;
        const baseUrl = getBaseUrl();
        return `${baseUrl}${photoUrl}`;
    };

    const updateLocalStorageAndNotify = (updatedUserData) => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...storedUser, ...updatedUserData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('profileUpdated'));
        return updatedUser;
    };

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/users/profile`, getAuthHeaders());
            const userData = response.data;
            setUser(userData);
            setEditForm({
                nom: userData.nom || '',
                prenom: userData.prenom || '',
                email: userData.email || '',
                telephone: userData.telephone || '',
                service: userData.service || ''
            });
            if (userData.photo_url) {
                const fullUrl = getFullPhotoUrl(userData.photo_url);
                setPhotoPreview(fullUrl);
            }
        } catch (error) {
            console.error('Erreur chargement profil:', error);
            toastError('Erreur lors du chargement du profil');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await axios.put(`${API_URL}/users/profile`, editForm, getAuthHeaders());
            success('Profil mis à jour avec succès');
            setUser(response.data.user);
            updateLocalStorageAndNotify(response.data.user);
            if (onProfileUpdate) {
                onProfileUpdate(response.data.user);
            }
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur lors de la mise à jour');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordErrors({});
        
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordErrors({ confirm: 'Les mots de passe ne correspondent pas' });
            return;
        }
        
        if (passwordForm.newPassword.length < 6) {
            setPasswordErrors({ new: 'Le mot de passe doit contenir au moins 6 caractères' });
            return;
        }
        
        setSaving(true);
        try {
            await axios.put(`${API_URL}/users/change-password`, {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            }, getAuthHeaders());
            success('Mot de passe modifié avec succès');
            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur lors du changement de mot de passe');
        } finally {
            setSaving(false);
        }
    };

    // ============ SUPPRESSION DE COMPTE CORRIGÉE ============
    const handleDeleteAccount = async () => {
        setDeleteError('');
        
        // Vérifier que le texte de confirmation est exactement "SUPPRIMER"
        if (deleteConfirmText.trim() !== 'SUPPRIMER') {
            setDeleteError('Veuillez taper exactement "SUPPRIMER" pour confirmer');
            return;
        }
        
        if (!window.confirm('⚠️ Êtes-vous ABSOLUMENT sûr de vouloir supprimer votre compte ? Cette action est IRRÉVERSIBLE !')) {
            return;
        }
        
        setSaving(true);
        try {
            await axios.delete(`${API_URL}/users/account`, getAuthHeaders());
            success('Compte supprimé avec succès');
            setTimeout(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (onLogout) {
                    onLogout();
                } else {
                    window.location.href = '/login';
                }
            }, 1500);
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur lors de la suppression du compte');
            setDeleteError(error.response?.data?.message || 'Erreur lors de la suppression');
        } finally {
            setSaving(false);
        }
    };

    const handleUploadPhoto = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            toastError('La photo ne doit pas dépasser 2MB');
            return;
        }
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            toastError('Format non supporté. Utilisez JPG, PNG ou GIF');
            return;
        }
        
        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append('photo', file);
        
        try {
            const response = await axios.post(`${API_URL}/users/upload-photo`, formData, {
                ...getAuthHeaders(),
                'Content-Type': 'multipart/form-data'
            });
            success('Photo de profil mise à jour');
            const newPhotoUrl = response.data.photo_url;
            setUser({ ...user, photo_url: newPhotoUrl });
            updateLocalStorageAndNotify({ photo_url: newPhotoUrl });
            const fullUrl = getFullPhotoUrl(newPhotoUrl);
            setPhotoPreview(fullUrl);
            if (onProfileUpdate) {
                onProfileUpdate({ ...user, photo_url: newPhotoUrl });
            }
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur lors de l\'upload');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleRemovePhoto = async () => {
        if (!window.confirm('Voulez-vous vraiment supprimer votre photo de profil ?')) return;
        setUploadingPhoto(true);
        try {
            await axios.delete(`${API_URL}/users/photo`, getAuthHeaders());
            success('Photo de profil supprimée');
            setUser({ ...user, photo_url: null });
            updateLocalStorageAndNotify({ photo_url: null });
            setPhotoPreview(null);
            if (onProfileUpdate) {
                onProfileUpdate({ ...user, photo_url: null });
            }
        } catch (error) {
            toastError(error.response?.data?.message || 'Erreur lors de la suppression');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const getRoleLabel = () => {
        if (role === 'admin') return 'Administrateur';
        if (role === 'manager') return 'Manager';
        return 'Employé';
    };

    const getRoleIcon = () => {
        if (role === 'admin') return '👑';
        if (role === 'manager') return '👔';
        return '👤';
    };

    const getRoleColor = () => {
        if (role === 'admin') return '#8b5cf6';
        if (role === 'manager') return '#4f46e5';
        return '#10b981';
    };

    if (loading) {
        return (
            <div className="loading-container" style={{ minHeight: '400px' }}>
                <div className="loading-spinner"></div>
                <div>Chargement du profil...</div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <ToastNotification toasts={toasts} removeToast={removeToast} />
            
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-title">Mon profil</h1>
                    <p className="dashboard-subtitle">Gérez vos informations personnelles</p>
                </div>
            </div>

            <div className="profile-grid">
                {/* Section Photo de profil */}
                <div className="profile-photo-card">
                    <div className="profile-photo-header">
                        <h3>Photo de profil</h3>
                    </div>
                    <div className="profile-photo-content">
                        <div className="profile-photo-wrapper">
                            {photoPreview ? (
                                <img 
                                    src={photoPreview} 
                                    alt="Photo de profil" 
                                    className="profile-photo-img"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        const parent = e.target.parentElement;
                                        if (parent) {
                                            const placeholder = document.createElement('div');
                                            placeholder.className = 'profile-photo-placeholder';
                                            placeholder.style.backgroundColor = getRoleColor();
                                            placeholder.innerHTML = `<span class="profile-photo-initials">${(user.prenom?.charAt(0) || '')}${(user.nom?.charAt(0) || '')}</span>`;
                                            parent.appendChild(placeholder);
                                        }
                                    }}
                                />
                            ) : (
                                <div className="profile-photo-placeholder" style={{ backgroundColor: getRoleColor() }}>
                                    <span className="profile-photo-initials">
                                        {user.prenom?.charAt(0)}{user.nom?.charAt(0)}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className="profile-photo-actions">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleUploadPhoto}
                                accept="image/jpeg,image/png,image/jpg,image/gif"
                                style={{ display: 'none' }}
                            />
                            <button 
                                className="btn-upload-photo" 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingPhoto}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                    <circle cx="12" cy="13" r="4"/>
                                </svg>
                                {uploadingPhoto ? 'Chargement...' : 'Changer la photo'}
                            </button>
                            {photoPreview && (
                                <button className="btn-remove-photo" onClick={handleRemovePhoto} disabled={uploadingPhoto}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8"/>
                                    </svg>
                                    Supprimer
                                </button>
                            )}
                        </div>
                        <p className="profile-photo-note">Formats acceptés : JPG, PNG, GIF (max 2MB)</p>
                    </div>
                </div>

                {/* Section Informations personnelles */}
                <div className="profile-info-card">
                    <div className="profile-info-header">
                        <h3>Informations personnelles</h3>
                        <span className={`profile-role-badge`} style={{ backgroundColor: getRoleColor() }}>
                            {getRoleIcon()} {getRoleLabel()}
                        </span>
                    </div>
                    
                    <form onSubmit={handleUpdateProfile} className="profile-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nom</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editForm.nom}
                                    onChange={(e) => setEditForm({...editForm, nom: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Prénom</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editForm.prenom}
                                    onChange={(e) => setEditForm({...editForm, prenom: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={editForm.email}
                                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Téléphone</label>
                            <input
                                type="tel"
                                className="form-input"
                                value={editForm.telephone}
                                onChange={(e) => setEditForm({...editForm, telephone: e.target.value})}
                            />
                        </div>
                        
                        {role !== 'admin' && (
                            <div className="form-group">
                                <label>Service</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editForm.service}
                                    onChange={(e) => setEditForm({...editForm, service: e.target.value})}
                                />
                            </div>
                        )}
                        
                        <div className="profile-form-actions">
                            <button type="submit" className="btn-primary" disabled={saving}>
                                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Section Sécurité */}
                <div className="profile-security-card">
                    <div className="profile-security-header">
                        <h3>Sécurité</h3>
                    </div>
                    
                    <div className="profile-security-actions">
                        <button className="security-action-btn" onClick={() => setShowPasswordModal(true)}>
                            <div className="security-action-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </div>
                            <div className="security-action-content">
                                <div className="security-action-title">Changer le mot de passe</div>
                                <div className="security-action-desc">Modifiez votre mot de passe</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </button>
                        
                        <button className="security-action-btn danger" onClick={() => {
                            setDeleteConfirmText('');
                            setDeleteError('');
                            setShowDeleteModal(true);
                        }}>
                            <div className="security-action-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8"/>
                                </svg>
                            </div>
                            <div className="security-action-content">
                                <div className="security-action-title">Supprimer mon compte</div>
                                <div className="security-action-desc">Supprimez définitivement votre compte</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Section Informations supplémentaires */}
                <div className="profile-stats-card">
                    <div className="profile-stats-header">
                        <h3>Informations</h3>
                    </div>
                    <div className="profile-stats-list">
                        <div className="profile-stat-item">
                            <span className="profile-stat-label">ID utilisateur</span>
                            <span className="profile-stat-value">#{user.id}</span>
                        </div>
                        <div className="profile-stat-item">
                            <span className="profile-stat-label">Rôle</span>
                            <span className="profile-stat-value">{getRoleLabel()}</span>
                        </div>
                        <div className="profile-stat-item">
                            <span className="profile-stat-label">Membre depuis</span>
                            <span className="profile-stat-value">
                                {user.cree_le ? new Date(user.cree_le).toLocaleDateString('fr-FR') : '-'}
                            </span>
                        </div>
                        <div className="profile-stat-item">
                            <span className="profile-stat-label">Statut</span>
                            <span className={`profile-stat-badge ${user.statut === 'actif' ? 'active' : 'inactive'}`}>
                                {user.statut === 'actif' ? 'Actif' : 'Inactif'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Changement de mot de passe */}
            {showPasswordModal && (
                <div className="modal-overlay" onClick={() => { setShowPasswordModal(false); setPasswordErrors({}); }}>
                    <div className="modal" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h3>🔒 Changer le mot de passe</h3>
                            <button className="modal-close" onClick={() => { setShowPasswordModal(false); setPasswordErrors({}); }}>✖</button>
                        </div>
                        <form onSubmit={handleChangePassword}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Mot de passe actuel</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Nouveau mot de passe</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                        required
                                    />
                                    {passwordErrors.new && <small className="error-text">{passwordErrors.new}</small>}
                                </div>
                                <div className="form-group">
                                    <label>Confirmer le nouveau mot de passe</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                                        required
                                    />
                                    {passwordErrors.confirm && <small className="error-text">{passwordErrors.confirm}</small>}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Changement...' : 'Changer le mot de passe'}
                                </button>
                                <button type="button" className="btn-secondary" onClick={() => { setShowPasswordModal(false); setPasswordErrors({}); }}>
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============ MODAL SUPPRESSION DE COMPTE CORRIGÉE ============ */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={(e) => { 
                    if (e.target === e.currentTarget) {
                        setShowDeleteModal(false);
                        setDeleteConfirmText('');
                        setDeleteError('');
                    }
                }}>
                    <div className="modal" style={{ maxWidth: '500px' }}>
                        <div className="modal-header" style={{ background: '#dc3545' }}>
                            <h3 style={{ color: 'white' }}>⚠️ Supprimer mon compte</h3>
                            <button 
                                className="modal-close" 
                                onClick={() => { 
                                    setShowDeleteModal(false);
                                    setDeleteConfirmText('');
                                    setDeleteError('');
                                }} 
                                style={{ color: 'white' }}
                            >
                                ✖
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="delete-warning">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                <p style={{ fontSize: '16px', fontWeight: 'bold' }}>⚠️ Cette action est <strong style={{ color: '#dc3545' }}>IRRÉVERSIBLE</strong> !</p>
                                <p>Toutes vos données (demandes, notifications, etc.) seront définitivement supprimées.</p>
                                <p style={{ marginTop: '16px' }}>
                                    Veuillez taper <strong style={{ color: '#dc3545' }}>"SUPPRIMER"</strong> pour confirmer.
                                </p>
                            </div>
                            
                            {deleteError && (
                                <div className="error-message" style={{ marginTop: '12px' }}>
                                    ❌ {deleteError}
                                </div>
                            )}
                            
                            <div className="form-group" style={{ marginTop: '16px' }}>
                                <label style={{ fontWeight: '600' }}>Confirmation</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Tapez SUPPRIMER ici"
                                    value={deleteConfirmText}
                                    onChange={(e) => {
                                        setDeleteConfirmText(e.target.value);
                                        if (deleteError) setDeleteError('');
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleDeleteAccount();
                                        }
                                    }}
                                    style={{ 
                                        borderColor: deleteConfirmText === 'SUPPRIMER' ? '#10b981' : '#dc3545',
                                        textAlign: 'center', 
                                        fontSize: '18px', 
                                        fontWeight: 'bold',
                                        letterSpacing: '2px',
                                        transition: 'border-color 0.3s'
                                    }}
                                    autoFocus
                                />
                                {deleteConfirmText && deleteConfirmText !== 'SUPPRIMER' && (
                                    <small className="error-text" style={{ display: 'block', marginTop: '6px' }}>
                                        ⚠️ Tapez exactement "SUPPRIMER" (en majuscules)
                                    </small>
                                )}
                                {deleteConfirmText === 'SUPPRIMER' && (
                                    <small className="success-text" style={{ display: 'block', marginTop: '6px', color: '#10b981', fontWeight: '600' }}>
                                        ✅ Confirmation valide
                                    </small>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                            <button 
                                className="btn-secondary" 
                                onClick={() => { 
                                    setShowDeleteModal(false);
                                    setDeleteConfirmText('');
                                    setDeleteError('');
                                }}
                            >
                                Annuler
                            </button>
                            <button 
                                className="btn-danger" 
                                onClick={handleDeleteAccount} 
                                disabled={saving || deleteConfirmText !== 'SUPPRIMER'}
                                style={{ 
                                    opacity: deleteConfirmText === 'SUPPRIMER' && !saving ? 1 : 0.5,
                                    cursor: deleteConfirmText === 'SUPPRIMER' && !saving ? 'pointer' : 'not-allowed'
                                }}
                            >
                                {saving ? 'Suppression...' : '🗑️ Confirmer la suppression'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Profile;