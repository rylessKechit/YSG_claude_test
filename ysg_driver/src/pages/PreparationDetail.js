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
  const [refreshKey, setRefreshKey] = useState(0); // Pour forcer le re-rendu des composants enfants
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
      console.error('Erreur lors du chargement des détails:', err);
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

  // Fonction pour basculer l'expansion des tâches
  const toggleTaskExpansion = useCallback((taskType) => {
    console.log(`Toggle task expansion: ${taskType}, current: ${expandedTask}`);
    setExpandedTask(prevTask => prevTask === taskType ? null : taskType);
  }, [expandedTask]);

  // Fonction optimisée pour traiter les actions de tâche
  const handleTaskAction = useCallback(async (action, taskType, data, additionalData = {}) => {
    if (taskLoading) return;
    
    try {
      setTaskLoading(true);
      setError(null);
      
      // Validation spécifique pour chaque type de tâche
      if (action === 'completeTask') {
        // Vérifier les exigences de photos multiples
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
          console.log(`Démarrage de la tâche ${taskType}`);
          result = await preparationService.startTask(id, taskType, data);
          
          if (result && result.preparation) {
            // Créer une copie profonde
            const updatedPreparation = JSON.parse(JSON.stringify(result.preparation));
            
            // Forcer un changement d'état immédiat et VISIBLE
            setPreparation(null); // Forcer un reset
            setTimeout(() => {
              setPreparation(updatedPreparation); // Rétablir avec les nouvelles données
              setRefreshKey(prev => prev + 1); // Forcer un remontage
              setExpandedTask(taskType); // Réouvrir immédiatement
            }, 10);
            
            if (result.preparation.notes) setNotes(result.preparation.notes);
          } else {
            console.log("Rechargement complet des données");
            await loadPreparation();
            
            // Forcer un rafraîchissement et garder l'accordion ouvert
            setRefreshKey(prev => prev + 1);
            setExpandedTask(taskType);
          }
          break;
          
        case 'completeTask':
          console.log(`Complétion de la tâche ${taskType}`);
          
          if (taskType === 'exteriorWashing' || taskType === 'interiorCleaning') {
            result = await preparationService.uploadBatchTaskPhotosWithDirectS3(
              id, taskType, data, Array(data.length).fill('after'), additionalData
            );
          } else {
            result = await preparationService.completeTaskWithDirectS3(id, taskType, data, additionalData);
          }
          
          if (result && result.preparation) {
            console.log(`Tâche ${taskType} complétée avec succès`);
            
            // Créer une copie profonde avec une nouvelle référence
            const updatedPreparation = JSON.parse(JSON.stringify(result.preparation));
            
            setPreparation(updatedPreparation);
            if (result.preparation.notes) setNotes(result.preparation.notes);
            
            // Forcer un rafraîchissement du composant
            setRefreshKey(prev => prev + 1);
          } else {
            console.log("Rechargement complet des données");
            await loadPreparation();
            setRefreshKey(prev => prev + 1);
          }
          break;
          
        case 'addTaskPhoto':
          console.log(`Ajout d'une photo additionnelle à la tâche ${taskType}`);
          
          result = await preparationService.addTaskPhotoWithDirectS3(id, taskType, data, additionalData);
          
          if (result && result.preparation) {
            console.log(`Photo ajoutée à la tâche ${taskType}`);
            
            // Créer une copie profonde avec une nouvelle référence
            const updatedPreparation = JSON.parse(JSON.stringify(result.preparation));
            
            setPreparation(updatedPreparation);
            
            // Forcer un rafraîchissement du composant
            setRefreshKey(prev => prev + 1);
          } else {
            console.log("Rechargement complet des données");
            await loadPreparation();
            setRefreshKey(prev => prev + 1);
          }
          break;
          
        case 'parkingTask':
          console.log("Traitement du stationnement");
          
          // 1. Démarrer la tâche
          result = await preparationService.startTask(id, 'parking');
          
          // 2. Compléter la tâche immédiatement
          if (result) {
            console.log("Stationnement démarré, complétion immédiate");
            
            result = await preparationService.completeTaskWithDirectS3(
              id, 'parking', data, { notes: additionalData }
            );
            
            if (result && result.preparation) {
              console.log("Stationnement complété avec succès");
              
              // Créer une copie profonde avec une nouvelle référence
              const updatedPreparation = JSON.parse(JSON.stringify(result.preparation));
              
              setPreparation(updatedPreparation);
              if (result.preparation.notes) setNotes(result.preparation.notes);
              
              // Forcer un rafraîchissement du composant
              setRefreshKey(prev => prev + 1);
            } else {
              console.log("Rechargement complet des données");
              await loadPreparation();
              setRefreshKey(prev => prev + 1);
            }
          }
          break;
      }
      
      // Notification de succès
      setSuccess(`Opération effectuée avec succès`);
      
      // Effacer le message de succès après 3 secondes
      const timer = setTimeout(() => {
        if (!isUnmounted.current) {
          setSuccess(null);
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Erreur lors de l\'action sur la tâche:', err);
      if (!isUnmounted.current) {
        setError(err.response?.data?.message || 'Erreur lors de l\'action');
      }
    } finally {
      if (!isUnmounted.current) {
        setTaskLoading(false);
      }
    }
  }, [id, taskLoading, loadPreparation]);

  // Terminer la préparation
  const handleCompletePreparation = useCallback(async () => {
    try {
      setLoading(true);
      const result = await preparationService.completePreparation(id, { notes });
      
      if (!isUnmounted.current) {
        // Utiliser directement la préparation retournée par l'API
        if (result && result.preparation) {
          // Créer une copie profonde avec une nouvelle référence
          const updatedPreparation = JSON.parse(JSON.stringify(result.preparation));
          setPreparation(updatedPreparation);
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
      console.error('Erreur lors de la finalisation:', err);
      if (!isUnmounted.current) {
        setError(err.response?.data?.message || 'Erreur lors de la finalisation');
        setLoading(false);
      }
    }
  }, [id, notes, navigate]);

  // Vérifier les permissions d'édition
  const canEdit = useCallback(() => {
    if (!preparation || !currentUser) return false;
    
    // Les admins peuvent toujours éditer
    if (currentUser.role === 'admin') return true;
    
    // L'utilisateur qui a créé la préparation peut l'éditer
    if (preparation.userId && preparation.userId._id === currentUser._id) return true;
    
    return false;
  }, [preparation, currentUser]);

  // Vérifier si au moins une tâche est complétée
  const hasCompletedTasks = useCallback(() => {
    if (!preparation) return false;
    
    return Object.values(preparation.tasks).some(task => task && task.status === 'completed');
  }, [preparation]);

  // Obtenir l'URL d'une photo pour une tâche donnée
  const getPhotoUrlByType = useCallback((taskType, photoType) => {
    if (!preparation || !preparation.tasks || !preparation.tasks[taskType] || !preparation.tasks[taskType].photos) {
      return '';
    }
    
    const photos = preparation.tasks[taskType].photos;
    if (!photos[photoType]) return '';
    
    return photos[photoType].url || '';
  }, [preparation]);

  // Affichage durant le chargement initial
  if (loading && !preparation) {
    return (
      <div>
        <Navigation />
        <div className="loading-container">
          <LoadingSpinner />
          <p>Chargement de la préparation...</p>
        </div>
      </div>
    );
  }
  
  // Affichage en cas d'erreur
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
        
        {/* Messages d'erreur et de succès */}
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
        
        {/* Contenu principal */}
        <div className="detail-card">
          {/* Informations du véhicule */}
          <PreparationInfoSection preparation={preparation} />
          
          {/* Section des tâches */}
          <div className="detail-section tasks-section">
            <h2 className="section-title">
              <i className="fas fa-tasks"></i> Tâches de préparation
            </h2>
            <div className="task-grid">
              {taskTypes.map(taskType => (
                <PreparationTaskSection
                  key={`${taskType}-${refreshKey}`} // Forcer le remontage du composant
                  preparation={preparation}
                  taskType={taskType}
                  expandedTask={expandedTask}
                  onToggleTask={toggleTaskExpansion}
                  canEdit={canEdit()}
                  onStartTask={(type, notes) => handleTaskAction('startTask', type, notes)}
                  onCompleteTask={(type, photos, data) => handleTaskAction('completeTask', type, photos, data)}
                  onAddTaskPhoto={(type, photo, desc) => handleTaskAction('addTaskPhoto', type, photo, desc)}
                  onParkingTask={(type, photo, notes) => handleTaskAction('parkingTask', type, photo, notes)}
                  uploadingPhoto={taskLoading}
                  getPhotoUrlByType={getPhotoUrlByType}
                />
              ))}
            </div>
          </div>
          
          {/* Section des notes */}
          <NotesSection
            notes={notes}
            onChange={setNotes}
            readOnly={preparation.status === 'completed' || !canEdit()}
          />
          
          {/* Section des dates */}
          <PreparationDatesSection preparation={preparation} />
          
          {/* Actions du bas de page */}
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