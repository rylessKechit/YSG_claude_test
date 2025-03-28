import React, { useState, useEffect } from 'react';
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

  // Charger les détails de la préparation
  useEffect(() => { loadPreparation(); }, [id]);

  const loadPreparation = async () => {
    try {
      setLoading(true);
      const data = await preparationService.getPreparation(id);
      setPreparation(data);
      if (data.notes) setNotes(data.notes);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  // Fonctions pour les tâches
  const toggleTaskExpansion = (taskType) => setExpandedTask(expandedTask === taskType ? null : taskType);

  const handleTaskAction = async (action, taskType, data1, data2 = {}) => {
    try {
      setTaskLoading(true);
      setError(null);
      
      switch(action) {
        case 'startTask':
          // Démarrage sans photo (data1 est les notes dans ce cas)
          await preparationService.startTask(id, taskType, data1);
          break;
        case 'completeTask':
          // Terminer avec photo obligatoire (data1 est la photo, data2 est additionalData)
          if (!data1) {
            setError('Vous devez prendre une photo pour terminer la tâche');
            setTaskLoading(false);
            return;
          }
          await preparationService.completeTask(id, taskType, data1, data2);
          break;
        case 'addTaskPhoto':
          if (!data1) {
            setError('Veuillez sélectionner une photo');
            setTaskLoading(false);
            return;
          }
          await preparationService.addTaskPhoto(id, taskType, data1, data2);
          break;
        case 'parkingTask':
          // Stationnement en une étape (toujours avec photo obligatoire)
          if (!data1) {
            setError('Vous devez prendre une photo pour valider le stationnement');
            setTaskLoading(false);
            return;
          }
          // Démarrer puis compléter immédiatement pour le stationnement
          await preparationService.startTask(id, 'parking');
          await new Promise(resolve => setTimeout(resolve, 500));
          await preparationService.completeTask(id, 'parking', data1, { notes: data2 });
          break;
      }
      
      setSuccess(`Action effectuée avec succès`);
      await loadPreparation();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'action');
    } finally {
      setTaskLoading(false);
    }
  };

  // Terminer la préparation
  const handleCompletePreparation = async () => {
    try {
      setLoading(true);
      await preparationService.completePreparation(id, { notes });
      await loadPreparation();
      setSuccess('Préparation terminée avec succès');
      setTimeout(() => {
        setSuccess(null);
        navigate('/preparations');
      }, 2000);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la finalisation');
      setLoading(false);
    }
  };

  // Permissions
  const canEdit = () => {
    if (!preparation || !currentUser) return false;
    return (preparation.userId && preparation.userId._id === currentUser._id) || currentUser.role === 'admin';
  };

  // Obtenir l'URL d'une photo
  const getPhotoUrlByType = (taskType, photoType) => {
    if (!preparation?.tasks[taskType]?.photos) return '';
    const photo = preparation.tasks[taskType].photos[photoType];
    return photo?.url || '';
  };

  // Vérifier si au moins une tâche est complétée
  const hasCompletedTasks = () => {
    if (!preparation) return false;
    return Object.values(preparation.tasks).some(task => task.status === 'completed');
  };

  // Liste des types de tâches
  const taskTypes = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];

  // Affichages conditionnels
  if (loading && !preparation) return <div><Navigation /><div className="loading-container"><LoadingSpinner /></div></div>;
  
  if (error && !preparation) {
    return (
      <div>
        <Navigation />
        <div className="preparation-detail-container">
          <AlertMessage type="error" message={error || 'Préparation non trouvée'} />
          <div className="back-button-container">
            <button onClick={() => navigate('/preparations')} className="btn btn-primary">Retour à la liste</button>
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
          <Link to="/preparations" className="back-link"><i className="fas fa-arrow-left"></i> Retour à la liste</Link>
        </div>
        
        {error && <AlertMessage type="error" message={error} />}
        {success && <AlertMessage type="success" message={success} />}
        
        <div className="detail-card">
          <PreparationInfoSection preparation={preparation} />
          
          <div className="detail-section tasks-section">
            <h2 className="section-title"><i className="fas fa-tasks"></i> Tâches de préparation</h2>
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
                  onCompleteTask={(type, photo, data) => handleTaskAction('completeTask', type, photo, data)}
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