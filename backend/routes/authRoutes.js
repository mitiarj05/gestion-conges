// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { sendResetPasswordEmail } = require('../utils/emailService');

// ============ FONCTIONS DE VALIDATION ============

// Valider que le champ ne contient que des lettres et espaces
const validateLettresOnly = (value) => {
    if (!value) return false;
    const regex = /^[A-Za-zÀ-ÿ\s-]+$/;
    return regex.test(value);
};

// Valider que le téléphone ne contient que des chiffres, espaces, +, -
const validateTelephone = (value) => {
    if (!value) return true; // Le téléphone est optionnel
    const regex = /^[0-9\s\+-]+$/;
    return regex.test(value);
};

// Nettoyer le téléphone (garder uniquement les chiffres)
const cleanTelephone = (value) => {
    if (!value) return null;
    return value.replace(/[^0-9]/g, '');
};

// ============ VÉRIFIER SI ADMIN EXISTE ============
async function adminExists() {
    const result = await pool.query(
        `SELECT COUNT(*) FROM utilisateurs_roles ur 
         JOIN roles r ON ur.role_id = r.id 
         WHERE r.nom = 'admin'`
    );
    return parseInt(result.rows[0].count) > 0;
}

// ============ INSCRIPTION ============
router.post('/register', async (req, res) => {
    const { nom, prenom, email, password, telephone, role_souhaite, adminCode, adminSecretKey } = req.body;
    
    // ============ VALIDATIONS ============
    
    // Validation nom (lettres uniquement)
    if (!nom || nom.trim() === '') {
        return res.status(400).json({ message: 'Le nom est requis' });
    }
    if (!validateLettresOnly(nom)) {
        return res.status(400).json({ message: 'Le nom ne doit contenir que des lettres (pas de chiffres ou caractères spéciaux)' });
    }
    
    // Validation prénom (lettres uniquement)
    if (!prenom || prenom.trim() === '') {
        return res.status(400).json({ message: 'Le prénom est requis' });
    }
    if (!validateLettresOnly(prenom)) {
        return res.status(400).json({ message: 'Le prénom ne doit contenir que des lettres (pas de chiffres ou caractères spéciaux)' });
    }
    
    // Validation téléphone (optionnel mais si rempli, doit être valide)
    if (telephone && !validateTelephone(telephone)) {
        return res.status(400).json({ message: 'Le numéro de téléphone ne doit contenir que des chiffres, espaces, + ou -' });
    }
    
    // Nettoyer le téléphone
    const cleanedTelephone = cleanTelephone(telephone);
    
    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }
        
        let roleNom = 'employe';
        
        if (role_souhaite === 'admin') {
            const ADMIN_CODE = process.env.ADMIN_CODE || 'ADMIN26';
            const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'SUPER_SECRET_KEY_123';
            
            if (adminCode !== ADMIN_CODE) {
                return res.status(403).json({ message: 'Code Admin invalide' });
            }
            if (adminSecretKey !== ADMIN_SECRET_KEY) {
                return res.status(403).json({ message: 'Clé d\'activation invalide' });
            }
            roleNom = 'admin';
        }
        
        const roleResult = await pool.query('SELECT id FROM roles WHERE nom = $1', [roleNom]);
        if (roleResult.rows.length === 0) {
            return res.status(500).json({ message: 'Rôle non trouvé' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userResult = await pool.query(
            `INSERT INTO users (nom, prenom, email, password_hash, telephone, statut, cree_le)
             VALUES ($1, $2, $3, $4, $5, 'actif', NOW())
             RETURNING id, nom, prenom, email`,
            [nom.trim(), prenom.trim(), email, hashedPassword, cleanedTelephone || null]
        );
        
        const userId = userResult.rows[0].id;
        
        await pool.query(
            `INSERT INTO utilisateurs_roles (utilisateur_id, role_id)
             VALUES ($1, $2)`,
            [userId, roleResult.rows[0].id]
        );
        
        if (roleNom === 'admin') {
            const employeRole = await pool.query('SELECT id FROM roles WHERE nom = $1', ['employe']);
            if (employeRole.rows.length > 0) {
                await pool.query(
                    `INSERT INTO utilisateurs_roles (utilisateur_id, role_id)
                     VALUES ($1, $2)`,
                    [userId, employeRole.rows[0].id]
                );
            }
        }
        
        const currentYear = new Date().getFullYear();
        const typesConges = await pool.query('SELECT id, jours_par_defaut FROM types_conges WHERE jours_par_defaut IS NOT NULL');
        
        for (const type of typesConges.rows) {
            await pool.query(
                `INSERT INTO solde_conges (utilisateur_id, annee, type_conge_id, total_jours, restant_jours)
                 VALUES ($1, $2, $3, $4, $4)`,
                [userId, currentYear, type.id, type.jours_par_defaut]
            );
        }
        
        res.status(201).json({ 
            message: roleNom === 'admin' ? 'Compte Admin créé avec succès !' : 'Inscription réussie',
            user: { id: userId, nom: nom.trim(), prenom: prenom.trim(), email, role: roleNom }
        });
        
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ CONNEXION ============
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const userResult = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.password_hash, u.statut, u.photo_url,
                    COALESCE(array_agg(DISTINCT r.nom) FILTER (WHERE r.nom IS NOT NULL), '{}') as roles
             FROM users u
             LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             LEFT JOIN roles r ON ur.role_id = r.id
             WHERE u.email = $1
             GROUP BY u.id`,
            [email]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }
        
        const user = userResult.rows[0];
        
        if (user.statut !== 'actif') {
            return res.status(401).json({ message: 'Compte désactivé' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, roles: user.roles },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                nom: user.nom,
                prenom: user.prenom,
                email: user.email,
                roles: user.roles,
                photo_url: user.photo_url
            }
        });
        
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// ============ MOT DE PASSE OUBLIÉ - DEMANDE DE RÉINITIALISATION ============
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    try {
        const userResult = await pool.query(
            `SELECT id, email, nom, prenom FROM users WHERE email = $1 AND statut = 'actif'`,
            [email]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(200).json({ 
                message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' 
            });
        }
        
        const user = userResult.rows[0];
        
        // Générer un token unique
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Token valable 1 heure
        
        // Supprimer l'ancien token et mettre à jour
        await pool.query(
            `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
            [resetToken, tokenExpiry, user.id]
        );
        
        // Envoyer l'email
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
        
        await sendResetPasswordEmail(user.email, `${user.prenom} ${user.nom}`, resetUrl);
        
        res.status(200).json({ 
            message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' 
        });
        
    } catch (error) {
        console.error('Erreur forgot password:', error);
        res.status(500).json({ message: 'Erreur serveur, veuillez réessayer plus tard.' });
    }
});

// ============ VÉRIFIER LE TOKEN DE RÉINITIALISATION ============
router.get('/verify-reset-token/:token', async (req, res) => {
    const { token } = req.params;
    
    try {
        const userResult = await pool.query(
            `SELECT id, email, nom, prenom, reset_token_expires 
             FROM users 
             WHERE reset_token = $1 AND reset_token_expires > NOW()`,
            [token]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ 
                valid: false, 
                message: 'Lien de réinitialisation invalide ou expiré.' 
            });
        }
        
        const user = userResult.rows[0];
        
        res.json({ 
            valid: true, 
            email: user.email,
            userName: `${user.prenom} ${user.nom}`
        });
        
    } catch (error) {
        console.error('Erreur verify token:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============ RÉINITIALISER LE MOT DE PASSE ============
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }
    
    try {
        const userResult = await pool.query(
            `SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()`,
            [token]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Lien de réinitialisation invalide ou expiré.' });
        }
        
        const user = userResult.rows[0];
        
        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Mettre à jour le mot de passe et supprimer le token
        await pool.query(
            `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
            [hashedPassword, user.id]
        );
        
        res.json({ message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' });
        
    } catch (error) {
        console.error('Erreur reset password:', error);
        res.status(500).json({ message: 'Erreur serveur, veuillez réessayer plus tard.' });
    }
});

// ============ ADMIN EXISTS ============
router.get('/admin-exists', async (req, res) => {
    try {
        const exists = await adminExists();
        res.json({ adminExists: exists });
    } catch (error) {
        console.error('Erreur admin-exists:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;