// src/pages/AgencyManagement.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import agencyService from '../services/agencyService';
import Navigation from '../components/Navigation';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AlertMessage from '../components/ui/AlertMessage';
import { GOOGLE_MAPS_API_KEY } from '../config';
import '../styles/AgencyManagement.css';

// Charger Google Maps API
const loadGoogleMapsScript = (callback) => {
  if (window.google && window.google.maps) {
    callback();
    return;
  }
  
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = callback;
  document.head.appendChild(script);
};

const AgencyManagement = () => {
  // États pour les agences et le formulaire
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formMode, setFormMode] = useState('create'); // 'create' ou 'edit'
  
  // État pour gérer le formulaire d'agence
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    contactPerson: '',
    latitude: '',
    longitude: '',
    isActive: true
  });
  
  // Référence à l'agence en cours d'édition
  const [currentAgencyId, setCurrentAgencyId] = useState(null);
  
  // Référence à l'autocomplete de Google
  const autocompleteInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  
  // Hooks de routing et auth
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Vérifier que l'utilisateur est admin ou chef d'équipe
  useEffect(() => {
    if (currentUser && !['admin', 'team-leader'].includes(currentUser.role)) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);
  
  // Initialiser Google Maps API
  useEffect(() => {
    loadGoogleMapsScript(() => {
      setGoogleMapsLoaded(true);
    });
  }, []);
  
  // Configurer l'autocomplete de Google lorsque l'API est chargée
  useEffect(() => {
    if (googleMapsLoaded && autocompleteInputRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        autocompleteInputRef.current,
        { types: ['address'] }
      );
      
      // Écouter les changements d'adresse sélectionnée
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        
        if (!place.geometry) {
          return;
        }
        
        // Extraire les coordonnées
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        // Mettre à jour le formulaire avec l'adresse complète et les coordonnées
        setFormData(prev => ({
          ...prev,
          address: place.formatted_address || prev.address,
          latitude: lat,
          longitude: lng
        }));
      });
    }
  }, [googleMapsLoaded]);
  
  // Charger les agences
  const loadAgencies = async () => {
    try {
      setLoading(true);
      const data = await agencyService.getAgencies(false); // Inclure les agences inactives
      setAgencies(data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement des agences:', err);
      setError('Erreur lors du chargement des agences');
      setLoading(false);
    }
  };
  
  // Charger les agences au chargement de la page
  useEffect(() => {
    loadAgencies();
  }, []);
  
  // Gérer les changements dans le formulaire
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      email: '',
      phone: '',
      contactPerson: '',
      latitude: '',
      longitude: '',
      isActive: true
    });
    setCurrentAgencyId(null);
    setFormMode('create');
  };
  
  // Remplir le formulaire avec les données d'une agence pour l'édition
  const editAgency = (agency) => {
    setFormData({
      name: agency.name,
      address: agency.address,
      email: agency.email,
      phone: agency.phone || '',
      contactPerson: agency.contactPerson || '',
      latitude: agency.location.coordinates.latitude,
      longitude: agency.location.coordinates.longitude,
      isActive: agency.isActive
    });
    setCurrentAgencyId(agency._id);
    setFormMode('edit');
    
    // Faire défiler jusqu'au formulaire
    document.getElementById('agencyForm').scrollIntoView({ behavior: 'smooth' });
  };
  
  // Gérer la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validation des champs obligatoires
      if (!formData.name || !formData.address || !formData.email || !formData.latitude || !formData.longitude) {
        setError('Veuillez remplir tous les champs obligatoires');
        setLoading(false);
        return;
      }
      
      if (formMode === 'create') {
        // Créer une nouvelle agence
        await agencyService.createAgency(formData);
        setSuccess('Agence créée avec succès');
      } else {
        // Mettre à jour une agence existante
        await agencyService.updateAgency(currentAgencyId, formData);
        setSuccess('Agence mise à jour avec succès');
      }
      
      // Réinitialiser le formulaire et recharger les agences
      resetForm();
      await loadAgencies();
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Erreur lors de la soumission du formulaire:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };
  
  // Supprimer une agence (seulement pour les admins)
  const deleteAgency = async (id) => {
    // Demander confirmation
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette agence ?')) {
      return;
    }
    
    try {
      setLoading(true);
      await agencyService.deleteAgency(id);
      setSuccess('Agence supprimée avec succès');
      
      // Réinitialiser le formulaire si l'agence en cours d'édition est celle supprimée
      if (currentAgencyId === id) {
        resetForm();
      }
      
      // Recharger les agences
      await loadAgencies();
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'agence:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue lors de la suppression');
    } finally {
      setLoading(false);
    }
  };
  
  // Géocoder une adresse manuellement (au cas où l'autocomplete ne fonctionne pas)
  const geocodeAddress = async () => {
    if (!formData.address) {
      setError('Veuillez entrer une adresse à géocoder');
      return;
    }
    
    try {
      setLoading(true);
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode({ 'address': formData.address }, (results, status) => {
        setLoading(false);
        
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          setFormData(prev => ({
            ...prev,
            latitude: location.lat(),
            longitude: location.lng()
          }));
          setSuccess('Coordonnées générées avec succès!');
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(`Impossible de géocoder l'adresse: ${status}`);
        }
      });
    } catch (err) {
      console.error('Erreur de géocodage:', err);
      setError('Erreur lors du géocodage de l\'adresse');
      setLoading(false);
    }
  };

  // Utiliser la position actuelle pour les coordonnées
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas prise en charge par votre navigateur');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        
        // Si l'API Google Maps est chargée, essayer de faire le géocodage inverse
        if (googleMapsLoaded) {
          const geocoder = new window.google.maps.Geocoder();
          const latlng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          geocoder.geocode({ 'location': latlng }, (results, status) => {
            if (status === 'OK' && results[0]) {
              setFormData(prev => ({
                ...prev,
                address: results[0].formatted_address
              }));
            }
          });
        }
        
        setSuccess('Position actuelle utilisée pour les coordonnées');
        setTimeout(() => setSuccess(null), 3000);
      },
      (err) => {
        setError(`Erreur de géolocalisation: ${err.message}`);
      }
    );
  };

  return (
    <div>
      <Navigation />
      
      <div className="agency-management-container">
        <h1 className="page-title">Gestion des agences</h1>
        
        {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
        {success && <AlertMessage type="success" message={success} onDismiss={() => setSuccess(null)} />}
        
        <div className="agency-form-section" id="agencyForm">
          <h2 className="section-title">
            {formMode === 'create' ? 'Ajouter une nouvelle agence' : 'Modifier une agence'}
          </h2>
          
          <form onSubmit={handleSubmit} className="agency-form">
            <div className="form-group">
              <label htmlFor="name">Nom de l'agence *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="address">Adresse *</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                className="form-input"
                ref={autocompleteInputRef}
                placeholder="Entrez une adresse (l'autocomplétion affichera des suggestions)"
              />
              <div className="address-actions">
                <button 
                  type="button" 
                  className="btn-secondary btn-sm"
                  onClick={geocodeAddress}
                  disabled={!formData.address || !googleMapsLoaded}
                >
                  <i className="fas fa-map-marker-alt"></i> Générer les coordonnées
                </button>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Téléphone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="contactPerson">Personne de contact</label>
              <input
                type="text"
                id="contactPerson"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            
            <div className="form-section">
              <h3 className="subsection-title">Coordonnées géographiques *</h3>
              <p className="help-text">Les coordonnées sont générées automatiquement à partir de l'adresse. Vous pouvez également les saisir manuellement ou utiliser votre position actuelle.</p>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="latitude">Latitude</label>
                  <input
                    type="number"
                    id="latitude"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    step="any"
                    required
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="longitude">Longitude</label>
                  <input
                    type="number"
                    id="longitude"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    step="any"
                    required
                    className="form-input"
                  />
                </div>
              </div>
              
              <button 
                type="button" 
                onClick={useCurrentLocation}
                className="btn-secondary use-location-btn"
              >
                <i className="fas fa-map-marker-alt"></i> Utiliser ma position actuelle
              </button>
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                />
                Agence active
              </label>
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                {formMode === 'edit' ? 'Annuler' : 'Réinitialiser'}
              </button>
              
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Chargement...' : formMode === 'create' ? 'Ajouter' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="agencies-list-section">
          <h2 className="section-title">Liste des agences</h2>
          
          {loading && agencies.length === 0 ? (
            <div className="loading-container">
              <LoadingSpinner />
              <p>Chargement des agences...</p>
            </div>
          ) : agencies.length === 0 ? (
            <div className="no-agencies">
              <p>Aucune agence trouvée. Veuillez ajouter une nouvelle agence.</p>
            </div>
          ) : (
            <div className="agencies-grid">
              {agencies.map(agency => (
                <div 
                  key={agency._id} 
                  className={`agency-card ${!agency.isActive ? 'inactive' : ''}`}
                >
                  <div className="agency-header">
                    <h3 className="agency-name">{agency.name}</h3>
                    {!agency.isActive && <span className="inactive-badge">Inactive</span>}
                  </div>
                  
                  <div className="agency-address">
                    <i className="fas fa-map-marker-alt"></i> {agency.address}
                  </div>
                  
                  <div className="agency-details">
                    <div className="detail-item">
                      <i className="fas fa-envelope"></i> {agency.email}
                    </div>
                    
                    {agency.phone && (
                      <div className="detail-item">
                        <i className="fas fa-phone"></i> {agency.phone}
                      </div>
                    )}
                    
                    {agency.contactPerson && (
                      <div className="detail-item">
                        <i className="fas fa-user"></i> {agency.contactPerson}
                      </div>
                    )}
                  </div>
                  
                  <div className="agency-coords">
                    <div className="coords-item">
                      <span className="coords-label">Lat:</span> {agency.location.coordinates.latitude.toFixed(6)}
                    </div>
                    <div className="coords-item">
                      <span className="coords-label">Lng:</span> {agency.location.coordinates.longitude.toFixed(6)}
                    </div>
                  </div>
                  
                  <div className="agency-actions">
                    <button
                      onClick={() => editAgency(agency)}
                      className="btn-edit"
                      title="Modifier"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => deleteAgency(agency._id)}
                        className="btn-delete"
                        title="Supprimer"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgencyManagement;