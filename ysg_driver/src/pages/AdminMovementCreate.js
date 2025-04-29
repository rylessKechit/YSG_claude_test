// ysg_driver/src/pages/AdminMovementCreate.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import movementService from '../services/movementService';
import agencyService from '../services/agencyService';
import Navigation from '../components/Navigation';
import '../styles/AdminMovementCreate.css';

const AdminMovementCreate = () => {
  const [formData, setFormData] = useState({
    userId: '',
    licensePlate: '',
    vehicleModel: '',
    departureAgencyId: '',
    departureLocation: {
      name: '',
      coordinates: { latitude: null, longitude: null }
    },
    arrivalAgencyId: '',
    arrivalLocation: {
      name: '',
      coordinates: { latitude: null, longitude: null }
    },
    deadline: '',
    notes: ''
  });
  
  // État pour les agences
  const [agencies, setAgencies] = useState([]);
  
  // Utiliser une liste de tous les chauffeurs au lieu de seulement ceux en service
  const [allDrivers, setAllDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDrivers, setFetchingDrivers] = useState(true);
  const [fetchingAgencies, setFetchingAgencies] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };

  // Vérifier que l'utilisateur est admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'team-leader') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Charger tous les chauffeurs (pas seulement ceux en service)
  useEffect(() => {
    const loadAllDrivers = async () => {
      try {
        setFetchingDrivers(true);
        const drivers = await movementService.getAllDrivers();
        setAllDrivers(drivers);
      } catch (err) {
        console.error('Erreur lors du chargement des chauffeurs:', err);
        setError('Impossible de charger la liste des chauffeurs');
      } finally {
        setFetchingDrivers(false);
      }
    };

    loadAllDrivers();
  }, []);
  
  // Charger toutes les agences actives
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        setFetchingAgencies(true);
        const agenciesData = await agencyService.getAgencies(true); // true pour n'obtenir que les agences actives
        setAgencies(agenciesData);
      } catch (err) {
        console.error('Erreur lors du chargement des agences:', err);
        setError('Impossible de charger la liste des agences');
      } finally {
        setFetchingAgencies(false);
      }
    };
    
    loadAgencies();
  }, []);

  // Gérer les changements dans le formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else if (name === 'departureAgencyId') {
      // Trouver l'agence sélectionnée et utiliser ses coordonnées
      const selectedAgency = agencies.find(agency => agency._id === value);
      
      if (selectedAgency) {
        setFormData({
          ...formData,
          departureAgencyId: value,
          departureLocation: {
            name: selectedAgency.name,
            coordinates: {
              latitude: selectedAgency.location.coordinates.latitude,
              longitude: selectedAgency.location.coordinates.longitude
            }
          }
        });
      } else {
        // Si "aucune agence" est sélectionnée
        setFormData({
          ...formData,
          departureAgencyId: '',
          departureLocation: {
            name: '',
            coordinates: { latitude: null, longitude: null }
          }
        });
      }
    } else if (name === 'arrivalAgencyId') {
      // Trouver l'agence sélectionnée et utiliser ses coordonnées
      const selectedAgency = agencies.find(agency => agency._id === value);
      
      if (selectedAgency) {
        setFormData({
          ...formData,
          arrivalAgencyId: value,
          arrivalLocation: {
            name: selectedAgency.name,
            coordinates: {
              latitude: selectedAgency.location.coordinates.latitude,
              longitude: selectedAgency.location.coordinates.longitude
            }
          }
        });
      } else {
        // Si "aucune agence" est sélectionnée
        setFormData({
          ...formData,
          arrivalAgencyId: '',
          arrivalLocation: {
            name: '',
            coordinates: { latitude: null, longitude: null }
          }
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Utiliser la géolocalisation pour le lieu de départ
  const useCurrentLocationForDeparture = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            departureAgencyId: '', // Réinitialiser l'agence de départ
            departureLocation: {
              ...formData.departureLocation,
              coordinates: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            }
          });
          setSuccess('Position actuelle utilisée pour le lieu de départ');
          setTimeout(() => setSuccess(null), 3000);
        },
        (err) => {
          setError(`Erreur de géolocalisation: ${err.message}`);
        }
      );
    } else {
      setError('La géolocalisation n\'est pas prise en charge par votre navigateur');
    }
  };

  // Utiliser la géolocalisation pour le lieu d'arrivée
  const useCurrentLocationForArrival = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            arrivalAgencyId: '', // Réinitialiser l'agence d'arrivée
            arrivalLocation: {
              ...formData.arrivalLocation,
              coordinates: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            }
          });
          setSuccess('Position actuelle utilisée pour le lieu d\'arrivée');
          setTimeout(() => setSuccess(null), 3000);
        },
        (err) => {
          setError(`Erreur de géolocalisation: ${err.message}`);
        }
      );
    } else {
      setError('La géolocalisation n\'est pas prise en charge par votre navigateur');
    }
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation des données
    if (!formData.licensePlate) {
      setError('La plaque d\'immatriculation est requise');
      return;
    }
    
    // Vérifier le lieu de départ
    if (!formData.departureAgencyId && (!formData.departureLocation.name || !formData.departureLocation.coordinates.latitude)) {
      setError('Veuillez sélectionner une agence de départ ou saisir un lieu de départ personnalisé');
      return;
    }
    
    // Vérifier le lieu d'arrivée
    if (!formData.arrivalAgencyId && (!formData.arrivalLocation.name || !formData.arrivalLocation.coordinates.latitude)) {
      setError('Veuillez sélectionner une agence d\'arrivée ou saisir un lieu d\'arrivée personnalisé');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Créer le mouvement
      await movementService.createMovement(formData);
      
      setSuccess('Mouvement créé avec succès');
      setTimeout(() => {
        navigate('/movement/history');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du mouvement');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navigation />
      
      <div className="admin-movement-container">
        <div className="page-header">
          <h1 className="page-title">Créer un mouvement de véhicule</h1>
          <p className="page-subtitle">Assignez un nouveau mouvement à un chauffeur ou créez-le sans chauffeur</p>
        </div>
        
        {error && (
          <div className="alert alert-error">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">{error}</div>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            <div className="alert-icon">✓</div>
            <div className="alert-content">{success}</div>
          </div>
        )}
        
        {fetchingDrivers || fetchingAgencies ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Chargement des données...</p>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <h2 className="section-title">
                    <i className="fas fa-user"></i> Sélection du chauffeur (optionnel)
                  </h2>
                  
                  <div className="form-group">
                    <label htmlFor="userId" className="form-label">Chauffeur</label>
                    <select
                      id="userId"
                      name="userId"
                      value={formData.userId}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="">Aucun chauffeur (créer sans assignation)</option>
                      <optgroup label="Chauffeurs en service">
                        {allDrivers.filter(driver => driver.isOnDuty).length > 0 ? (
                          allDrivers.filter(driver => driver.isOnDuty).map(driver => (
                            <option key={driver._id} value={driver._id}>
                              {driver.fullName} ({driver.username}) - En service
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>Aucun chauffeur en service</option>
                        )}
                      </optgroup>
                      <optgroup label="Chauffeurs hors service">
                        {allDrivers.filter(driver => !driver.isOnDuty).length > 0 ? (
                          allDrivers.filter(driver => !driver.isOnDuty).map(driver => (
                            <option key={driver._id} value={driver._id}>
                              {driver.fullName} ({driver.username}) - Hors service
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>Aucun chauffeur hors service</option>
                        )}
                      </optgroup>
                    </select>
                    <p className="form-hint">
                      Un mouvement sans chauffeur ou avec un chauffeur hors service ne pourra pas être démarré. 
                      Le chauffeur devra être en service pour pouvoir démarrer le mouvement.
                    </p>
                  </div>
                </div>
                
                <div className="form-section">
                  <h2 className="section-title">
                    <i className="fas fa-car"></i> Informations du véhicule
                  </h2>
                  
                  <div className="form-group">
                    <label htmlFor="licensePlate" className="form-label">
                      Plaque d'immatriculation *
                    </label>
                    <input
                      type="text"
                      id="licensePlate"
                      name="licensePlate"
                      value={formData.licensePlate}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Ex: AB-123-CD"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="vehicleModel" className="form-label">
                      Modèle du véhicule
                    </label>
                    <input
                      type="text"
                      id="vehicleModel"
                      name="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Ex: Renault Clio"
                    />
                  </div>
                </div>
                
                <div className="form-section">
                  <h2 className="section-title">
                    <i className="fas fa-map-marker-alt"></i> Lieu de départ
                  </h2>
                  
                  <div className="form-group">
                    <label htmlFor="departureAgencyId" className="form-label">
                      Agence de départ
                    </label>
                    <select
                      id="departureAgencyId"
                      name="departureAgencyId"
                      value={formData.departureAgencyId}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="">Aucune agence (saisir un lieu personnalisé)</option>
                      {agencies.map(agency => (
                        <option key={agency._id} value={agency._id}>
                          {agency.name} - {agency.address}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {!formData.departureAgencyId && (
                    <>
                      <div className="form-group">
                        <label htmlFor="departureLocation.name" className="form-label">
                          Nom du lieu de départ *
                        </label>
                        <input
                          type="text"
                          id="departureLocation.name"
                          name="departureLocation.name"
                          value={formData.departureLocation.name}
                          onChange={handleChange}
                          className="form-input"
                          placeholder="Ex: Aéroport d'Orly"
                          required={!formData.departureAgencyId}
                        />
                      </div>
                      
                      <div className="location-helper">
                        {formData.departureLocation.coordinates.latitude && (
                          <div className="coordinates-box">
                            <p>Lat: {formData.departureLocation.coordinates.latitude.toFixed(6)}</p>
                            <p>Lng: {formData.departureLocation.coordinates.longitude.toFixed(6)}</p>
                          </div>
                        )}
                        <button 
                          type="button" 
                          onClick={useCurrentLocationForDeparture}
                          className="btn btn-secondary"
                        >
                          <i className="fas fa-map-pin"></i> Utiliser ma position actuelle
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="form-section">
                  <h2 className="section-title">
                    <i className="fas fa-flag-checkered"></i> Lieu d'arrivée
                  </h2>
                  
                  <div className="form-group">
                    <label htmlFor="arrivalAgencyId" className="form-label">
                      Agence d'arrivée
                    </label>
                    <select
                      id="arrivalAgencyId"
                      name="arrivalAgencyId"
                      value={formData.arrivalAgencyId}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="">Aucune agence (saisir un lieu personnalisé)</option>
                      {agencies.map(agency => (
                        <option key={agency._id} value={agency._id}>
                          {agency.name} - {agency.address}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {!formData.arrivalAgencyId && (
                    <>
                      <div className="form-group">
                        <label htmlFor="arrivalLocation.name" className="form-label">
                          Nom du lieu d'arrivée *
                        </label>
                        <input
                          type="text"
                          id="arrivalLocation.name"
                          name="arrivalLocation.name"
                          value={formData.arrivalLocation.name}
                          onChange={handleChange}
                          className="form-input"
                          placeholder="Ex: Aéroport Charles de Gaulle"
                          required={!formData.arrivalAgencyId}
                        />
                      </div>
                      
                      <div className="location-helper">
                        {formData.arrivalLocation.coordinates.latitude && (
                          <div className="coordinates-box">
                            <p>Lat: {formData.arrivalLocation.coordinates.latitude.toFixed(6)}</p>
                            <p>Lng: {formData.arrivalLocation.coordinates.longitude.toFixed(6)}</p>
                          </div>
                        )}
                        <button 
                          type="button" 
                          onClick={useCurrentLocationForArrival}
                          className="btn btn-secondary"
                        >
                          <i className="fas fa-map-pin"></i> Utiliser ma position actuelle
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Deadline */}
                <div className="form-section">
                  <h2 className="section-title">
                    <i className="fas fa-clock"></i> Deadline (Optionnel)
                  </h2>
                  
                  <div className="form-group">
                    <label htmlFor="deadline" className="form-label">
                      Date et heure limite d'arrivée
                    </label>
                    <input
                      type="datetime-local"
                      id="deadline"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleChange}
                      className="form-input"
                      min={getCurrentDateTime()}
                    />
                    <p className="form-hint">
                      Indiquez la date et l'heure auxquelles le véhicule doit arriver à destination.
                      Cette information sera partagée avec l'agence d'arrivée et le chauffeur.
                    </p>
                  </div>
                </div>
                
                <div className="form-section">
                  <h2 className="section-title">
                    <i className="fas fa-sticky-note"></i> Notes
                  </h2>
                  
                  <div className="form-group">
                    <label htmlFor="notes" className="form-label">
                      Notes additionnelles
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      className="form-textarea"
                      placeholder="Informations supplémentaires pour le chauffeur et les agences..."
                    ></textarea>
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={() => navigate('/movement/history')}