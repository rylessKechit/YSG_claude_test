// src/pages/TimeLog.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import timelogService from '../services/timelogService';
import movementService from '../services/movementService';
import preparationService from '../services/preparationService';
import Navigation from '../components/Navigation';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AlertMessage from '../components/ui/AlertMessage';
import '../styles/TimeLog.css';

const TimeLog = () => {
  const [activeTimeLog, setActiveTimeLog] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [position, setPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [autoEndPrediction, setAutoEndPrediction] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Calcul de l'heure de fin automatique prévue
  const calculateAutoEndTime = async () => {
    try {
      if (!currentUser) return null;
      
      // Logique différente selon le rôle de l'utilisateur
      if (['driver', 'team-leader'].includes(currentUser.role)) {
        // Pour les chauffeurs et chefs d'équipe, vérifier leur dernier mouvement terminé
        const lastMovement = await movementService.getLatestCompletedMovement();
        
        if (lastMovement) {
          const lastMovementTime = new Date(lastMovement.arrivalTime || lastMovement.updatedAt);
          
          // Ajouter 15 minutes pour obtenir l'heure prévue de fin automatique
          const predictedEndTime = new Date(lastMovementTime.getTime() + 15 * 60000);
          
          return {
            predictedTime: predictedEndTime,
            basedOn: 'dernier mouvement',
            activityTime: lastMovementTime
          };
        }
      } else if (currentUser.role === 'preparator') {
        // Pour les préparateurs, vérifier leur dernière préparation terminée
        const lastPreparation = await preparationService.getLatestCompletedPreparation();
        
        if (lastPreparation) {
          const lastPreparationTime = new Date(lastPreparation.endTime || lastPreparation.updatedAt);
          
          // Ajouter 15 minutes pour obtenir l'heure prévue de fin automatique
          const predictedEndTime = new Date(lastPreparationTime.getTime() + 15 * 60000);
          
          return {
            predictedTime: predictedEndTime,
            basedOn: 'dernière préparation',
            activityTime: lastPreparationTime
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors du calcul de l\'heure de fin automatique:', error);
      return null;
    }
  };

  // Vérifier le pointage actif au chargement
  useEffect(() => {
    const checkActiveTimeLog = async () => {
      try {
        setLoading(true);
        const timeLog = await timelogService.getActiveTimeLog();
        setActiveTimeLog(timeLog);
        
        // Vérification du pointage actif et calcul de fin auto - utilisation d'une IIFE asynchrone
        if (timeLog) {
          // Fonction auto-invoquée asynchrone pour permettre d'utiliser await
          (async () => {
            const prediction = await calculateAutoEndTime();
            setAutoEndPrediction(prediction);
          })();
        } else {
          setAutoEndPrediction(null);
        }
        
        setLoading(false);
      } catch (err) {
        if (err.response?.status === 404) {
          setActiveTimeLog(null);
        } else {
          setError('Erreur lors de la vérification du pointage');
          console.error(err);
        }
        setLoading(false);
      }
    };
    
    checkActiveTimeLog();
  }, []);

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

  // Démarrer un pointage
  const startTimeLog = async () => {
    if (!position) {
      setError('La position GPS est requise pour le pointage');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { latitude, longitude } = position;
      const response = await timelogService.startTimeLog({ latitude, longitude, notes });
      
      setActiveTimeLog(response.timeLog);
      setNotes('');
      setSuccess('Pointage démarré avec succès');
      
      // Calculer la prédiction de fin automatique
      const prediction = await calculateAutoEndTime();
      setAutoEndPrediction(prediction);
      
      setTimeout(() => setSuccess(null), 3000);
      
      setLoading(false);
    } catch (err) {
      setLoading(false);
      
      // Gestion spécifique des erreurs de localisation/réseau
      if (err.response?.data?.error === 'NETWORK_NOT_ALLOWED') {
        setError('Réseau non autorisé pour le pointage. Vous devez être connecté à un réseau d\'entreprise.');
      } else if (err.response?.data?.error === 'LOCATION_NOT_ALLOWED') {
        // Affichage des détails sur l'emplacement le plus proche
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
      setAutoEndPrediction(null);
      setNotes('');
      setSuccess('Pointage terminé avec succès');
      setTimeout(() => setSuccess(null), 3000);
      
      setLoading(false);
    } catch (err) {
      setLoading(false);
      
      // Gestion spécifique des erreurs de localisation/réseau
      if (err.response?.data?.error === 'NETWORK_NOT_ALLOWED') {
        setError('Réseau non autorisé pour le pointage. Vous devez être connecté à un réseau d\'entreprise.');
      } else if (err.response?.data?.error === 'LOCATION_NOT_ALLOWED') {
        // Affichage des détails sur l'emplacement le plus proche
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
          
          {/* Affichage de la prédiction de fin automatique */}
          {activeTimeLog && autoEndPrediction && (
            <div className="auto-end-notification">
              <div className="notification-icon">
                <i className="fas fa-stopwatch"></i>
              </div>
              <div className="notification-content">
                <div className="notification-title">Fin de service automatique</div>
                <div className="notification-message">
                  Votre service sera automatiquement terminé à <strong>{autoEndPrediction.predictedTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong>{' '}
                  (15 minutes après votre {autoEndPrediction.basedOn}).
                </div>
                <div className="notification-tip">
                  Si vous souhaitez continuer votre service, effectuez une nouvelle activité ou terminez manuellement votre service.
                </div>
              </div>
            </div>
          )}
          
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
                  <i className="fas fa-stop-circle"></i> Terminer le service
                </>
              )}
            </button>
          ) : (
            <button
              className="btn-start"
              onClick={startTimeLog}
              disabled={loading || !position}
            >
              {loading ? (
                <>
                  <div className="spinner-sm"></div>
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-play-circle"></i> Démarrer le service
                </>
              )}
            </button>
          )}
          
          <div className="timelog-info">
            <i className="fas fa-info-circle"></i>
            <p>
              Pour effectuer un pointage, vous devez être sur un réseau autorisé et 
              à proximité d'un emplacement enregistré. La géolocalisation de votre 
              appareil doit être activée avec une précision suffisante.
            </p>
          </div>
        </div>
      )}
      
      <div className="back-link">
        <a href="#back" onClick={() => navigate('/dashboard')}>Retour au tableau de bord</a>
      </div>
    </div>
  </div>
  );
};

export default TimeLog;