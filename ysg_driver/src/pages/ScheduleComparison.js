import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import scheduleService from '../services/scheduleService';
import timelogService from '../services/timelogService';
import userService from '../services/userService';
import Navigation from '../components/Navigation';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AlertMessage from '../components/ui/AlertMessage';
import '../styles/ScheduleComparison.css';

const ScheduleComparison = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: getStartOfWeek().toISOString().split('T')[0],
    endDate: getEndOfWeek().toISOString().split('T')[0]
  });
  const [scheduleData, setScheduleData] = useState([]);
  const [timelogData, setTimelogData] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Jours de la semaine
  const days = [
    { value: 'monday', label: 'Lundi' },
    { value: 'tuesday', label: 'Mardi' },
    { value: 'wednesday', label: 'Mercredi' },
    { value: 'thursday', label: 'Jeudi' },
    { value: 'friday', label: 'Vendredi' },
    { value: 'saturday', label: 'Samedi' },
    { value: 'sunday', label: 'Dimanche' }
  ];

  // Vérifier les droits d'accès
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'direction') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Fonctions utilitaires pour les dates
  function getStartOfWeek() {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  function getEndOfWeek() {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? 0 : 7);
    return new Date(date.setDate(diff));
  }

  // Charger la liste des préparateurs
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const allUsers = await userService.getAllUsers();
        const preparators = allUsers.filter(user => user.role === 'preparator');
        setUsers(preparators);
        
        if (preparators && preparators.length > 0) {
          setSelectedUser(preparators[0]._id);
        } else {
          setError('Aucun utilisateur avec le rôle "préparateur" n\'a été trouvé.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur:', err);
        setError(`Erreur: ${err.message || 'Erreur inconnue'}`);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Charger les données de planning et de pointage
  useEffect(() => {
    if (!selectedUser) return;

    const fetchScheduleAndTimelogs = async () => {
      try {
        setLoading(true);
        setError(null);
    
        // Charger le planning
        const schedule = await scheduleService.getUserSchedule(selectedUser);
        setScheduleData(schedule || []);
    
        // Charger les pointages
        // Modifier pour spécifier le userId dans la requête des pointages
        const params = {
          userId: selectedUser,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        };
        
        const timelogs = await timelogService.getTimeLogs(1, 500, null, params);
        
        // S'assurer que les pointages sont bien pour le bon utilisateur
        const timeLogsArray = timelogs && timelogs.timeLogs ? timelogs.timeLogs : [];
        
        // Filtrer pour l'utilisateur et la plage de dates de façon explicite
        const startDate = new Date(dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        
        const filteredTimelogs = timeLogsArray.filter(log => {
          const logStartDate = new Date(log.startTime);
          return log.userId === selectedUser && 
                 logStartDate >= startDate && 
                 logStartDate <= endDate;
        });
        
        console.log("Timelogs filtrés:", filteredTimelogs);
        setTimelogData(filteredTimelogs);
    
        // Générer les données de comparaison
        generateComparisonData(schedule || [], filteredTimelogs);
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur:', err);
        setError(`Erreur: ${err.message || 'Erreur inconnue'}`);
        setLoading(false);
      }
    };

    fetchScheduleAndTimelogs();
  }, [selectedUser, dateRange]);

  // Générer les données de comparaison
  const generateComparisonData = (schedule, timelogs) => {
    const weekDates = getWeekDates();
    const comparison = [];
  
    days.forEach(day => {
      const dayDate = weekDates[day.value];
      const scheduleEntry = schedule.find(entry => entry.day === day.value);
      
      // Filtrer les pointages du jour
      const dayTimelogs = timelogs.filter(log => {
        const logDate = new Date(log.startTime);
        const logDateStr = logDate.toISOString().split('T')[0];
        const dayDateStr = dayDate.toISOString().split('T')[0];
        return logDateStr === dayDateStr;
      });
  
      // Calculer les métriques
      let startDiff = null;
      let endDiff = null;
      let totalWorkedMinutes = 0;
  
      if (scheduleEntry && scheduleEntry.entryType === 'work' && dayTimelogs.length > 0) {
        // Calcul du temps prévu vs réel
        const [scheduledStartHours, scheduledStartMinutes] = scheduleEntry.startTime.split(':').map(Number);
        const [scheduledEndHours, scheduledEndMinutes] = scheduleEntry.endTime.split(':').map(Number);
        
        const scheduledStartMinutesFromMidnight = scheduledStartHours * 60 + scheduledStartMinutes;
        const scheduledEndMinutesFromMidnight = scheduledEndHours * 60 + scheduledEndMinutes;
        
        // Premier pointage = arrivée
        const firstLog = dayTimelogs.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
        const actualStartTime = new Date(firstLog.startTime);
        const actualStartMinutesFromMidnight = actualStartTime.getHours() * 60 + actualStartTime.getMinutes();
        
        startDiff = actualStartMinutesFromMidnight - scheduledStartMinutesFromMidnight;
        
        // Dernier pointage complété = départ
        const completedLogs = dayTimelogs.filter(log => log.status === 'completed');
        if (completedLogs.length > 0) {
          const lastLog = completedLogs.sort((a, b) => new Date(b.endTime) - new Date(a.endTime))[0];
          const actualEndTime = new Date(lastLog.endTime);
          const actualEndMinutesFromMidnight = actualEndTime.getHours() * 60 + actualEndTime.getMinutes();
          
          endDiff = actualEndMinutesFromMidnight - scheduledEndMinutesFromMidnight;
        }
        
        // Calculer le temps total travaillé
        dayTimelogs.forEach(log => {
          if (log.status === 'completed' && log.endTime) {
            const start = new Date(log.startTime);
            const end = new Date(log.endTime);
            // Arrondir à 2 décimales pour éviter les nombres à virgule flottante longs
            totalWorkedMinutes += Math.round(((end - start) / (1000 * 60)) * 100) / 100;
          }
        });
      } else if (dayTimelogs.length > 0) {
        // Calculer le temps travaillé même sans planning
        dayTimelogs.forEach(log => {
          if (log.status === 'completed' && log.endTime) {
            const start = new Date(log.startTime);
            const end = new Date(log.endTime);
            // Arrondir à 2 décimales
            totalWorkedMinutes += Math.round(((end - start) / (1000 * 60)) * 100) / 100;
          }
        });
      }
  
      comparison.push({
        day: day.value,
        dayLabel: day.label,
        date: dayDate,
        scheduled: scheduleEntry,
        timelogs: dayTimelogs,
        startDiff: startDiff !== null ? Math.round(startDiff * 10) / 10 : null, // Arrondir à 1 décimale
        endDiff: endDiff !== null ? Math.round(endDiff * 10) / 10 : null, // Arrondir à 1 décimale
        totalWorkedMinutes: totalWorkedMinutes > 0 ? Math.round(totalWorkedMinutes * 100) / 100 : 0, // Arrondir à 2 décimales
        shouldWork: scheduleEntry && scheduleEntry.entryType === 'work'
      });
    });
  
    setComparisonData(comparison);
  };

  // Obtenir les dates de la semaine
  const getWeekDates = () => {
    const dates = {};
    const startDate = new Date(dateRange.startDate);
    
    // S'assurer que les jours sont correctement ordonnés
    days.forEach((day, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      dates[day.value] = date;
    });
    
    return dates;
  };

  // Formater la différence en minutes
  const formatDiffMinutes = (minutes) => {
    if (minutes === null) return 'N/A';
    
    // Arrondir à 2 décimales maximum
    const roundedMinutes = Math.round(minutes * 100) / 100;
    
    const hours = Math.floor(Math.abs(roundedMinutes) / 60);
    const mins = Math.abs(Math.round(roundedMinutes % 60));
    
    let result = '';
    if (hours > 0) {
      result += `${hours}h`;
    }
    if (mins > 0 || hours === 0) {
      result += `${mins}min`;
    }
    
    return minutes < 0 ? `${result} avant` : minutes > 0 ? `${result} après` : 'À l\'heure';
  };

  // Formater les minutes en HH:MM
  const formatMinutesToTime = (minutes) => {
    if (minutes === null || isNaN(minutes)) return 'N/A';
    
    // Arrondir les minutes à un nombre entier ou à 2 décimales max
    const roundedMinutes = Math.round(minutes * 100) / 100;
    
    const hours = Math.floor(roundedMinutes / 60);
    const mins = Math.floor(roundedMinutes % 60);
    const secs = Math.round((roundedMinutes % 1) * 60); // Convertir décimales en secondes
    
    // Format HH:MM ou HH:MM:SS si des secondes existent
    if (secs > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Formater une date pour l'affichage
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  // Navigation entre semaines
  const handlePreviousWeek = () => {
    const startDate = new Date(dateRange.startDate);
    startDate.setDate(startDate.getDate() - 7);
    
    const endDate = new Date(dateRange.endDate);
    endDate.setDate(endDate.getDate() - 7);
    
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  const handleNextWeek = () => {
    const startDate = new Date(dateRange.startDate);
    startDate.setDate(startDate.getDate() + 7);
    
    const endDate = new Date(dateRange.endDate);
    endDate.setDate(endDate.getDate() + 7);
    
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  // Classes CSS selon l'écart
  const getDifferenceClass = (diff) => {
    if (diff === null) return '';
    if (diff < -15) return 'early';      // Plus de 15 minutes en avance
    if (diff < 5) return 'on-time';      // À l'heure (±5 minutes)
    if (diff < 15) return 'slightly-late'; // Légèrement en retard (5-15 minutes)
    return 'late';                        // En retard (plus de 15 minutes)
  };

  // Calculer les totaux
  const calculateTotalWorkedTime = () => {
    const totalMinutes = comparisonData.reduce((sum, day) => sum + (day.totalWorkedMinutes || 0), 0);
    // Arrondir à 2 décimales
    const roundedMinutes = Math.round(totalMinutes * 100) / 100;
    return formatMinutesToTime(roundedMinutes);
  };

  const calculateTotalScheduledTime = () => {
    let totalMinutes = 0;
    
    comparisonData.forEach(day => {
      if (day.scheduled && day.scheduled.entryType === 'work') {
        const [startHours, startMinutes] = day.scheduled.startTime.split(':').map(Number);
        const [endHours, endMinutes] = day.scheduled.endTime.split(':').map(Number);
        
        const startMinutesFromMidnight = startHours * 60 + startMinutes;
        const endMinutesFromMidnight = endHours * 60 + endMinutes;
        
        totalMinutes += endMinutesFromMidnight - startMinutesFromMidnight;
      }
    });
    
    return formatMinutesToTime(totalMinutes);
  };

  const calculateTotalDifference = () => {
    let totalScheduledMinutes = 0;
    let totalWorkedMinutes = 0;
    
    comparisonData.forEach(day => {
      // Temps prévu
      if (day.scheduled && day.scheduled.entryType === 'work') {
        const [startHours, startMinutes] = day.scheduled.startTime.split(':').map(Number);
        const [endHours, endMinutes] = day.scheduled.endTime.split(':').map(Number);
        
        const startMinutesFromMidnight = startHours * 60 + startMinutes;
        const endMinutesFromMidnight = endHours * 60 + endMinutes;
        
        totalScheduledMinutes += endMinutesFromMidnight - startMinutesFromMidnight;
      }
      
      // Temps travaillé
      totalWorkedMinutes += day.totalWorkedMinutes || 0;
    });
    
    // Arrondir la différence à 2 décimales
    const diffMinutes = Math.round((totalWorkedMinutes - totalScheduledMinutes) * 100) / 100;
    return formatDiffMinutes(diffMinutes);
  };

  return (
    <div>
      <Navigation />
      
      <div className="schedule-comparison-container">
        <h1 className="page-title">Comparaison des horaires et pointages</h1>
        
        {error && <AlertMessage type="error" message={error} />}
        
        <div className="filters-section">
          <div className="user-filter">
            <label htmlFor="user-select">Préparateur:</label>
            {users && users.length > 0 ? (
              <select id="user-select" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
                className="filter-select">
                {users.map(user => (
                  <option key={user._id} value={user._id}>{user.fullName}</option>
                ))}
              </select>
            ) : (
              <select id="user-select" disabled className="filter-select">
                <option>Aucun préparateur disponible</option>
              </select>
            )}
          </div>
          
          {users.length === 0 && currentUser?.role === 'admin' && (
            <div className="add-preparator-shortcut">
              <button onClick={() => navigate('/admin')} className="btn btn-primary">
                <i className="fas fa-plus-circle"></i> Ajouter un préparateur
              </button>
              <span className="helper-text">Aucun préparateur trouvé. Vous devez en créer un dans l'administration.</span>
            </div>
          )}
          
          <div className="date-navigation">
            <button onClick={handlePreviousWeek} className="nav-button">
              <i className="fas fa-chevron-left"></i> Semaine précédente
            </button>
            
            <div className="date-range">
              Du {formatDate(dateRange.startDate)} au {formatDate(dateRange.endDate)}
            </div>
            
            <button onClick={handleNextWeek} className="nav-button">
              Semaine suivante <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Chargement des données...</p>
          </div>
        ) : (
          <>
            <div className="comparison-table-container">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Jour</th>
                    <th>Date</th>
                    <th>Horaire prévu</th>
                    <th>Heure d'arrivée</th>
                    <th>Écart arrivée</th>
                    <th>Heure de départ</th>
                    <th>Écart départ</th>
                    <th>Temps travaillé</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map(day => (
                    <tr key={day.day} className={day.shouldWork ? '' : 'rest-day'}>
                      <td>{day.dayLabel}</td>
                      <td>{formatDate(day.date)}</td>
                      <td>
                        {day.scheduled ? (
                          day.scheduled.entryType === 'work' ? (
                            <span className="scheduled-time">
                              {day.scheduled.startTime} - {day.scheduled.endTime}
                            </span>
                          ) : (
                            <span className="rest-day-label"><i className="fas fa-bed"></i> Repos</span>
                          )
                        ) : (
                          <span className="not-scheduled">Non planifié</span>
                        )}
                      </td>
                      <td>
                        {day.timelogs.length > 0 ? (
                          <span>
                            {new Date(day.timelogs[0].startTime).toLocaleTimeString('fr-FR', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        ) : (
                          <span className="no-timelog">-</span>
                        )}
                      </td>
                      <td className={`diff ${getDifferenceClass(day.startDiff)}`}>
                        {formatDiffMinutes(day.startDiff)}
                      </td>
                      <td>
                        {day.timelogs.length > 0 && day.timelogs.filter(log => log.status === 'completed').length > 0 ? (
                          <span>
                            {new Date(day.timelogs.filter(log => log.status === 'completed')
                              .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))[0].endTime)
                              .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="no-timelog">-</span>
                        )}
                      </td>
                      <td className={`diff ${getDifferenceClass(day.endDiff)}`}>
                        {formatDiffMinutes(day.endDiff)}
                      </td>
                      <td>
                        {day.totalWorkedMinutes > 0 ? (
                          <span className="worked-time">{formatMinutesToTime(day.totalWorkedMinutes)}</span>
                        ) : (
                          <span className="no-timelog">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="7" className="total-label">Total:</td>
                    <td className="total-value">{calculateTotalWorkedTime()}</td>
                  </tr>
                  <tr>
                    <td colSpan="7" className="total-label">Temps prévu:</td>
                    <td className="total-value">{calculateTotalScheduledTime()}</td>
                  </tr>
                  <tr>
                    <td colSpan="7" className="total-label">Différence:</td>
                    <td className="total-value">{calculateTotalDifference()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div className="legend">
              <div className="legend-title">Légende:</div>
              <div className="legend-item">
                <span className="legend-color early"></span>
                <span>En avance (plus de 15 minutes)</span>
              </div>
              <div className="legend-item">
                <span className="legend-color on-time"></span>
                <span>À l'heure (±5 minutes)</span>
              </div>
              <div className="legend-item">
                <span className="legend-color slightly-late"></span>
                <span>Légèrement en retard (5-15 minutes)</span>
              </div>
              <div className="legend-item">
                <span className="legend-color late"></span>
                <span>En retard (plus de 15 minutes)</span>
              </div>
              <div className="legend-item">
                <span className="legend-color rest-day"></span>
                <span>Jour de repos</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScheduleComparison;