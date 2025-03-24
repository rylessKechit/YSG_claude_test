import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import timelogService from '../services/timelogService';
import preparationService from '../services/preparationService';
import Navigation from '../components/Navigation';
import '../styles/PreparationCreate.css';

const PreparationCreate = () => {
  const [formData, setFormData] = useState({
    agency: 'Antony / Massy TGV',
    licensePlate: '',
    vehicleModel: '',
    notes: ''
  });
  
  const [activeTimeLog, setActiveTimeLog] = useState(null);
  const [preparators, setPreparators] = useState([]);
  const [selectedPreparator, setSelectedPreparator] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        
        // Vérifier si l'utilisateur est en service
        if (currentUser.role === 'preparator') {
          const timeLog = await timelogService.getActiveTimeLog()
            .catch(err => {
              if (err.response && err.response.status === 404) {
                return null; // Pas de pointage actif
              }
              throw err;
            });
          
          setActiveTimeLog(timeLog);
        } else if (currentUser.role === 'admin') {
          // Si c'est un admin, charger la liste des préparateurs en service
          const preparatorsOnDuty = await preparationService.getPreparatorsOnDuty()
            .catch(err => {
              console.warn('Erreur lors du chargement des préparateurs:', err);
              return [];
            });
          
          setPreparators(preparatorsOnDuty);
        }
      } catch (err) {
        console.error('Erreur lors de l\'initialisation:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, [currentUser]);

  // Gérer les changements dans le formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.agency) {
      setError('L\'agence est requise');
      return;
    }
    
    if (!formData.licensePlate) {
      setError('La plaque d\'immatriculation est requise');
      return;
    }
    
    // Vérifier que l'utilisateur est en service (si préparateur)
    if (currentUser.role === 'preparator' && !activeTimeLog) {
      setError('Vous devez être en service pour créer une préparation');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Préparer les données pour la création
      const preparationData = {
        ...formData
      };
      
      // Si c'est un admin qui crée pour un préparateur
      if (currentUser.role === 'admin' && selectedPreparator) {
        preparationData.userId = selectedPreparator;
      }
      
      // Créer la préparation
      const response = await preparationService.createPreparation(preparationData);
      
      setSuccess('Préparation créée avec succès');
      setTimeout(() => {
        navigate(`/preparations/${response.preparation._id}`);
      }, 1500);
    } catch (err) {
      console.error('Erreur lors de la création de la préparation:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création de la préparation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Navigation />
      
      <div className="preparation-create-container">
        <div className="page-header">
          <h1 className="page-title">Créer une nouvelle préparation</h1>
          <p className="page-subtitle">
            {currentUser.role === 'preparator' 
              ? 'Remplissez ce formulaire pour commencer une nouvelle préparation de véhicule' 
              : 'Assignez une nouvelle préparation à un préparateur en service'}
          </p>
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
        
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Chargement...</p>
          </div>
        ) : (
          <>
            {currentUser.role === 'preparator' && !activeTimeLog ? (
              <div className="no-service-message">
                <div className="message-icon">
                  <i className="fas fa-exclamation-circle"></i>
                </div>
                <h2 className="message-title">Service non démarré</h2>
                <p className="message-text">
                  Vous devez être en service pour créer une préparation de véhicule.
                </p>
                <button 
                  onClick={() => navigate('/timelog')}
                  className="btn btn-primary"
                >
                  Aller à la page de pointage
                </button>
              </div>
            ) : (
              <div className="form-card">
                <form onSubmit={handleSubmit}>
                  {currentUser.role === 'admin' && (
                    <div className="form-section">
                      <h2 className="section-title">
                        <i className="fas fa-user"></i> Sélection du préparateur
                      </h2>
                      
                      <div className="form-group">
                        <label htmlFor="preparator" className="form-label">
                          Préparateur
                        </label>
                        <select
                          id="preparator"
                          value={selectedPreparator}
                          onChange={(e) => setSelectedPreparator(e.target.value)}
                          className="form-select"
                        >
                          <option value="">Sélectionnez un préparateur</option>
                          {preparators.length > 0 ? (
                            preparators.map(prep => (
                              <option key={prep._id} value={prep._id}>
                                {prep.fullName} - En service depuis {new Date(prep.serviceStartTime).toLocaleTimeString()}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>Aucun préparateur en service</option>
                          )}
                        </select>
                        
                        {preparators.length === 0 && (
                          <p className="form-hint">
                            Aucun préparateur n'est actuellement en service. La préparation sera créée en attente.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="form-section">
                    <h2 className="section-title">
                      <i className="fas fa-car"></i> Informations du véhicule
                    </h2>

                    <label htmlFor="role" className="form-label">
                      Agence
                    </label>
                    <select
                      id="agency"
                      name="agency"
                      value={formData.agency}
                      onChange={handleChange}
                      className="form-input"
                      required
                    >
                      <option value="Antony / MAssy TGV">Antony / Massy TGV</option>
                      <option value="Melun">Melun</option>
                      <option value="Athis-mons">Athis-mons</option>
                      <option value="Marne-la-Valée">Marne-la-Vallée</option>
                      <option value="Paris 15">Paris 15</option>
                    </select>
                    
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
                      <i className="fas fa-clipboard-list"></i> Informations supplémentaires
                    </h2>
                    
                    <div className="form-group">
                      <label htmlFor="notes" className="form-label">
                        Notes
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        className="form-textarea"
                        placeholder="Précisions importantes concernant la préparation..."
                        rows="4"
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      type="button" 
                      onClick={() => navigate('/preparations')}
                      className="btn btn-secondary"
                      disabled={submitting}
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? 'Création en cours...' : 'Créer la préparation'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PreparationCreate;