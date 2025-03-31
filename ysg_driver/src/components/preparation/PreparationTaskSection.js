import React, { useState, useEffect, useCallback, useRef, memo } from 'react';

// Composant optimisé avec React.memo pour éviter les rendus inutiles
const PreparationTaskSection = memo(({ 
  preparation, taskType, expandedTask, onToggleTask, canEdit, 
  onStartTask, onCompleteTask, onAddTaskPhoto, onParkingTask,
  uploadingPhoto
}) => {
  // États pour les photos
  const [photoAfterFiles, setPhotoAfterFiles] = useState([]);
  const [photoAfterPreviews, setPhotoAfterPreviews] = useState([]);
  const [additionalPhotoFile, setAdditionalPhotoFile] = useState(null);
  const [additionalPhotoPreview, setAdditionalPhotoPreview] = useState(null);
  const [additionalPhotoDescription, setAdditionalPhotoDescription] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [refuelingAmount, setRefuelingAmount] = useState('');
  
  // Référence aux fichiers input
  const fileInputRefs = useRef({
    after1: null,
    after2: null,
    after3: null,
    additional: null
  });

  // Obtenir la tâche actuelle - c'est cette référence qui est utilisée partout
  const task = preparation.tasks[taskType] || { status: 'not_started', photos: { additional: [] } };
  const isExpanded = expandedTask === taskType;
  
  // Initialiser les tableaux de photos en fonction du type de tâche
  useEffect(() => {
    if (taskType === 'exteriorWashing') {
      setPhotoAfterFiles(Array(2).fill(null));
      setPhotoAfterPreviews(Array(2).fill(null));
    } else if (taskType === 'interiorCleaning') {
      setPhotoAfterFiles(Array(3).fill(null));
      setPhotoAfterPreviews(Array(3).fill(null));
    } else {
      setPhotoAfterFiles([null]);
      setPhotoAfterPreviews([null]);
    }
  }, [taskType]);
  
  // Nettoyer les URLs des aperçus quand le composant est démonté
  useEffect(() => {
    return () => {
      photoAfterPreviews.forEach(preview => {
        if (preview) URL.revokeObjectURL(preview);
      });
      
      if (additionalPhotoPreview) {
        URL.revokeObjectURL(additionalPhotoPreview);
      }
    };
  }, [photoAfterPreviews, additionalPhotoPreview]);
  
  // Gestion des photos optimisée avec useCallback
  const handlePhotoChange = useCallback((files, index = null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0]; // Prendre le premier fichier de la liste
    if (!file) return;
    
    // Si c'est une photo "after" avec un index spécifique
    if (index !== null) {
      setPhotoAfterFiles(prev => {
        const newFiles = [...prev];
        newFiles[index] = file;
        return newFiles;
      });
      
      setPhotoAfterPreviews(prev => {
        const newPreviews = [...prev];
        newPreviews[index] = URL.createObjectURL(file);
        return newPreviews;
      });
    } 
    // Si c'est une photo additionnelle
    else {
      setAdditionalPhotoFile(file);
      setAdditionalPhotoPreview(URL.createObjectURL(file));
    }
  }, []);
  
  // Actions par type de tâche
  const handleAction = useCallback({
    startTask: () => {
      onStartTask(taskType, taskNotes);
      setTaskNotes('');
    },
    
    completeTask: () => {
      const additionalData = { notes: taskNotes };
      
      if (taskType === 'refueling' && refuelingAmount) {
        additionalData.amount = refuelingAmount;
      }
      
      // Validations selon le type de tâche
      if (taskType === 'exteriorWashing') {
        if (!photoAfterFiles[0] || !photoAfterFiles[1]) {
          alert('Vous devez fournir les deux photos requises pour le lavage extérieur');
          return;
        }
        onCompleteTask(taskType, photoAfterFiles, additionalData);
      } 
      else if (taskType === 'interiorCleaning') {
        if (!photoAfterFiles[0] || !photoAfterFiles[1] || !photoAfterFiles[2]) {
          alert('Vous devez fournir les trois photos requises pour le nettoyage intérieur');
          return;
        }
        onCompleteTask(taskType, photoAfterFiles, additionalData);
      } 
      else {
        onCompleteTask(taskType, photoAfterFiles[0], additionalData);
      }
      
      // Réinitialiser les états
      setPhotoAfterFiles(taskType === 'exteriorWashing' ? Array(2).fill(null) : 
                         taskType === 'interiorCleaning' ? Array(3).fill(null) : [null]);
      setPhotoAfterPreviews(taskType === 'exteriorWashing' ? Array(2).fill(null) : 
                            taskType === 'interiorCleaning' ? Array(3).fill(null) : [null]);
      setTaskNotes('');
      setRefuelingAmount('');
    },
    
    addAdditionalPhoto: () => {
      onAddTaskPhoto(taskType, additionalPhotoFile, additionalPhotoDescription);
      setAdditionalPhotoFile(null);
      setAdditionalPhotoPreview(null);
      setAdditionalPhotoDescription('');
    },
    
    parkingTask: () => {
      onParkingTask(taskType, photoAfterFiles[0], taskNotes);
      setPhotoAfterFiles([null]);
      setPhotoAfterPreviews([null]);
      setTaskNotes('');
    }
  }, [taskType, taskNotes, photoAfterFiles, refuelingAmount, additionalPhotoFile, additionalPhotoDescription, onStartTask, onCompleteTask, onAddTaskPhoto, onParkingTask]);

  // Labels des tâches et statuts (définis en dehors du rendu pour éviter les recréations)
  const labels = {
    tasks: {
      exteriorWashing: 'Lavage extérieur',
      interiorCleaning: 'Nettoyage intérieur',
      refueling: 'Mise de carburant',
      parking: 'Stationnement'
    },
    status: {
      not_started: 'Non commencée',
      in_progress: 'En cours',
      completed: 'Terminée'
    },
    photoDescriptions: {
      exteriorWashing: [
        '3/4 avant du véhicule',
        '3/4 arrière en diagonale'
      ],
      interiorCleaning: [
        'Intérieur avant',
        'Intérieur arrière',
        'Coffre'
      ]
    }
  };

  // Helper pour obtenir le nombre de photos requises selon le type de tâche
  const getRequiredPhotosCount = useCallback((type) => {
    switch(type) {
      case 'exteriorWashing': return 2;
      case 'interiorCleaning': return 3;
      default: return 1;
    }
  }, []);
  
  // Trigger pour ouvrir le sélecteur de fichier
  const triggerFileInput = useCallback((refName) => {
    if (fileInputRefs.current[refName]) {
      fileInputRefs.current[refName].click();
    }
  }, []);

  // Fonction pour le rendu des inputs de photos optimisée avec useCallback
  const renderPhotoInputs = useCallback(() => {
    const requiredPhotos = getRequiredPhotosCount(taskType);
    
    if (taskType === 'exteriorWashing' || taskType === 'interiorCleaning') {
      const photoDescriptions = labels.photoDescriptions[taskType] || [];
      
      return (
        <div className="task-photo-multiple">
          <p className="photo-requirement-text">
            Cette tâche nécessite {requiredPhotos} photos différentes pour être validée:
          </p>
          
          {Array.from({ length: requiredPhotos }).map((_, index) => (
            <div key={index} className="photo-upload-item">
              <div className="photo-upload-header">
                <span className="photo-number">Photo {index + 1}</span>
                <span className="photo-description">{photoDescriptions[index] || `Photo ${index + 1}`}</span>
              </div>
              
              <div className="photo-upload-content">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoChange(e.target.files, index)}
                  style={{ display: 'none' }}
                  ref={el => fileInputRefs.current[`after${index + 1}`] = el}
                />
                
                <div 
                  className="photo-upload-area" 
                  onClick={() => triggerFileInput(`after${index + 1}`)}
                >
                  {photoAfterPreviews[index] ? (
                    <div className="photo-preview-container">
                      <img 
                        src={photoAfterPreviews[index]} 
                        alt={`Aperçu ${index + 1}`}
                        className="photo-preview-image" 
                      />
                      <button className="photo-replace-btn" onClick={(e) => {
                        e.stopPropagation();
                        triggerFileInput(`after${index + 1}`);
                      }}>
                        <i className="fas fa-sync-alt"></i> Remplacer
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="photo-upload-icon">
                        <i className="fas fa-camera"></i>
                      </div>
                      <span className="photo-upload-text">
                        Cliquez pour prendre la photo {index + 1}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      // Pour les tâches qui ne nécessitent qu'une photo (refueling, parking)
      return (
        <div className="task-photo-upload">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handlePhotoChange(e.target.files, 0)}
            className="form-input"
          />
          
          {photoAfterPreviews[0] && (
            <div className="photo-preview-container">
              <div className="photo-preview">
                <img src={photoAfterPreviews[0]} alt="Prévisualisation" />
              </div>
            </div>
          )}
        </div>
      );
    }
  }, [taskType, photoAfterPreviews, handlePhotoChange, triggerFileInput, getRequiredPhotosCount]);

  console.log(`RENDER ${taskType}: status=${task.status}, expanded=${isExpanded}, startedAt=${!!task.startedAt}`);

  return (
    <div className="task-card">
      <div 
        className={`task-header ${isExpanded ? 'expanded' : ''}`} 
        onClick={() => onToggleTask(taskType)}
      >
        <h3 className="task-title">{labels.tasks[taskType] || 'Tâche inconnue'}</h3>
        <div className="task-header-info">
          <span className={`task-status ${task.status}`}>{labels.status[task.status] || 'Statut inconnu'}</span>
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
        </div>
      </div>
      
      {isExpanded && (
        <div className="task-content show-task-content">
          {/* Métadonnées de la tâche si disponibles */}
          {task.startedAt && (
            <div className="task-info">
              <i className="fas fa-clock"></i> Commencée: {new Date(task.startedAt).toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </div>
          )}
          
          {task.completedAt && (
            <div className="task-info">
              <i className="fas fa-check-circle"></i> Terminée: {new Date(task.completedAt).toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </div>
          )}
          
          {taskType === 'refueling' && task.amount && (
            <div className="task-info"><i className="fas fa-gas-pump"></i> Quantité: {task.amount} L</div>
          )}
          
          {task.notes && <div className="task-notes"><strong>Notes:</strong> {task.notes}</div>}
          
          {/* Photos existantes */}
          {(task.photos?.before || task.photos?.after || (task.photos?.additional && task.photos.additional.length > 0)) && (
            <div className="task-photos-section">
              <h4 className="photos-section-title">Photos de la tâche</h4>
              
              <div className="task-photos">
                {task.photos?.before && (
                  <div className="photo-container">
                    <div className="photo-header">Photo avant</div>
                    <img src={task.photos.before.url} alt="Avant" className="photo-image" 
                      onClick={() => window.open(task.photos.before.url, '_blank')} />
                    <div className="photo-timestamp">
                      {new Date(task.photos.before.timestamp).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}
                
                {task.photos?.after && (
                  <div className="photo-container">
                    <div className="photo-header">Photo après</div>
                    <img src={task.photos.after.url} alt="Après" className="photo-image" 
                      onClick={() => window.open(task.photos.after.url, '_blank')} />
                    <div className="photo-timestamp">
                      {new Date(task.photos.after.timestamp).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Photos additionnelles */}
              {task.photos?.additional && task.photos.additional.length > 0 && (
                <div className="additional-photos">
                  <div className="additional-photos-title">
                    Photos additionnelles ({task.photos.additional.length})
                  </div>
                  <div className="additional-photos-grid">
                    {task.photos.additional.map((photo, index) => (
                      <div key={index} className="additional-photo-item">
                        <img src={photo.url} alt={`Photo additionnelle ${index + 1}`} 
                          className="additional-photo-img" onClick={() => window.open(photo.url, '_blank')} />
                        {photo.description && (
                          <div className="additional-photo-description">{photo.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Actions conditionnelles - Utiliser directement task.status pour les conditions */}
          {canEdit && preparation.status !== 'completed' && (
            <div className="task-actions">
              {/* Démarrer une tâche - Uniquement si non commencée */}
              {task.status === 'not_started' && taskType !== 'parking' && (
                <div className="task-step">
                  <div className="task-step-header">
                    <span className="step-number">1</span>
                    <span>Commencer {labels.tasks[taskType].toLowerCase()}</span>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Notes (optionnel)</label>
                    <textarea 
                      value={taskNotes} 
                      onChange={(e) => setTaskNotes(e.target.value)}
                      className="form-textarea" 
                      placeholder="Observations..." 
                    />
                  </div>
                  
                  <button 
                    onClick={handleAction.startTask} 
                    className="btn btn-primary"
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? 'Traitement...' : `Commencer ${labels.tasks[taskType].toLowerCase()}`}
                  </button>
                </div>
              )}
              
              {/* Section pour terminer une tâche - SIMPLIFIÉE ET FORCÉE */}
              {isExpanded && task.status === 'in_progress' && (
                <div className="task-step">
                  <div className="task-step-header">
                    <span className="step-number">2</span>
                    <span>Terminer {labels.tasks[taskType].toLowerCase()}</span>
                  </div>
                  
                  {/* Contenu du formulaire d'upload... */}
                  <p className="task-requirements">
                    Prenez {taskType === 'exteriorWashing' ? '2 photos' : 
                          taskType === 'interiorCleaning' ? '3 photos' : 
                          'une photo'} pour documenter le travail effectué.
                  </p>
                  
                  {renderPhotoInputs()}
                  
                  {/* Champ spécifique pour la quantité de carburant */}
                  {taskType === 'refueling' && (
                    <div className="form-group">
                      <label className="form-label">Quantité de carburant (litres) *</label>
                      <input 
                        type="number" 
                        value={refuelingAmount} 
                        onChange={(e) => setRefuelingAmount(e.target.value)}
                        className="form-input" 
                        step="0.01" 
                        min="0" 
                        placeholder="Ex: 45.5" 
                        required 
                      />
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label className="form-label">Notes (optionnel)</label>
                    <textarea 
                      value={taskNotes} 
                      onChange={(e) => setTaskNotes(e.target.value)}
                      className="form-textarea" 
                      placeholder="Observations..." 
                    />
                  </div>
                  
                  <button 
                    onClick={handleAction.completeTask} 
                    className="btn btn-success"
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? 'Traitement...' : `Terminer ${labels.tasks[taskType].toLowerCase()}`}
                  </button>
                </div>
              )}
              
              {/* Cas spécial: Stationnement */}
              {taskType === 'parking' && task.status === 'not_started' && (
                <div className="task-step">
                  <div className="task-step-header">
                    <span className="step-number">1</span>
                    <span>Valider le stationnement</span>
                  </div>
                  
                  <p className="task-requirements">
                    Prenez une photo du véhicule garé correctement pour valider cette tâche.
                  </p>
                  
                  <div className="task-photo-upload">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoChange(e.target.files, 0)}
                      className="form-input"
                    />
                    
                    {photoAfterPreviews[0] && (
                      <div className="photo-preview-container">
                        <div className="photo-preview">
                          <img src={photoAfterPreviews[0]} alt="Prévisualisation stationnement" />
                        </div>
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label className="form-label">Notes (optionnel)</label>
                      <textarea 
                        value={taskNotes} 
                        onChange={(e) => setTaskNotes(e.target.value)}
                        className="form-textarea" 
                        placeholder="Observations..." 
                      />
                    </div>
                    
                    <button 
                      onClick={handleAction.parkingTask} 
                      className="btn btn-success"
                      disabled={!photoAfterFiles[0] || uploadingPhoto}
                    >
                      {uploadingPhoto ? 'Traitement...' : 'Valider le stationnement'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Ajout de photos additionnelles - Disponible pour les tâches en cours ou terminées */}
              {(task.status === 'in_progress' || task.status === 'completed') && (
                <div className="task-step">
                  <div className="task-step-header">
                    <span className="step-number">+</span>
                    <span>Ajouter une photo additionnelle (optionnel)</span>
                  </div>
                  
                  <div className="task-photo-upload">
                    <input 
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoChange(e.target.files)}
                      style={{ display: 'none' }}
                      ref={el => fileInputRefs.current.additional = el}
                    />
                    
                    <div 
                      className="photo-upload-area" 
                      onClick={() => triggerFileInput('additional')}
                    >
                      {additionalPhotoPreview ? (
                        <div className="photo-preview-container">
                          <img 
                            src={additionalPhotoPreview} 
                            alt="Aperçu photo additionnelle"
                            className="photo-preview-image" 
                          />
                          <button className="photo-replace-btn" onClick={(e) => {
                            e.stopPropagation();
                            triggerFileInput('additional');
                          }}>
                            <i className="fas fa-sync-alt"></i> Remplacer
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="photo-upload-icon">
                            <i className="fas fa-camera"></i>
                          </div>
                          <span className="photo-upload-text">
                            Cliquez pour ajouter une photo
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input 
                        type="text" 
                        value={additionalPhotoDescription}
                        onChange={(e) => setAdditionalPhotoDescription(e.target.value)}
                        className="form-input" 
                        placeholder="Description de la photo..." 
                      />
                    </div>
                    
                    <button 
                      onClick={handleAction.addAdditionalPhoto} 
                      className="btn btn-photo"
                      disabled={!additionalPhotoFile || uploadingPhoto}
                    >
                      {uploadingPhoto ? 'Traitement...' : 'Ajouter la photo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Définir un nom pour le composant (utile pour les outils de développement)
PreparationTaskSection.displayName = 'PreparationTaskSection';

export default PreparationTaskSection;