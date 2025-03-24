import React, { useState } from 'react';

const PreparationTaskSection = ({ 
  preparation, taskType, expandedTask, onToggleTask, canEdit, 
  onStartTask, onCompleteTask, onAddTaskPhoto, onParkingTask,
  uploadingPhoto, getPhotoUrlByType
}) => {
  const [photoBeforeFile, setPhotoBeforeFile] = useState(null);
  const [photoBeforePreview, setPhotoBeforePreview] = useState(null);
  const [photoAfterFile, setPhotoAfterFile] = useState(null);
  const [photoAfterPreview, setPhotoAfterPreview] = useState(null);
  const [additionalPhotoFile, setAdditionalPhotoFile] = useState(null);
  const [additionalPhotoPreview, setAdditionalPhotoPreview] = useState(null);
  const [additionalPhotoDescription, setAdditionalPhotoDescription] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [refuelingAmount, setRefuelingAmount] = useState('');

  // Gestion des photos
  const handlePhotoChange = (file, setFile, setPreview) => {
    if (file) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Actions par type
  const handleAction = {
    startTask: () => {
      onStartTask(taskType, photoBeforeFile, taskNotes);
      setPhotoBeforeFile(null);
      setPhotoBeforePreview(null);
      setTaskNotes('');
    },
    completeTask: () => {
      const additionalData = { notes: taskNotes };
      if (taskType === 'refueling' && refuelingAmount) {
        additionalData.amount = refuelingAmount;
      }
      onCompleteTask(taskType, photoAfterFile, additionalData);
      setPhotoAfterFile(null);
      setPhotoAfterPreview(null);
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
      onParkingTask(taskType, photoAfterFile, taskNotes);
      setPhotoAfterFile(null);
      setPhotoAfterPreview(null);
      setTaskNotes('');
    }
  };

  // Labels des tâches et statuts
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
    }
  };

  const task = preparation.tasks[taskType] || { status: 'not_started' };
  const isExpanded = expandedTask === taskType;

  return (
    <div className="task-card">
      <div className={`task-header ${isExpanded ? 'expanded' : ''}`} onClick={() => onToggleTask(taskType)}>
        <h3 className="task-title">{labels.tasks[taskType] || 'Tâche inconnue'}</h3>
        <div className="task-header-info">
          <span className={`task-status ${task.status}`}>{labels.status[task.status] || 'Statut inconnu'}</span>
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
        </div>
      </div>
      
      {isExpanded && (
        <div className="task-content">
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
          {(task.photos?.before || task.photos?.after) && (
            <div className="task-photos">
              {task.photos.before && (
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
              
              {task.photos.after && (
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
          )}
          
          {/* Photos additionnelles */}
          {task.photos?.additional && task.photos.additional.length > 0 && (
            <div className="additional-photos">
              <div className="additional-photos-title">Photos additionnelles ({task.photos.additional.length})</div>
              <div className="additional-photos-grid">
                {task.photos.additional.map((photo, index) => (
                  <div key={index} className="additional-photo-item">
                    <img src={photo.url} alt={`Photo additionnelle ${index + 1}`} 
                      className="additional-photo-img" onClick={() => window.open(photo.url, '_blank')} />
                    {photo.description && <div className="additional-photo-description">{photo.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions disponibles selon l'état */}
          {canEdit && preparation.status !== 'completed' && (
            <div className="task-actions">
              {/* Démarrer une tâche normale */}
              {task.status === 'not_started' && taskType !== 'parking' && (
                <div className="task-step">
                  <div className="task-step-header">
                    <span className="step-number">1</span>
                    <span>Commencer {labels.tasks[taskType].toLowerCase()}</span>
                  </div>
                  
                  <p>Prenez une photo de l'état initial avant de commencer la tâche.</p>
                  
                  <div className="task-photo-upload">
                    <input type="file" accept="image/*" capture="environment"
                      onChange={(e) => e.target.files?.[0] && handlePhotoChange(
                        e.target.files[0], setPhotoBeforeFile, setPhotoBeforePreview
                      )} className="form-input" />
                    
                    {photoBeforePreview && (
                      <div className="photo-preview-container">
                        <div className="photo-preview">
                          <img src={photoBeforePreview} alt="Prévisualisation avant" />
                        </div>
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label className="form-label">Notes (optionnel)</label>
                      <textarea value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)}
                        className="form-textarea" placeholder="Observations..." />
                    </div>
                    
                    <button onClick={handleAction.startTask} className="btn btn-primary"
                      disabled={!photoBeforeFile || uploadingPhoto}>
                      {uploadingPhoto ? 'Traitement...' : `Commencer ${labels.tasks[taskType].toLowerCase()}`}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Terminer une tâche normale */}
              {task.status === 'in_progress' && taskType !== 'parking' && (
                <div className="task-step">
                  <div className="task-step-header">
                    <span className="step-number">2</span>
                    <span>Terminer {labels.tasks[taskType].toLowerCase()}</span>
                  </div>
                  
                  <p>Prenez une photo pour documenter le travail effectué.</p>
                  
                  <div className="task-photo-upload">
                    <input type="file" accept="image/*" capture="environment"
                      onChange={(e) => e.target.files?.[0] && handlePhotoChange(
                        e.target.files[0], setPhotoAfterFile, setPhotoAfterPreview
                      )} className="form-input" />
                    
                    {photoAfterPreview && (
                      <div className="photo-preview-container">
                        <div className="photo-preview">
                          <img src={photoAfterPreview} alt="Prévisualisation après" />
                        </div>
                      </div>
                    )}
                    
                    {/* Champ spécifique pour la quantité de carburant */}
                    {taskType === 'refueling' && (
                      <div className="form-group">
                        <label className="form-label">Quantité de carburant (litres) *</label>
                        <input type="number" value={refuelingAmount} onChange={(e) => setRefuelingAmount(e.target.value)}
                          className="form-input" step="0.01" min="0" placeholder="Ex: 45.5" required />
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label className="form-label">Notes (optionnel)</label>
                      <textarea value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)}
                        className="form-textarea" placeholder="Observations..." />
                    </div>
                    
                    <button onClick={handleAction.completeTask} className="btn btn-success"
                      disabled={!photoAfterFile || (taskType === 'refueling' && !refuelingAmount) || uploadingPhoto}>
                      {uploadingPhoto ? 'Traitement...' : `Terminer ${labels.tasks[taskType].toLowerCase()}`}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Cas spécial: Stationnement */}
              {(!task || task.status === 'not_started') && taskType === 'parking' && (
                <div className="task-step">
                  <div className="task-step-header">
                    <span className="step-number">1</span>
                    <span>Valider le stationnement</span>
                  </div>
                  
                  <p>Prenez une photo du véhicule garé correctement pour valider cette tâche.</p>
                  
                  <div className="task-photo-upload">
                    <input type="file" accept="image/*" capture="environment"
                      onChange={(e) => e.target.files?.[0] && handlePhotoChange(
                        e.target.files[0], setPhotoAfterFile, setPhotoAfterPreview
                      )} className="form-input" />
                    
                    {photoAfterPreview && (
                      <div className="photo-preview-container">
                        <div className="photo-preview">
                          <img src={photoAfterPreview} alt="Prévisualisation stationnement" />
                        </div>
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label className="form-label">Notes (optionnel)</label>
                      <textarea value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)}
                        className="form-textarea" placeholder="Observations..." />
                    </div>
                    
                    <button onClick={handleAction.parkingTask} className="btn btn-success"
                      disabled={!photoAfterFile || uploadingPhoto}>
                      {uploadingPhoto ? 'Traitement...' : 'Valider le stationnement'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Ajout de photos additionnelles */}
              {(task.status === 'in_progress' || task.status === 'completed') && (
                <div className="task-step">
                  <div className="task-step-header">
                    <span className="step-number">+</span>
                    <span>Ajouter une photo additionnelle (optionnel)</span>
                  </div>
                  
                  <div className="task-photo-upload">
                    <input type="file" accept="image/*" capture="environment"
                      onChange={(e) => e.target.files?.[0] && handlePhotoChange(
                        e.target.files[0], setAdditionalPhotoFile, setAdditionalPhotoPreview
                      )} className="form-input" />
                    
                    {additionalPhotoPreview && (
                      <div className="photo-preview-container">
                        <div className="photo-preview">
                          <img src={additionalPhotoPreview} alt="Prévisualisation additionnelle" />
                        </div>
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input type="text" value={additionalPhotoDescription}
                        onChange={(e) => setAdditionalPhotoDescription(e.target.value)}
                        className="form-input" placeholder="Description de la photo..." />
                    </div>
                    
                    <button onClick={handleAction.addAdditionalPhoto} className="btn btn-photo"
                      disabled={!additionalPhotoFile || uploadingPhoto}>
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
};

export default PreparationTaskSection;