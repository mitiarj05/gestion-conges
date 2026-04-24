// frontend/src/utils/dateUtils.js

// Formater une date en français
export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

// Formater une date avec heure
export const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Obtenir le mois en français
export const getMonthName = (month) => {
    const months = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month];
};

// Obtenir le jour de la semaine
export const getDayName = (date) => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[date.getDay()];
};

// Calculer le nombre de jours entre deux dates
export const daysBetween = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
};

// Vérifier si une date est un week-end
export const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
};

// Générer les jours du mois
export const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
};

// Obtenir le premier jour du mois
export const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
};

// Vérifier si une date est dans le passé
export const isPastDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
};

// Vérifier si l'utilisateur a des alertes de solde faible
export const hasLowBalanceAlert = (balance, threshold = 5) => {
    return balance.cp_restant < threshold || balance.rtt_restant < threshold;
};

// Obtenir le message d'alerte
export const getBalanceAlertMessage = (balance) => {
    const alerts = [];
    if (balance.cp_restant < 5) {
        alerts.push(`⚠️ Congés Payés : il vous reste ${balance.cp_restant} jours`);
    }
    if (balance.rtt_restant < 5) {
        alerts.push(`⚠️ RTT : il vous reste ${balance.rtt_restant} jours`);
    }
    return alerts;
};