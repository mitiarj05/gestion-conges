// frontend/src/components/employee/CalendarView.jsx
import React, { useState, useEffect } from 'react';
import { getMonthName, getFirstDayOfMonth, getDaysInMonth, formatDate, getDayName } from '../../utils/dateUtils';

function CalendarView({ requests }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState([]);
    const [selectedDayInfo, setSelectedDayInfo] = useState(null);

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    useEffect(() => {
        generateCalendar();
    }, [currentDate, requests]);

    const getStatusForDate = (date) => {
        const dateStr = formatDate(date);
        const dayRequests = requests.filter(req => {
            const start = new Date(req.start_date);
            const end = new Date(req.end_date);
            const current = new Date(date);
            return current >= start && current <= end;
        });
        
        if (dayRequests.length === 0) return null;
        
        // Priorité: approved > pending_admin > pending_manager
        if (dayRequests.some(r => r.status === 'approved')) return 'approved';
        if (dayRequests.some(r => r.status === 'pending_admin')) return 'pending_admin';
        if (dayRequests.some(r => r.status === 'pending_manager')) return 'pending_manager';
        return 'pending_manager';
    };

    const getStatusClass = (status) => {
        switch(status) {
            case 'approved': return 'calendar-day-approved';
            case 'pending_admin': return 'calendar-day-pending-admin';
            case 'pending_manager': return 'calendar-day-pending-manager';
            default: return '';
        }
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'approved': return '✅ Approuvé';
            case 'pending_admin': return '🕐 En attente validation admin';
            case 'pending_manager': return '⏳ En attente validation manager';
            default: return '';
        }
    };

    const generateCalendar = () => {
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        
        // Obtenir le nombre de jours du mois précédent pour compléter la première semaine
        const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);
        
        const days = [];
        
        // Jours du mois précédent
        for (let i = firstDay - 1; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - 1, prevMonthDays - i);
            days.push({
                date,
                isCurrentMonth: false,
                dayNumber: prevMonthDays - i,
                status: getStatusForDate(date)
            });
        }
        
        // Jours du mois courant
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentYear, currentMonth, i);
            days.push({
                date,
                isCurrentMonth: true,
                dayNumber: i,
                status: getStatusForDate(date)
            });
        }
        
        // Jours du mois suivant pour compléter (6 lignes)
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(currentYear, currentMonth + 1, i);
            days.push({
                date,
                isCurrentMonth: false,
                dayNumber: i,
                status: getStatusForDate(date)
            });
        }
        
        setCalendarDays(days);
    };

    const changeMonth = (delta) => {
        setCurrentDate(new Date(currentYear, currentMonth + delta, 1));
        setSelectedDayInfo(null);
    };

    const handleDayClick = (day) => {
        if (day.status) {
            setSelectedDayInfo(day);
        }
    };

    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <button className="btn btn-sm btn-secondary" onClick={() => changeMonth(-1)}>◀ Mois précédent</button>
                <h3>{getMonthName(currentMonth)} {currentYear}</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => changeMonth(1)}>Mois suivant ▶</button>
                <button className="btn btn-sm btn-primary" onClick={() => {
                    setCurrentDate(new Date());
                    setSelectedDayInfo(null);
                }}>📅 Aujourd'hui</button>
            </div>
            
            <div className="calendar-legend">
                <div className="legend-item"><span className="calendar-day-approved"></span> Congé approuvé</div>
                <div className="legend-item"><span className="calendar-day-pending-admin"></span> En attente validation admin</div>
                <div className="legend-item"><span className="calendar-day-pending-manager"></span> En attente validation manager</div>
            </div>
            
            <div className="calendar-grid">
                {weekDays.map(day => (
                    <div key={day} className="calendar-weekday">{day}</div>
                ))}
                {calendarDays.map((day, index) => (
                    <div 
                        key={index}
                        className={`calendar-day ${!day.isCurrentMonth ? 'calendar-day-other-month' : ''} ${day.status ? getStatusClass(day.status) : ''}`}
                        onClick={() => handleDayClick(day)}
                        style={{ cursor: day.status ? 'pointer' : 'default' }}
                    >
                        <span className="calendar-day-number">{day.dayNumber}</span>
                        {day.status && <span className="calendar-day-dot">●</span>}
                    </div>
                ))}
            </div>
            
            {selectedDayInfo && (
                <div className="calendar-detail">
                    <h4>📅 {formatDate(selectedDayInfo.date)}</h4>
                    <p>Statut: {getStatusLabel(selectedDayInfo.status)}</p>
                </div>
            )}
        </div>
    );
}

export default CalendarView;