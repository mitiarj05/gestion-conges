const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Test de connexion
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erreur PostgreSQL:', err.message);
    } else {
        console.log('✅ PostgreSQL connecté');
    }
    release();
});

module.exports = pool;