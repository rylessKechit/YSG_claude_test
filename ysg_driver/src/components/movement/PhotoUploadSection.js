import React, { useMemo, useCallback } from 'react';
import PhotoAccordionItem from './PhotoAccordionItem';

const PhotoUploadSection = ({ 
  photosStatus, 
  expandedSection, 
  selectedFiles,
  onExpandSection, 
  onSelectPhoto, 
  onUploadAllPhotos,
  onResetPhotoStatus,
  uploadingPhotos,
  getPhotoUrlByType,
  sectionTitle = "Photos du véhicule",
  instructionText = "Pour continuer ce mouvement, vous devez prendre les photos suivantes du véhicule. Chaque section doit être complétée."
}) => {
  // Configuration des sections de photo avec leurs détails - mémorisée pour éviter recréation
  const photoSections = useMemo(() => [
    {
      type: 'front',
      label: 'Face avant avec plaque',
      instruction: 'Prenez une photo de la face avant du véhicule. Assurez-vous que la plaque d\'immatriculation soit bien visible.'
    },
    {
      type: 'passenger',
      label: 'Côté passager',
      instruction: 'Prenez une photo du côté passager du véhicule.'
    },
    {
      type: 'driver',
      label: 'Côté conducteur',
      instruction: 'Prenez une photo du côté conducteur du véhicule.'
    },
    {
      type: 'rear',
      label: 'Face arrière',
      instruction: 'Prenez une photo de l\'arrière du véhicule.'
    },
    {
      type: 'windshield',
      label: 'Pare-brise',
      instruction: 'Prenez une photo du pare-brise du véhicule.'
    },
    {
      type: 'roof',
      label: 'Toit',
      instruction: 'Prenez une photo du toit du véhicule.'
    },
    {
      type: 'meter',
      label: 'Compteur',
      instruction: 'Prenez une photo du compteur kilométrique du véhicule. Assurez-vous que les chiffres soient bien lisibles.'
    }
  ], []);

  // Calcul mémorisé pour déterminer si toutes les photos sont prises ou sélectionnées
  const { allPhotosSelected, allPhotosUploaded, pendingPhotosCount } = useMemo(() => {
    const allSelected = photoSections.every(section => 
      photosStatus[section.type] === true || selectedFiles[section.type]
    );
    
    const allUploaded = Object.values(photosStatus).every(status => status === true);
    
    const pendingCount = Object.values(selectedFiles).filter(file => file !== null).length;
    
    return { 
      allPhotosSelected: allSelected, 
      allPhotosUploaded: allUploaded,
      pendingPhotosCount: pendingCount
    };
  }, [photosStatus, selectedFiles, photoSections]);

  // Optimisation des gestionnaires d'événements
  const handleExpandSection = useCallback((section) => {
    onExpandSection(section);
  }, [onExpandSection]);

  const handleSelectPhoto = useCallback((type, file) => {
    onSelectPhoto(type, file);
  }, [onSelectPhoto]);

  const handleResetStatus = useCallback((type) => {
    onResetPhotoStatus(type);
  }, [onResetPhotoStatus]);

  return (
    <div className="detail-section photo-upload-section">
      <h2 className="section-title">
        <i className="fas fa-camera"></i> {sectionTitle}
      </h2>
      
      <div className="photo-guidelines">
        <p className="guidelines-intro">{instructionText}</p>
      </div>
      
      {/* Accordéon des zones à photographier */}
      <div className="photo-accordion">
        {photoSections.map(section => (
          <PhotoAccordionItem
            key={section.type}
            type={section.type}
            label={section.label}
            instruction={section.instruction}
            completed={photosStatus[section.type] === true}
            expanded={expandedSection === section.type}
            photoUrl={getPhotoUrlByType(section.type)}
            selectedFile={selectedFiles[section.type]}
            onToggle={() => handleExpandSection(section.type)}
            onSelectPhoto={(file) => handleSelectPhoto(section.type, file)}
            onUploadPhoto={() => {}} // Désactivé - les uploads individuels ne sont plus utilisés
            onResetStatus={() => handleResetStatus(section.type)}
            uploadingPhoto={false}
            localPreviewOnly={true} // Nouveau flag pour indiquer qu'on ne fait que prévisualiser sans upload immédiat
          />
        ))}
      </div>
      
      {/* Section de statut des photos avec bouton d'upload global */}
      <div className="photos-confirmation-section">
        {allPhotosUploaded ? (
          <div className="photos-complete-message">
            <i className="fas fa-check-circle"></i>
            <span>Toutes les photos requises ont été prises et uploadées</span>
          </div>
        ) : allPhotosSelected ? (
          <div className="photos-ready-message">
            <i className="fas fa-camera-retro"></i>
            <span>Toutes les photos sont prêtes ({pendingPhotosCount} en attente d'upload)</span>
            <button 
              onClick={onUploadAllPhotos}
              className="btn btn-primary btn-lg btn-block upload-all-photos-btn"
              disabled={uploadingPhotos || pendingPhotosCount === 0}
            >
              {uploadingPhotos ? 
                'Upload en cours...' : 
                `Uploader toutes les photos (${pendingPhotosCount})`}
            </button>
          </div>
        ) : (
          <div className="photos-incomplete-message">
            <i className="fas fa-info-circle"></i>
            <span>Veuillez prendre toutes les photos requises pour continuer</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrap dans un React.memo pour éviter les rendus inutiles
export default React.memo(PhotoUploadSection);