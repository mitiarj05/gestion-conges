// backend/routes/chatbotRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Récupérer le contexte utilisateur depuis la BDD
const getUserContext = async (userId, role) => {
    try {
        let context = '';

        if (role === 'employe' || role === 'employee') {
            // Solde congés
            const balance = await pool.query(
                `SELECT sc.restant_jours, sc.total_jours, sc.pris_jours, tc.nom as type_name
                 FROM solde_conges sc
                 JOIN types_conges tc ON sc.type_conge_id = tc.id
                 WHERE sc.utilisateur_id = $1
                 ORDER BY sc.annee DESC, sc.type_conge_id ASC`,
                [userId]
            );
            if (balance.rows.length > 0) {
                const soldes = balance.rows.map(b =>
                    `${b.type_name}: ${b.restant_jours}j restants (total ${b.total_jours}j, pris ${b.pris_jours}j)`
                ).join(', ');
                context += `Soldes congés: ${soldes}. `;
            }

            // Dernières demandes
            const requests = await pool.query(
                `SELECT d.statut, d.date_debut, d.date_fin, d.nombre_jours, tc.nom as type_conge
                 FROM demandes_conges d
                 JOIN types_conges tc ON d.type_conge_id = tc.id
                 WHERE d.utilisateur_id = $1
                 ORDER BY d.cree_le DESC LIMIT 5`,
                [userId]
            );
            if (requests.rows.length > 0) {
                context += `Dernières demandes: ${requests.rows.map(r =>
                    `${r.type_conge} du ${r.date_debut} au ${r.date_fin} (${r.nombre_jours}j) - ${r.statut}`
                ).join(' | ')}. `;
            }

            // Bulletins de paie
            const bulletins = await pool.query(
                `SELECT mois, annee, net_a_payer, prime_transport, statut
                 FROM paie_employes WHERE utilisateur_id = $1
                 ORDER BY annee DESC, mois DESC LIMIT 3`,
                [userId]
            );
            if (bulletins.rows.length > 0) {
                context += `Bulletins récents: ${bulletins.rows.map(b =>
                    `${b.mois}/${b.annee}: ${b.net_a_payer} Ar (${b.statut})`
                ).join(', ')}. `;
            }

        } else if (role === 'manager') {
            // Membres de l'équipe
            const team = await pool.query(
                `SELECT prenom, nom FROM users WHERE manager_id = $1 AND statut = 'actif'`,
                [userId]
            );
            context += `Équipe: ${team.rows.length > 0
                ? team.rows.map(m => `${m.prenom} ${m.nom}`).join(', ')
                : 'aucun membre'}. `;

            // Demandes en attente
            const pending = await pool.query(
                `SELECT COUNT(*) as total FROM demandes_conges d
                 JOIN users u ON d.utilisateur_id = u.id
                 WHERE u.manager_id = $1 AND d.statut = 'pending_manager'`,
                [userId]
            );
            context += `Demandes en attente de validation: ${pending.rows[0].total}. `;

            // Absences en cours / à venir
            const absences = await pool.query(
                `SELECT u.prenom, u.nom, d.date_debut, d.date_fin, tc.nom as type_conge
                 FROM demandes_conges d
                 JOIN users u ON d.utilisateur_id = u.id
                 JOIN types_conges tc ON d.type_conge_id = tc.id
                 WHERE u.manager_id = $1 AND d.statut = 'approved'
                 AND d.date_fin >= CURRENT_DATE
                 ORDER BY d.date_debut ASC LIMIT 5`,
                [userId]
            );
            if (absences.rows.length > 0) {
                context += `Absences à venir/en cours: ${absences.rows.map(a =>
                    `${a.prenom} ${a.nom} (${a.type_conge}: ${a.date_debut} → ${a.date_fin})`
                ).join(' | ')}. `;
            }

            // Solde congés du manager lui-même
            const myBalance = await pool.query(
                `SELECT sc.restant_jours, tc.nom as type_name
                 FROM solde_conges sc
                 JOIN types_conges tc ON sc.type_conge_id = tc.id
                 WHERE sc.utilisateur_id = $1
                 ORDER BY sc.annee DESC, sc.type_conge_id ASC LIMIT 3`,
                [userId]
            );
            if (myBalance.rows.length > 0) {
                context += `Mon solde: ${myBalance.rows.map(b => `${b.type_name}: ${b.restant_jours}j`).join(', ')}. `;
            }

        } else if (role === 'admin') {
            // Stats globales
            const stats = await pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM users WHERE statut = 'actif') as total_employes,
                    (SELECT COUNT(*) FROM demandes_conges WHERE statut IN ('pending_manager','pending_admin')) as demandes_attente,
                    (SELECT COUNT(*) FROM demandes_conges WHERE statut = 'approved' AND date_fin >= CURRENT_DATE) as conges_en_cours,
                    (SELECT COUNT(*) FROM utilisateurs_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.nom = 'manager') as total_managers
            `);
            if (stats.rows[0]) {
                const s = stats.rows[0];
                context += `Stats: ${s.total_employes} employés actifs, ${s.total_managers} managers, ${s.demandes_attente} demandes en attente, ${s.conges_en_cours} congés en cours. `;
            }

            // Bulletins du mois en cours
            const now = new Date();
            const bulletins = await pool.query(
                `SELECT COUNT(*) as total, COALESCE(SUM(net_a_payer), 0) as masse_salariale
                 FROM paie_employes WHERE mois = $1 AND annee = $2`,
                [now.getMonth() + 1, now.getFullYear()]
            );
            if (bulletins.rows[0]?.total > 0) {
                context += `Bulletins ${now.getMonth() + 1}/${now.getFullYear()}: ${bulletins.rows[0].total} bulletins générés, masse salariale: ${Number(bulletins.rows[0].masse_salariale).toLocaleString()} Ar. `;
            }

            // Dernières demandes à traiter
            const latest = await pool.query(
                `SELECT u.prenom, u.nom, d.statut, d.date_debut, d.date_fin, tc.nom as type_conge
                 FROM demandes_conges d
                 JOIN users u ON d.utilisateur_id = u.id
                 JOIN types_conges tc ON d.type_conge_id = tc.id
                 WHERE d.statut IN ('pending_admin', 'pending_manager')
                 ORDER BY d.cree_le DESC LIMIT 5`,
                []
            );
            if (latest.rows.length > 0) {
                context += `Demandes récentes: ${latest.rows.map(r =>
                    `${r.prenom} ${r.nom} - ${r.type_conge} (${r.date_debut} → ${r.date_fin}) [${r.statut}]`
                ).join(' | ')}. `;
            }
        }

        return context;
    } catch (err) {
        console.error('Erreur getUserContext:', err.message);
        return '';
    }
};

// Route principale
router.post('/message', async (req, res) => {
    const { message, role, history = [] } = req.body;
    const userId = req.user?.id || req.user?.utilisateur_id;

    if (!message) return res.status(400).json({ message: 'Message requis' });
    if (!GROQ_API_KEY) {
        return res.status(500).json({ reply: '❌ Clé API Groq non configurée dans le .env' });
    }

    try {
        const userContext = await getUserContext(userId, role);
        const today = new Date().toLocaleDateString('fr-FR');
        const moisNoms = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        const moisActuel = moisNoms[new Date().getMonth()];

        const systemPrompt = `Tu es un assistant RH intelligent et bienveillant pour une application de gestion des congés et de la paie à Madagascar.
Aujourd'hui nous sommes le ${today}. Le mois actuel est ${moisActuel}.
Tu réponds toujours en français, de manière concise et utile.
La monnaie utilisée est l'Ariary (Ar).

Rôle de l'utilisateur connecté: ${role}
Données temps réel de l'utilisateur: ${userContext || 'Aucune donnée disponible'}

Instructions:
- Employé: aide avec solde congés, statut demandes, bulletins de paie
- Manager: aide avec validation demandes, gestion équipe, absences planifiées
- Admin: aide avec stats globales, gestion utilisateurs, bulletins de paie

Sois bref et précis (2-4 phrases). Utilise les données réelles si disponibles.
Si tu ne sais pas, dis-le honnêtement.`;

        // Historique pour Groq (format OpenAI)
        const groqHistory = history.slice(-6).map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
        }));

        const groqBody = {
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                ...groqHistory,
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 512
        };

        const groqResponse = await axios.post(GROQ_URL, groqBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            timeout: 15000
        });

        const reply = groqResponse.data?.choices?.[0]?.message?.content
            || 'Désolé, je n\'ai pas pu générer une réponse.';

        res.json({ reply });

    } catch (error) {
        console.error('Erreur chatbot:', error.response?.data || error.message);
        res.status(500).json({
            reply: 'Désolé, le service est temporairement indisponible. Veuillez réessayer.'
        });
    }
});

module.exports = router;