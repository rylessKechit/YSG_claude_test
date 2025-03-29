// ysg_driver/src/pages/DriverTrackingMap.js - Version améliorée
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleMap, LoadScript, InfoWindow, Polyline, Marker } from '@react-google-maps/api';
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
  lat: 48.8566, // Paris
  lng: 2.3522
};

// Icônes personnalisées pour les marqueurs
const createCustomMarker = (color, size = 12) => {
  return {
    path: window.google?.maps?.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    scale: size / 2,
    strokeWeight: 2,
    strokeColor: '#FFFFFF'
  };
};

const DriverTrackingMap = () => {
  const [activeMovements, setActiveMovements] = useState([]);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [movementPath, setMovementPath] = useState([]);
  const [pathMarkers, setPathMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(6);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Vérifier les droits d'accès
  useEffect(() => {
    if (currentUser && !['admin', 'team-leader'].includes(currentUser.role)) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Nettoyer les marqueurs existants
  const clearMarkers = () => {
    if (markersRef.current && markersRef.current.length > 0) {
      markersRef.current.forEach(marker => {
        if (marker) marker.setMap(null);
      });
      markersRef.current = [];
    }
  };

  // Ajouter les marqueurs manuellement à la carte
  const addMarkersToMap = (movements) => {
    if (!mapRef.current || !movements || movements.length === 0) return;

    // Nettoyer les marqueurs existants
    clearMarkers();

    // Créer de nouveaux marqueurs
    movements.forEach(movement => {
      if (movement.position) {
        try {
          // Créer le marqueur directement avec l'API Google Maps
          const marker = new window.google.maps.Marker({
            position: movement.position,
            map: mapRef.current,
            title: movement.licensePlate,
            animation: window.google.maps.Animation.DROP,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#3b82f6', // Bleu principal
              fillOpacity: 1,
              scale: 10,
              strokeWeight: 2,
              strokeColor: '#FFFFFF'
            }
          });
          
          // Stocker une référence au marqueur
          markersRef.current.push(marker);
          
          // Ajouter un gestionnaire d'événements click
          marker.addListener('click', () => {
            setSelectedMarker(movement);
            setSelectedMovement(movement);
            loadMovementPath(movement._id);
          });
        } catch (err) {
          console.error("Erreur lors de la création du marqueur:", err);
        }
      }
    });
  };

  // Charger les mouvements actifs
  useEffect(() => {
    const fetchActiveMovements = async () => {
      try {
        setLoading(true);
        const { movements } = await trackingService.getActiveMovements();
        
        if (!movements || movements.length === 0) {
          setActiveMovements([]);
          setLoading(false);
          return;
        }
        
        // Filtrer les mouvements ayant des coordonnées valides
        const validMovements = movements.filter(m => 
          m.currentLocation && 
          m.currentLocation.latitude && 
          m.currentLocation.longitude
        );
        
        // Formater les données pour s'assurer que les coordonnées sont des nombres
        const formattedMovements = validMovements.map(movement => {
          const lat = parseFloat(movement.currentLocation.latitude);
          const lng = parseFloat(movement.currentLocation.longitude);
          
          // Vérifier que les coordonnées sont valides
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return null;
          }
          
          return {
            ...movement,
            position: { lat, lng } // Ajouter une propriété position formatée
          };
        }).filter(Boolean); // Enlever les entrées nulles
        
        setActiveMovements(formattedMovements);
        
        // Sélectionner un mouvement si nécessaire
        const queryParams = new URLSearchParams(window.location.search);
        const initialMovementId = queryParams.get('movement');
        
        if (initialMovementId && formattedMovements.length > 0) {
          const specificMovement = formattedMovements.find(m => m._id === initialMovementId);
          if (specificMovement) {
            setSelectedMovement(specificMovement);
            loadMovementPath(specificMovement._id);
            
            // Centrer la carte sur ce mouvement
            setMapCenter(specificMovement.position);
            setMapZoom(12);
          }
        } else if (formattedMovements.length > 0) {
          setSelectedMovement(formattedMovements[0]);
          loadMovementPath(formattedMovements[0]._id);
          setMapCenter(formattedMovements[0].position);
          setMapZoom(10);
        }
        
        // Ajouter des marqueurs si la carte est déjà chargée
        if (isMapLoaded && mapRef.current) {
          addMarkersToMap(formattedMovements);
          setTimeout(() => fitBoundsToMarkers(formattedMovements), 500);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des mouvements:', err);
        setError('Erreur lors du chargement des mouvements actifs: ' + (err.message || String(err)));
        setLoading(false);
      }
    };
    
    fetchActiveMovements();
    const interval = setInterval(fetchActiveMovements, refreshInterval * 1000);
    return () => {
      clearInterval(interval);
      clearMarkers();
    };
  }, [refreshInterval, isMapLoaded]);
  
  // Charger le trajet d'un mouvement spécifique
  const loadMovementPath = async (movementId) => {
    try {
      const locations = await trackingService.getLocations(movementId, 100); // Récupérer jusqu'à 100 points
      
      if (!locations || locations.length === 0) {
        setMovementPath([]);
        setPathMarkers([]);
        return;
      }
      
      // Convertir les données pour la polyline et les marqueurs de chemin
      const pathPoints = locations
        .filter(loc => loc.location && loc.location.latitude && loc.location.longitude)
        .map((loc, index, array) => {
          const lat = parseFloat(loc.location.latitude);
          const lng = parseFloat(loc.location.longitude);
          
          if (isNaN(lat) || isNaN(lng)) {
            return null;
          }
          
          // Déterminer si c'est le premier ou le dernier point
          const isStart = index === 0;
          const isEnd = index === array.length - 1;
          
          return { 
            lat, 
            lng, 
            timestamp: new Date(loc.timestamp),
            isStart,
            isEnd
          };
        })
        .filter(Boolean); // Enlever les positions nulles
      
      setMovementPath(pathPoints);
      setPathMarkers(pathPoints);
      
      // Ajuster la carte pour montrer tout le trajet
      if (pathPoints.length > 0 && mapRef.current) {
        const bounds = new window.google.maps.LatLngBounds();
        pathPoints.forEach(point => bounds.extend(point));
        mapRef.current.fitBounds(bounds);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du trajet:', err);
      setError('Erreur lors du chargement du trajet: ' + (err.message || String(err)));
    }
  };

  // Ajuster la carte pour montrer tous les marqueurs
  const fitBoundsToMarkers = (movements = activeMovements) => {
    if (!mapRef.current || !movements || movements.length === 0) {
      return;
    }
    
    try {
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidPositions = false;
      
      movements.forEach(movement => {
        if (movement.position) {
          bounds.extend(movement.position);
          hasValidPositions = true;
        }
      });
      
      if (hasValidPositions) {
        mapRef.current.fitBounds(bounds);
      }
    } catch (err) {
      console.error("Erreur lors de l'ajustement des limites:", err);
    }
  };

  // Changer l'intervalle de rafraîchissement
  const handleRefreshChange = (e) => {
    const newInterval = parseInt(e.target.value);
    setRefreshInterval(newInterval);
  };

  // Formater la date et l'heure
  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div>
      <Navigation />
      
      <div className="tracking-container">
        <h1 className="page-title"><i className="fas fa-map-marked-alt"></i> Suivi des chauffeurs en temps réel</h1>
        
        {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
        
        <div className="tracking-controls">
          <div className="active-movements-selector">
            <label htmlFor="movement-select">Mouvements actifs:</label>
            <select 
              id="movement-select" 
              value={selectedMovement?._id || ''}
              onChange={(e) => {
                const selected = activeMovements.find(m => m._id === e.target.value);
                if (selected) {
                  setSelectedMovement(selected);
                  if (selected.position) {
                    setMapCenter(selected.position);
                    setMapZoom(12);
                    loadMovementPath(selected._id);
                  }
                }
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
          
          <button 
            onClick={() => fitBoundsToMarkers()}
            className="fit-bounds-btn"
            disabled={!isMapLoaded || activeMovements.length === 0}
          >
            <i className="fas fa-search"></i> Afficher tous les véhicules
          </button>
        </div>
        
        {loading && activeMovements.length === 0 ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Chargement des mouvements actifs...</p>
          </div>
        ) : (
          <div className="map-container">
            <div className="map-wrapper">
              <LoadScript
                googleMapsApiKey={"AIzaSyDqukPelmpRyW1gzIJiIxOz6m_tgE848QU"}
                loadingElement={<div style={{ height: '100%' }}>Chargement de Google Maps...</div>}
              >
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={mapZoom}
                  onLoad={map => {
                    mapRef.current = map;
                    setIsMapLoaded(true);
                    
                    // Ajouter les marqueurs une fois que la carte est chargée
                    if (activeMovements.length > 0) {
                      addMarkersToMap(activeMovements);
                      setTimeout(() => fitBoundsToMarkers(), 500);
                    }
                  }}
                  options={{
                    styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
                    fullscreenControl: true,
                    mapTypeControl: true,
                    streetViewControl: false,
                    zoomControl: true
                  }}
                >
                  {/* Info Window pour le marqueur sélectionné */}
                  {selectedMarker && selectedMarker.position && (
                    <InfoWindow
                      position={selectedMarker.position}
                      onCloseClick={() => setSelectedMarker(null)}
                    >
                      <div className="info-window">
                        <h3>{selectedMarker.licensePlate}</h3>
                        <p><strong>Chauffeur:</strong> {selectedMarker.userId?.fullName || 'Non assigné'}</p>
                        <p><strong>Départ:</strong> {selectedMarker.departureLocation.name}</p>
                        <p><strong>Arrivée:</strong> {selectedMarker.arrivalLocation.name}</p>
                        <p><strong>Mise à jour:</strong> {
                          selectedMarker.lastUpdate 
                            ? new Date(selectedMarker.lastUpdate).toLocaleTimeString() 
                            : 'N/A'
                        }</p>
                      </div>
                    </InfoWindow>
                  )}
                  
                  {/* Trajet du mouvement sélectionné - Ligne du parcours */}
                  {movementPath.length > 0 && (
                    <Polyline
                      path={movementPath}
                      options={{
                        strokeColor: '#3b82f6', // Bleu principal
                        strokeOpacity: 0.8,
                        strokeWeight: 3
                      }}
                    />
                  )}
                  
                  {/* Marqueurs pour chaque point du chemin */}
                  {pathMarkers.map((point, index) => (
                    <Marker
                      key={`path-${index}`}
                      position={point}
                      icon={
                        point.isStart ? {
                          path: window.google?.maps?.SymbolPath.CIRCLE,
                          fillColor: '#10b981', // Vert pour le départ
                          fillOpacity: 1,
                          scale: 8,
                          strokeColor: '#FFFFFF',
                          strokeWeight: 2
                        } : point.isEnd ? {
                          path: window.google?.maps?.SymbolPath.CIRCLE,
                          fillColor: '#ef4444', // Rouge pour l'arrivée
                          fillOpacity: 1,
                          scale: 8,
                          strokeColor: '#FFFFFF',
                          strokeWeight: 2
                        } : {
                          path: window.google?.maps?.SymbolPath.CIRCLE,
                          fillColor: '#6366f1', // Indigo pour les points intermédiaires
                          fillOpacity: 0.8,
                          scale: 4,
                          strokeColor: '#FFFFFF',
                          strokeWeight: 1
                        }
                      }
                      title={`Position ${index + 1}: ${formatDateTime(point.timestamp)}`}
                    />
                  ))}
                </GoogleMap>
              </LoadScript>
            </div>
            
            {selectedMovement && (
              <div className="selected-movement-info">
                <h2>{selectedMovement.licensePlate}</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Chauffeur:</span>
                    <span className="info-value">{selectedMovement.userId?.fullName || 'Non assigné'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Départ:</span>
                    <span className="info-value">{selectedMovement.departureLocation.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Arrivée:</span>
                    <span className="info-value">{selectedMovement.arrivalLocation.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Statut:</span>
                    <span className="info-value">{selectedMovement.status === 'in-progress' ? 'En cours' : selectedMovement.status}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Position actuelle:</span>
                    <span className="info-value">
                      {selectedMovement.position 
                        ? `${selectedMovement.position.lat.toFixed(6)}, ${selectedMovement.position.lng.toFixed(6)}`
                        : 'Non disponible'}
                    </span>
                  </div>
                  
                  {/* Afficher le nombre de points dans le parcours */}
                  {movementPath.length > 0 && (
                    <div className="info-item">
                      <span className="info-label">Points du trajet:</span>
                      <span className="info-value">{movementPath.length}</span>
                    </div>
                  )}
                  
                  <div className="movement-actions">
                    <button 
                      onClick={() => navigate(`/movement/${selectedMovement._id}`)}
                    >
                      <i className="fas fa-info-circle"></i> Voir les détails
                    </button>
                  </div>
                </div>
                
                {/* Liste des points du parcours */}
                {pathMarkers.length > 0 && (
                  <div className="path-points-container">
                    <h3>Historique du trajet</h3>
                    <div className="path-points-list">
                      {pathMarkers.map((point, index) => (
                        <div key={`point-${index}`} className="path-point-item">
                          <div className="path-point-time">
                            {point.isStart ? '🟢 Départ: ' : point.isEnd ? '🔴 Dernière position: ' : `🔵 Point ${index + 1}: `}
                            {formatDateTime(point.timestamp)}
                          </div>
                          <div className="path-point-coords">
                            Lat: {point.lat.toFixed(6)}, Lng: {point.lng.toFixed(6)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverTrackingMap;