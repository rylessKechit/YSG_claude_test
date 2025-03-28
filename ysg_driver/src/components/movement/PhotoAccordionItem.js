// src/components/movement/PhotoAccordionItem.js
import React, { useState, useEffect } from 'react';

const PhotoAccordionItem = ({
  type,
  label,
  instruction,
  completed,
  expanded,
  photoUrl,
  selectedFile,
  onToggle,
  onSelectPhoto,
  onUploadPhoto,
  onResetStatus,
  uploadingPhoto,
  localPreviewOnly = false // Nouveau paramètre indiquant si on est en mode prévisualisation uniquement
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Générer la prévisualisation quand un fichier est sélectionné
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  // Les styles communs regroupés
  const styles = {
    completedSection: {
      borderLeft: '4px solid #10b981',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    previewContainer: {
      margin: '15px 0',
      textAlign: 'center',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '8px',
      backgroundColor: '#f9fafb'
    },
    previewImage: {
      maxWidth: '100%',
      maxHeight: '300px',
      borderRadius: '4px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    fileInput: {
      display: 'block',
      width: '100%',
      padding: '8px',
      border: '1px dashed #d1d5db',
      borderRadius: '4px',
      backgroundColor: '#f9fafb'
    },
    photoReady: {
      borderLeft: '4px solid #3b82f6',
      borderRadius: '8px',
      overflow: 'hidden'
    }
  };

  // Déterminer le style de la section en fonction de l'état
  const getSectionStyle = () => {
    if (completed) return styles.completedSection;
    if (selectedFile && localPreviewOnly) return styles.photoReady;
    return {};
  };

  return (
    <div 
      className="photo-accordion-item" 
      style={getSectionStyle()}
    >
      <div 
        className={`photo-accordion-header ${completed ? 'completed' : ''} ${selectedFile && localPreviewOnly ? 'photo-ready' : ''}`} 
        onClick={onToggle}
        style={completed ? { backgroundColor: '#d1fae5' } : 
              (selectedFile && localPreviewOnly ? { backgroundColor: '#dbeafe' } : {})}
      >
        <div className="photo-section-title">
          <span className="status-icon">
            <i 
              className={`fas ${
                completed ? 'fa-check-circle' : 
                (selectedFile && localPreviewOnly ? 'fa-camera' : 'fa-circle')
              }`} 
              style={{ 
                color: completed ? '#10b981' : 
                      (selectedFile && localPreviewOnly ? '#3b82f6' : '#6b7280') 
              }}
            />
          </span>
          <span>{label}</span>
        </div>
        <div className="photo-section-actions">
          <span 
            className="photo-status-text" 
            style={
              completed ? { color: '#10b981', fontWeight: '500' } : 
              (selectedFile && localPreviewOnly ? { color: '#3b82f6', fontWeight: '500' } : {})
            }
          >
            {completed ? 'Uploadée' : 
             (selectedFile && localPreviewOnly ? 'Prête' : 'À photographier')}
          </span>
          <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`} />
        </div>
      </div>
      
      {expanded && (
        <div className="photo-accordion-content">
          {completed ? (
            <div className="completed-photo">
              <div style={styles.previewContainer}>
                {photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt={label} 
                    className="preview-image"
                    style={styles.previewImage}
                    onClick={() => window.open(photoUrl, '_blank')}
                  />
                ) : (
                  <p>Aucune image disponible</p>
                )}
              </div>
              <button 
                className="btn btn-secondary photo-replace-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  onResetStatus();
                }}
              >
                Remplacer la photo
              </button>
            </div>
          ) : (
            <div className="photo-upload-container">
              <p className="photo-instruction">{instruction}</p>
              <div className="file-upload-wrapper" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                  type="file" 
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => e.target.files?.[0] && onSelectPhoto(e.target.files[0])}
                  className="photo-input"
                  style={styles.fileInput}
                />
                
                {selectedFile && (
                  <div className="photo-preview-container" style={styles.previewContainer}>
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="Prévisualisation" 
                        className="preview-image"
                        style={styles.previewImage}
                      />
                    ) : (
                      <div style={{color: '#6b7280', padding: '20px'}}>
                        Fichier sélectionné : {selectedFile.name} ({Math.round(selectedFile.size/1024)} Ko)
                      </div>
                    )}
                  </div>
                )}
                
                {/* Bouton d'upload individuel - caché en mode localPreviewOnly */}
                {!localPreviewOnly && (
                  <button 
                    onClick={() => localPreviewOnly ? null : onUploadPhoto()}
                    className="btn btn-primary"
                  >
                    {uploadingPhoto ? 'Chargement...' : 'Valider la photo'}
                  </button>
                )}
                
                {/* En mode localPreviewOnly, montrer un message de confirmation si une photo est sélectionnée */}
                {localPreviewOnly && selectedFile && (
                  <div className="photo-selected-message" style={{ 
                    color: '#3b82f6', 
                    padding: '10px', 
                    backgroundColor: '#eff6ff',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-info-circle"></i>
                    <span>Photo sélectionnée - sera uploadée en une fois avec les autres photos</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoAccordionItem;