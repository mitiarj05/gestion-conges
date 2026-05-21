// frontend/src/components/employee/CalendarView.jsx
import React, { useState, useEffect } from 'react';

function CalendarView({ requests, onRequestUpdate }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState([]);
    const [selectedDayInfo, setSelectedDayInfo] = useState(null);
    const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
    const [viewMode, setViewMode] = useState('month');

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    useEffect(() => {
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
            if (req.request_type === 'permission') {
                const permDate = normalizeDate(req.start_date || req.date_permission);
                return permDate && normalizedDate.getTime() === permDate.getTime();
            }
            
            const start = normalizeDate(req.start_date);
            const end = normalizeDate(req.end_date);
            
            if (!start || !end) return false;
            return normalizedDate >= start && normalizedDate <= end;
        });
        
        if (dayRequests.length === 0) return { status: null, requests: [] };
        
        let priorityStatus = null;
        if (dayRequests.some(r => r.status === 'approved')) priorityStatus = 'approved';
        else if (dayRequests.some(r => r.status === 'pending_admin')) priorityStatus = 'pending_admin';
        else if (dayRequests.some(r => r.status === 'pending_manager')) priorityStatus = 'pending_manager';
        else if (dayRequests.some(r => r.status === 'rejected')) priorityStatus = 'rejected';
        
        return { status: priorityStatus, requests: dayRequests };
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

    const getTypeDisplay = (req) => {
        if (req.request_type === 'permission') return 'Permission';
        if (req.type_id === 1 || req.type === 'Congés Payés') return 'Congés Payés';
        return 'Congé sans solde';
    };

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

    const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    const formatDateFR = (date) => {
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Calcul des demandes à venir
    const upcomingRequests = requests
        .filter(r => {
            const startDate = new Date(r.start_date);
            return startDate >= new Date() && r.status !== 'rejected';
        })
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        .slice(0, 5);

    return (
        <div className="calendar-container-modern">
            {/* En-tête */}
            <div className="calendar-header-modern">
                <div>
                    <h1 className="calendar-title">Mon calendrier</h1>
                    <p className="calendar-subtitle">Visualisation de mes demandes de congé</p>
                </div>
                <div className="view-toggle">
                    <button className={`view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>
                        📅 Mois
                    </button>
                    <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                        📋 Liste
                    </button>
                </div>
            </div>

            {/* Mini-statistiques */}
            <div className="calendar-stats-bar">
                <div className="stat-item">
                    <span className="stat-dot total-dot"></span>
                    <div className="stat-info">
                        <span className="stat-number">{stats.total}</span>
                        <span className="stat-label">Total</span>
                    </div>
                </div>
                <div className="stat-item">
                    <span className="stat-dot approved-dot"></span>
                    <div className="stat-info">
                        <span className="stat-number">{stats.approved}</span>
                        <span className="stat-label">Approuvés</span>
                    </div>
                </div>
                <div className="stat-item">
                    <span className="stat-dot pending-dot"></span>
                    <div className="stat-info">
                        <span className="stat-number">{stats.pending}</span>
                        <span className="stat-label">En attente</span>
                    </div>
                </div>
                <div className="stat-item">
                    <span className="stat-dot rejected-dot"></span>
                    <div className="stat-info">
                        <span className="stat-number">{stats.rejected}</span>
                        <span className="stat-label">Refusés</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="calendar-nav">
                <button className="nav-btn" onClick={() => changeMonth(-1)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                    Mois précédent
                </button>
                <div className="current-month">
                    <span className="month-name">{getMonthName(currentMonth)}</span>
                    <span className="year-name">{currentYear}</span>
                </div>
                <button className="nav-btn" onClick={() => changeMonth(1)}>
                    Mois suivant
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </button>
                <button className="today-btn" onClick={() => { setCurrentDate(new Date()); setSelectedDayInfo(null); }}>
                    Aujourd'hui
                </button>
            </div>

            {/* Légende compacte */}
            <div className="calendar-legend-compact">
                <div className="legend-item-compact">
                    <div className="legend-color-compact approved"></div>
                    <span>Approuvé</span>
                </div>
                <div className="legend-item-compact">
                    <div className="legend-color-compact pending-admin"></div>
                    <span>Attente admin</span>
                </div>
                <div className="legend-item-compact">
                    <div className="legend-color-compact pending-manager"></div>
                    <span>Attente manager</span>
                </div>
                <div className="legend-item-compact">
                    <div className="legend-color-compact rejected"></div>
                    <span>Refusé</span>
                </div>
                <div className="legend-item-compact">
                    <div className="legend-color-compact today"></div>
                    <span>Aujourd'hui</span>
                </div>
            </div>

            {viewMode === 'month' ? (
                <>
                    {/* Grille du calendrier */}
                    <div className="calendar-grid-modern">
                        {weekDays.map(day => (
                            <div key={day} className="calendar-weekday-modern">{day}</div>
                        ))}
                        {calendarDays.map((day, index) => {
                            const isCurrentDay = isToday(day.date);
                            const dayClassName = getDayClassName(day);
                            
                            return (
                                <div 
                                    key={index}
                                    className={`calendar-cell-modern ${dayClassName} ${!day.isCurrentMonth ? 'other-month' : ''}`}
                                    onClick={() => handleDayClick(day)}
                                >
                                    <div className="calendar-day-header-modern">
                                        <span className={`calendar-day-number-modern ${isCurrentDay ? 'today' : ''}`}>
                                            {day.dayNumber}
                                        </span>
                                        {day.requestsCount > 0 && (
                                            <span className="calendar-event-badge">{day.requestsCount}</span>
                                        )}
                                    </div>
                                    {day.requestsCount > 0 && day.requestsCount <= 2 && (
                                        <div className="calendar-event-mini">
                                            {day.requests.slice(0, 2).map((req, idx) => {
                                                const typeIcon = req.type_id === 1 ? '🏖️' : '📝';
                                                return (
                                                    <div key={idx} className="mini-event" title={getTypeDisplay(req)}>
                                                        {typeIcon}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                /* Vue liste des demandes */
                <div className="absences-list-view">
                    <div className="list-header">
                        <span>Type</span>
                        <span>Dates</span>
                        <span>Durée</span>
                        <span>Statut</span>
                    </div>
                    {requests.length === 0 ? (
                        <div className="empty-list">Aucune demande</div>
                    ) : (
                        requests.map((req, idx) => (
                            <div key={idx} className="list-item">
                                <span className="list-employee">{getTypeDisplay(req)}</span>
                                <span className="list-dates">{req.start_date} → {req.end_date}</span>
                                <span className="list-type">{req.duration} {req.type === 'Permission' ? 'h' : 'j'}</span>
                                <span className={`list-status status-${req.status}`}>
                                    {getStatusLabel(req.status)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Panneau de détail */}
            {selectedDayInfo && selectedDayInfo.requests.length > 0 && (
                <div className="calendar-detail-panel-modern">
                    <div className="detail-header-modern">
                        <h4>{formatDateFR(selectedDayInfo.date)}</h4>
                        <button className="detail-close-modern" onClick={() => setSelectedDayInfo(null)}>✖</button>
                    </div>
                    <div className="detail-body-modern">
                        {selectedDayInfo.requests.map((req, idx) => (
                            <div key={idx} className="detail-item-modern">
                                <div className="detail-employee">
                                    <div className="detail-avatar">
                                        {getTypeDisplay(req).charAt(0)}
                                    </div>
                                    <div className="detail-info">
                                        <div className="detail-name">{getTypeDisplay(req)}</div>
                                        <div className="detail-type">
                                            {req.request_type === 'permission' ? req.start_date : `Du ${req.start_date} au ${req.end_date}`}
                                        </div>
                                        <div className="detail-service">
                                            Durée : {req.duration} {req.type === 'Permission' ? 'heure(s)' : 'jour(s)'}
                                        </div>
                                        {req.motif && <div className="detail-service">Motif : {req.motif}</div>}
                                        {req.motif_refus && <div className="detail-service rejection">Motif du refus : {req.motif_refus}</div>}
                                    </div>
                                    <div className={`detail-status status-${req.status}`}>
                                        {getStatusLabel(req.status)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section des demandes à venir */}
            {upcomingRequests.length > 0 && (
                <div className="upcoming-section">
                    <h3>📋 Demandes à venir</h3>
                    <div className="upcoming-list">
                        {upcomingRequests.map((req, idx) => (
                            <div key={idx} className="upcoming-item">
                                <div className="upcoming-date">
                                    {new Date(req.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                </div>
                                <div className="upcoming-info">
                                    <strong>{getTypeDisplay(req)}</strong>
                                    <span>{req.start_date} → {req.end_date}</span>
                                </div>
                                <div className={`upcoming-status status-${req.status}`}>
                                    {getStatusLabel(req.status).split(' ')[0]}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CalendarView;