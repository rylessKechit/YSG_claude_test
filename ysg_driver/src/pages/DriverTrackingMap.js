// ysg_driver/src/pages/DriverTrackingMap.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleMap, LoadScript, InfoWindow, Polyline } from '@react-google-maps/api';
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

const DriverTrackingMap = () => {
  const [activeMovements, setActiveMovements] = useState([]);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [movementPath, setMovementPath] = useState([]);
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
        console.log(`Création manuelle du marqueur pour ${movement.licensePlate} à:`, movement.position);
        
        try {
          // Créer le marqueur directement avec l'API Google Maps
          const marker = new window.google.maps.Marker({
            position: movement.position,
            map: mapRef.current,
            title: movement.licensePlate
          });
          
          // Stocker une référence au marqueur
          markersRef.current.push(marker);
          
          // Ajouter un gestionnaire d'événements click
          marker.addListener('click', () => {
            console.log("Marqueur cliqué:", movement);
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
        console.log("Mouvements reçus:", movements);
        
        if (!movements || movements.length === 0) {
          console.log("Aucun mouvement actif trouvé");
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
        
        console.log(`${validMovements.length}/${movements.length} mouvements avec position valide`);
        
        // Formater les données pour s'assurer que les coordonnées sont des nombres
        const formattedMovements = validMovements.map(movement => {
          const lat = parseFloat(movement.currentLocation.latitude);
          const lng = parseFloat(movement.currentLocation.longitude);
          
          // Vérifier que les coordonnées sont valides
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.warn(`Coordonnées invalides pour ${movement.licensePlate}:`, movement.currentLocation);
            return null;
          }
          
          console.log(`Position de ${movement.licensePlate}: ${lat}, ${lng}`);
          
          return {
            ...movement,
            position: { lat, lng } // Ajouter une propriété position formatée
          };
        }).filter(Boolean); // Enlever les entrées nulles
        
        console.log("Mouvements formatés:", formattedMovements);
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
      const locations = await trackingService.getLocations(movementId);
      console.log("Positions du trajet reçues:", locations);
      
      if (!locations || locations.length === 0) {
        console.log("Aucune position trouvée pour ce mouvement");
        setMovementPath([]);
        return;
      }
      
      // Convertir les données pour la polyline
      const pathPoints = locations
        .filter(loc => loc.location && loc.location.latitude && loc.location.longitude)
        .map(loc => {
          const lat = parseFloat(loc.location.latitude);
          const lng = parseFloat(loc.location.longitude);
          
          if (isNaN(lat) || isNaN(lng)) {
            console.warn("Coordonnées invalides:", loc.location);
            return null;
          }
          
          return { lat, lng };
        })
        .filter(Boolean); // Enlever les positions nulles
      
      console.log("Points du trajet formatés:", pathPoints);
      setMovementPath(pathPoints);
    } catch (err) {
      console.error('Erreur lors du chargement du trajet:', err);
      setError('Erreur lors du chargement du trajet: ' + (err.message || String(err)));
    }
  };

  // Ajuster la carte pour montrer tous les marqueurs
  const fitBoundsToMarkers = (movements = activeMovements) => {
    if (!mapRef.current || !movements || movements.length === 0) {
      console.log("Impossible d'ajuster la carte: mapRef ou mouvements non disponibles");
      return;
    }
    
    try {
      console.log("Ajustement de la carte pour", movements.length, "mouvements");
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidPositions = false;
      
      movements.forEach(movement => {
        if (movement.position) {
          bounds.extend(movement.position);
          hasValidPositions = true;
        }
      });
      
      if (hasValidPositions) {
        console.log("Ajustement des limites de la carte");
        mapRef.current.fitBounds(bounds);
      }
    } catch (err) {
      console.error("Erreur lors de l'ajustement des limites:", err);
    }
  };

  // Changer l'intervalle de rafraîchissement
  const handleRefreshChange = (e) => {
    const newInterval = parseInt(e.target.value);
    console.log("Intervalle de rafraîchissement changé à", newInterval, "secondes");
    setRefreshInterval(newInterval);
  };

  // Ajouter un marqueur de test
  const addTestMarker = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return;
    
    try {
      console.log("Ajout d'un marqueur de test à Paris");
      const testMarker = new window.google.maps.Marker({
        position: { lat: 48.8566, lng: 2.3522 }, // Paris
        map: mapRef.current,
        title: "Marqueur de test (Paris)"
      });
      markersRef.current.push(testMarker);
    } catch (err) {
      console.error("Erreur lors de la création du marqueur de test:", err);
    }
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
                if (selected) {
                  console.log("Mouvement sélectionné:", selected);
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
            onClick={() => {
              if (activeMovements.length === 0) {
                addTestMarker(); // Ajouter un marqueur de test si aucun mouvement
              } else {
                fitBoundsToMarkers(); // Ajuster aux limites des marqueurs existants
              }
            }}
            className="fit-bounds-btn"
            disabled={!isMapLoaded}
          >
            <i className="fas fa-search"></i> Afficher tous les véhicules
          </button>
        </div>
        
        {loading && activeMovements.length === 0 ? (
          <div className="loading-container">
            <LoadingSpinner />
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
                    console.log("Carte Google Maps chargée");
                    mapRef.current = map;
                    setIsMapLoaded(true);
                    
                    // Ajouter les marqueurs une fois que la carte est chargée
                    if (activeMovements.length > 0) {
                      addMarkersToMap(activeMovements);
                      setTimeout(() => fitBoundsToMarkers(), 500);
                    } else {
                      addTestMarker(); // Ajouter un marqueur de test si aucun mouvement
                    }
                  }}
                  options={{
                    styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
                    fullscreenControl: true,
                    mapTypeControl: true,
                    streetViewControl: false
                  }}
                >
                  {/* Nous n'utilisons plus le composant Marker, mais nous gérons directement les marqueurs via l'API Google Maps */}
                  
                  {/* Info Window pour le marqueur sélectionné */}
                  {selectedMarker && selectedMarker.position && (
                    <InfoWindow
                      position={selectedMarker.position}
                      onCloseClick={() => {
                        console.log("InfoWindow fermée");
                        setSelectedMarker(null);
                      }}
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
                  <div className="movement-actions">
                    <button 
                      className="btn-primary"
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
        
        {/* Section de débogage pour aider à résoudre les problèmes */}
        <div className="debug-section">
          <h3>Informations de débogage</h3>
          <p>Nombre de mouvements actifs: {activeMovements.length}</p>
          <p>Nombre de marqueurs sur la carte: {markersRef.current.length}</p>
          <p>Carte chargée: {isMapLoaded ? 'Oui' : 'Non'}</p>
          <p>Centre de la carte: {mapCenter.lat.toFixed(6)}, {mapCenter.lng.toFixed(6)}</p>
          <p>Zoom: {mapZoom}</p>
          {activeMovements.length > 0 && (
            <div className="debug-movements">
              <h4>Positions reçues:</h4>
              <ul>
                {activeMovements.map(m => (
                  <li key={m._id}>
                    {m.licensePlate}: {m.position ? `${m.position.lat.toFixed(6)}, ${m.position.lng.toFixed(6)}` : 'Aucune position'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverTrackingMap;