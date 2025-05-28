// ysg_driver/src/pages/TimeLog.js (LOGIQUE SIMPLIFIÉE)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import timelogService from '../services/timelogService';
import Navigation from '../components/Navigation';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AlertMessage from '../components/ui/AlertMessage';
import '../styles/TimeLog.css';

const TimeLog = () => {
  const [activeTimeLog, setActiveTimeLog] = useState(null);
  const [todaySequence, setTodaySequence] = useState([]);
  const [nextAction, setNextAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [position, setPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Séquence complète des actions dans l'ordre
  const SEQUENCE = [
    { 
      type: 'start_service', 
      label: 'Prendre mon service', 
      icon: '🟢', 
      color: '#10B981',
      description: 'Commencer ma journée de travail'
    },
    { 
      type: 'start_break', 
      label: 'Commencer ma pause', 
      icon: '⏸️', 
      color: '#F59E0B',
      description: 'Prendre ma pause déjeuner'
    },
    { 
      type: 'end_break', 
      label: 'Reprendre mon service', 
      icon: '▶️', 
      color: '#3B82F6',
      description: 'Terminer ma pause et reprendre le travail'
    },
    { 
      type: 'end_service', 
      label: 'Terminer mon service', 
      icon: '🔴', 
      color: '#EF4444',
      description: 'Finir ma journée de travail'
    }
  ];

  // Obtenir la géolocalisation actuelle
  const getCurrentPosition = () => {
    setLocationError(null);
    setLocationStatus('Obtention de votre position...');
    
    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas prise en charge par votre navigateur');
      setLocationStatus(null);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocationStatus(`Position obtenue (précision: ${Math.round(position.coords.accuracy)}m)`);
      },
      (error) => {
        let errorMessage;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Accès à la géolocalisation refusé. Veuillez autoriser l\'accès à votre position.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position indisponible. Vérifiez que le GPS est activé.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Délai d\'attente dépassé. Veuillez réessayer.';
            break;
          default:
            errorMessage = `Erreur de géolocalisation: ${error.message}`;
        }
        setLocationError(errorMessage);
        setLocationStatus(null);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  };

  // Analyser les pointages d'aujourd'hui
  const analyzeToday = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const analysis = await timelogService.analyzeDriverTimelogs(null, today);
      
      // Extraire la séquence des pointages déjà effectués
      const completedSequence = analysis.analysis.sequence || [];
      setTodaySequence(completedSequence);
      
      // Déterminer la prochaine action
      const nextActionIndex = completedSequence.length;
      
      if (nextActionIndex < SEQUENCE.length) {
        setNextAction({
          ...SEQUENCE[nextActionIndex],
          step: nextActionIndex + 1,
          totalSteps: SEQUENCE.length
        });
      } else {
        // Journée complète
        setNextAction({
          type: null,
          label: 'Journée terminée',
          icon: '✅',
          color: '#10B981',
          description: 'Tous vos pointages sont complets',
          step: SEQUENCE.length,
          totalSteps: SEQUENCE.length
        });
      }
    } catch (err) {
      console.error('Erreur lors de l\'analyse:', err);
    }
  };

  // Charger les données au démarrage
  useEffect(() => {
    const initializeTimeLog = async () => {
      try {
        setLoading(true);
        
        // Vérifier s'il y a un pointage actif
        const timeLog = await timelogService.getActiveTimeLog()
          .catch(err => err.response?.status === 404 ? null : Promise.reject(err));
        setActiveTimeLog(timeLog);
        
        // Analyser les pointages d'aujourd'hui (seulement pour les drivers)
        if (currentUser && currentUser.role === 'driver') {
          await analyzeToday();
        }
        
        setLoading(false);
      } catch (err) {
        setError('Erreur lors de la vérification du pointage');
        console.error(err);
        setLoading(false);
      }
    };
    
    if (currentUser) {
      initializeTimeLog();
    }
  }, [currentUser]);

  // Obtenir la position GPS au démarrage et la rafraîchir périodiquement
  useEffect(() => {
    getCurrentPosition();
    const interval = setInterval(getCurrentPosition, 30000); // Toutes les 30 secondes
    return () => clearInterval(interval);
  }, []);

  // Effectuer l'action de pointage
  const performTimelogAction = async () => {
    if (!position) {
      setError('La position GPS est requise pour le pointage');
      return;
    }
    
    if (!nextAction || !nextAction.type) {
      setError('Aucune action de pointage disponible');
      return;
    }
    
    try {
      setActionLoading(true);
      setError(null);
      
      const { latitude, longitude } = position;
      
      // Si c'est une fin de pause ou fin de service, terminer le pointage actif
      if (nextAction.type === 'end_break' || nextAction.type === 'end_service') {
        await timelogService.endTimeLog({ latitude, longitude, notes });
        setActiveTimeLog(null);
      } else {
        // Sinon, démarrer un nouveau pointage
        const response = await timelogService.startDriverTimeLog(
          nextAction.type,
          { latitude, longitude },
          notes
        );
        setActiveTimeLog(response.timeLog);
      }
      
      setNotes('');
      setSuccess(`${nextAction.label} - Pointage effectué avec succès`);
      
      // Rafraîchir l'analyse
      await analyzeToday();
      
      setTimeout(() => setSuccess(null), 3000);
      setActionLoading(false);
    } catch (err) {
      setActionLoading(false);
      
      // Gestion des erreurs spécifiques
      if (err.response?.data?.error === 'NETWORK_NOT_ALLOWED') {
        setError('Réseau non autorisé. Vous devez être connecté au réseau d\'entreprise.');
      } else if (err.response?.data?.error === 'LOCATION_NOT_ALLOWED') {
        const details = err.response?.data?.details;
        let errorMsg = 'Vous devez être à un emplacement autorisé pour pointer.';
        
        if (details && details.closestLocation) {
          errorMsg += ` L'emplacement le plus proche est "${details.closestLocation}" à ${details.distance} mètres.`;
        }
        
        setError(errorMsg);
      } else {
        setError(err.response?.data?.message || 'Erreur lors du pointage');
      }
      
      console.error(err);
    }
  };

  // Calculer le pourcentage de progression
  const getProgressPercentage = () => {
    if (!nextAction) return 0;
    return Math.round(((nextAction.step - 1) / nextAction.totalSteps) * 100);
  };

  // Formater l'heure
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Affichage du composant
  return (
    <div>
      <Navigation />
      <div className="timelog-container">
        <h1 className="timelog-title">Pointage</h1>
        
        {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
        {success && <AlertMessage type="success" message={success} onDismiss={() => setSuccess(null)} />}
        
        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Chargement...</p>
          </div>
        ) : (
          <>
            <div className="timelog-card">
              
              {/* Statut actuel */}
              <div className="status-section">
                <h2 className="status-title">Statut actuel</h2>
                <div className="status-indicator">
                  <div className={`status-dot ${activeTimeLog ? 'active' : 'inactive'}`}></div>
                  <span className="status-text">
                    {activeTimeLog ? 'En service' : 'Hors service'}
                  </span>
                </div>
                
                {activeTimeLog && (
                  <p className="timestamp">
                    Démarré le {new Date(activeTimeLog.startTime).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>

              {/* Progression de la journée (seulement pour les drivers) */}
              {currentUser?.role === 'driver' && nextAction && (
                <div className="progress-section">
                  <h2 className="status-title">Progression de la journée</h2>
                  
                  {/* Barre de progression */}
                  <div className="progress-bar-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${getProgressPercentage()}%`,
                          backgroundColor: nextAction.color
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      Étape {nextAction.step} sur {nextAction.totalSteps}
                    </span>
                  </div>

                  {/* Pointages effectués aujourd'hui */}
                  {todaySequence.length > 0 && (
                    <div className="today-sequence">
                      <h3>Pointages d'aujourd'hui :</h3>
                      <div className="sequence-list">
                        {todaySequence.map((item, index) => {
                          const sequenceItem = SEQUENCE.find(s => s.type === item.type);
                          return (
                            <div key={index} className="sequence-item">
                              <span className="sequence-icon">
                                {sequenceItem?.icon || '📝'}
                              </span>
                              <span className="sequence-label">
                                {sequenceItem?.label || 'Pointage'}
                              </span>
                              <span className="sequence-time">
                                {formatTime(item.time)}
                              </span>
                              {item.isAutoGenerated && (
                                <span className="auto-badge">Auto</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section de position GPS */}
              <div className="location-section">
                <h2 className="location-title">Position GPS</h2>
                
                {locationError ? (
                  <div className="location-error">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>{locationError}</span>
                    <button 
                      className="btn btn-sm btn-primary" 
                      onClick={getCurrentPosition}
                    >
                      Réessayer
                    </button>
                  </div>
                ) : position ? (
                  <div className="location-info">
                    <div className="location-coordinates">
                      <span className="coordinate">
                        <i className="fas fa-map-marker-alt"></i> Latitude: {position.latitude.toFixed(6)}
                      </span>
                      <span className="coordinate">
                        <i className="fas fa-map-marker-alt"></i> Longitude: {position.longitude.toFixed(6)}
                      </span>
                      {position.accuracy && (
                        <span className="coordinate">
                          <i className="fas fa-bullseye"></i> Précision: {Math.round(position.accuracy)} m
                        </span>
                      )}
                    </div>
                    <div className="location-status">
                      {locationStatus && (
                        <div className="status-message">
                          <i className="fas fa-info-circle"></i> {locationStatus}
                        </div>
                      )}
                      <button 
                        className="btn btn-sm btn-secondary refresh-position"
                        onClick={getCurrentPosition}
                      >
                        <i className="fas fa-sync-alt"></i> Actualiser
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="location-loading">
                    <div className="spinner-sm"></div>
                    <span>Obtention de votre position...</span>
                  </div>
                )}
              </div>
              
              {/* Section des notes */}
              <div className="notes-section">
                <label htmlFor="notes" className="notes-label">Notes (optionnel)</label>
                <textarea
                  id="notes"
                  className="notes-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajouter une note..."
                  disabled={actionLoading}
                ></textarea>
              </div>
              
              {/* Bouton d'action principal */}
              {nextAction && nextAction.type ? (
                <button
                  className="smart-btn"
                  onClick={performTimelogAction}
                  disabled={actionLoading || !position}
                  style={{ backgroundColor: nextAction.color }}
                >
                  {actionLoading ? (
                    <>
                      <div className="spinner-sm"></div>
                      <span>Traitement en cours...</span>
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">{nextAction.icon}</span>
                      <span className="btn-text">
                        <strong>{nextAction.label}</strong>
                        <small>{nextAction.description}</small>
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div className="completed-state">
                  <i className="fas fa-check-circle"></i>
                  <span>Tous vos pointages sont complets pour aujourd'hui</span>
                </div>
              )}
              
              <div className="timelog-info">
                <i className="fas fa-info-circle"></i>
                <p>
                  Appuyez sur le bouton pour effectuer automatiquement le prochain pointage. 
                  L'application suit automatiquement votre progression : service → pause → reprise → fin.
                </p>
              </div>
            </div>
          </>
        )}
        
        <div className="back-link">
          <a href="#back" onClick={() => navigate('/dashboard')}>Retour au tableau de bord</a>
        </div>
      </div>
    </div>
  );
};

export default TimeLog;