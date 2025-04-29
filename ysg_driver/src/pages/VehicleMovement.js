import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import timelogService from '../services/timelogService';
import movementService from '../services/movementService';
import Navigation from '../components/Navigation';
import '../styles/VehicleMovement.css';

const VehicleMovement = () => {
  const [formData, setFormData] = useState({
    licensePlate: '', vehicleModel: '',
    departureLocation: { name: '', coordinates: { latitude: null, longitude: null } },
    arrivalLocation: { name: '', coordinates: { latitude: null, longitude: null } },
    notes: ''
  });
  const [activeTimeLog, setActiveTimeLog] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkActiveTimeLog = async () => {
      try {
        setLoading(true);
        const timeLog = await timelogService.getActiveTimeLog();
        setActiveTimeLog(timeLog);
        setLoading(false);
      } catch (err) {
        console.error('Erreur:', err);
        setError(err.response?.status === 404 ? 'Vous devez être en service' : 'Erreur de vérification');
        setLoading(false);
      }
    };
    checkActiveTimeLog();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    name.includes('.') 
      ? setFormData(prev => {
          const [parent, child] = name.split('.');
          return { ...prev, [parent]: { ...prev[parent], [child]: value } };
        }) 
      : setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => setPhotos(Array.from(e.target.files));

  const useCurrentLocation = (locationType) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            [locationType]: {
              ...prev[locationType],
              coordinates: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            }
          }));
          setSuccess(`Position utilisée pour ${locationType}`);
          setTimeout(() => setSuccess(null), 3000);
        },
        (err) => setError(`Erreur: ${err.message}`)
      );
    } else {
      setError('Géolocalisation non supportée');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeTimeLog) return setError('Vous devez être en service');
    if (!formData.licensePlate || !formData.departureLocation.name || !formData.arrivalLocation.name)
      return setError('Veuillez remplir les champs obligatoires');
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await movementService.createMovement(formData);
      const movementId = response.movement._id;
      
      if (photos.length > 0) {
        const photoFormData = new FormData();
        photos.forEach(photo => photoFormData.append('photos', photo));
        photoFormData.append('type', 'departure');
        await movementService.uploadPhotos(movementId, photoFormData);
      }
      
      await movementService.startMovement(movementId);
      setSuccess('Mouvement créé et démarré avec succès');
      setTimeout(() => navigate('/movement/history'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navigation />
      <div className="vehicle-movement-container">
        <h1 className="page-title">Nouveau mouvement de véhicule</h1>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        {loading ? <div className="loading-container"><div className="spinner"></div></div> : (
          !activeTimeLog ? (
            <div className="no-service-message">
              <p>Vous devez être en service pour créer un mouvement.</p>
              <button onClick={() => navigate('/timelog')} className="btn btn-primary">Aller à la page de pointage</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="movement-form">
              {/* Informations du véhicule */}
              <div className="form-section">
                <h2 className="section-title">Informations du véhicule</h2>
                <div className="form-group">
                  <label htmlFor="licensePlate" className="form-label">Plaque d'immatriculation *</label>
                  <input type="text" id="licensePlate" name="licensePlate" value={formData.licensePlate} 
                    onChange={handleChange} className="form-input" placeholder="Ex: AB-123-CD" required />
                </div>
                <div className="form-group">
                  <label htmlFor="vehicleModel" className="form-label">Modèle du véhicule</label>
                  <input type="text" id="vehicleModel" name="vehicleModel" value={formData.vehicleModel} 
                    onChange={handleChange} className="form-input" placeholder="Ex: Renault Clio" />
                </div>
              </div>
              
              {/* Lieux */}
              {['departure', 'arrival'].map(type => (
                <div className="form-section" key={type}>
                  <h2 className="section-title">Lieu de {type === 'departure' ? 'départ' : 'd\'arrivée'}</h2>
                  <div className="form-group">
                    <label htmlFor={`${type}Location.name`} className="form-label">Nom du lieu *</label>
                    <input type="text" id={`${type}Location.name`} name={`${type}Location.name`} 
                      value={formData[`${type}Location`].name} onChange={handleChange} 
                      className="form-input" required />
                  </div>
                  <div className="location-coordinates">
                    {formData[`${type}Location`].coordinates.latitude && (
                      <p className="coordinates-text">
                        Coordonnées: {formData[`${type}Location`].coordinates.latitude.toFixed(4)}, 
                        {formData[`${type}Location`].coordinates.longitude.toFixed(4)}
                      </p>
                    )}
                    <button type="button" onClick={() => useCurrentLocation(`${type}Location`)} 
                      className="btn btn-secondary">Utiliser ma position actuelle</button>
                  </div>
                </div>
              ))}
              
              {/* Photos */}
              <div className="form-section">
                <h2 className="section-title">Photos du véhicule</h2>
                <div className="form-group">
                  <label htmlFor="photos" className="form-label">Ajouter des photos</label>
                  <input type="file" id="photos" name="photos" onChange={handlePhotoChange} 
                    className="form-input file-input" multiple accept="image/*" />
                  <p className="help-text">Vous pouvez sélectionner plusieurs photos (max 5)</p>
                </div>
                {photos.length > 0 && <div className="selected-photos"><p>{photos.length} photo(s) sélectionnée(s)</p></div>}
              </div>
              
              {/* Notes */}
              <div className="form-section">
                <h2 className="section-title">Notes</h2>
                <div className="form-group">
                  <label htmlFor="notes" className="form-label">Notes additionnelles</label>
                  <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} 
                    className="form-textarea" rows="4" placeholder="Informations supplémentaires..."></textarea>
                </div>
              </div>
              
              {/* Boutons */}
              <div className="form-actions">
                <button type="button" onClick={() => navigate('/dashboard')} 
                  className="btn btn-secondary" disabled={loading}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Création en cours...' : 'Créer et démarrer le trajet'}
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
};

export default VehicleMovement;