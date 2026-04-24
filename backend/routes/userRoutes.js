const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// Récupérer tous les utilisateurs
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service, u.statut,
                    array_agg(r.nom) as roles
             FROM users u
             LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             LEFT JOIN roles r ON ur.role_id = r.id
             GROUP BY u.id`
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer un utilisateur par ID
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.service, u.statut,
                    array_agg(r.nom) as roles
             FROM users u
             LEFT JOIN utilisateurs_roles ur ON u.id = ur.utilisateur_id
             LEFT JOIN roles r ON ur.role_id = r.id
             WHERE u.id = $1
             GROUP BY u.id`,
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;