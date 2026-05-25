// backend/routes/userRoutes.js (version complète avec les routes profil)
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration multer pour les photos de profil
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/profiles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `profile-${req.user.id}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format non supporté'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: fileFilter
});

// ============ PROFIL UTILISATEUR ============

// Récupérer le profil
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service, 
                    u.statut, u.salaire_base, u.photo_url, u.cree_le,
                    COALESCE(array_agg(DISTINCT r.nom) FILTER (WHERE r.nom IS NOT NULL), '{}') as roles
             FROM users u
             LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             LEFT JOIN roles r ON ur.role_id = r.id
             WHERE u.id = $1
             GROUP BY u.id`,
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur get profile:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Mettre à jour le profil
router.put('/profile', authMiddleware, async (req, res) => {
    const { nom, prenom, email, telephone, service } = req.body;
    const userId = req.user.id;
    
    try {
        // Vérifier si l'email n'est pas déjà utilisé par un autre utilisateur
        const emailCheck = await pool.query(
            `SELECT id FROM users WHERE email = $1 AND id != $2`,
            [email, userId]
        );
        
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }
        
        const result = await pool.query(
            `UPDATE users 
             SET nom = $1, prenom = $2, email = $3, telephone = $4, service = $5
             WHERE id = $6
             RETURNING id, nom, prenom, email, telephone, service, statut, photo_url`,
            [nom, prenom, email, telephone || null, service || null, userId]
        );
        
        res.json({ 
            message: 'Profil mis à jour avec succès',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur update profile:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Changer le mot de passe
router.put('/change-password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Tous les champs sont requis' });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }
    
    try {
        const userResult = await pool.query(
            `SELECT password_hash FROM users WHERE id = $1`,
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        
        const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.query(
            `UPDATE users SET password_hash = $1 WHERE id = $2`,
            [hashedPassword, userId]
        );
        
        res.json({ message: 'Mot de passe modifié avec succès' });
    } catch (error) {
        console.error('Erreur change password:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Upload photo de profil
router.post('/upload-photo', authMiddleware, upload.single('photo'), async (req, res) => {
    const userId = req.user.id;
    
    if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier fourni' });
    }
    
    try {
        // Récupérer l'ancienne photo pour la supprimer
        const oldPhoto = await pool.query(
            `SELECT photo_url FROM users WHERE id = $1`,
            [userId]
        );
        
        if (oldPhoto.rows[0]?.photo_url) {
            const oldPath = path.join(__dirname, '../uploads/profiles', path.basename(oldPhoto.rows[0].photo_url));
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        
        const photoUrl = `/uploads/profiles/${req.file.filename}`;
        
        await pool.query(
            `UPDATE users SET photo_url = $1 WHERE id = $2`,
            [photoUrl, userId]
        );
        
        res.json({ 
            message: 'Photo de profil mise à jour',
            photo_url: photoUrl
        });
    } catch (error) {
        console.error('Erreur upload photo:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Supprimer la photo de profil
router.delete('/photo', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    
    try {
        const photoResult = await pool.query(
            `SELECT photo_url FROM users WHERE id = $1`,
            [userId]
        );
        
        if (photoResult.rows[0]?.photo_url) {
            const oldPath = path.join(__dirname, '../uploads/profiles', path.basename(photoResult.rows[0].photo_url));
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        
        await pool.query(
            `UPDATE users SET photo_url = NULL WHERE id = $1`,
            [userId]
        );
        
        res.json({ message: 'Photo de profil supprimée' });
    } catch (error) {
        console.error('Erreur delete photo:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Supprimer le compte
router.delete('/account', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    
    try {
        // Supprimer la photo de profil si elle existe
        const photoResult = await pool.query(
            `SELECT photo_url FROM users WHERE id = $1`,
            [userId]
        );
        
        if (photoResult.rows[0]?.photo_url) {
            const photoPath = path.join(__dirname, '../uploads/profiles', path.basename(photoResult.rows[0].photo_url));
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
            }
        }
        
        // Supprimer les demandes de congé
        await pool.query(`DELETE FROM demandes_conges WHERE utilisateur_id = $1`, [userId]);
        
        // Supprimer les notifications
        await pool.query(`DELETE FROM notifications WHERE utilisateur_id = $1`, [userId]);
        
        // Supprimer les rôles
        await pool.query(`DELETE FROM utilisateurs_roles WHERE utilisateur_id = $1`, [userId]);
        
        // Supprimer les soldes de congés
        await pool.query(`DELETE FROM solde_conges WHERE utilisateur_id = $1`, [userId]);
        
        // Supprimer les bulletins de paie
        await pool.query(`DELETE FROM paie_employes WHERE utilisateur_id = $1`, [userId]);
        
        // Supprimer l'utilisateur
        await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
        
        res.json({ message: 'Compte supprimé avec succès' });
    } catch (error) {
        console.error('Erreur delete account:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ GESTION D'ÉQUIPE (EXISTANT) ============

router.get('/my-team', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.service, u.photo_url
             FROM users u WHERE u.manager_id = $1 ORDER BY u.nom ASC`,
            [managerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur my-team:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.get('/my-manager', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const userResult = await pool.query(
            `SELECT manager_id FROM users WHERE id = $1`,
            [userId]
        );
        
        const managerId = userResult.rows[0]?.manager_id;
        
        if (!managerId) {
            return res.status(404).json({ message: 'Aucun manager assigné' });
        }
        
        const managerResult = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service, u.photo_url,
                    COUNT(DISTINCT e.id) as team_count
             FROM users u
             LEFT JOIN users e ON e.manager_id = u.id
             WHERE u.id = $1
             GROUP BY u.id`,
            [managerId]
        );
        
        res.json(managerResult.rows[0]);
    } catch (error) {
        console.error('Erreur my-manager:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.get('/available-employees', authMiddleware, async (req, res) => {
    try {
        const managerId = req.user.id;
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.service
             FROM users u
             JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             JOIN roles r ON ur.role_id = r.id
             WHERE r.nom = 'employe' AND (u.manager_id IS NULL OR u.manager_id = 0)
             AND u.id != $1
             ORDER BY u.nom ASC`,
            [managerId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur available-employees:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.post('/add-team-member', authMiddleware, async (req, res) => {
    const { employee_id } = req.body;
    const managerId = req.user.id;
    
    try {
        const roleCheck = await pool.query(
            `SELECT COUNT(*) FROM utilisateurs_roles ur
             JOIN roles r ON ur.role_id = r.id
             WHERE ur.utilisateur_id = $1 AND r.nom = 'manager'`,
            [managerId]
        );
        
        if (parseInt(roleCheck.rows[0].count) === 0) {
            return res.status(403).json({ message: 'Accès réservé aux managers' });
        }
        
        await pool.query(`UPDATE users SET manager_id = $1 WHERE id = $2`, [managerId, employee_id]);
        
        const managerInfo = await pool.query(`SELECT nom, prenom FROM users WHERE id = $1`, [managerId]);
        const manager = managerInfo.rows[0];
        
        await pool.query(
            `INSERT INTO notifications (utilisateur_id, type, titre, message, lien, cree_le)
             VALUES ($1, 'team_added', 'Nouveau manager', 
                     'Vous avez été ajouté à l équipe de ${manager.prenom} ${manager.nom}.', 
                     '/dashboard/employee', NOW())`,
            [employee_id]
        );
        
        res.json({ message: 'Membre ajouté' });
    } catch (error) {
        console.error('Erreur ajout membre:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.delete('/remove-team-member/:employeeId', authMiddleware, async (req, res) => {
    const { employeeId } = req.params;
    const managerId = req.user.id;
    
    try {
        await pool.query(`UPDATE users SET manager_id = NULL WHERE id = $1 AND manager_id = $2`, [employeeId, managerId]);
        res.json({ message: 'Membre retiré' });
    } catch (error) {
        console.error('Erreur remove member:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;