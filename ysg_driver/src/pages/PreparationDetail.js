import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import preparationService from '../services/preparationService';
import Navigation from '../components/Navigation';
import PreparationInfoSection from '../components/preparation/PreparationInfoSection';
import PreparationTaskSection from '../components/preparation/PreparationTaskSection';
import PreparationDatesSection from '../components/preparation/PreparationDatesSection';
import PreparationActions from '../components/preparation/PreparationActions';
import NotesSection from '../components/movement/NotesSection';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AlertMessage from '../components/ui/AlertMessage';
import '../styles/PreparationDetail.css';

const PreparationDetail = () => {
  const { id } = useParams();
  const [preparation, setPreparation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [notes, setNotes] = useState('');
  const [expandedTask, setExpandedTask] = useState(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const initialLoadDone = useRef(false);
  const isUnmounted = useRef(false);

  // Liste des types de tâches
  const taskTypes = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];

  // Chargement initial de la préparation
  const loadPreparation = useCallback(async () => {
    if (isUnmounted.current) return;
    
    try {
      setLoading(true);
      const data = await preparationService.getPreparation(id);
      
      if (isUnmounted.current) return;
      
      setPreparation(data);
      if (data.notes && !notes) setNotes(data.notes);
      setLoading(false);
      initialLoadDone.current = true;
    } catch (err) {
      console.error('Erreur:', err);
      if (!isUnmounted.current) {
        setError('Erreur lors du chargement des détails');
        setLoading(false);
      }
    }
  }, [id, notes]);

  // Chargement initial des données avec cleanup
  useEffect(() => {
    isUnmounted.current = false;
    
    if (!initialLoadDone.current) {
      loadPreparation();
    }
    
    return () => {
      isUnmounted.current = true;
    };
  }, [loadPreparation]);

  // Fonctions pour les tâches
  const toggleTaskExpansion = (taskType) => setExpandedTask(expandedTask === taskType ? null : taskType);

  // Trouve et ouvre la prochaine tâche non complétée
  const openNextTask = useCallback(() => {
    if (!preparation) return;
    
    // Déterminer l'index de la tâche actuelle
    const currentIndex = taskTypes.indexOf(expandedTask);
    
    // Trouver la prochaine tâche non complétée
    let nextTask = null;
    
    // Commencer par chercher après la tâche actuelle
    for (let i = currentIndex + 1; i < taskTypes.length; i++) {
      const taskType = taskTypes[i];
      const task = preparation.tasks[taskType] || { status: 'not_started' };
      
      if (task.status !== 'completed') {
        nextTask = taskType;
        break;
      }
    }
    
    // Si aucune tâche non complétée n'a été trouvée après la tâche actuelle,
    // chercher depuis le début
    if (!nextTask && currentIndex > 0) {
      for (let i = 0; i < currentIndex; i++) {
        const taskType = taskTypes[i];
        const task = preparation.tasks[taskType] || { status: 'not_started' };
        
        if (task.status !== 'completed') {
          nextTask = taskType;
          break;
        }
      }
    }
    
    // Ouvrir la prochaine tâche si une a été trouvée
    if (nextTask) {
      setExpandedTask(nextTask);
    } else {
      // Toutes les tâches sont complétées, fermer l'accordéon
      setExpandedTask(null);
    }
  }, [preparation, expandedTask, taskTypes]);

  // Version optimisée pour traiter les actions de tâche - AVEC MISE À JOUR DIRECTE DEPUIS LA RÉPONSE API
  const handleTaskAction = async (action, taskType, data, additionalData = {}) => {
    if (taskLoading) return;
    
    try {
      setTaskLoading(true);
      setError(null);
      
      // Validation spécifique pour chaque type de tâche
      if (action === 'completeTask') {
        // Vérifier les exigences de photos multiples selon le type de tâche
        if (taskType === 'exteriorWashing' && (!data || data.length !== 2)) {
          setError('Pour le lavage extérieur, vous devez fournir exactement 2 photos (3/4 avant et 3/4 arrière)');
          setTaskLoading(false);
          return;
        }
        
        if (taskType === 'interiorCleaning' && (!data || data.length !== 3)) {
          setError('Pour le nettoyage intérieur, vous devez fournir 3 photos (avant, arrière et coffre)');
          setTaskLoading(false);
          return;
        }
        
        // Pour les autres types de tâches, vérifier qu'au moins une photo est fournie
        if ((taskType === 'refueling' || taskType === 'parking') && !data) {
          setError(`Vous devez prendre une photo pour terminer la tâche ${taskType}`);
          setTaskLoading(false);
          return;
        }
      }
      
      let result;
      
      switch(action) {
        case 'startTask':
          // Démarrage sans photo spécifique requise
          result = await preparationService.startTask(id, taskType, data);
          // Mettre à jour la préparation avec celle retournée par l'API
          if (result && result.preparation) {
            setPreparation(result.preparation);
            if (result.preparation.notes) setNotes(result.preparation.notes);
          }
          break;
          
        case 'completeTask':
          // Traitement optimisé pour photos multiples avec upload parallèle
          switch(taskType) {
            case 'exteriorWashing':
            case 'interiorCleaning':
              // Upload parallèle des photos avec S3 direct
              result = await preparationService.uploadBatchTaskPhotosWithDirectS3(
                id,
                taskType,
                data,
                Array(data.length).fill('after'), // Toutes les photos sont "after"
                additionalData
              );
              // Mettre à jour la préparation avec celle retournée par l'API
              if (result && result.preparation) {
                setPreparation(result.preparation);
                if (result.preparation.notes) setNotes(result.preparation.notes);
                
                // Après avoir terminé la tâche, fermer l'accordéon et ouvrir le suivant
                setTimeout(() => {
                  if (!isUnmounted.current) {
                    setExpandedTask(null);
                  }
                }, 1000);
              }
              break;
              
            case 'refueling':
            case 'parking':
              // Méthode standard pour des tâches avec une seule photo
              result = await preparationService.completeTaskWithDirectS3(id, taskType, data, additionalData);
              // Mettre à jour la préparation avec celle retournée par l'API
              if (result && result.preparation) {
                setPreparation(result.preparation);
                if (result.preparation.notes) setNotes(result.preparation.notes);
                
                // Après avoir terminé la tâche, fermer l'accordéon et ouvrir le suivant
                setTimeout(() => {
                  if (!isUnmounted.current) {
                    setExpandedTask(null);
                  }
                }, 1000);
              }
              break;
          }
          break;
          
        case 'addTaskPhoto':
          if (!data) {
            setError('Veuillez sélectionner une photo');
            setTaskLoading(false);
            return;
          }
          // Utiliser S3 direct pour de meilleures performances
          result = await preparationService.addTaskPhotoWithDirectS3(id, taskType, data, additionalData);
          // Mettre à jour la préparation avec celle retournée par l'API
          if (result && result.preparation) {
            setPreparation(result.preparation);
            if (result.preparation.notes) setNotes(result.preparation.notes);
          }
          break;
          
        case 'parkingTask':
          // Stationnement en une étape (toujours avec photo)
          if (!data) {
            setError('Vous devez prendre une photo pour valider le stationnement');
            setTaskLoading(false);
            return;
          }
          
          // Démarrer la tâche
          result = await preparationService.startTask(id, 'parking');
          
          // Compléter la tâche
          if (result) {
            result = await preparationService.completeTaskWithDirectS3(id, 'parking', data, { notes: additionalData });
            
            // Mettre à jour la préparation avec celle retournée par l'API
            if (result && result.preparation) {
              setPreparation(result.preparation);
              if (result.preparation.notes) setNotes(result.preparation.notes);
              
              // Après avoir terminé la tâche, fermer l'accordéon et ouvrir le suivant
              setTimeout(() => {
                if (!isUnmounted.current) {
                  setExpandedTask(null);
                }
              }, 1000);
            }
          }
          break;
      }
      
      // Utiliser une notification temporaire
      setSuccess(`Action effectuée avec succès`);
      
      // Effacer le message de succès après un délai
      const timer = setTimeout(() => {
        if (!isUnmounted.current) setSuccess(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Erreur:', err);
      if (!isUnmounted.current) {
        setError(err.response?.data?.message || 'Erreur lors de l\'action');
      }
    } finally {
      if (!isUnmounted.current) {
        setTaskLoading(false);
      }
    }
  };

  // Terminer la préparation
  const handleCompletePreparation = async () => {
    try {
      setLoading(true);
      const result = await preparationService.completePreparation(id, { notes });
      
      if (!isUnmounted.current) {
        // Utiliser directement la préparation retournée par l'API
        if (result && result.preparation) {
          setPreparation(result.preparation);
        }
        
        setSuccess('Préparation terminée avec succès');
        
        // Navigation après un délai
        setTimeout(() => {
          if (!isUnmounted.current) {
            setSuccess(null);
            navigate('/preparations');
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Erreur:', err);
      if (!isUnmounted.current) {
        setError('Erreur lors de la finalisation');
        setLoading(false);
      }
    }
  };

  // Permissions - Optimisé avec mémoisation
  const canEdit = useCallback(() => {
    if (!preparation || !currentUser) return false;
    return (preparation.userId && preparation.userId._id === currentUser._id) || currentUser.role === 'admin';
  }, [preparation, currentUser]);

  // Vérifier si au moins une tâche est complétée
  const hasCompletedTasks = useCallback(() => {
    if (!preparation) return false;
    return Object.values(preparation.tasks).some(task => task.status === 'completed');
  }, [preparation]);

  // Obtenir l'URL d'une photo
  const getPhotoUrlByType = useCallback((taskType, photoType) => {
    if (!preparation?.tasks[taskType]?.photos) return '';
    const photo = preparation.tasks[taskType].photos[photoType];
    return photo?.url || '';
  }, [preparation]);

  // Affichages conditionnels
  if (loading && !preparation) return (
    <div>
      <Navigation />
      <div className="loading-container">
        <LoadingSpinner />
      </div>
    </div>
  );
  
  if (error && !preparation) {
    return (
      <div>
        <Navigation />
        <div className="preparation-detail-container">
          <AlertMessage type="error" message={error || 'Préparation non trouvée'} />
          <div className="back-button-container">
            <button onClick={() => navigate('/preparations')} className="btn btn-primary">
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      <div className="preparation-detail-container">
        <div className="detail-header">
          <h1 className="detail-title">Détails de la préparation</h1>
          <Link to="/preparations" className="back-link">
            <i className="fas fa-arrow-left"></i> Retour à la liste
          </Link>
        </div>
        
        {error && (
          <AlertMessage 
            type="error" 
            message={error} 
            onDismiss={() => setError(null)}
          />
        )}
        
        {success && (
          <AlertMessage 
            type="success" 
            message={success} 
            onDismiss={() => setSuccess(null)}
          />
        )}
        
        <div className="detail-card">
          <PreparationInfoSection preparation={preparation} />
          
          <div className="detail-section tasks-section">
            <h2 className="section-title">
              <i className="fas fa-tasks"></i> Tâches de préparation
            </h2>
            <div className="task-grid">
              {taskTypes.map(taskType => (
                <PreparationTaskSection
                  key={taskType}
                  preparation={preparation}
                  taskType={taskType}
                  expandedTask={expandedTask}
                  onToggleTask={toggleTaskExpansion}
                  canEdit={canEdit()}
                  onStartTask={(type, photo, notes) => handleTaskAction('startTask', type, photo, notes)}
                  onCompleteTask={(type, photos, data) => handleTaskAction('completeTask', type, photos, data)}
                  onAddTaskPhoto={(type, photo, desc) => handleTaskAction('addTaskPhoto', type, photo, desc)}
                  onParkingTask={(type, photo, notes) => handleTaskAction('parkingTask', type, photo, notes)}
                  uploadingPhoto={taskLoading}
                  getPhotoUrlByType={getPhotoUrlByType}
                />
              ))}
            </div>
          </div>
          
          <NotesSection
            notes={notes}
            onChange={setNotes}
            readOnly={preparation.status === 'completed' || !canEdit()}
          />
          
          <PreparationDatesSection preparation={preparation} />
          
          <PreparationActions
            preparation={preparation}
            canEdit={canEdit()}
            loading={loading}
            hasCompletedTasks={hasCompletedTasks()}
            onCompletePreparation={handleCompletePreparation}
            navigateBack={() => navigate('/preparations')}
          />
        </div>
      </div>
    </div>
  );
};

export default PreparationDetail;