// frontend/src/components/employee/CalendarView.jsx
import React, { useState, useEffect } from 'react';

function CalendarView({ requests, onRequestUpdate }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState([]);
    const [selectedDayInfo, setSelectedDayInfo] = useState(null);
    const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    useEffect(() => {
        console.log('CalendarView - requests reçues:', requests);
        if (requests && requests.length > 0) {
            console.log('Exemple de statut:', requests[0].status);
        }
        generateCalendar();
        calculateStats();
    }, [currentDate, requests]);

    const calculateStats = () => {
        if (!requests || requests.length === 0) {
            setStats({ total: 0, approved: 0, pending: 0, pendingManager: 0, pendingAdmin: 0, rejected: 0 });
            return;
        }
        
        const approved = requests.filter(r => r.status === 'approved').length;
        const pendingManager = requests.filter(r => r.status === 'pending_manager').length;
        const pendingAdmin = requests.filter(r => r.status === 'pending_admin').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;
        setStats({
            total: requests.length,
            approved,
            pending: pendingManager + pendingAdmin,
            pendingManager,
            pendingAdmin,
            rejected
        });
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
    const getMonthName = (month) => ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][month];

    const normalizeDate = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const getStatusForDate = (date) => {
        const normalizedDate = normalizeDate(date);
        
        if (!requests || requests.length === 0) return { status: null, requests: [] };
        
        const dayRequests = requests.filter(req => {
            // Pour les permissions
            if (req.request_type === 'permission') {
                const permDate = normalizeDate(req.start_date || req.date_permission);
                return permDate && normalizedDate.getTime() === permDate.getTime();
            }
            
            // Pour les congés
            const start = normalizeDate(req.start_date);
            const end = normalizeDate(req.end_date);
            
            if (!start || !end) return false;
            return normalizedDate >= start && normalizedDate <= end;
        });
        
        if (dayRequests.length === 0) return { status: null, requests: [] };
        
        // Priorité des statuts pour l'affichage de la couleur
        let priorityStatus = null;
        if (dayRequests.some(r => r.status === 'approved')) priorityStatus = 'approved';
        else if (dayRequests.some(r => r.status === 'pending_admin')) priorityStatus = 'pending_admin';
        else if (dayRequests.some(r => r.status === 'pending_manager')) priorityStatus = 'pending_manager';
        else if (dayRequests.some(r => r.status === 'rejected')) priorityStatus = 'rejected';
        
        return { status: priorityStatus, requests: dayRequests };
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'approved': return '✅';
            case 'pending_admin': return '🕐';
            case 'pending_manager': return '⏳';
            case 'rejected': return '❌';
            default: return '📅';
        }
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'approved': return 'Approuvé';
            case 'pending_admin': return 'En attente validation admin';
            case 'pending_manager': return 'En attente validation manager';
            case 'rejected': return 'Refusé';
            default: return status || 'Inconnu';
        }
    };

    // CORRECTION : Fonction pour obtenir la classe CSS selon le statut
    const getDayClassName = (day) => {
        if (!day.isCurrentMonth) return 'other-month';
        
        switch(day.status) {
            case 'approved': return 'calendar-day-approved';
            case 'pending_admin': return 'calendar-day-pending-admin';
            case 'pending_manager': return 'calendar-day-pending-manager';
            case 'rejected': return 'calendar-day-rejected';
            default: return '';
        }
    };

    const generateCalendar = () => {
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);
        const days = [];
        
        let startOffset = firstDay === 0 ? 6 : firstDay - 1;
        
        // Jours du mois précédent
        for (let i = startOffset - 1; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - 1, prevMonthDays - i);
            const { status, requests: reqs } = getStatusForDate(date);
            days.push({
                date,
                isCurrentMonth: false,
                dayNumber: prevMonthDays - i,
                status,
                requestsCount: reqs.length,
                requests: reqs
            });
        }
        
        // Jours du mois courant
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const { status, requests: reqs } = getStatusForDate(date);
            days.push({
                date,
                isCurrentMonth: true,
                dayNumber: i,
                status,
                requestsCount: reqs.length,
                requests: reqs
            });
        }
        
        // Compléter pour avoir 42 jours
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(currentYear, currentMonth + 1, i);
            const { status, requests: reqs } = getStatusForDate(date);
            days.push({
                date,
                isCurrentMonth: false,
                dayNumber: i,
                status,
                requestsCount: reqs.length,
                requests: reqs
            });
        }
        
        setCalendarDays(days);
    };

    const changeMonth = (delta) => {
        setCurrentDate(new Date(currentYear, currentMonth + delta, 1));
        setSelectedDayInfo(null);
    };

    const handleDayClick = (day) => {
        if (day.requestsCount > 0) {
            setSelectedDayInfo(day);
        }
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && 
               date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
    };

    const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    return (
        <div className="calendar-container">
            <h2>📅 Calendrier des congés</h2>
            
            {/* Statistiques */}
            <div className="calendar-stats">
                <div className="stat-badge total">
                    <span className="stat-number">{stats.total}</span>
                    <span className="stat-label">Total demandes</span>
                </div>
                <div className="stat-badge approved">
                    <span className="stat-number">{stats.approved}</span>
                    <span className="stat-label">Approuvées</span>
                </div>
                <div className="stat-badge pending">
                    <span className="stat-number">{stats.pending}</span>
                    <span className="stat-label">En attente</span>
                </div>
                <div className="stat-badge rejected">
                    <span className="stat-number">{stats.rejected}</span>
                    <span className="stat-label">Refusées</span>
                </div>
            </div>
            
            {/* En-tête */}
            <div className="calendar-header">
                <button className="btn btn-sm btn-secondary" onClick={() => changeMonth(-1)}>◀ Mois précédent</button>
                <h3>{getMonthName(currentMonth)} {currentYear}</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => changeMonth(1)}>Mois suivant ▶</button>
                <button className="btn btn-sm btn-primary" onClick={() => { setCurrentDate(new Date()); setSelectedDayInfo(null); }}>📅 Aujourd'hui</button>
            </div>
            
            {/* Légende des couleurs */}
            <div className="calendar-legend">
                <div className="legend-item">
                    <div className="legend-color approved-color"></div>
                    <span>✅ Congé approuvé (Vert)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color pending-admin-color"></div>
                    <span>🕐 En attente validation admin (Orange)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color pending-manager-color"></div>
                    <span>⏳ En attente validation manager (Bleu)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color rejected-color"></div>
                    <span>❌ Congé refusé (Rouge)</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color today-color"></div>
                    <span>📅 Aujourd'hui</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color other-month-color"></div>
                    <span>📆 Autre mois</span>
                </div>
            </div>
            
            {/* Grille du calendrier */}
            <div className="calendar-grid">
                {weekDays.map(day => (
                    <div key={day} className="calendar-weekday">{day}</div>
                ))}
                {calendarDays.map((day, index) => {
                    const isCurrentDay = isToday(day.date);
                    // CORRECTION : Utiliser les classes CSS au lieu des styles inline
                    const dayClassName = getDayClassName(day);
                    
                    return (
                        <div 
                            key={index}
                            className={`calendar-cell ${dayClassName}`}
                            onClick={() => handleDayClick(day)}
                        >
                            <div className="calendar-day-header">
                                <span className={`calendar-day-number ${isCurrentDay ? 'today' : ''}`}>
                                    {day.dayNumber}
                                </span>
                                {day.requestsCount > 0 && (
                                    <span className="calendar-event-icon">{getStatusIcon(day.status)}</span>
                                )}
                            </div>
                            {day.requestsCount > 0 && (
                                <div className="calendar-event-info">
                                    <small>{day.requestsCount} événement(s)</small>
                                </div>
                            )}
                            {isCurrentDay && <div className="today-marker">Aujourd'hui</div>}
                        </div>
                    );
                })}
            </div>
            
            {/* Panneau de détail */}
            {selectedDayInfo && selectedDayInfo.requests.length > 0 && (
                <div className="calendar-detail-panel">
                    <div className="detail-header">
                        <h4>📅 {selectedDayInfo.date.toLocaleDateString('fr-FR')}</h4>
                        <button className="detail-close" onClick={() => setSelectedDayInfo(null)}>✖</button>
                    </div>
                    <div className="detail-body">
                        {selectedDayInfo.requests.map((req, idx) => (
                            <div key={idx} className="detail-item">
                                <div className="detail-item-header">
                                    <span className="detail-icon">{getStatusIcon(req.status)}</span>
                                    <strong>{req.type}</strong>
                                    <span className={`detail-status status-${req.status}`}>
                                        {getStatusLabel(req.status)}
                                    </span>
                                </div>
                                <div className="detail-item-dates">
                                    📆 {req.request_type === 'permission' ? req.start_date : `Du ${req.start_date} au ${req.end_date}`}
                                </div>
                                <div className="detail-item-duration">
                                    ⏱️ Durée : {req.duration} {req.type === 'Permission' ? 'heure(s)' : 'jour(s)'}
                                </div>
                                {req.motif && <div className="detail-item-motif">📝 Motif : {req.motif}</div>}
                                {req.motif_refus && <div className="detail-item-refus">❌ Motif du refus : {req.motif_refus}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CalendarView;