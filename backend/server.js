// backend/server.js - VERSION CORRIGÉE (sans serveur statique)
const express = require('express');
const cors = require('cors');
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

// Configuration CORS pour autoriser le frontend Render
const io = socketIo(server, {
    cors: {
        origin: [
            'http://localhost:3000',
            'https://gestion-conges-1.onrender.com',
            'https://gestion-conges-puhh.onrender.com'
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://gestion-conges-1.onrender.com',
        'https://gestion-conges-puhh.onrender.com'
    ],
    credentials: true
}));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('io', io);

// ============ ROUTES API UNIQUEMENT ============
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
        backend: 'gestion-conges-puhh'
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
    console.log(`✅ Backend démarré sur le port ${PORT}`);
    console.log(`✅ Frontend attendu sur: https://gestion-conges-1.onrender.com`);
});