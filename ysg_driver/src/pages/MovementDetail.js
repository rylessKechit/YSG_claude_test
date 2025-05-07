import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import PhotosDisplaySection from '../components/movement/PhotosDisplaySection';
import trackingService from '../services/trackingService';
import '../styles/MovementDetail.css';

// Définition des états initiaux en dehors du composant pour éviter les recréations
const initialPhotoState = Object.freeze({
  front: null, passenger: null, driver: null, rear: null, windshield: null, roof: null, meter: null
});

const MovementDetail = () => {
  // États principaux
  const [movement, setMovement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(null);
  const [allDrivers, setAllDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(null);
  
  // États pour les photos - départ
  const [expandedPhotoSection, setExpandedPhotoSection] = useState(null);
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState({...initialPhotoState});
  const [photosStatus, setPhotosStatus] = useState({...initialPhotoState});
  
  // États pour les photos - arrivée
  const [expandedArrivalPhotoSection, setExpandedArrivalPhotoSection] = useState(null);
  const [selectedArrivalPhotoFiles, setSelectedArrivalPhotoFiles] = useState({...initialPhotoState});
  const [arrivalPhotosStatus, setArrivalPhotosStatus] = useState({...initialPhotoState});
  
  // États de contrôle des uploads
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingArrivalPhoto, setUploadingArrivalPhoto] = useState(false);
  
  // Hooks de React Router et Auth
  const { currentUser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  // Refs pour éviter des recréations inutiles
  const initialPhotoStateRef = useRef(initialPhotoState);
  const loadMovementCountRef = useRef(0);
  const isLoadingRef = useRef(false);
  const locationIntervalRef = useRef(null);

  // Fonction pour mettre à jour les statuts de photos à partir d'un mouvement
  const updatePhotoStatuses = useCallback((movementData) => {
    if (!movementData?.photos || movementData.photos.length === 0) return;
    
    // Utiliser des références pour éviter les recréations d'objets
    const updatedPhotoStatus = { ...initialPhotoStateRef.current };
    const updatedArrivalPhotoStatus = { ...initialPhotoStateRef.current };
    
    // Optimiser la boucle pour n'itérer qu'une seule fois sur les photos
    for (let i = 0; i < movementData.photos.length; i++) {
      const photo = movementData.photos[i];
      if (photo.type && initialPhotoStateRef.current.hasOwnProperty(photo.type)) {
        if (photo.photoType === 'arrival') {
          updatedArrivalPhotoStatus[photo.type] = true;
        } else {
          updatedPhotoStatus[photo.type] = true;
        }
      }
    }
    
    setPhotosStatus(updatedPhotoStatus);
    setArrivalPhotosStatus(updatedArrivalPhotoStatus);
  }, []);

  // Fonction de chargement du mouvement - optimisée
  const loadMovement = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    loadMovementCountRef.current++;
    
    try {
      setLoading(true);
      
      const data = await movementService.getMovement(id);
      
      // Mise à jour de l'état du mouvement
      setMovement(data);
      
      // Mise à jour des notes
      if (data.notes) setNotes(data.notes);
      
      // Analyse des photos existantes
      updatePhotoStatuses(data);
    } catch (err) {
      console.error('[loadMovement] Erreur:', err);
      setError('Erreur lors du chargement des détails du mouvement');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [id, updatePhotoStatuses]);

  // Fonction de chargement des chauffeurs
  const loadDrivers = useCallback(async () => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'team-leader') return;
    
    try {
      setLoadingDrivers(true);
      const drivers = await movementService.getAllDrivers();
      setAllDrivers(drivers);
    } catch (err) {
      console.error('[loadDrivers] Erreur:', err);
    } finally {
      setLoadingDrivers(false);
    }
  }, [currentUser?.role]);

  // Effet pour le chargement initial
  useEffect(() => {
    loadMovement();
  }, [loadMovement]);

  // Effet pour charger les chauffeurs si admin
  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // Effet pour la géolocalisation si mouvement en cours
  useEffect(() => {
    // Nettoyage de l'intervalle précédent au cas où
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    
    // Vérifier que le mouvement est en cours et que c'est le chauffeur assigné
    const isInProgress = movement?.status === 'in-progress';
    const isAssignedDriver = 
      currentUser?.role === 'driver' && 
      movement?.userId && 
      (typeof movement.userId === 'object' 
        ? movement.userId._id === currentUser._id 
        : movement.userId === currentUser._id);
    
    if (!isInProgress || !isAssignedDriver) return;
    
    // Fonction pour envoyer la position
    const sendCurrentPosition = () => {
      if (!navigator.geolocation) return;
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await trackingService.sendLocation(movement._id, {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              speed: position.coords.speed || 0
            });
          } catch (err) {
            console.error('[Tracking] Erreur:', err);
          }
        },
        (err) => console.error('[Geolocation] Erreur:', err),
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };
    
    // Envoyer immédiatement puis configurer un intervalle
    sendCurrentPosition();
    locationIntervalRef.current = setInterval(sendCurrentPosition, 30000);
    
    // Nettoyage à la démontage
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
  }, [movement, currentUser]);

  // Fonctions mémorisées pour vérifier si toutes les photos nécessaires sont prises
  const allRequiredPhotosTaken = useMemo(() => {
    if (!photosStatus) return false;
    
    return Object.values(photosStatus).every(status => status === true);
  }, [photosStatus]);

  const allRequiredArrivalPhotosTaken = useMemo(() => {
    if (!arrivalPhotosStatus) return false;
    
    return Object.values(arrivalPhotosStatus).every(status => status === true);
  }, [arrivalPhotosStatus]);

  // Gestion de l'upload groupé des photos
  const handleBatchPhotoUpload = useCallback(async (isArrival = false) => {
    try {
      setUpdateLoading(true);
      setError(null);
      
      // Sélectionner les bons états selon le type de photo
      const photoFiles = isArrival ? selectedArrivalPhotoFiles : selectedPhotoFiles;
      const setPhotoStatus = isArrival ? setArrivalPhotosStatus : setPhotosStatus;
      const setPhotoFiles = isArrival ? setSelectedArrivalPhotoFiles : setSelectedPhotoFiles;
      
      // Obtenir les types de photos valides
      const validEntries = Object.entries(photoFiles).filter(([_, file]) => file);
      const photoTypes = validEntries.map(([type]) => type);
      const validFiles = validEntries.map(([_, file]) => file);
      
      // Vérifier s'il y a des photos à uploader
      if (validFiles.length === 0) {
        setError('Aucune photo sélectionnée pour upload');
        setUpdateLoading(false);
        return;
      }
      
      // Upload via S3
      const result = await movementService.uploadPhotosToS3(
        id, 
        validFiles, 
        photoTypes, 
        isArrival ? 'arrival' : 'departure'
      );
      
      // Mise à jour de l'état du mouvement si la réponse contient le mouvement mis à jour
      if (result.photos && result.movement) {
        setMovement(result.movement);
        
        // Mise à jour des statuts de photos en utilisant les données reçues
        updatePhotoStatuses(result.movement);
      } else {
        // Sinon, mise à jour manuelle des statuts
        const updatedStatus = { ...isArrival ? arrivalPhotosStatus : photosStatus };
        photoTypes.forEach(type => {
          updatedStatus[type] = true;
        });
        setPhotoStatus(updatedStatus);
      }
      
      // Réinitialisation des fichiers sélectionnés
      setPhotoFiles({ ...initialPhotoStateRef.current });
      
      // Message de succès
      setUpdateSuccess(`Photos ${isArrival ? 'd\'arrivée' : 'de départ'} téléchargées avec succès`);
      
      // Nettoyer le message de succès après un délai
      setTimeout(() => setUpdateSuccess(null), 3000);
    } catch (err) {
      console.error('[Upload] Erreur:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'upload des photos');
    } finally {
      setUpdateLoading(false);
    }
  }, [id, selectedPhotoFiles, selectedArrivalPhotoFiles, arrivalPhotosStatus, photosStatus, updatePhotoStatuses]);

  // Gestion des actions principales - OPTIMISÉE pour utiliser directement les réponses API
  const handleAction = useCallback(async (actionType, ...params) => {
    try {
      setUpdateLoading(true);
      setError(null);
      
      let updatedMovement = null;
      
      switch(actionType) {
        case 'assignDriver':
          const assignResponse = await movementService.assignDriver(id, params[0]);
          updatedMovement = assignResponse.movement;
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
          const prepareResponse = await movementService.prepareMovement(id);
          updatedMovement = prepareResponse.movement;
          setUpdateSuccess('Préparation du mouvement démarrée');
          break;
          
        case 'startMovement':
          if (!allRequiredPhotosTaken) {
            setError('Veuillez prendre toutes les photos requises avant de démarrer');
            setUpdateLoading(false);
            return;
          }
          const startResponse = await movementService.startMovement(id);
          updatedMovement = startResponse.movement;
          setUpdateSuccess('Mouvement démarré avec succès');
          break;
          
        case 'completeMovement':
          if (!allRequiredArrivalPhotosTaken) {
            setError('Veuillez prendre toutes les photos requises à l\'arrivée');
            setUpdateLoading(false);
            return;
          }
          const completeResponse = await movementService.completeMovement(id, { notes });
          updatedMovement = completeResponse.movement;
          setUpdateSuccess('Mouvement terminé avec succès');
          break;
          
        default:
          throw new Error(`Action non reconnue: ${actionType}`);
      }
      
      // Si nous avons reçu un mouvement mis à jour de l'API, utilisons-le directement
      if (updatedMovement) {
        // Mise à jour directe de l'état local avec les données complètes du serveur
        setMovement(updatedMovement);
        
        // Mise à jour des notes si nécessaire
        if (updatedMovement.notes) {
          setNotes(updatedMovement.notes);
        }
        
        // Mise à jour des statuts de photos
        updatePhotoStatuses(updatedMovement);
      } else {
        // Si nous n'avons pas reçu de mouvement mis à jour (rare), faire un rechargement complet
        await loadMovement();
      }
    } catch (err) {
      console.error(`[${actionType}] Erreur:`, err);
      setError(err.response?.data?.message || `Erreur lors de l'action ${actionType}`);
    } finally {
      setUpdateLoading(false);
    }
  }, [id, notes, navigate, allRequiredPhotosTaken, allRequiredArrivalPhotosTaken, loadMovement, updatePhotoStatuses]);

  // Gestion des photos (reset, preview, etc.)
  const handlePhotoOperation = useCallback(async (operationType, isArrival, photoType) => {
    try {
      const setUploading = isArrival ? setUploadingArrivalPhoto : setUploadingPhoto;
      setUploading(true);
      setError(null);
      
      const setPhotoStatus = isArrival ? setArrivalPhotosStatus : setPhotosStatus;
      
      if (operationType === 'reset') {
        // Réinitialisation du statut de photo
        setPhotoStatus(prev => ({ ...prev, [photoType]: false }));
        const setExpandedSection = isArrival ? setExpandedArrivalPhotoSection : setExpandedPhotoSection;
        setExpandedSection(photoType);
      } else {
        throw new Error(`Opération non reconnue: ${operationType}`);
      }
    } catch (err) {
      console.error('[PhotoOperation] Erreur:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'opération sur la photo');
    } finally {
      const setUploading = isArrival ? setUploadingArrivalPhoto : setUploadingPhoto;
      setUploading(false);
    }
  }, []);

  // Gestionnaires pour l'interface des photos
  const handleExpandPhotoSection = useCallback((section, isArrival = false) => {
    const setExpandedSection = isArrival ? setExpandedArrivalPhotoSection : setExpandedPhotoSection;
    setExpandedSection(prev => prev === section ? null : section);
  }, []);

  const handleSelectPhoto = useCallback((type, file, isArrival = false) => {
    const setSelectedFiles = isArrival ? setSelectedArrivalPhotoFiles : setSelectedPhotoFiles;
    setSelectedFiles(prev => ({ ...prev, [type]: file }));
  }, []);

  // Fonction utilitaire pour obtenir l'URL de photo
  const getPhotoUrlByType = useCallback((photoType, isArrival = false) => {
    if (!movement?.photos) return '';
    
    for (let i = 0; i < movement.photos.length; i++) {
      const photo = movement.photos[i];
      if (photo.type === photoType && 
          (!isArrival ? (!photo.photoType || photo.photoType === 'departure') : photo.photoType === 'arrival')) {
        return photo.url;
      }
    }
    
    return '';
  }, [movement?.photos]);

  // Déterminer si on doit afficher les sections spécifiques du mouvement
  const shouldShowPhotoUploadForPreparation = useMemo(() => {
    if (!movement || !currentUser) return false;
    
    // Extraction plus robuste des IDs
    const movementUserId = typeof movement.userId === 'object' && movement.userId !== null 
      ? movement.userId._id 
      : movement.userId;
    
    // La condition finale
    return movement.status === 'preparing' && 
           currentUser.role === 'driver' && 
           movementUserId && String(movementUserId) === String(currentUser._id);
  }, [movement, currentUser]);

  const shouldShowPhotoUploadForArrival = useMemo(() => {
    if (!movement || !currentUser) return false;
    
    // Extraction plus robuste des IDs
    const movementUserId = typeof movement.userId === 'object' && movement.userId !== null 
      ? movement.userId._id 
      : movement.userId;
    
    return movement.status === 'in-progress' && 
           currentUser.role === 'driver' && 
           movementUserId && String(movementUserId) === String(currentUser._id);
  }, [movement, currentUser]);

  // Gestion des différents états de chargement
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
        
        {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}
        {updateSuccess && <AlertMessage type="success" message={updateSuccess} onDismiss={() => setUpdateSuccess(null)} />}
        
        <div className="detail-card">
          <VehicleInfoSection movement={movement} />
          
          {(currentUser?.role === 'admin' || currentUser?.role === 'team-leader') && (
            <DriverAssignmentSection
              movement={movement}
              allDrivers={allDrivers}
              loadingDrivers={loadingDrivers}
              onAssignDriver={(driverId) => handleAction('assignDriver', driverId)}
              updateLoading={updateLoading}
            />
          )}
          
          <RouteInfoSection movement={movement} />
          
          {/* Photos au départ - visible uniquement en préparation */}
          {shouldShowPhotoUploadForPreparation && (
            <PhotoUploadSection
              photosStatus={photosStatus}
              expandedSection={expandedPhotoSection}
              selectedFiles={selectedPhotoFiles}
              onExpandSection={(section) => handleExpandPhotoSection(section)}
              onSelectPhoto={(type, file) => handleSelectPhoto(type, file)}
              onUploadAllPhotos={() => handleBatchPhotoUpload(false)}
              onResetPhotoStatus={(type) => handlePhotoOperation('reset', false, type)}
              uploadingPhotos={updateLoading}
              getPhotoUrlByType={(type) => getPhotoUrlByType(type)}
              sectionTitle="Photos du véhicule au départ"
              instructionText="Prenez toutes les photos suivantes du véhicule avant le départ, puis uploadez-les en une seule fois."
            />
          )}

          {/* Photos à l'arrivée - visible uniquement en cours */}
          {shouldShowPhotoUploadForArrival && (
            <PhotoUploadSection
              photosStatus={arrivalPhotosStatus}
              expandedSection={expandedArrivalPhotoSection}
              selectedFiles={selectedArrivalPhotoFiles}
              onExpandSection={(section) => handleExpandPhotoSection(section, true)}
              onSelectPhoto={(type, file) => handleSelectPhoto(type, file, true)}
              onUploadAllPhotos={() => handleBatchPhotoUpload(true)}
              onResetPhotoStatus={(type) => handlePhotoOperation('reset', true, type)}
              uploadingPhotos={updateLoading}
              getPhotoUrlByType={(type) => getPhotoUrlByType(type, true)}
              sectionTitle="Photos du véhicule à l'arrivée"
              instructionText="Prenez toutes les photos suivantes du véhicule à l'arrivée, puis uploadez-les en une seule fois."
            />
          )}

          {/* Prévisualisation plein écran */}
          {fullscreenPreview && (
            <div className="fullscreen-preview" onClick={() => setFullscreenPreview(null)}>
              <div className="preview-container">
                <img src={fullscreenPreview} alt="Prévisualisation" />
                <button className="close-preview" onClick={() => setFullscreenPreview(null)}>×</button>
              </div>
            </div>
          )}

          {/* Photos de départ - visible après qu'elles aient été téléchargées */}
          {movement.status === 'completed' && (
            <PhotosDisplaySection 
              movement={movement} 
              title="Photos du véhicule au départ" 
              photoType="departure" 
            />
          )}

          {/* Photos d'arrivée - visible uniquement pour les mouvements terminés */}
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
            allPhotosTaken={allRequiredPhotosTaken}
            allArrivalPhotosTaken={allRequiredArrivalPhotosTaken}
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

export default React.memo(MovementDetail);