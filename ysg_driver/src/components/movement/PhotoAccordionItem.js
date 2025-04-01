import React, { useState, useEffect, useCallback, useMemo } from 'react';

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
  localPreviewOnly = false
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

  // Les styles communs mémorisés pour éviter de les recréer à chaque rendu
  const styles = useMemo(() => ({
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
  }), []);

  // Déterminer le style de la section en fonction de l'état - mémorisé
  const sectionStyle = useMemo(() => {
    if (completed) return styles.completedSection;
    if (selectedFile && localPreviewOnly) return styles.photoReady;
    return {};
  }, [completed, selectedFile, localPreviewOnly, styles]);

  // Gestionnaires d'événements mémorisés
  const handleToggle = useCallback(() => {
    onToggle();
  }, [onToggle]);

  const handleSelectFile = useCallback((e) => {
    if (e.target.files?.[0]) {
      onSelectPhoto(e.target.files[0]);
    }
  }, [onSelectPhoto]);

  const handleResetStatus = useCallback((e) => {
    e.stopPropagation();
    onResetStatus();
  }, [onResetStatus]);

  // Mémoriser les statuts et styles conditionnels
  const { statusText, statusStyle, iconClass, iconStyle } = useMemo(() => {
    if (completed) {
      return {
        statusText: 'Uploadée',
        statusStyle: { color: '#10b981', fontWeight: '500' },
        iconClass: 'fa-check-circle',
        iconStyle: { color: '#10b981' }
      };
    } else if (selectedFile && localPreviewOnly) {
      return {
        statusText: 'Prête',
        statusStyle: { color: '#3b82f6', fontWeight: '500' },
        iconClass: 'fa-camera',
        iconStyle: { color: '#3b82f6' }
      };
    } else {
      return {
        statusText: 'À photographier',
        statusStyle: {},
        iconClass: 'fa-circle',
        iconStyle: { color: '#6b7280' }
      };
    }
  }, [completed, selectedFile, localPreviewOnly]);

  // Mémoriser les styles des headers
  const headerStyle = useMemo(() => {
    if (completed) {
      return { backgroundColor: '#d1fae5' };
    } else if (selectedFile && localPreviewOnly) {
      return { backgroundColor: '#dbeafe' };
    } else {
      return {};
    }
  }, [completed, selectedFile, localPreviewOnly]);

  return (
    <div 
      className="photo-accordion-item" 
      style={sectionStyle}
    >
      <div 
        className={`photo-accordion-header ${completed ? 'completed' : ''} ${selectedFile && localPreviewOnly ? 'photo-ready' : ''}`} 
        onClick={handleToggle}
        style={headerStyle}
      >
        <div className="photo-section-title">
          <span className="status-icon">
            <i 
              className={`fas ${iconClass}`}
              style={iconStyle}
            />
          </span>
          <span>{label}</span>
        </div>
        <div className="photo-section-actions">
          <span 
            className="photo-status-text"
            style={statusStyle}
          >
            {statusText}
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
                onClick={handleResetStatus}
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
                  onChange={handleSelectFile}
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

// Utiliser React.memo pour éviter les re-rendus inutiles
export default React.memo(PhotoAccordionItem);