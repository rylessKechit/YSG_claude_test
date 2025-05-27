// ysg_driver/src/pages/TimeLog.js (VERSION INTELLIGENTE)
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
  const [todayAnalysis, setTodayAnalysis] = useState(null);
  const [nextAction, setNextAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [position, setPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

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
            errorMessage = 'Accès à la géolocalisation refusé. Veuillez autoriser l\'accès à votre position dans les paramètres de votre navigateur.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position indisponible. Veuillez vérifier que le GPS de votre appareil est activé.';
            break;
          case error.TIMEOUT:
            errorMessage = 'La demande de géolocalisation a expiré. Veuillez réessayer.';
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

  // Démarrer la mise à jour périodique de la position
  useEffect(() => {
    getCurrentPosition();

    // Mettre à jour la position toutes les 30 secondes
    const interval = setInterval(() => {
      getCurrentPosition();
    }, 30000);

    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  // Analyser les pointages du jour et déterminer la prochaine action
  const analyzeCurrentDay = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const analysis = await timelogService.analyzeDriverTimelogs(null, today);
      
      setTodayAnalysis(analysis);
      
      // Déterminer la prochaine action intelligente
      const completedTypes = analysis.analysis.sequence.map(s => s.type);
      const nextActionInfo = determineNextAction(completedTypes);
      setNextAction(nextActionInfo);
      
    } catch (err) {
      console.error('Erreur lors de l\'analyse des pointages:', err);
    }
  };

  // Déterminer intelligemment la prochaine action
  const determineNextAction = (completedTypes) => {
    const count = completedTypes.length;
    
    switch (count) {
      case 0:
        return {
          type: 'start_service',
          label: 'Démarrer mon service',
          description: 'Commencer votre journée de travail',
          icon: '🟢',
          color: '#10B981',
          step: 1,
          totalSteps: 4
        };
        
      case 1:
        if (completedTypes.includes('start_service')) {
          return {
            type: 'start_break',
            label: 'Démarrer ma pause',
            description: 'Prendre votre pause (1h maximum)',
            icon: '⏸️',
            color: '#F59E0B',
            step: 2,
            totalSteps: 4
          };
        }
        break;
        
      case 2:
        if (completedTypes.includes('start_service') && completedTypes.includes('start_break')) {
          return {
            type: 'end_break',
            label: 'Reprendre mon service',
            description: 'Terminer votre pause et reprendre le travail',
            icon: '▶️',
            color: '#3B82F6',
            step: 3,
            totalSteps: 4
          };
        }
        break;
        
      case 3:
        if (completedTypes.includes('start_service') && 
            completedTypes.includes('start_break') && 
            completedTypes.includes('end_break')) {
          return {
            type: 'end_service',
            label: 'Terminer mon service',
            description: 'Finaliser votre journée de travail',
            icon: '🔴',
            color: '#EF4444',
            step: 4,
            totalSteps: 4
          };
        }
        break;
        
      case 4:
      default:
        return {
          type: null,
          label: 'Journée terminée',
          description: 'Tous vos pointages sont complets pour aujourd\'hui',
          icon: '✅',
          color: '#10B981',
          step: 4,
          totalSteps: 4
        };
    }
    
    // Fallback si séquence inattendue
    return {
      type: 'start_service',
      label: 'Démarrer mon service',
      description: 'Action par défaut',
      icon: '🟢',
      color: '#10B981',
      step: 1,
      totalSteps: 4
    };
  };

  // Vérifier le pointage actif et analyser la journée au chargement
  useEffect(() => {
    const initializeTimeLog = async () => {
      try {
        setLoading(true);
        
        // Vérifier s'il y a un pointage actif
        const timeLog = await timelogService.getActiveTimeLog()
          .catch(err => err.response?.status === 404 ? null : Promise.reject(err));
        setActiveTimeLog(timeLog);
        
        // Analyser la journée actuelle (seulement pour les drivers)
        if (currentUser && currentUser.role === 'driver') {
          await analyzeCurrentDay();
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

  // Démarrer un pointage intelligent
  const startSmartTimeLog = async () => {
    if (!position) {
      setError('La position GPS est requise pour le pointage');
      return;
    }
    
    if (!nextAction || !nextAction.type) {
      setError('Aucune action de pointage disponible');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { latitude, longitude } = position;
      
      // Utiliser le service intelligent avec le type déterminé
      const response = await timelogService.startDriverTimeLog(
        nextAction.type,
        { latitude, longitude },
        notes
      );
      
      setActiveTimeLog(response.timeLog);
      setNotes('');
      setSuccess(`${nextAction.label} - Pointage effectué avec succès`);
      
      // Rafraîchir l'analyse après le pointage
      await analyzeCurrentDay();
      
      setTimeout(() => setSuccess(null), 3000);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      
      // Gestion spécifique des erreurs de localisation/réseau
      if (err.response?.data?.error === 'NETWORK_NOT_ALLOWED') {
        setError('Réseau non autorisé pour le pointage. Vous devez être connecté à un réseau d\'entreprise.');
      } else if (err.response?.data?.error === 'LOCATION_NOT_ALLOWED') {
        const details = err.response?.data?.details;
        let errorMsg = 'Vous devez être à un emplacement autorisé pour pointer.';
        
        if (details && details.closestLocation) {
          errorMsg += ` L'emplacement autorisé le plus proche est "${details.closestLocation}" à ${details.distance} mètres.`;
        }
        
        setError(errorMsg);
      } else {
        setError(err.response?.data?.message || 'Erreur lors du pointage');
      }
      
      console.error(err);
    }
  };

  // Terminer un pointage
  const endTimeLog = async () => {
    if (!position) {
      setError('La position GPS est requise pour terminer le pointage');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { latitude, longitude } = position;
      await timelogService.endTimeLog({ latitude, longitude, notes });
      
      setActiveTimeLog(null);
      setNotes('');
      setSuccess('Pointage terminé avec succès');
      
      // Rafraîchir l'analyse après la fin du pointage
      await analyzeCurrentDay();
      
      setTimeout(() => setSuccess(null), 3000);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      
      if (err.response?.data?.error === 'NETWORK_NOT_ALLOWED') {
        setError('Réseau non autorisé pour le pointage. Vous devez être connecté à un réseau d\'entreprise.');
      } else if (err.response?.data?.error === 'LOCATION_NOT_ALLOWED') {
        const details = err.response?.data?.details;
        let errorMsg = 'Vous devez être à un emplacement autorisé pour terminer le pointage.';
        
        if (details && details.closestLocation) {
          errorMsg += ` L'emplacement autorisé le plus proche est "${details.closestLocation}" à ${details.distance} mètres.`;
        }
        
        setError(errorMsg);
      } else {
        setError(err.response?.data?.message || 'Erreur lors de la fin du pointage');
      }
      
      console.error(err);
    }
  };

  // Fonction pour formater l'heure
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
        <h1 className="timelog-title">Gestion du pointage</h1>
        
        {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
        {success && <AlertMessage type="success" message={success} onDismiss={() => setSuccess(null)} />}
        
        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Chargement...</p>
          </div>
        ) : (
          <>
            {/* Section de statut actuel */}
            <div className="timelog-card">
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
                    Service démarré le {new Date(activeTimeLog.startTime).toLocaleString()}
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
                          width: `${(nextAction.step - 1) / nextAction.totalSteps * 100}%`,
                          backgroundColor: nextAction.color
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      Étape {nextAction.step > nextAction.totalSteps ? nextAction.totalSteps : nextAction.step} sur {nextAction.totalSteps}
                    </span>
                  </div>

                  {/* Pointages de la journée */}
                  {todayAnalysis && todayAnalysis.analysis.sequence.length > 0 && (
                    <div className="today-sequence">
                      <h3>Pointages d'aujourd'hui :</h3>
                      <div className="sequence-list">
                        {todayAnalysis.analysis.sequence.map((item, index) => (
                          <div key={index} className="sequence-item">
                            <span className="sequence-icon">
                              {item.type === 'start_service' ? '🟢' :
                               item.type === 'start_break' ? '⏸️' :
                               item.type === 'end_break' ? '▶️' :
                               item.type === 'end_service' ? '🔴' : '📝'}
                            </span>
                            <span className="sequence-label">
                              {item.type === 'start_service' ? 'Service démarré' :
                               item.type === 'start_break' ? 'Pause commencée' :
                               item.type === 'end_break' ? 'Pause terminée' :
                               item.type === 'end_service' ? 'Service terminé' : 'Pointage'}
                            </span>
                            <span className="sequence-time">
                              {formatTime(item.time)}
                            </span>
                            {item.isAutoGenerated && (
                              <span className="auto-badge">Auto</span>
                            )}
                          </div>
                        ))}
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
                <label htmlFor="notes" className="notes-label">Notes</label>
                <textarea
                  id="notes"
                  className="notes-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajouter des notes (facultatif)"
                  disabled={loading}
                ></textarea>
              </div>
              
              {/* Bouton d'action intelligent */}
              {activeTimeLog ? (
                <button
                  className="btn-end"
                  onClick={endTimeLog}
                  disabled={loading || !position}
                >
                  {loading ? (
                    <>
                      <div className="spinner-sm"></div>
                      <span>Traitement en cours...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-stop-circle"></i> Terminer le pointage actuel
                    </>
                  )}
                </button>
              ) : nextAction ? (
                <button
                  className="btn-start smart-btn"
                  onClick={startSmartTimeLog}
                  disabled={loading || !position || !nextAction.type}
                  style={{ backgroundColor: nextAction.color }}
                >
                  {loading ? (
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
                  Le système propose automatiquement le bon type de pointage selon votre progression quotidienne. 
                  Quatre pointages sont requis par jour : début de service, début/fin de pause, et fin de service.
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