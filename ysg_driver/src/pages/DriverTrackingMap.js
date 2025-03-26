import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleMap, LoadScript, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import trackingService from '../services/trackingService';
import Navigation from '../components/Navigation';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AlertMessage from '../components/ui/AlertMessage';
import '../styles/DriverTrackingMap.css';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 46.603354, 
  lng: 1.888334 // Centre de la France
};

const DriverTrackingMap = () => {
  const [activeMovements, setActiveMovements] = useState([]);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [movementPath, setMovementPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Vérifier les droits d'accès
  useEffect(() => {
    if (currentUser && !['admin', 'team-leader'].includes(currentUser.role)) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Charger les mouvements actifs
  useEffect(() => {
    const fetchActiveMovements = async () => {
      try {
        setLoading(true);
        const { movements } = await trackingService.getActiveMovements();
        console.log("Mouvements reçus:", movements);
        
        // Améliorer les données en ajoutant des positions par défaut si nécessaires
        const enhancedMovements = movements.map(movement => {
          const enhanced = { ...movement };
          
          // Vérifier si le mouvement a une position actuelle
          if (!enhanced.currentLocation) {
            console.log(`${enhanced.licensePlate} n'a pas de position, utilisation d'une position par défaut`);
            enhanced.currentLocation = {
              latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
              longitude: 2.3522 + (Math.random() - 0.5) * 0.1
            };
          }
          
          return enhanced;
        });
        
        setActiveMovements(enhancedMovements);
        
        // Sélectionner un mouvement si nécessaire
        const queryParams = new URLSearchParams(window.location.search);
        const initialMovementId = queryParams.get('movement');
        
        if (initialMovementId && !selectedMovement) {
          const specificMovement = enhancedMovements.find(m => m._id === initialMovementId);
          if (specificMovement) {
            setSelectedMovement(specificMovement);
            loadMovementPath(specificMovement._id);
          }
        } else if (!selectedMovement && enhancedMovements.length > 0) {
          setSelectedMovement(enhancedMovements[0]);
          loadMovementPath(enhancedMovements[0]._id);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des mouvements:', err);
        setError('Erreur lors du chargement des mouvements actifs');
        setLoading(false);
      }
    };
    
    fetchActiveMovements();
    const interval = setInterval(fetchActiveMovements, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, selectedMovement]);
  
  // Charger le trajet d'un mouvement spécifique
  const loadMovementPath = async (movementId) => {
    try {
      const locations = await trackingService.getLocations(movementId);
      console.log("Positions du trajet reçues:", locations);
      
      // Convertir les données pour la polyline
      const pathPoints = locations.map(loc => ({
        lat: parseFloat(loc.location?.latitude || 0),
        lng: parseFloat(loc.location?.longitude || 0)
      })).filter(point => point.lat !== 0 && point.lng !== 0);
      
      setMovementPath(pathPoints);
    } catch (err) {
      console.error('Erreur lors du chargement du trajet:', err);
      setError('Erreur lors du chargement du trajet');
    }
  };

  // Changer l'intervalle de rafraîchissement
  const handleRefreshChange = (e) => {
    setRefreshInterval(parseInt(e.target.value));
  };

  return (
    <div>
      <Navigation />
      
      <div className="tracking-container">
        <h1 className="page-title">Suivi des chauffeurs en temps réel</h1>
        
        {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
        
        <div className="tracking-controls">
          <div className="active-movements-selector">
            <label htmlFor="movement-select">Mouvements actifs:</label>
            <select 
              id="movement-select" 
              value={selectedMovement?._id || ''}
              onChange={(e) => {
                const selected = activeMovements.find(m => m._id === e.target.value);
                setSelectedMovement(selected);
                if (selected) loadMovementPath(selected._id);
              }}
              disabled={loading || activeMovements.length === 0}
            >
              {activeMovements.length === 0 ? (
                <option value="">Aucun mouvement actif</option>
              ) : (
                <>
                  <option value="">Sélectionner un mouvement</option>
                  {activeMovements.map(movement => (
                    <option key={movement._id} value={movement._id}>
                      {movement.licensePlate} - {movement.userId?.fullName || 'Sans chauffeur'}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          
          <div className="refresh-control">
            <label htmlFor="refresh-interval">Rafraîchir toutes les:</label>
            <select
              id="refresh-interval"
              value={refreshInterval}
              onChange={handleRefreshChange}
            >
              <option value="10">10 secondes</option>
              <option value="30">30 secondes</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
            </select>
          </div>
        </div>
        
        {loading && !activeMovements.length ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Chargement des mouvements actifs...</p>
          </div>
        ) : (
          <div className="map-container">
            {activeMovements.length === 0 ? (
              <div className="no-movements">
                <div className="empty-state">
                  <i className="fas fa-map-marked-alt"></i>
                  <p>Aucun mouvement actif à suivre pour le moment</p>
                </div>
              </div>
            ) : (
              <div className="map-wrapper">
                <LoadScript
                  googleMapsApiKey={"AIzaSyDqukPelmpRyW1gzIJiIxOz6m_tgE848QU"}
                  loadingElement={<div style={{ height: '100%' }}>Chargement de Google Maps...</div>}
                >
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={defaultCenter}
                    zoom={6}
                    options={{
                      styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                    }}
                  >
                    {/* Marqueurs pour chaque mouvement */}
                    {activeMovements.map(movement => {
                      if (!movement.currentLocation) return null;
                      
                      const position = {
                        lat: parseFloat(movement.currentLocation.latitude),
                        lng: parseFloat(movement.currentLocation.longitude)
                      };
                      
                      return (
                        <Marker
                          key={movement._id}
                          position={position}
                          title={`${movement.licensePlate} - ${movement.userId?.fullName || 'Sans chauffeur'}`}
                          icon={null}
                          onClick={() => {
                            setSelectedMarker(movement);
                            setSelectedMovement(movement);
                            loadMovementPath(movement._id);
                          }}
                        />
                      );
                    })}
                    
                    {/* Info Window pour le marqueur sélectionné */}
                    {selectedMarker && (
                      <InfoWindow
                        position={{
                          lat: parseFloat(selectedMarker.currentLocation.latitude),
                          lng: parseFloat(selectedMarker.currentLocation.longitude)
                        }}
                        onCloseClick={() => setSelectedMarker(null)}
                      >
                        <div className="info-window">
                          <h3>{selectedMarker.licensePlate}</h3>
                          <p><strong>Chauffeur:</strong> {selectedMarker.userId?.fullName || 'Non assigné'}</p>
                          <p><strong>Départ:</strong> {selectedMarker.departureLocation.name}</p>
                          <p><strong>Arrivée:</strong> {selectedMarker.arrivalLocation.name}</p>
                          <p><strong>Dernière mise à jour:</strong> {
                            selectedMarker.lastUpdate 
                              ? new Date(selectedMarker.lastUpdate).toLocaleTimeString() 
                              : 'N/A'
                          }</p>
                        </div>
                      </InfoWindow>
                    )}
                    
                    {/* Trajet du mouvement sélectionné */}
                    {movementPath.length > 0 && (
                      <Polyline
                        path={movementPath}
                        options={{
                          strokeColor: '#4361ee',
                          strokeOpacity: 0.8,
                          strokeWeight: 3
                        }}
                      />
                    )}
                  </GoogleMap>
                </LoadScript>
              </div>
            )}
            
            {selectedMovement && (
              <div className="selected-movement-info">
                <h2>{selectedMovement.licensePlate}</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Chauffeur:</span>
                    <span className="info-value">{selectedMovement.userId?.fullName || 'Non assigné'}</span>
                  </div>
                  {/* Autres informations... */}
                  <div className="movement-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => navigate(`/movement/${selectedMovement._id}`)}
                    >
                      Voir les détails
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverTrackingMap;