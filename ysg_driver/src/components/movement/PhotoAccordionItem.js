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
  uploadingPhoto
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
    }
  };

  return (
    <div 
      className="photo-accordion-item" 
      style={completed ? styles.completedSection : {}}
    >
      <div 
        className={`photo-accordion-header ${completed ? 'completed' : ''}`} 
        onClick={onToggle}
        style={completed ? { backgroundColor: '#d1fae5' } : {}}
      >
        <div className="photo-section-title">
          <span className="status-icon">
            <i 
              className={`fas ${completed ? 'fa-check-circle' : 'fa-circle'}`} 
              style={{ color: completed ? '#10b981' : '#6b7280' }}
            />
          </span>
          <span>{label}</span>
        </div>
        <div className="photo-section-actions">
          <span 
            className="photo-status-text" 
            style={completed ? { color: '#10b981', fontWeight: '500' } : {}}
          >
            {completed ? 'Complété' : 'À photographier'}
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
                
                <button 
                  className="btn btn-primary upload-photo-btn"
                  disabled={!selectedFile || uploadingPhoto}
                  onClick={onUploadPhoto}
                  style={{ marginTop: '10px' }}
                >
                  {uploadingPhoto ? 'Chargement...' : 'Valider la photo'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoAccordionItem;