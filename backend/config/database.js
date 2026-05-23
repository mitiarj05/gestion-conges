// backend/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

// Configuration pour Neon.tech
let pool;

if (process.env.DATABASE_URL) {
    // Utiliser Neon.tech (production)
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Nécessaire pour Neon
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });
} else {
    // Développement local
    pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'gestion_conges',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
    });
}

// Test de connexion
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erreur PostgreSQL:', err.message);
        console.error('Vérifiez votre connexion à Neon.tech');
    } else {
        console.log('✅ PostgreSQL connecté avec succès (Neon.tech)');
    }
    if (release) release();
});

module.exports = pool;