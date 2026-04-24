const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

async function adminExists() {
    const result = await pool.query(
        `SELECT COUNT(*) FROM utilisateurs_roles ur 
         JOIN roles r ON ur.role_id = r.id 
         WHERE r.nom = 'admin'`
    );
    return parseInt(result.rows[0].count) > 0;
}

router.post('/register', async (req, res) => {
    const { nom, prenom, email, password, telephone, role_souhaite, adminCode, adminSecretKey } = req.body;
    
    try {
        console.log('=== INSCRIPTION ===');
        console.log('Email:', email);
        console.log('Rôle souhaité:', role_souhaite);
        
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }
        
        const adminAlreadyExists = await adminExists();
        
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
            [nom, prenom, email, hashedPassword, telephone || null]
        );
        
        const userId = userResult.rows[0].id;
        
        await pool.query(
            `INSERT INTO utilisateurs_roles (utilisateur_id, role_id, assigne_le)
             VALUES ($1, $2, NOW())`,
            [userId, roleResult.rows[0].id]
        );
        
        if (roleNom === 'admin') {
            const employeRole = await pool.query('SELECT id FROM roles WHERE nom = $1', ['employe']);
            if (employeRole.rows.length > 0) {
                await pool.query(
                    `INSERT INTO utilisateurs_roles (utilisateur_id, role_id, assigne_le)
                     VALUES ($1, $2, NOW())`,
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
            user: { id: userId, nom, prenom, email, role: roleNom }
        });
        
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const userResult = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.password_hash, u.statut,
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
        
        await pool.query('UPDATE users SET derniere_connexion = NOW() WHERE id = $1', [user.id]);
        
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
                roles: user.roles
            }
        });
        
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.get('/admin-exists', async (req, res) => {
    try {
        const exists = await adminExists();
        res.json({ adminExists: exists });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;