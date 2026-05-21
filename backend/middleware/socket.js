// backend/middleware/socket.js
// Fonction pour émettre des notifications en temps réel

const emitNotification = (io, userId, notification) => {
    io.to(`user_${userId}`).emit('new_notification', notification);
};

const emitToAdmins = (io, notification) => {
    io.to('admin_room').emit('admin_notification', notification);
};

module.exports = { emitNotification, emitToAdmins };