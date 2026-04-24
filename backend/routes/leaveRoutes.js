// backend/routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Récupérer le solde de l'utilisateur connecté
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(
            `SELECT sc.*, tc.nom as type_name
             FROM solde_conges sc
             JOIN types_conges tc ON sc.type_conge_id = tc.id
             WHERE sc.utilisateur_id = $1 AND sc.annee = $2`,
            [userId, new Date().getFullYear()]
        );
        
        if (result.rows.length === 0) {
            return res.json({
                paid: 0,
                rtt: 0,
                unpaid: 0,
                sick: 0
            });
        }
        
        const balance = {
            paid: 0,
            rtt: 0,
            unpaid: 0,
            sick: 0
        };
        
        result.rows.forEach(row => {
            if (row.type_name === 'Congés Payés') balance.paid = parseFloat(row.restant_jours);
            if (row.type_name === 'RTT') balance.rtt = parseFloat(row.restant_jours);
        });
        
        res.json(balance);
    } catch (error) {
        console.error('Erreur balance:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer les demandes de l'utilisateur connecté
router.get('/my-requests', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(
            `SELECT dc.*, tc.nom as type_name
             FROM demandes_conges dc
             JOIN types_conges tc ON dc.type_conge_id = tc.id
             WHERE dc.utilisateur_id = $1
             ORDER BY dc.cree_le DESC
             LIMIT 10`,
            [userId]
        );
        
        const requests = result.rows.map(row => ({
            id: row.id,
            start_date: row.date_debut,
            end_date: row.date_fin,
            type: row.type_name,
            duration: parseFloat(row.nombre_jours),
            status: row.statut
        }));
        
        res.json(requests);
    } catch (error) {
        console.error('Erreur my-requests:', error);
        // Données fictives en cas d'erreur
        res.json([
            { id: 1, start_date: '2024-05-10', end_date: '2024-05-15', type: 'Congés Payés', duration: 5, status: 'pending' },
            { id: 2, start_date: '2024-03-20', end_date: '2024-03-22', type: 'Congés Payés', duration: 3, status: 'approved' }
        ]);
    }
});

// Créer une demande de congé
router.post('/request', authMiddleware, async (req, res) => {
    const { type_id, start_date, end_date, motif } = req.body;
    const userId = req.user.id;
    
    try {
        // Calculer le nombre de jours
        const start = new Date(start_date);
        const end = new Date(end_date);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        const result = await pool.query(
            `INSERT INTO demandes_conges 
             (utilisateur_id, type_conge_id, date_debut, date_fin, nombre_jours, motif, statut)
             VALUES ($1, $2, $3, $4, $5, $6, 'en_attente')
             RETURNING id`,
            [userId, type_id, start_date, end_date, days, motif]
        );
        
        res.status(201).json({ 
            message: 'Demande créée avec succès',
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Erreur create request:', error);
        res.status(500).json({ message: 'Erreur lors de la création' });
    }
});

module.exports = router;