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

// Configuration CORS pour Socket.IO - ACCEPTE TOUTES LES ORIGINS
const io = socketIo(server, {
    cors: {
        origin: "*",  // Accepte toutes les origines
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

// Middleware CORS pour Express - ACCEPTE TOUTES LES ORIGINS
app.use(cors({
    origin: "*",
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
    console.log(`✅ CORS: toutes origines autorisées`);
});