// frontend/src/components/admin/GlobalCalendar.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function GlobalCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [allAbsences, setAllAbsences] = useState([]);
    const [calendarDays, setCalendarDays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDayInfo, setSelectedDayInfo] = useState(null);

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    useEffect(() => {
        fetchAllAbsences();
    }, [currentDate]);

    useEffect(() => {
        if (allAbsences.length >= 0) {
            generateCalendar();
        }
    }, [currentDate, allAbsences]);

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const fetchAllAbsences = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/api/leaves/all-absences', getAuthHeaders());
            setAllAbsences(response.data);
        } catch (error) {
            console.error('Erreur chargement absences:', error);
        } finally {
            setLoading(false);
        }
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
        const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
        let startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth - 1);
        const days = [];

        for (let i = startOffset - 1; i >= 0; i--) {
            const dayNumber = daysInPrevMonth - i;
            const date = new Date(currentYear, currentMonth - 1, dayNumber);
            const absences = getAbsencesForDate(date);
            days.push({ date, isCurrentMonth: false, dayNumber, absences });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const absences = getAbsencesForDate(date);
            days.push({ date, isCurrentMonth: true, dayNumber: i, absences });
        }

        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(currentYear, currentMonth + 1, i);
            const absences = getAbsencesForDate(date);
            days.push({ date, isCurrentMonth: false, dayNumber: i, absences });
        }

        setCalendarDays(days);
    };

    const changeMonth = (delta) => {
        setCurrentDate(new Date(currentYear, currentMonth + delta, 1));
        setSelectedDayInfo(null);
    };

    const handleDayClick = (day) => {
        if (day.absences.length > 0) {
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

    const getStatusIcon = (statut) => {
        switch(statut) {
            case 'approved': return '✅';
            case 'pending_admin': return '🕐';
            case 'pending_manager': return '⏳';
            case 'rejected': return '❌';
            default: return '📅';
        }
    };

    const getStatusLabel = (statut) => {
        switch(statut) {
            case 'approved': return 'Approuvé';
            case 'pending_admin': return 'En attente admin';
            case 'pending_manager': return 'En attente manager';
            case 'rejected': return 'Refusé';
            default: return statut;
        }
    };

    if (loading) {
        return <div className="text-center" style={{ padding: '40px' }}>Chargement du calendrier...</div>;
    }

    return (
        <div>
            <h2>📅 Calendrier général des congés</h2>
            <div className="info-box" style={{ marginBottom: '20px' }}>
                <strong>ℹ️ Ce calendrier montre toutes les demandes de congés de l'entreprise.</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button className="btn btn-sm btn-secondary" onClick={() => changeMonth(-1)}>◀ Mois précédent</button>
                <h3>{getMonthName(currentMonth)} {currentYear}</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => changeMonth(1)}>Mois suivant ▶</button>
                <button className="btn btn-sm btn-primary" onClick={() => { setCurrentDate(new Date()); setSelectedDayInfo(null); }}>📅 Aujourd'hui</button>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                <div><span style={{ background: '#d4edda', padding: '5px 10px', borderRadius: '4px' }}>✅ Approuvé</span></div>
                <div><span style={{ background: '#fff3cd', padding: '5px 10px', borderRadius: '4px' }}>🕐 En attente admin</span></div>
                <div><span style={{ background: '#cce5ff', padding: '5px 10px', borderRadius: '4px' }}>⏳ En attente manager</span></div>
                <div><span style={{ background: '#f8d7da', padding: '5px 10px', borderRadius: '4px' }}>❌ Refusé</span></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                {weekDays.map(day => (
                    <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px', background: '#0f3460', color: 'white', borderRadius: '8px' }}>{day}</div>
                ))}
                {calendarDays.map((day, index) => {
                    const dayClass = getDayClass(day.absences);
                    let backgroundColor = 'white';
                    let borderColor = '#e9ecef';

                    if (dayClass === 'calendar-day-approved') { backgroundColor = '#d4edda'; borderColor = '#28a745'; }
                    else if (dayClass === 'calendar-day-pending-admin') { backgroundColor = '#fff3cd'; borderColor = '#ffc107'; }
                    else if (dayClass === 'calendar-day-pending-manager') { backgroundColor = '#cce5ff'; borderColor = '#007bff'; }
                    else if (dayClass === 'calendar-day-rejected') { backgroundColor = '#f8d7da'; borderColor = '#dc3545'; }
                    else if (!day.isCurrentMonth) { backgroundColor = '#f8f9fa'; }

                    return (
                        <div key={index} onClick={() => handleDayClick(day)} style={{
                            aspectRatio: '1', border: `2px solid ${borderColor}`, borderRadius: '8px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: day.absences.length > 0 ? 'pointer' : 'default',
                            backgroundColor: backgroundColor, opacity: day.isCurrentMonth ? 1 : 0.6
                        }}>
                            <span style={{ fontSize: '14px', fontWeight: isToday(day.date) ? 'bold' : '500' }}>{day.dayNumber}</span>
                            {isToday(day.date) && <span style={{ fontSize: '8px', color: '#0f3460' }}>Aujourd'hui</span>}
                            {day.absences.length > 0 && (
                                <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: '10px', padding: '2px 5px', marginTop: '2px' }}>
                                    {day.absences.length} absent(s)
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedDayInfo && (
                <div style={{ marginTop: '20px', padding: '15px', background: '#e8f4fd', borderRadius: '8px' }}>
                    <h4>📅 Détails du {selectedDayInfo.date.toLocaleDateString('fr-FR')}</h4>
                    {selectedDayInfo.absences.map((absence, idx) => (
                        <div key={idx} style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                            <strong>👤 {absence.prenom} {absence.nom}</strong> - {absence.type_name} - {absence.service || 'Service non spécifié'}
                            <span style={{ marginLeft: '10px' }}>{getStatusIcon(absence.statut)} {getStatusLabel(absence.statut)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default GlobalCalendar;