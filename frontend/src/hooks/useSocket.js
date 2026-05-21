// frontend/src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const useSocket = (userId) => {
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!userId) return;
        
        const newSocket = io('http://localhost:5000');
        setSocket(newSocket);
        
        newSocket.emit('join', userId);
        
        newSocket.on('new_notification', (notification) => {
            setNotifications(prev => [notification, ...prev]);
        });
        
        return () => {
            newSocket.close();
        };
    }, [userId]);

    const clearNotifications = () => setNotifications([]);
    const removeNotification = (index) => setNotifications(prev => prev.filter((_, i) => i !== index));

    return { socket, notifications, clearNotifications, removeNotification };
};

export default useSocket;