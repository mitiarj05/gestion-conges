// frontend/src/components/manager/TeamCalendar.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TeamCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [teamAbsences, setTeamAbsences] = useState([]);
    const [calendarDays, setCalendarDays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDayInfo, setSelectedDayInfo] = useState(null);

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    useEffect(() => {
        fetchTeamAbsences();
    }, [currentDate]);

    useEffect(() => {
        if (teamAbsences.length >= 0) {
            generateCalendar();
        }
    }, [currentDate, teamAbsences]);

    const getAuthHeaders = () => ({ 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
    });

    const fetchTeamAbsences = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/api/leaves/team-absences', getAuthHeaders());
            console.log('Absences reçues pour le calendrier:', response.data);
            setTeamAbsences(response.data);
        } catch (error) {
            console.error('Erreur chargement absences:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };

    const getMonthName = (month) => {
        const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return months[month];
    };

    const formatDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

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
        return teamAbsences.filter(absence => {
            return isDateInRange(date, absence.date_debut, absence.date_fin);
        });
    };

    const getDayClass = (absences) => {
        if (absences.length === 0) return '';
        const hasApproved = absences.some(a => a.statut === 'approved');
        const hasPendingAdmin = absences.some(a => a.statut === 'pending_admin');
        const hasPendingManager = absences.some(a => a.statut === 'pending_manager');
        const hasRejected = absences.some(a => a.statut === 'rejected');
        
        // Priorité : approved > pending_admin > pending_manager > rejected
        if (hasApproved) return 'calendar-day-approved';
        if (hasPendingAdmin) return 'calendar-day-pending-admin';
        if (hasPendingManager) return 'calendar-day-pending-manager';
        if (hasRejected) return 'calendar-day-rejected';
        return '';
    };

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
            case 'pending_admin': return 'En attente validation admin';
            case 'pending_manager': return 'En attente validation manager';
            case 'rejected': return 'Refusé';
            default: return statut;
        }
    };

    const generateCalendar = () => {
        const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
        let startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth - 1);
        const days = [];

        // Jours du mois précédent
        for (let i = startOffset - 1; i >= 0; i--) {
            const dayNumber = daysInPrevMonth - i;
            const date = new Date(currentYear, currentMonth - 1, dayNumber);
            const absences = getAbsencesForDate(date);
            days.push({ date, isCurrentMonth: false, dayNumber, absences });
        }

        // Jours du mois courant
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const absences = getAbsencesForDate(date);
            days.push({ date, isCurrentMonth: true, dayNumber: i, absences });
        }

        // Compléter pour avoir 42 jours
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

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="loading-spinner" style={{ width: '30px', height: '30px', margin: '0 auto 20px' }}></div>
                <div>Chargement du calendrier des absences...</div>
            </div>
        );
    }

    return (
        <div>
            <h2>📅 Calendrier des absences de l'équipe</h2>
            <div className="info-box" style={{ marginBottom: '20px', background: '#e8f4fd' }}>
                <strong>ℹ️ Ce calendrier montre les absences de tous les membres de votre équipe.</strong><br/>
                Cliquez sur un jour coloré pour voir le détail des absences.
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <button className="btn btn-sm btn-secondary" onClick={() => changeMonth(-1)}>◀ Mois précédent</button>
                <h3>{getMonthName(currentMonth)} {currentYear}</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => changeMonth(1)}>Mois suivant ▶</button>
                <button className="btn btn-sm btn-primary" onClick={() => { setCurrentDate(new Date()); setSelectedDayInfo(null); }}>📅 Aujourd'hui</button>
            </div>
            
            {/* Légende des couleurs */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '20px', height: '20px', background: '#d4edda', border: '2px solid #28a745', borderRadius: '4px' }}></span>
                    <span>✅ Congés approuvés (Vert)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '20px', height: '20px', background: '#fff3cd', border: '2px solid #ffc107', borderRadius: '4px' }}></span>
                    <span>🕐 En attente validation admin (Orange)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '20px', height: '20px', background: '#cce5ff', border: '2px solid #007bff', borderRadius: '4px' }}></span>
                    <span>⏳ En attente validation manager (Bleu)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '20px', height: '20px', background: '#f8d7da', border: '2px solid #dc3545', borderRadius: '4px' }}></span>
                    <span>❌ Congés refusés (Rouge)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '20px', height: '20px', background: '#e9ecef', border: '1px solid #adb5bd', borderRadius: '4px' }}></span>
                    <span>Aucun congé</span>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                {weekDays.map(day => (
                    <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px', background: '#0f3460', color: 'white', borderRadius: '8px' }}>{day}</div>
                ))}
                {calendarDays.map((day, index) => {
                    const dayClass = getDayClass(day.absences);
                    const isCurrentDay = isToday(day.date);
                    
                    let backgroundColor = 'white';
                    let borderColor = '#e9ecef';
                    let borderWidth = '1px';
                    
                    if (dayClass === 'calendar-day-approved') {
                        backgroundColor = '#d4edda';
                        borderColor = '#28a745';
                        borderWidth = '2px';
                    } else if (dayClass === 'calendar-day-pending-admin') {
                        backgroundColor = '#fff3cd';
                        borderColor = '#ffc107';
                        borderWidth = '2px';
                    } else if (dayClass === 'calendar-day-pending-manager') {
                        backgroundColor = '#cce5ff';
                        borderColor = '#007bff';
                        borderWidth = '2px';
                    } else if (dayClass === 'calendar-day-rejected') {
                        backgroundColor = '#f8d7da';
                        borderColor = '#dc3545';
                        borderWidth = '2px';
                    } else if (!day.isCurrentMonth) {
                        backgroundColor = '#f8f9fa';
                        borderColor = '#dee2e6';
                        borderWidth = '1px';
                    }
                    
                    return (
                        <div 
                            key={index}
                            onClick={() => handleDayClick(day)}
                            style={{
                                aspectRatio: '1',
                                border: `${borderWidth} solid ${borderColor}`,
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: day.absences.length > 0 ? 'pointer' : 'default',
                                backgroundColor: backgroundColor,
                                transition: 'all 0.2s',
                                opacity: day.isCurrentMonth ? 1 : 0.6
                            }}
                            onMouseEnter={(e) => {
                                if (day.absences.length > 0) {
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <span style={{ 
                                fontSize: '14px', 
                                fontWeight: isCurrentDay ? 'bold' : '500',
                                color: isCurrentDay ? '#0f3460' : 'inherit'
                            }}>
                                {day.dayNumber}
                            </span>
                            {isCurrentDay && (
                                <span style={{ fontSize: '8px', color: '#0f3460', fontWeight: 'bold' }}>Aujourd'hui</span>
                            )}
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
                <div style={{ marginTop: '20px', padding: '15px', background: '#e8f4fd', borderRadius: '8px', borderLeft: '4px solid #0f3460' }}>
                    <h4>📅 Détails du {selectedDayInfo.date.toLocaleDateString('fr-FR')}</h4>
                    <div style={{ marginTop: '10px' }}>
                        {selectedDayInfo.absences.map((absence, idx) => (
                            <div key={idx} style={{ padding: '8px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <strong>👤 {absence.prenom} {absence.nom}</strong>
                                <span>{absence.type_name}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {getStatusIcon(absence.statut)}
                                    <span className={`status ${absence.statut === 'approved' ? 'status-approved' : absence.statut === 'pending_admin' ? 'status-pending-admin' : absence.statut === 'pending_manager' ? 'status-pending-manager' : 'status-rejected'}`}>
                                        {getStatusLabel(absence.statut)}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {teamAbsences.length === 0 && (
                <div className="info-box" style={{ marginTop: '20px', background: '#fff3cd' }}>
                    <strong>ℹ️ Aucune absence planifiée pour le moment.</strong><br/>
                    Les congés approuvés ou en attente apparaîtront sur le calendrier.
                </div>
            )}
        </div>
    );
}

export default TeamCalendar;