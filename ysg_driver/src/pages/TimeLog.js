// src/pages/TimeLog.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import timelogService from '../services/timelogService';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import '../styles/TimeLog.css';

const TimeLog = () => {
  const [activeTimeLog, setActiveTimeLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [location, setLocation] = useState(null);
  const [notes, setNotes] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Rediriger si l'utilisateur est admin ou direction
  useEffect(() => {
    if (currentUser && ['admin', 'direction'].includes(currentUser.role)) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Obtenir la géolocalisation actuelle
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('La géolocalisation n\'est pas supportée par votre navigateur'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            },
            name: 'Position actuelle'
          };
          setLocation(locationData);
          resolve(locationData);
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          reject(error);
        }
      );
    });
  };

  // Charger le pointage actif au chargement de la page
  useEffect(() => {
    // Ne pas charger le pointage si l'utilisateur est admin ou direction
    if (currentUser && ['admin', 'direction'].includes(currentUser.role)) {
      setLoading(false);
      return;
    }
    
    const fetchActiveTimeLog = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await timelogService.getActiveTimeLog();
        setActiveTimeLog(data);
        
        // Obtenir la position actuelle en arrière-plan
        getCurrentLocation().catch(err => console.error('Erreur de géolocalisation:', err));
      } catch (err) {
        console.error('Erreur lors du chargement du pointage actif:', err);
        if (!(err.response && err.response.status === 404)) {
          setError('Erreur lors du chargement du pointage actif. Veuillez réessayer.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchActiveTimeLog();
  }, [currentUser]);

  // Démarrer un pointage
  const handleStartTimeLog = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      // Obtenir la position actuelle
      let locationData;
      try {
        locationData = location || await getCurrentLocation();
      } catch (geoError) {
        console.error('Erreur de géolocalisation lors du démarrage:', geoError);
        locationData = {
          name: 'Position non disponible',
          coordinates: { latitude: null, longitude: null }
        };
      }
      
      const response = await timelogService.startTimeLog({ location: locationData });
      
      if (response && response.timeLog) {
        setActiveTimeLog(response.timeLog);
        setSuccess('Pointage démarré avec succès');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      console.error('Erreur détaillée lors du démarrage du pointage:', err);
      setError(err.response?.data?.message || 'Erreur lors du démarrage du pointage. Veuillez réessayer.');
    } finally {
      setActionLoading(false);
    }
  };

  // Terminer un pointage
  const handleEndTimeLog = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      // Récupérer la position actuelle si possible
      let locationData;
      try {
        locationData = location || await getCurrentLocation();
      } catch (geoError) {
        locationData = {
          name: 'Position non disponible',
          coordinates: { latitude: null, longitude: null }
        };
      }
      
      await timelogService.endTimeLog(locationData, notes);
      
      setActiveTimeLog(null);
      setNotes('');
      setSuccess('Pointage terminé avec succès');
      
      setTimeout(() => {
        setSuccess(null);
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Erreur lors de la fin du pointage:', err);
      setError(err.response?.data?.message || 'Erreur lors de la fin du pointage. Veuillez réessayer.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navigation />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement en cours...</p>
        </div>
      </div>
    );
  }

  // Vérification si l'utilisateur est admin ou direction
  const isUnauthorized = currentUser && ['admin', 'direction'].includes(currentUser.role);
  
  return (
    <div>
      <Navigation />
      
      {isUnauthorized ? (
        <div className="unauthorized-message">
          <h2>Accès non autorisé</h2>
          <p>Votre rôle ne permet pas d'accéder à la fonctionnalité de pointage.</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Retour au tableau de bord
          </button>
        </div>
      ) : (
        <div className="timelog-container">
          <h1 className="timelog-title">Pointage de service</h1>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <div className="timelog-card">
            <div className="status-section">
              <h2 className="status-title">Statut actuel</h2>
              <div className="status-indicator">
                <div className={`status-dot ${activeTimeLog ? 'active' : 'inactive'}`}></div>
                <span className="status-text">{activeTimeLog ? 'En service' : 'Hors service'}</span>
              </div>
            </div>
            
            {activeTimeLog ? (
              <div>
                <div className="timestamp">
                  <p>Service démarré le {new Date(activeTimeLog.startTime).toLocaleString()}</p>
                </div>
                
                <div className="notes-section">
                  <label htmlFor="notes" className="notes-label">Notes de fin de service</label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="notes-textarea"
                    rows="4"
                    placeholder="Entrez des notes concernant votre service (facultatif)"
                  ></textarea>
                </div>
                
                <button 
                  onClick={handleEndTimeLog}
                  disabled={actionLoading}
                  className="btn-end"
                >
                  {actionLoading ? 'Traitement en cours...' : 'Terminer le service'}
                </button>
              </div>
            ) : (
              <div>
                <p className="instruction-text">
                  Appuyez sur le bouton ci-dessous pour commencer votre service.
                </p>
                
                <button
                  onClick={handleStartTimeLog}
                  disabled={actionLoading}
                  className="btn-start"
                >
                  {actionLoading ? 'Traitement en cours...' : 'Démarrer le service'}
                </button>
              </div>
            )}
          </div>
          
          <div className="back-link">
            <a href='/' onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
              Retour au tableau de bord
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeLog;