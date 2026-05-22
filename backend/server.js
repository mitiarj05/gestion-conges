// backend/server.js
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
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Stocker io dans app pour l'utiliser dans les routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payroll', payrollRoutes);

// Route de test
app.get('/', (req, res) => {
    res.json({ message: 'API Gestion des Congés' });
});

// Socket.io - Connexions en temps réel
io.on('connection', (socket) => {
    console.log('🔌 Nouveau client connecté:', socket.id);
    
    // Joindre une salle par utilisateur (pour notifier individuellement)
    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`📱 Utilisateur ${userId} a rejoint sa salle`);
    });
    
    // Joindre la salle admin
    socket.on('join_admin', () => {
        socket.join('admin_room');
        console.log('👑 Admin a rejoint sa salle');
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Client déconnecté:', socket.id);
    });
});

// Fonction pour émettre des notifications (accessible globalement)
global.emitNotification = (io, userId, notification) => {
    io.to(`user_${userId}`).emit('new_notification', notification);
};

global.emitToAdmins = (io, notification) => {
    io.to('admin_room').emit('admin_notification', notification);
};

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erreur serveur interne' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`✅ Socket.io prêt pour notifications temps réel`);
});
const contactRoutes = require('./routes/contactRoutes');
app.use('/api/contact', contactRoutes);