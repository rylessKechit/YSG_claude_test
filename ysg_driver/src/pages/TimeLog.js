// src/pages/TimeLog.js (mise à jour)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import timelogService from '../services/timelogService';
import Navigation from '../components/Navigation';
import '../styles/TimeLog.css';

const TimeLog = () => {
  const [activeTimeLog, setActiveTimeLog] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [position, setPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Vérifier le pointage actif au chargement
  useEffect(() => {
    const checkActiveTimeLog = async () => {
      try {
        setLoading(true);
        const timeLog = await timelogService.getActiveTimeLog();
        setActiveTimeLog(timeLog);
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
    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas prise en charge par votre navigateur');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        let errorMessage;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Accès à la géolocalisation refusé';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position indisponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'La demande de géolocalisation a expiré';
            break;
          default:
            errorMessage = 'Erreur inconnue de géolocalisation';
        }
        setLocationError(errorMessage);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Au chargement, demander la géolocalisation
  useEffect(() => {
    getCurrentPosition();
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
      setTimeout(() => setSuccess(null), 3000);
      
      setLoading(false);
    } catch (err) {
      setLoading(false);
      if (err.response?.data?.error === 'NETWORK_NOT_ALLOWED') {
        setError('Réseau non autorisé pour le pointage');
      } else if (err.response?.data?.error === 'LOCATION_NOT_ALLOWED') {
        setError('Vous devez être à un emplacement autorisé pour pointer');
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
      setTimeout(() => setSuccess(null), 3000);
      
      setLoading(false);
    } catch (err) {
      setLoading(false);
      if (err.response?.data?.error === 'NETWORK_NOT_ALLOWED') {
        setError('Réseau non autorisé pour le pointage');
      } else if (err.response?.data?.error === 'LOCATION_NOT_ALLOWED') {
        setError('Vous devez être à un emplacement autorisé pour terminer le pointage');
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
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        {locationError && (
          <div className="error-message">
            {locationError}
            <button className="btn btn-primary" onClick={getCurrentPosition} style={{marginTop: '10px'}}>
              Réessayer la géolocalisation
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
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
            
            {position && (
              <div className="position-info">
                <p>Position GPS: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</p>
              </div>
            )}
            
            {activeTimeLog ? (
              <button
                className="btn-end"
                onClick={endTimeLog}
                disabled={loading || !position}
              >
                {loading ? 'Chargement...' : 'Terminer le service'}
              </button>
            ) : (
              <button
                className="btn-start"
                onClick={startTimeLog}
                disabled={loading || !position}
              >
                {loading ? 'Chargement...' : 'Démarrer le service'}
              </button>
            )}
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