import React, { useState, useEffect } from 'react';

function CalendarView({ requests }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState([]);
    const [selectedDayInfo, setSelectedDayInfo] = useState(null);
    const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    useEffect(() => {
        generateCalendar();
        calculateStats();
    }, [currentDate, requests]);

    const calculateStats = () => {
        const approved = requests.filter(r => r.status === 'approved').length;
        const pending = requests.filter(r => r.status === 'pending_manager' || r.status === 'pending_admin').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;
        setStats({
            total: requests.length,
            approved,
            pending,
            rejected
        });
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
    const getMonthName = (month) => ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][month];

    const getStatusForDate = (date) => {
        const dayRequests = requests.filter(req => {
            const start = new Date(req.start_date);
            const end = new Date(req.end_date);
            const current = new Date(date);
            current.setHours(0, 0, 0, 0);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return current >= start && current <= end && req.status !== 'rejected';
        });
        
        if (dayRequests.length === 0) return { status: null, requests: [] };
        
        let priorityStatus = null;
        if (dayRequests.some(r => r.status === 'approved')) priorityStatus = 'approved';
        else if (dayRequests.some(r => r.status === 'pending_admin')) priorityStatus = 'pending_admin';
        else if (dayRequests.some(r => r.status === 'pending_manager')) priorityStatus = 'pending_manager';
        
        return { status: priorityStatus, requests: dayRequests };
    };

    const getStatusClass = (status) => {
        switch(status) {
            case 'approved': return 'calendar-day-approved';
            case 'pending_admin': return 'calendar-day-pending-admin';
            case 'pending_manager': return 'calendar-day-pending-manager';
            default: return '';
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'approved': return '✅';
            case 'pending_admin': return '🕐';
            case 'pending_manager': return '⏳';
            default: return '📅';
        }
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'approved': return 'Approuvé';
            case 'pending_admin': return 'En attente validation admin';
            case 'pending_manager': return 'En attente validation manager';
            default: return '';
        }
    };

    const generateCalendar = () => {
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);
        const days = [];
        
        let startOffset = firstDay === 0 ? 6 : firstDay - 1;
        
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

    const getDayBackgroundColor = (day) => {
        if (!day.isCurrentMonth) return '#f8f9fa';
        if (day.status === 'approved') return '#d4edda';
        if (day.status === 'pending_admin') return '#fff3cd';
        if (day.status === 'pending_manager') return '#cce5ff';
        return 'white';
    };

    const getDayBorder = (day) => {
        if (day.status === 'approved') return '2px solid #28a745';
        if (day.status === 'pending_admin') return '2px solid #ffc107';
        if (day.status === 'pending_manager') return '2px solid #007bff';
        return '1px solid #e9ecef';
    };

    const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    return (
        <div className="calendar-container">
            <h2>📅 Calendrier des congés</h2>
            
            <div className="calendar-stats">
                <div className="stat-badge total"><span className="stat-number">{stats.total}</span><span className="stat-label">Total demandes</span></div>
                <div className="stat-badge approved"><span className="stat-number">{stats.approved}</span><span className="stat-label">Approuvées</span></div>
                <div className="stat-badge pending"><span className="stat-number">{stats.pending}</span><span className="stat-label">En attente</span></div>
                <div className="stat-badge rejected"><span className="stat-number">{stats.rejected}</span><span className="stat-label">Refusées</span></div>
            </div>
            
            <div className="calendar-header">
                <button className="btn btn-sm btn-secondary" onClick={() => changeMonth(-1)}>◀ Mois précédent</button>
                <h3>{getMonthName(currentMonth)} {currentYear}</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => changeMonth(1)}>Mois suivant ▶</button>
                <button className="btn btn-sm btn-primary" onClick={() => { setCurrentDate(new Date()); setSelectedDayInfo(null); }}>📅 Aujourd'hui</button>
            </div>
            
            <div className="calendar-legend">
                <div className="legend-item"><span className="legend-color approved-color"></span><span>✅ Congé approuvé</span></div>
                <div className="legend-item"><span className="legend-color pending-admin-color"></span><span>🕐 En attente validation admin</span></div>
                <div className="legend-item"><span className="legend-color pending-manager-color"></span><span>⏳ En attente validation manager</span></div>
                <div className="legend-item"><span className="legend-color today-color"></span><span>📅 Aujourd'hui</span></div>
                <div className="legend-item"><span className="legend-color other-month-color"></span><span>📆 Autre mois</span></div>
            </div>
            
            <div className="calendar-grid">
                {weekDays.map(day => (<div key={day} className="calendar-weekday">{day}</div>))}
                {calendarDays.map((day, index) => {
                    const isCurrentDay = isToday(day.date);
                    const backgroundColor = getDayBackgroundColor(day);
                    const border = getDayBorder(day);
                    
                    return (
                        <div 
                            key={index}
                            className={`calendar-cell ${!day.isCurrentMonth ? 'other-month' : ''}`}
                            onClick={() => handleDayClick(day)}
                            style={{
                                backgroundColor,
                                border,
                                cursor: day.requestsCount > 0 ? 'pointer' : 'default',
                                padding: '8px',
                                minHeight: '80px',
                                borderRadius: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { if (day.requestsCount > 0) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div className="calendar-day-header">
                                <span className={`calendar-day-number ${isCurrentDay ? 'today' : ''}`}>{day.dayNumber}</span>
                                {day.requestsCount > 0 && <span className="calendar-event-icon">{getStatusIcon(day.status)}</span>}
                            </div>
                            {day.requestsCount > 0 && <div className="calendar-event-info"><small>{day.requestsCount} événement(s)</small></div>}
                            {isCurrentDay && <div className="today-marker">Aujourd'hui</div>}
                        </div>
                    );
                })}
            </div>
            
            {selectedDayInfo && (
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
                                    <span className={`detail-status status-${req.status}`}>{getStatusLabel(req.status)}</span>
                                </div>
                                <div className="detail-item-dates">📆 Du {req.start_date} au {req.end_date}</div>
                                <div className="detail-item-duration">⏱️ Durée : {req.duration} {req.type === 'Permission' ? 'heures' : 'jour(s)'}</div>
                                {req.motif && <div className="detail-item-motif">📝 Motif : {req.motif}</div>}
                                {req.motif_refus && <div className="detail-item-refus">❌ Motif du refus : {req.motif_refus}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {requests.length === 0 && (
                <div className="info-box" style={{ textAlign: 'center', padding: '30px' }}>📭 Aucune demande de congé pour le moment.</div>
            )}
        </div>
    );
}

export default CalendarView;