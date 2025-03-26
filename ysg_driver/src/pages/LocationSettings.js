// src/pages/LocationSettings.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import adminService from '../services/adminService';
import Navigation from '../components/Navigation';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AlertMessage from '../components/ui/AlertMessage';
import '../styles/LocationSettings.css';

const LocationSettings = () => {
  // États des emplacements
  const [locations, setLocations] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [activeTab, setActiveTab] = useState('locations');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // États des formulaires
  const [locationForm, setLocationForm] = useState({
    _id: null,
    name: '',
    latitude: '',
    longitude: '',
    radius: '500',
    isActive: true
  });
  
  const [networkForm, setNetworkForm] = useState({
    _id: null,
    name: '',
    ipRange: '',
    description: '',
    isActive: true
  });
  
  const [testLocation, setTestLocation] = useState({
    latitude: '',
    longitude: '',
    results: null,
    testing: false
  });
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Vérifier les droits d'accès
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);
  
  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [locationsData, networksData] = await Promise.all([
          adminService.getLocations(),
          adminService.getNetworks()
        ]);
        
        setLocations(locationsData);
        setNetworks(networksData);
        setLoading(false);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur lors du chargement des données');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Gestionnaires de formulaire pour les emplacements
  const handleLocationChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLocationForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const resetLocationForm = () => {
    setLocationForm({
      _id: null,
      name: '',
      latitude: '',
      longitude: '',
      radius: '500',
      isActive: true
    });
  };
  
  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const formData = { ...locationForm };
      delete formData._id;
      
      if (locationForm._id) {
        // Mise à jour
        await adminService.updateLocation(locationForm._id, formData);
        setSuccess('Emplacement mis à jour avec succès');
      } else {
        // Création
        await adminService.createLocation(formData);
        setSuccess('Emplacement créé avec succès');
      }
      
      // Recharger les données
      const locationsData = await adminService.getLocations();
      setLocations(locationsData);
      
      // Réinitialiser le formulaire
      resetLocationForm();
      
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'opération');
      setLoading(false);
    }
  };
  
  const editLocation = (location) => {
    setLocationForm({
      _id: location._id,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radius,
      isActive: location.isActive
    });
  };
  
  const deleteLocation = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet emplacement ?')) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await adminService.deleteLocation(id);
      setSuccess('Emplacement supprimé avec succès');
      
      // Mettre à jour la liste
      setLocations(prev => prev.filter(loc => loc._id !== id));
      
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
      setLoading(false);
    }
  };
  
  // Gestionnaires de formulaire pour les réseaux
  const handleNetworkChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNetworkForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const resetNetworkForm = () => {
    setNetworkForm({
      _id: null,
      name: '',
      ipRange: '',
      description: '',
      isActive: true
    });
  };
  
  const handleNetworkSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const formData = { ...networkForm };
      delete formData._id;
      
      if (networkForm._id) {
        // Mise à jour
        await adminService.updateNetwork(networkForm._id, formData);
        setSuccess('Réseau mis à jour avec succès');
      } else {
        // Création
        await adminService.createNetwork(formData);
        setSuccess('Réseau créé avec succès');
      }
      
      // Recharger les données
      const networksData = await adminService.getNetworks();
      setNetworks(networksData);
      
      // Réinitialiser le formulaire
      resetNetworkForm();
      
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'opération');
      setLoading(false);
    }
  };
  
  const editNetwork = (network) => {
    setNetworkForm({
      _id: network._id,
      name: network.name,
      ipRange: network.ipRange,
      description: network.description,
      isActive: network.isActive
    });
  };
  
  const deleteNetwork = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce réseau ?')) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await adminService.deleteNetwork(id);
      setSuccess('Réseau supprimé avec succès');
      
      // Mettre à jour la liste
      setNetworks(prev => prev.filter(net => net._id !== id));
      
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
      setLoading(false);
    }
  };
  
  // Test de localisation
  const handleTestLocationChange = (e) => {
    const { name, value } = e.target;
    setTestLocation(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas prise en charge par votre navigateur');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTestLocation(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        }));
      },
      (err) => {
        setError(`Erreur de géolocalisation: ${err.message}`);
      }
    );
  };
  
  const testLocationFn = async () => {
    try {
      setTestLocation(prev => ({ ...prev, testing: true, results: null }));
      setError(null);
      
      const { latitude, longitude } = testLocation;
      
      if (!latitude || !longitude) {
        setError('Veuillez saisir une latitude et une longitude');
        setTestLocation(prev => ({ ...prev, testing: false }));
        return;
      }
      
      const results = await adminService.testLocation(latitude, longitude);
      setTestLocation(prev => ({ ...prev, results, testing: false }));
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du test');
      setTestLocation(prev => ({ ...prev, testing: false }));
    }
  };
  
  // Fonction auxiliaire pour calculer la distance depuis la position actuelle
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance en mètres
  };
  
  if (loading && !locations.length && !networks.length) {
    return (
      <div>
        <Navigation />
        <div className="loading-container">
          <LoadingSpinner />
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <Navigation />
      
      <div className="location-settings-container">
        <h1 className="page-title">Configuration des emplacements et réseaux autorisés</h1>
        
        {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
        {success && <AlertMessage type="success" message={success} onDismiss={() => setSuccess(null)} />}
        
        <div className="tabs-container">
          <div className="tabs-header">
            <button 
              className={`tab-button ${activeTab === 'locations' ? 'active' : ''}`}
              onClick={() => setActiveTab('locations')}
            >
              <i className="fas fa-map-marker-alt"></i> Emplacements autorisés
            </button>
            <button 
              className={`tab-button ${activeTab === 'networks' ? 'active' : ''}`}
              onClick={() => setActiveTab('networks')}
            >
              <i className="fas fa-network-wired"></i> Réseaux autorisés
            </button>
            <button 
              className={`tab-button ${activeTab === 'test' ? 'active' : ''}`}
              onClick={() => setActiveTab('test')}
            >
              <i className="fas fa-vial"></i> Tester une position
            </button>
          </div>
          
          <div className="tab-content">
            {/* Onglet Emplacements */}
            {activeTab === 'locations' && (
              <div className="locations-tab">
                <div className="locations-grid">
                  <div className="locations-list">
                    <h2 className="section-title">Liste des emplacements autorisés</h2>
                    {locations.length === 0 ? (
                      <div className="no-data">Aucun emplacement configuré</div>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Nom</th>
                            <th>Coordonnées</th>
                            <th>Rayon</th>
                            <th>Statut</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locations.map(loc => (
                            <tr key={loc._id} className={!loc.isActive ? 'inactive-row' : ''}>
                              <td>{loc.name}</td>
                              <td>
                                {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                              </td>
                              <td>{loc.radius} m</td>
                              <td>
                                <span className={`status-badge ${loc.isActive ? 'active' : 'inactive'}`}>
                                  {loc.isActive ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button 
                                    className="action-btn edit-btn" 
                                    onClick={() => editLocation(loc)}
                                    title="Modifier"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button 
                                    className="action-btn delete-btn" 
                                    onClick={() => deleteLocation(loc._id)}
                                    title="Supprimer"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  
                  <div className="locations-form">
                    <h2 className="section-title">
                      {locationForm._id ? 'Modifier un emplacement' : 'Ajouter un emplacement'}
                    </h2>
                    <form onSubmit={handleLocationSubmit}>
                      <div className="form-group">
                        <label htmlFor="name">Nom de l'emplacement</label>
                        <input 
                          type="text" 
                          id="name" 
                          name="name" 
                          value={locationForm.name}
                          onChange={handleLocationChange}
                          required
                        />
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                        <label htmlFor="latitude">Latitude</label>
                        <input 
                            type="number" 
                            id="latitude" 
                            name="latitude" 
                            value={locationForm.latitude}
                            onChange={handleLocationChange}
                            step="any"
                            required
                        />
                        </div>
                        
                        <div className="form-group">
                        <label htmlFor="longitude">Longitude</label>
                        <input 
                            type="number" 
                            id="longitude" 
                            name="longitude" 
                            value={locationForm.longitude}
                            onChange={handleLocationChange}
                            step="any"
                            required
                        />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="radius">Rayon (mètres)</label>
                        <input 
                        type="number" 
                        id="radius" 
                        name="radius" 
                        value={locationForm.radius}
                        onChange={handleLocationChange}
                        min="50"
                        max="5000"
                        required
                        />
                        <p className="help-text">Distance maximale autorisée à partir du point central</p>
                    </div>
                    
                    <div className="form-group checkbox-group">
                        <label>
                        <input 
                            type="checkbox" 
                            name="isActive" 
                            checked={locationForm.isActive}
                            onChange={handleLocationChange}
                        />
                        Emplacement actif
                        </label>
                    </div>
                    
                    <div className="form-actions">
                        <button 
                        type="button" 
                        onClick={resetLocationForm}
                        className="btn btn-secondary"
                        >
                        {locationForm._id ? 'Annuler' : 'Réinitialiser'}
                        </button>
                        <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                        >
                        {loading 
                            ? 'Chargement...' 
                            : locationForm._id 
                            ? 'Mettre à jour' 
                            : 'Ajouter'
                        }
                        </button>
                    </div>
                    </form>
                </div>
                </div>
            </div>
            )}
            
            {/* Onglet Réseaux */}
            {activeTab === 'networks' && (
            <div className="networks-tab">
                <div className="networks-grid">
                <div className="networks-list">
                    <h2 className="section-title">Liste des réseaux autorisés</h2>
                    {networks.length === 0 ? (
                    <div className="no-data">Aucun réseau configuré</div>
                    ) : (
                    <table className="data-table">
                        <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Plage IP</th>
                            <th>Description</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {networks.map(net => (
                            <tr key={net._id} className={!net.isActive ? 'inactive-row' : ''}>
                            <td>{net.name}</td>
                            <td>{net.ipRange}</td>
                            <td>{net.description || '-'}</td>
                            <td>
                                <span className={`status-badge ${net.isActive ? 'active' : 'inactive'}`}>
                                {net.isActive ? 'Actif' : 'Inactif'}
                                </span>
                            </td>
                            <td>
                                <div className="action-buttons">
                                <button 
                                    className="action-btn edit-btn" 
                                    onClick={() => editNetwork(net)}
                                    title="Modifier"
                                >
                                    <i className="fas fa-edit"></i>
                                </button>
                                <button 
                                    className="action-btn delete-btn" 
                                    onClick={() => deleteNetwork(net._id)}
                                    title="Supprimer"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                                </div>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    )}
                </div>
                
                <div className="networks-form">
                    <h2 className="section-title">
                    {networkForm._id ? 'Modifier un réseau' : 'Ajouter un réseau'}
                    </h2>
                    <form onSubmit={handleNetworkSubmit}>
                    <div className="form-group">
                        <label htmlFor="net-name">Nom du réseau</label>
                        <input 
                        type="text" 
                        id="net-name" 
                        name="name" 
                        value={networkForm.name}
                        onChange={handleNetworkChange}
                        required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="ipRange">Plage IP</label>
                        <input 
                        type="text" 
                        id="ipRange" 
                        name="ipRange" 
                        value={networkForm.ipRange}
                        onChange={handleNetworkChange}
                        placeholder="ex: 192.168.1.0/24"
                        required
                        />
                        <p className="help-text">Format CIDR (ex: 192.168.1.0/24) ou adresse IP unique</p>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea 
                        id="description" 
                        name="description" 
                        value={networkForm.description}
                        onChange={handleNetworkChange}
                        rows="3"
                        ></textarea>
                    </div>
                    
                    <div className="form-group checkbox-group">
                        <label>
                        <input 
                            type="checkbox" 
                            name="isActive" 
                            checked={networkForm.isActive}
                            onChange={handleNetworkChange}
                        />
                        Réseau actif
                        </label>
                    </div>
                    
                    <div className="form-actions">
                        <button 
                        type="button" 
                        onClick={resetNetworkForm}
                        className="btn btn-secondary"
                        >
                        {networkForm._id ? 'Annuler' : 'Réinitialiser'}
                        </button>
                        <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                        >
                        {loading 
                            ? 'Chargement...' 
                            : networkForm._id 
                            ? 'Mettre à jour' 
                            : 'Ajouter'
                        }
                        </button>
                    </div>
                    </form>
                </div>
                </div>
            </div>
            )}
            
            {/* Onglet Test */}
            {activeTab === 'test' && (
            <div className="test-location-tab">
                <h2 className="section-title">Tester une position</h2>
                
                <div className="test-location-form">
                <div className="form-row">
                    <div className="form-group">
                    <label htmlFor="test-latitude">Latitude</label>
                    <input 
                        type="number" 
                        id="test-latitude" 
                        name="latitude" 
                        value={testLocation.latitude}
                        onChange={handleTestLocationChange}
                        step="any"
                        required
                    />
                    </div>
                    
                    <div className="form-group">
                    <label htmlFor="test-longitude">Longitude</label>
                    <input 
                        type="number" 
                        id="test-longitude" 
                        name="longitude" 
                        value={testLocation.longitude}
                        onChange={handleTestLocationChange}
                        step="any"
                        required
                    />
                    </div>
                    
                    <div className="form-actions">
                    <button 
                        type="button" 
                        onClick={getCurrentLocation}
                        className="btn btn-secondary"
                    >
                        <i className="fas fa-map-marker-alt"></i> Position actuelle
                    </button>
                    <button 
                        type="button" 
                        onClick={testLocationFn}
                        className="btn btn-primary"
                        disabled={testLocation.testing}
                    >
                        {testLocation.testing 
                        ? 'Test en cours...' 
                        : 'Tester la position'
                        }
                    </button>
                    </div>
                </div>
                </div>
                
                {testLocation.results && (
                <div className="test-results">
                    <h3 className="results-title">
                    <span className={testLocation.results.isAuthorized ? 'authorized' : 'unauthorized'}>
                        Position {testLocation.results.isAuthorized ? 'autorisée' : 'non autorisée'}
                    </span>
                    </h3>
                    
                    <div className="coordinates-display">
                    Coordonnées testées: {testLocation.results.coordinates.latitude}, {testLocation.results.coordinates.longitude}
                    </div>
                    
                    <table className="data-table">
                    <thead>
                        <tr>
                        <th>Emplacement</th>
                        <th>Distance</th>
                        <th>Rayon</th>
                        <th>Résultat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {testLocation.results.locations.map(loc => (
                        <tr key={loc.locationId}>
                            <td>{loc.name}</td>
                            <td>{loc.distance} m</td>
                            <td>{loc.radius} m</td>
                            <td>
                            <span className={`status-badge ${loc.isInRange ? 'in-range' : 'out-of-range'}`}>
                                {loc.isInRange ? 'Dans la zone' : 'Hors zone'}
                            </span>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )}
            </div>
            )}
        </div>
        </div>
    </div>
    </div>
    );
};