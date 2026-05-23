// frontend/src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/api';

const useSocket = (userId) => {
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!userId) return;
        
        const socketUrl = getSocketUrl();
        
        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });
        
        newSocket.on('connect', () => {
            console.log('Socket.IO connecté');
            newSocket.emit('join', userId);
        });
        
        newSocket.on('connect_error', (error) => {
            console.warn('Socket.IO erreur:', error.message);
        });
        
        newSocket.on('new_notification', (notification) => {
            setNotifications(prev => [notification, ...prev]);
        });
        
        setSocket(newSocket);
        
        return () => {
            if (newSocket) {
                newSocket.disconnect();
                newSocket.close();
            }
        };
    }, [userId]);

    const clearNotifications = () => setNotifications([]);
    const removeNotification = (index) => setNotifications(prev => prev.filter((_, i) => i !== index));

    return { socket, notifications, clearNotifications, removeNotification };
};

export default useSocket;