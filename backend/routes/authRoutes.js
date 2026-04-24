// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// INSCRIPTION
router.post('/register', async (req, res) => {
    const { nom, prenom, email, password, telephone, code_inscription } = req.body;
    
    try {
        console.log('Tentative inscription:', { email, code_inscription });
        
        // Vérifier si l'email existe déjà
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }
        
        // Déterminer le rôle selon le code (AVEC VALEURS PAR DÉFAUT)
        const MANAGER_CODE = process.env.MANAGER_CODE || 'MGR2024';
        const ADMIN_CODE = process.env.ADMIN_CODE || 'ADMIN2024';
        
        let roleNom = 'employe';
        if (code_inscription === MANAGER_CODE) {
            roleNom = 'manager';
            console.log('Code manager reconnu, rôle = manager');
        }
        if (code_inscription === ADMIN_CODE) {
            roleNom = 'admin';
            console.log('Code admin reconnu, rôle = admin');
        }
        
        console.log('Rôle attribué:', roleNom);
        
        // Récupérer l'ID du rôle
        const roleResult = await pool.query('SELECT id FROM roles WHERE nom = $1', [roleNom]);
        if (roleResult.rows.length === 0) {
            return res.status(500).json({ message: 'Rôle non trouvé dans la base' });
        }
        const roleId = roleResult.rows[0].id;
        
        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Créer l'utilisateur
        const userResult = await pool.query(
            `INSERT INTO users (nom, prenom, email, password_hash, telephone, statut, cree_le)
             VALUES ($1, $2, $3, $4, $5, 'actif', NOW())
             RETURNING id, nom, prenom, email`,
            [nom, prenom, email, hashedPassword, telephone || null]
        );
        
        const userId = userResult.rows[0].id;
        
        // Attribuer le rôle principal
        await pool.query(
            `INSERT INTO utilisateurs_roles (utilisateur_id, role_id, assigne_le)
             VALUES ($1, $2, NOW())`,
            [userId, roleId]
        );
        
        // Attribuer le rôle employé aussi si ce n'est pas déjà le cas
        if (roleNom !== 'employe') {
            const employeRole = await pool.query('SELECT id FROM roles WHERE nom = $1', ['employe']);
            if (employeRole.rows.length > 0) {
                await pool.query(
                    `INSERT INTO utilisateurs_roles (utilisateur_id, role_id, assigne_le)
                     VALUES ($1, $2, NOW())`,
                    [userId, employeRole.rows[0].id]
                );
            }
        }
        
        // Créer le solde de congés pour l'année en cours
        const currentYear = new Date().getFullYear();
        const typesConges = await pool.query('SELECT id, jours_par_defaut FROM types_conges WHERE jours_par_defaut IS NOT NULL');
        
        for (const type of typesConges.rows) {
            await pool.query(
                `INSERT INTO solde_conges (utilisateur_id, annee, type_conge_id, total_jours, restant_jours)
                 VALUES ($1, $2, $3, $4, $4)`,
                [userId, currentYear, type.id, type.jours_par_defaut]
            );
        }
        
        console.log('Inscription réussie pour:', email, 'avec rôle:', roleNom);
        
        res.status(201).json({ 
            message: 'Inscription réussie',
            user: { id: userId, nom, prenom, email, role: roleNom }
        });
        
    } catch (error) {
        console.error('Erreur inscription détaillée:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

// CONNEXION
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        console.log('Tentative connexion:', email);
        
        // Récupérer l'utilisateur avec ses rôles
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
            console.log('Utilisateur non trouvé:', email);
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }
        
        const user = userResult.rows[0];
        
        // Vérifier le statut
        if (user.statut !== 'actif') {
            return res.status(401).json({ message: 'Compte désactivé' });
        }
        
        // Vérifier le mot de passe
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log('Mot de passe incorrect pour:', email);
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }
        
        // Mettre à jour dernière connexion
        await pool.query('UPDATE users SET derniere_connexion = NOW() WHERE id = $1', [user.id]);
        
        // Créer le token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, roles: user.roles },
            process.env.JWT_SECRET || 'default_secret_key',
            { expiresIn: '24h' }
        );
        
        console.log('Connexion réussie pour:', email, 'Rôles:', user.roles);
        
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
        console.error('Erreur connexion détaillée:', error);
        res.status(500).json({ message: 'Erreur serveur: ' + error.message });
    }
});

module.exports = router;