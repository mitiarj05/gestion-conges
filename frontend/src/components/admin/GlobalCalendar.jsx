// frontend/src/components/admin/GlobalCalendar.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';

function GlobalCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [allAbsences, setAllAbsences] = useState([]);
    const [calendarDays, setCalendarDays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDayInfo, setSelectedDayInfo] = useState(null);
    const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
    const [viewMode, setViewMode] = useState('month'); // month, week, list

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    useEffect(() => {
        fetchAllAbsences();
    }, [currentDate]);

    useEffect(() => {
        if (allAbsences.length >= 0) {
            generateCalendar();
            calculateStats();
        }
    }, [currentDate, allAbsences]);

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const fetchAllAbsences = async () => {
        setLoading(true);
        try {
const response = await axios.get(`${API_URL}/leaves/all-absences`, getAuthHeaders());
            setAllAbsences(response.data);
            calculateStatsFromData(response.data);
        } catch (error) {
            console.error('Erreur chargement absences:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStatsFromData = (absences) => {
        const approved = absences.filter(a => a.statut === 'approved').length;
        const pendingAdmin = absences.filter(a => a.statut === 'pending_admin').length;
        const pendingManager = absences.filter(a => a.statut === 'pending_manager').length;
        const rejected = absences.filter(a => a.statut === 'rejected').length;
        
        setStats({
            total: absences.length,
            approved,
            pending: pendingAdmin + pendingManager,
            pendingManager,
            pendingAdmin,
            rejected
        });
    };

    const calculateStats = () => {
        calculateStatsFromData(allAbsences);
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
    const getMonthName = (month) => ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][month];

    const isDateInRange = (date, startDate, endDate) => {
        const d = new Date(date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        d.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return d >= start && d <= end;
    };

    const getAbsencesForDate = (date) => {
        return allAbsences.filter(absence => {
            return isDateInRange(date, absence.date_debut, absence.date_fin);
        });
    };

    const getStatusIcon = (statut) => {
        switch(statut) {
            case 'approved': return '✓';
            case 'pending_admin': return '○';
            case 'pending_manager': return '◐';
            case 'rejected': return '✗';
            default: return '•';
        }
    };

    const getStatusLabel = (statut) => {
        switch(statut) {
            case 'approved': return 'Approuvé';
            case 'pending_admin': return 'En attente validation admin';
            case 'pending_manager': return 'En attente validation manager';
            case 'rejected': return 'Refusé';
            default: return statut || 'Inconnu';
        }
    };

    const getDayClass = (absences) => {
        if (absences.length === 0) return '';
        const hasApproved = absences.some(a => a.statut === 'approved');
        const hasPendingAdmin = absences.some(a => a.statut === 'pending_admin');
        const hasPendingManager = absences.some(a => a.statut === 'pending_manager');
        const hasRejected = absences.some(a => a.statut === 'rejected');
        
        if (hasApproved) return 'calendar-day-approved';
        if (hasPendingAdmin) return 'calendar-day-pending-admin';
        if (hasPendingManager) return 'calendar-day-pending-manager';
        if (hasRejected) return 'calendar-day-rejected';
        return '';
    };

    const generateCalendar = () => {
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);
        const days = [];
        
        let startOffset = firstDay === 0 ? 6 : firstDay - 1;
        
        for (let i = startOffset - 1; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - 1, prevMonthDays - i);
            const absences = getAbsencesForDate(date);
            const status = getDayClass(absences);
            days.push({
                date,
                isCurrentMonth: false,
                dayNumber: prevMonthDays - i,
                status,
                absencesCount: absences.length,
                absences: absences
            });
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const absences = getAbsencesForDate(date);
            const status = getDayClass(absences);
            days.push({
                date,
                isCurrentMonth: true,
                dayNumber: i,
                status,
                absencesCount: absences.length,
                absences: absences
            });
        }
        
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(currentYear, currentMonth + 1, i);
            const absences = getAbsencesForDate(date);
            const status = getDayClass(absences);
            days.push({
                date,
                isCurrentMonth: false,
                dayNumber: i,
                status,
                absencesCount: absences.length,
                absences: absences
            });
        }
        
        setCalendarDays(days);
    };

    const changeMonth = (delta) => {
        setCurrentDate(new Date(currentYear, currentMonth + delta, 1));
        setSelectedDayInfo(null);
    };

    const handleDayClick = (day) => {
        if (day.absencesCount > 0) {
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

    // Calcul des congés à venir
    const upcomingAbsences = allAbsences
        .filter(a => new Date(a.date_debut) >= new Date())
        .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut))
        .slice(0, 5);

    if (loading) {
        return (
            <div className="loading-container" style={{ minHeight: '400px' }}>
                <div className="loading-spinner" style={{ width: '30px', height: '30px' }}></div>
                <div>Chargement du calendrier...</div>
            </div>
        );
    }

    return (
        <div className="calendar-container-modern">
            {/* En-tête avec titre et vue */}
            <div className="calendar-header-modern">
                <div>
                    <h1 className="calendar-title">Calendrier des congés</h1>
                    <p className="calendar-subtitle">Visualisation globale des absences de l'entreprise</p>
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

            {/* Stats sous forme de mini-indicateurs intégrés */}
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

            {/* Navigation mois */}
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
                            const dayClassName = day.status;
                            
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
                                        {day.absencesCount > 0 && (
                                            <span className="calendar-event-badge">{day.absencesCount}</span>
                                        )}
                                    </div>
                                    {day.absencesCount > 0 && day.absencesCount <= 3 && (
                                        <div className="calendar-event-mini">
                                            {day.absences.slice(0, 2).map((absence, idx) => (
                                                <div key={idx} className="mini-event" title={`${absence.prenom} ${absence.nom}`}>
                                                    {absence.prenom?.charAt(0)}{absence.nom?.charAt(0)}
                                                </div>
                                            ))}
                                            {day.absencesCount > 2 && (
                                                <div className="mini-event more">+{day.absencesCount - 2}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                /* Vue liste des absences */
                <div className="absences-list-view">
                    <div className="list-header">
                        <span>Employé</span>
                        <span>Dates</span>
                        <span>Type</span>
                        <span>Statut</span>
                    </div>
                    {allAbsences.length === 0 ? (
                        <div className="empty-list">Aucune absence planifiée</div>
                    ) : (
                        allAbsences.map((absence, idx) => (
                            <div key={idx} className="list-item">
                                <span className="list-employee">{absence.prenom} {absence.nom}</span>
                                <span className="list-dates">{absence.date_debut} → {absence.date_fin}</span>
                                <span className="list-type">{absence.type_name}</span>
                                <span className={`list-status status-${absence.statut}`}>
                                    {getStatusLabel(absence.statut)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Panneau de détail */}
            {selectedDayInfo && selectedDayInfo.absences.length > 0 && (
                <div className="calendar-detail-panel-modern">
                    <div className="detail-header-modern">
                        <h4>{formatDateFR(selectedDayInfo.date)}</h4>
                        <button className="detail-close-modern" onClick={() => setSelectedDayInfo(null)}>✖</button>
                    </div>
                    <div className="detail-body-modern">
                        {selectedDayInfo.absences.map((absence, idx) => (
                            <div key={idx} className="detail-item-modern">
                                <div className="detail-employee">
                                    <div className="detail-avatar">
                                        {absence.prenom?.charAt(0)}{absence.nom?.charAt(0)}
                                    </div>
                                    <div className="detail-info">
                                        <div className="detail-name">{absence.prenom} {absence.nom}</div>
                                        <div className="detail-type">{absence.type_name}</div>
                                        {absence.service && <div className="detail-service">Service : {absence.service}</div>}
                                    </div>
                                    <div className={`detail-status status-${absence.statut}`}>
                                        {getStatusLabel(absence.statut)}
                                    </div>
                                </div>
                                <div className="detail-dates">
                                    📆 Du {absence.date_debut} au {absence.date_fin}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section des congés à venir */}
            {upcomingAbsences.length > 0 && (
                <div className="upcoming-section">
                    <h3>📅 Congés à venir</h3>
                    <div className="upcoming-list">
                        {upcomingAbsences.map((absence, idx) => (
                            <div key={idx} className="upcoming-item">
                                <div className="upcoming-date">
                                    {new Date(absence.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                </div>
                                <div className="upcoming-info">
                                    <strong>{absence.prenom} {absence.nom}</strong>
                                    <span>{absence.type_name}</span>
                                </div>
                                <div className={`upcoming-status status-${absence.statut}`}>
                                    {getStatusLabel(absence.statut).split(' ')[0]}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default GlobalCalendar;