import React, { useState } from 'react';

const PhotosDisplaySection = ({ movement, title, photoType }) => {
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  
  // Ne rien afficher s'il n'y a pas de photos
  if (!movement || !movement.photos || movement.photos.length === 0) {
    return null;
  }
  
  // Filtrer les photos par type (départ ou arrivée)
  const photos = movement.photos.filter(photo => 
    !photo.photoType || photo.photoType === photoType
  );
  
  if (photos.length === 0) {
    return null;
  }

  // Grouper les photos par type
  const photosByType = {
    front: photos.find(p => p.type === 'front'),
    passenger: photos.find(p => p.type === 'passenger'),
    driver: photos.find(p => p.type === 'driver'),
    rear: photos.find(p => p.type === 'rear'),
    windshield: photos.find(p => p.type === 'windshield'),
    roof: photos.find(p => p.type === 'roof'),
    meter: photos.find(p => p.type === 'meter'),
    others: photos.filter(p => p.type === 'other' || p.type === 'damage')
  };

  // Titres pour chaque type de photo
  const photoTitles = {
    front: 'Face avant',
    passenger: 'Côté passager',
    driver: 'Côté conducteur',
    rear: 'Face arrière',
    windshield: 'Pare-brise',
    roof: 'Toit',
    meter: 'Compteur',
    others: 'Autres photos'
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
                          onClick={() => setFullscreenPhoto(otherPhoto)}
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
                    onClick={() => setFullscreenPhoto(photo)}
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
        <div className="fullscreen-photo-modal" onClick={() => setFullscreenPhoto(null)}>
          <div className="fullscreen-photo-content">
            <img src={fullscreenPhoto.url} alt="Photo en plein écran" />
            <button className="close-fullscreen-btn" onClick={() => setFullscreenPhoto(null)}>×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotosDisplaySection;