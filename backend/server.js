// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const adminRoutes = require('./routes/adminRoutes');
const payrollRoutes = require('./routes/payrollRoutes');

const app = express();
const server = http.createServer(app);

// Configuration CORS complète - Autoriser tous les frontends Render
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://gestion-conges-frontend.onrender.com',
    'https://gestion-conges-1.onrender.com',
    'https://gestion-conges-puhh.onrender.com',
    process.env.FRONTEND_URL
].filter(Boolean);

const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    }
});

// Middleware CORS avec options
app.use(cors({
    origin: (origin, callback) => {
        // Permettre les requêtes sans origin (comme les appels API)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('Origin bloqué par CORS:', origin);
            // En développement, on accepte toutes les origins
            if (process.env.NODE_ENV !== 'production') {
                callback(null, true);
            } else {
                callback(new Error('Non autorisé par CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Pré-vol pour les requêtes OPTIONS
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Stocker io dans app
app.set('io', io);

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payroll', payrollRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date(),
        uptime: process.uptime(),
        database: 'Neon.tech',
        cors: 'enabled'
    });
});

// Socket.io
io.on('connection', (socket) => {
    console.log('🔌 Nouveau client connecté:', socket.id);
    
    socket.on('join', (userId) => {
        if (userId) {
            socket.join(`user_${userId}`);
            console.log(`📱 Utilisateur ${userId} a rejoint sa salle`);
        }
    });
    
    socket.on('join_admin', () => {
        socket.join('admin_room');
        console.log('👑 Admin a rejoint sa salle');
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Client déconnecté:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`✅ Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ CORS autorisé pour:`, allowedOrigins);
});