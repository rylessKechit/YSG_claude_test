// src/components/movement/PhotoUploadSection.js
import React from 'react';
import PhotoAccordionItem from './PhotoAccordionItem';

const PhotoUploadSection = ({ 
  photosStatus, 
  expandedSection, 
  selectedFiles,
  onExpandSection, 
  onSelectPhoto, 
  onUploadPhoto,
  onResetPhotoStatus,
  uploadingPhoto,
  getPhotoUrlByType,
  sectionTitle = "Photos du véhicule",
  instructionText = "Pour continuer ce mouvement, vous devez prendre les photos suivantes du véhicule. Chaque section doit être complétée."
}) => {
  // Configuration des sections de photo avec leurs détails
  const photoSections = [
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
  ];

  // Vérification si toutes les photos ont été prises
  const allRequiredPhotosTaken = photosStatus && 
    Object.values(photosStatus).every(status => status === true);

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
            onToggle={() => onExpandSection(section.type)}
            onSelectPhoto={(file) => onSelectPhoto(section.type, file)}
            onUploadPhoto={() => onUploadPhoto(section.type)}
            onResetStatus={() => onResetPhotoStatus(section.type)}
            uploadingPhoto={uploadingPhoto}
          />
        ))}
      </div>
      
      {/* Section de statut des photos */}
      <div className="photos-confirmation-section">
        {allRequiredPhotosTaken ? (
          <div className="photos-complete-message">
            <i className="fas fa-check-circle"></i>
            <span>Toutes les photos requises ont été prises</span>
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

export default PhotoUploadSection;