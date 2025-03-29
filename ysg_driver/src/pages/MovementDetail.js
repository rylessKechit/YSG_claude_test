import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import movementService from '../services/movementService';
import Navigation from '../components/Navigation';
import VehicleInfoSection from '../components/movement/VehicleInfoSection';
import RouteInfoSection from '../components/movement/RouteInfoSection';
import DriverAssignmentSection from '../components/movement/DriverAssignmentSection';
import PhotoUploadSection from '../components/movement/PhotoUploadSection';
import NotesSection from '../components/movement/NotesSection';
import DatesSection from '../components/movement/DatesSection';
import ActionButtons from '../components/movement/ActionButtons';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AlertMessage from '../components/ui/AlertMessage';
import '../styles/MovementDetail.css';
import trackingService from '../services/trackingService';
import PhotosDisplaySection from '../components/movement/PhotosDisplaySection';

const MovementDetail = () => {
  const [movement, setMovement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(null);
  const [allDrivers, setAllDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(null);
  
  // Gestion des photos
  const initialPhotoState = {
    front: null, passenger: null, driver: null, rear: null, windshield: null, roof: null, meter: null
  };
  const [expandedPhotoSection, setExpandedPhotoSection] = useState(null);
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState({...initialPhotoState});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photosStatus, setPhotosStatus] = useState({...initialPhotoState});
  const [expandedArrivalPhotoSection, setExpandedArrivalPhotoSection] = useState(null);
  const [selectedArrivalPhotoFiles, setSelectedArrivalPhotoFiles] = useState({...initialPhotoState});
  const [uploadingArrivalPhoto, setUploadingArrivalPhoto] = useState(false);
  const [arrivalPhotosStatus, setArrivalPhotosStatus] = useState({...initialPhotoState});
  
  const { currentUser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  // Charger les détails du mouvement
  useEffect(() => { loadMovement(); }, [id]);

  // Charger les chauffeurs pour les admins
  useEffect(() => {
    if (currentUser?.role === 'admin') loadDrivers();
  }, [currentUser]);

  useEffect(() => {
    // Ne démarrer le tracking que si c'est un mouvement en cours et que l'utilisateur est le chauffeur
    if (
      movement && 
      movement.status === 'in-progress' && 
      currentUser.role === 'driver' && 
      movement.userId && 
      movement.userId._id === currentUser._id
    ) {
      
      // Fonction pour envoyer la position actuelle
      const sendCurrentPosition = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                await trackingService.sendLocation(movement._id, {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  speed: position.coords.speed || 0
                });
              } catch (err) {
                console.error('Erreur lors de la mise à jour de la position:', err);
              }
            },
            (err) => {
              console.error('Erreur de géolocalisation:', err);
            },
            { 
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        }
      };
      
      // Envoyer la position immédiatement au chargement
      sendCurrentPosition();
      
      // Puis configurer un intervalle (toutes les 30 secondes)
      const trackingInterval = setInterval(sendCurrentPosition, 30000);
      
      // Nettoyage à la démontage du composant
      return () => clearInterval(trackingInterval);
    }
  }, [movement, currentUser]);
  

  async function loadMovement() {
    try {
      setLoading(true);
      const data = await movementService.getMovement(id);
      setMovement(data);
      if (data.notes) setNotes(data.notes);
      
      // Analyser les photos existantes
      if (data.photos?.length > 0) {
        const updatedPhotoStatus = { ...photosStatus };
        const updatedArrivalPhotoStatus = { ...arrivalPhotosStatus };
        
        data.photos.forEach(photo => {
          if (photo.type) {
            if (photo.photoType === 'arrival') {
              updatedArrivalPhotoStatus[photo.type] = true;
            } else {
              updatedPhotoStatus[photo.type] = true;
            }
          }
        });
        
        setPhotosStatus(updatedPhotoStatus);
        setArrivalPhotosStatus(updatedArrivalPhotoStatus);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  }

  async function loadDrivers() {
    try {
      setLoadingDrivers(true);
      const drivers = await movementService.getAllDrivers();
      setAllDrivers(drivers);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoadingDrivers(false);
    }
  }

  // Gestion de l'upload groupé des photos
  const handleBatchPhotoUpload = async (isArrival = false) => {
    try {
      setUpdateLoading(true);
      setError(null);
      
      const photoFiles = isArrival ? selectedArrivalPhotoFiles : selectedPhotoFiles;
      const setPhotoStatus = isArrival ? setArrivalPhotosStatus : setPhotosStatus;
      const setPhotoFiles = isArrival ? setSelectedArrivalPhotoFiles : setSelectedPhotoFiles;
      
      // Créer un FormData contenant toutes les photos
      const formData = new FormData();
      
      // Ajouter chaque photo au FormData avec son type
      Object.entries(photoFiles).forEach(([type, file]) => {
        if (file) {
          // Utiliser un nom de champ qui inclut le type de photo
          formData.append('photos', file);
          formData.append('photoTypes', type);
        }
      });
      
      // Ajouter le flag pour indiquer si ce sont des photos d'arrivée
      if (isArrival) {
        formData.append('photoType', 'arrival');
      }
      
      // Appel API pour uploader toutes les photos
      // Nouveau code// Vos fichiers sélectionnés
      const selectedFiles = isArrival ? selectedArrivalPhotoFiles : selectedPhotoFiles;
      const photoTypes = Object.keys(selectedFiles).filter(key => selectedFiles[key]); // Les types de photos
      await movementService.uploadPhotosToS3(id, Object.values(selectedFiles).filter(Boolean), photoTypes, isArrival ? 'arrival' : 'departure');
      
      // Mise à jour de l'état pour toutes les photos uploadées
      const updatedPhotoStatus = isArrival ? { ...arrivalPhotosStatus } : { ...photosStatus };
      Object.keys(photoFiles).forEach(type => {
        if (photoFiles[type]) {
          updatedPhotoStatus[type] = true;
        }
      });
      setPhotoStatus(updatedPhotoStatus);
      
      // Réinitialiser les fichiers sélectionnés
      setPhotoFiles(initialPhotoState);
      
      setUpdateSuccess(`Photos ${isArrival ? 'd\'arrivée ' : 'de départ '} téléchargées avec succès`);
      setTimeout(() => setUpdateSuccess(null), 3000);
      
      await loadMovement();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'upload des photos');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Gestion des actions
  const handleAction = async (actionType, ...params) => {
    try {
      setUpdateLoading(true);
      setError(null);
      
      switch(actionType) {
        case 'assignDriver':
          await movementService.assignDriver(id, params[0]);
          setUpdateSuccess('Chauffeur assigné avec succès');
          break;
        case 'deleteMovement':
          if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce mouvement ?')) {
            setUpdateLoading(false);
            return;
          }
          await movementService.deleteMovement(id);
          setUpdateSuccess('Mouvement supprimé avec succès');
          setTimeout(() => navigate('/movement/history'), 2000);
          return;
        case 'prepareMovement':
          await movementService.prepareMovement(id);
          movement.status = 'preparing';
          setUpdateSuccess('Préparation du mouvement démarrée');
          break;
        case 'startMovement':
          await movementService.startMovement(id);
          setUpdateSuccess('Mouvement démarré avec succès');
          break;
        case 'completeMovement':
          if (!allRequiredArrivalPhotosTaken()) {
            setError('Veuillez prendre toutes les photos requises à l\'arrivée');
            setUpdateLoading(false);
            return;
          }
          await movementService.completeMovement(id, { notes });
          setUpdateSuccess('Mouvement terminé avec succès');
          break;
      }
      
      await loadMovement();
      console.log(movement)
      setTimeout(() => setUpdateSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || `Erreur lors de l'action ${actionType}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Gestion des photos
  const handlePhotoOperation = async (operationType, isArrival, photoType) => {
    try {
      const setUploading = isArrival ? setUploadingArrivalPhoto : setUploadingPhoto;
      setUploading(true);
      setError(null);
      
      const photoFiles = isArrival ? selectedArrivalPhotoFiles : selectedPhotoFiles;
      const setPhotoFiles = isArrival ? setSelectedArrivalPhotoFiles : setSelectedPhotoFiles;
      const photoStatus = isArrival ? arrivalPhotosStatus : photosStatus;
      const setPhotoStatus = isArrival ? setArrivalPhotosStatus : setPhotosStatus;
      
      if (operationType === 'upload') {
        const file = photoFiles[photoType];
        if (!file) {
          setError(`Veuillez sélectionner une photo pour ${photoType}`);
          setUploading(false);
          return;
        }
        
        const formData = new FormData();
        formData.append('photos', file);
        formData.append('type', photoType);
        if (isArrival) formData.append('photoType', 'arrival');
        
        await movementService.uploadPhotos(id, formData);
        
        // Mise à jour état
        setPhotoStatus(prev => ({ ...prev, [photoType]: true }));
        setPhotoFiles(prev => ({ ...prev, [photoType]: null }));
        
        setUpdateSuccess(`Photo ${isArrival ? 'd\'arrivée ' : ''}${photoType} téléchargée avec succès`);
        setTimeout(() => setUpdateSuccess(null), 3000);
        
        await loadMovement();
      } else if (operationType === 'reset') {
        setPhotoStatus(prev => ({ ...prev, [photoType]: false }));
        const setExpandedSection = isArrival ? setExpandedArrivalPhotoSection : setExpandedPhotoSection;
        setExpandedSection(photoType);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'opération sur la photo');
    } finally {
      const setUploading = isArrival ? setUploadingArrivalPhoto : setUploadingPhoto;
      setUploading(false);
    }
  };

  // Helpers pour les photos
  const handleExpandPhotoSection = (section, isArrival = false) => {
    const setExpandedSection = isArrival ? setExpandedArrivalPhotoSection : setExpandedPhotoSection;
    const expandedSection = isArrival ? expandedArrivalPhotoSection : expandedPhotoSection;
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSelectPhoto = (type, file, isArrival = false) => {
    const setSelectedFiles = isArrival ? setSelectedArrivalPhotoFiles : setSelectedPhotoFiles;
    setSelectedFiles(prev => ({ ...prev, [type]: file }));
  };

  const getPhotoUrlByType = (photoType, isArrival = false) => {
    if (!movement?.photos) return '';
    const photo = movement.photos.find(p => 
      p.type === photoType && (!isArrival ? (!p.photoType || p.photoType === 'departure') : p.photoType === 'arrival')
    );
    return photo ? photo.url : '';
  };

  const allRequiredPhotosTaken = () => 
    photosStatus && Object.values(photosStatus).every(status => status === true);

  const allRequiredArrivalPhotosTaken = () => 
    arrivalPhotosStatus && Object.values(arrivalPhotosStatus).every(status => status === true);

  // Affichage conditionnel pour l'état du chargement
  if (loading && !movement) {
    return (
      <div>
        <Navigation />
        <div className="loading-container"><LoadingSpinner /></div>
      </div>
    );
  }

  if ((error && !movement) || !movement) {
    return (
      <div>
        <Navigation />
        <div className="detail-container">
          <AlertMessage type="error" message={error || "Mouvement non trouvé"} />
          <div className="back-button-container">
            <button onClick={() => navigate('/movement/history')} className="btn btn-primary">
              Retour à l'historique
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      
      <div className="detail-container">
        <div className="detail-header">
          <h1 className="detail-title">Détails du mouvement</h1>
          <a onClick={() => navigate('/movement/history')} className="back-link" href="#back">
            <i className="fas fa-arrow-left"></i> Retour à l'historique
          </a>
        </div>
        
        {error && <AlertMessage type="error" message={error} />}
        {updateSuccess && <AlertMessage type="success" message={updateSuccess} />}
        
        <div className="detail-card">
          <VehicleInfoSection movement={movement} />
          
          {currentUser.role === 'admin' && (
            <DriverAssignmentSection
              movement={movement}
              allDrivers={allDrivers}
              loadingDrivers={loadingDrivers}
              onAssignDriver={(driverId) => handleAction('assignDriver', driverId)}
              updateLoading={updateLoading}
            />
          )}
          
          <RouteInfoSection movement={movement} />
          
          {/* Photos au départ */}
          {movement.status === 'preparing' && movement.userId && 
          currentUser.role === 'driver' && movement.userId._id === currentUser._id && (
            <PhotoUploadSection
              movement={movement}
              photosStatus={photosStatus}
              expandedSection={expandedPhotoSection}
              selectedFiles={selectedPhotoFiles}
              onExpandSection={(section) => handleExpandPhotoSection(section)}
              onSelectPhoto={(type, file) => handleSelectPhoto(type, file)}
              onUploadAllPhotos={() => handleBatchPhotoUpload(false)} // Nouvel handler pour l'upload groupé
              onResetPhotoStatus={(type) => handlePhotoOperation('reset', false, type)}
              uploadingPhotos={updateLoading} // Utilisez updateLoading pour l'état du bouton
              getPhotoUrlByType={(type) => getPhotoUrlByType(type)}
              sectionTitle="Photos du véhicule au départ"
              instructionText="Prenez toutes les photos suivantes du véhicule avant le départ, puis uploadez-les en une seule fois."
            />
          )}

          {/* Photos à l'arrivée */}
          {movement.status === 'in-progress' && movement.userId && 
          currentUser.role === 'driver' && movement.userId._id === currentUser._id && (
            <PhotoUploadSection
              movement={movement}
              photosStatus={arrivalPhotosStatus}
              expandedSection={expandedArrivalPhotoSection}
              selectedFiles={selectedArrivalPhotoFiles}
              onExpandSection={(section) => handleExpandPhotoSection(section, true)}
              onSelectPhoto={(type, file) => handleSelectPhoto(type, file, true)}
              onUploadAllPhotos={() => handleBatchPhotoUpload(true)} // Nouvel handler pour l'upload groupé
              onResetPhotoStatus={(type) => handlePhotoOperation('reset', true, type)}
              uploadingPhotos={updateLoading} // Utilisez updateLoading pour l'état du bouton
              getPhotoUrlByType={(type) => getPhotoUrlByType(type, true)}
              sectionTitle="Photos du véhicule à l'arrivée"
              instructionText="Prenez toutes les photos suivantes du véhicule à l'arrivée, puis uploadez-les en une seule fois."
            />
          )}

          {fullscreenPreview && (
            <div className="fullscreen-preview" onClick={() => setFullscreenPreview(null)}>
              <div className="preview-container">
                <img src={fullscreenPreview} alt="Prévisualisation" />
                <button className="close-preview" onClick={() => setFullscreenPreview(null)}>×</button>
              </div>
            </div>
          )}

          {/* Photos de départ (visible après qu'elles aient été téléchargées) */}
          {movement.status !== 'pending' && movement.status !== 'assigned' && (
            <PhotosDisplaySection 
              movement={movement} 
              title="Photos du véhicule au départ" 
              photoType="departure" 
            />
          )}

          {/* Photos d'arrivée (visible uniquement pour les mouvements terminés) */}
          {movement.status === 'completed' && (
            <PhotosDisplaySection 
              movement={movement} 
              title="Photos du véhicule à l'arrivée" 
              photoType="arrival" 
            />
          )}
          
          <NotesSection
            notes={notes}
            onChange={setNotes}
            readOnly={movement.status === 'completed'}
          />
          
          <DatesSection movement={movement} />
          
          <ActionButtons
            movement={movement}
            currentUser={currentUser}
            loading={updateLoading}
            allPhotosTaken={allRequiredPhotosTaken()}
            allArrivalPhotosTaken={allRequiredArrivalPhotosTaken()}
            onPrepareMovement={() => handleAction('prepareMovement')}
            onStartMovement={() => handleAction('startMovement')}
            onCompleteMovement={() => handleAction('completeMovement')}
            onDeleteMovement={() => handleAction('deleteMovement')}
            navigateBack={() => navigate('/movement/history')}
          />
        </div>
      </div>
    </div>
  );
};

export default MovementDetail;