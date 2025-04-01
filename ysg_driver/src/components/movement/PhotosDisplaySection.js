import React, { useState, useCallback, useMemo } from 'react';

const PhotosDisplaySection = ({ movement, title, photoType }) => {
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  
  // Callback pour ouvrir une photo en plein écran
  const openFullscreen = useCallback((photo) => {
    setFullscreenPhoto(photo);
  }, []);
  
  // Callback pour fermer la photo en plein écran
  const closeFullscreen = useCallback(() => {
    setFullscreenPhoto(null);
  }, []);
  
  // Formater la date - mémoriser pour éviter les calculs répétés
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Organiser les photos par type - mémorisé pour éviter le recalcul
  const { photos, photosByType } = useMemo(() => {
    // Ne rien afficher s'il n'y a pas de photos
    if (!movement || !movement.photos || movement.photos.length === 0) {
      return { photos: [], photosByType: {} };
    }
    
    // Filtrer les photos par type (départ ou arrivée)
    const filteredPhotos = movement.photos.filter(photo => 
      !photo.photoType || photo.photoType === photoType
    );
    
    if (filteredPhotos.length === 0) {
      return { photos: [], photosByType: {} };
    }

    // Récupérer les photos par type avec une seule boucle
    const photoGroups = {
      front: null,
      passenger: null,
      driver: null,
      rear: null,
      windshield: null,
      roof: null,
      meter: null,
      others: []
    };
    
    for (const photo of filteredPhotos) {
      if (['front', 'passenger', 'driver', 'rear', 'windshield', 'roof', 'meter'].includes(photo.type)) {
        photoGroups[photo.type] = photo;
      } else {
        photoGroups.others.push(photo);
      }
    }
    
    return { photos: filteredPhotos, photosByType: photoGroups };
  }, [movement, photoType]);

  // Mémoriser les titres par type de photo
  const photoTitles = useMemo(() => ({
    front: 'Face avant',
    passenger: 'Côté passager',
    driver: 'Côté conducteur',
    rear: 'Face arrière',
    windshield: 'Pare-brise',
    roof: 'Toit',
    meter: 'Compteur',
    others: 'Autres photos'
  }), []);

  // Ne pas rendre le composant s'il n'y a pas de photos
  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="detail-section photos-display-section">
      <h2 className="section-title">
        <i className="fas fa-camera"></i> {title || `Photos ${photoType === 'arrival' ? 'd\'arrivée' : 'de départ'}`}
      </h2>
      
      <div className="photos-grid">
        {Object.entries(photosByType).map(([type, photo]) => {
          // Ignorer les types sans photo
          if (!photo && type !== 'others') return null;
          
          // Traiter les "autres photos" différemment
          if (type === 'others') {
            if (photosByType.others.length === 0) return null;
            
            return (
              <div key={type} className="photo-category">
                <h3 className="photo-category-title">{photoTitles[type]}</h3>
                <div className="others-photos-grid">
                  {photosByType.others.map((otherPhoto, index) => (
                    <div key={index} className="photo-item">
                      <div className="photo-container">
                        <img 
                          src={otherPhoto.url} 
                          alt={`Autre photo ${index + 1}`} 
                          className="photo-image"
                          onClick={() => openFullscreen(otherPhoto)}
                          loading="lazy" // Ajouter loading lazy pour optimiser le chargement
                        />
                      </div>
                      <div className="photo-info">
                        <span className="photo-timestamp">{formatDate(otherPhoto.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          
          // Afficher les photos principales
          return (
            <div key={type} className="photo-category">
              <h3 className="photo-category-title">{photoTitles[type]}</h3>
              <div className="photo-item">
                <div className="photo-container">
                  <img 
                    src={photo.url} 
                    alt={photoTitles[type]} 
                    className="photo-image"
                    onClick={() => openFullscreen(photo)}
                    loading="lazy" // Ajouter loading lazy pour optimiser le chargement
                  />
                </div>
                <div className="photo-info">
                  <span className="photo-timestamp">{formatDate(photo.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal pour afficher les photos en plein écran */}
      {fullscreenPhoto && (
        <div className="fullscreen-photo-modal" onClick={closeFullscreen}>
          <div className="fullscreen-photo-content" onClick={e => e.stopPropagation()}>
            <img src={fullscreenPhoto.url} alt="Photo en plein écran" />
            <button className="close-fullscreen-btn" onClick={closeFullscreen}>×</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Utiliser React.memo pour éviter les re-rendus inutiles
export default React.memo(PhotosDisplaySection);