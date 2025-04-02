// src/pages/Dashboard.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import timelogService from '../services/timelogService';
import movementService from '../services/movementService';
import preparationService from '../services/preparationService';
import Navigation from '../components/Navigation';
import WeeklySchedule from '../components/WeeklySchedule';
import GreetingSection from '../components/dashboard/GreetingSection';
import StatusCard from '../components/dashboard/StatusCard';
import QuickActions from '../components/dashboard/QuickActions';
import '../styles/Dashboard.css';

// Importations dynamiques des composants selon le rôle
const AssignedMovements = React.lazy(() => import('../components/dashboard/AssignedMovements'));
const InProgressMovement = React.lazy(() => import('../components/dashboard/InProgressMovement'));
const InProgressPreparations = React.lazy(() => import('../components/dashboard/InProgressPreparations'));
const RecentMovements = React.lazy(() => import('../components/dashboard/RecentMovements'));
const RecentPreparations = React.lazy(() => import('../components/dashboard/RecentPreparations'));

const Dashboard = () => {
  const [activeTimeLog, setActiveTimeLog] = useState(null);
  const [movementsData, setMovementsData] = useState({ assigned: [], inProgress: [], recent: [] });
  const [preparationsData, setPreparationsData] = useState({ inProgress: [], recent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const isInitialMount = useRef(true);
  const isFetchingData = useRef(false);

  // Utiliser useCallback pour éviter les recréations de la fonction entre les rendus
  const fetchDashboardData = useCallback(async () => {
    // Éviter les appels concurrents
    if (isFetchingData.current) return;
    
    try {
      isFetchingData.current = true;
      setLoading(true);
      
      // 1. Récupérer le pointage actif
      const timeLog = await timelogService.getActiveTimeLog()
        .catch(err => err.response?.status === 404 ? null : Promise.reject(err));
      setActiveTimeLog(timeLog);
      
      // 2. Charger les mouvements selon le rôle
      if (currentUser && ['driver', 'team-leader', 'admin'].includes(currentUser.role)) {
        const { movements = [] } = await movementService.getMovements(1, 30);
        
        setMovementsData({
          assigned: movements.filter(m => m.status === 'assigned'),
          inProgress: movements.filter(m => m.status === 'in-progress'),
          recent: movements.filter(m => m.status === 'completed').slice(0, 3)
        });
      }
      
      // 3. Charger les préparations si nécessaire
      if (currentUser && ['preparator', 'driver', 'team-leader', 'admin'].includes(currentUser.role)) {
        const { preparations = [] } = await preparationService.getPreparations(1, 50);
        
        setPreparationsData({
          inProgress: preparations.filter(p => p.status === 'in-progress').slice(0, 3),
          recent: preparations.filter(p => p.status === 'completed').slice(0, 3)
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      isFetchingData.current = false;
    }
  }, [currentUser]);
  
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      
      if (currentUser) {
        fetchDashboardData();
      }
    }
  }, [currentUser, fetchDashboardData]);

  // Reste du code inchangé
  const componentsByRole = React.useMemo(() => {
    if (!currentUser) return [];
    
    const roleComponents = [{ component: 'greeting', label: 'Greeting' }];
    
    // WeeklySchedule uniquement pour les préparateurs
    currentUser.role === 'preparator' && 
      roleComponents.push({ component: 'weeklySchedule', label: 'Planning' });
    
    // StatusCard pour chauffeurs, préparateurs et chefs d'équipe
    ['driver', 'preparator', 'team-leader'].includes(currentUser.role) && 
      roleComponents.push({ component: 'statusCard', label: 'StatusCard' });
    
    // Mouvements en cours pour chauffeurs et chefs d'équipe
    (['driver', 'team-leader'].includes(currentUser.role) && movementsData.inProgress.length > 0) && 
      roleComponents.push({ component: 'inProgressMovement', label: 'InProgressMovement' });
    
    // Mouvements assignés pour chauffeurs
    (currentUser.role === 'driver' && movementsData.assigned.length > 0) && 
      roleComponents.push({ component: 'assignedMovements', label: 'AssignedMovements' });
    
    // QuickActions pour tous
    roleComponents.push({ component: 'quickActions', label: 'QuickActions' });
    
    // Préparations en cours pour préparateurs, chauffeurs et chefs d'équipe
    (['preparator', 'admin'].includes(currentUser.role) && preparationsData.inProgress.length > 0) && 
      roleComponents.push({ component: 'inProgressPreparations', label: 'InProgressPreparations' });
    
    // Préparations récentes pour préparateurs, chauffeurs et chefs d'équipe
    (['preparator', 'admin'].includes(currentUser.role) && preparationsData.recent.length > 0) && 
      roleComponents.push({ component: 'recentPreparations', label: 'RecentPreparations' });
    
    // Mouvements récents pour chauffeurs, chefs d'équipe et admin
    (['driver', 'team-leader', 'admin'].includes(currentUser.role) && movementsData.recent.length > 0) && 
      roleComponents.push({ component: 'recentMovements', label: 'RecentMovements' });
    
    return roleComponents;
  }, [currentUser, movementsData, preparationsData]);

  // Rendu du composant selon le type
  const renderComponent = (componentType) => {
    const components = {
      greeting: <GreetingSection currentUser={currentUser} />,
      weeklySchedule: <WeeklySchedule />,
      statusCard: <StatusCard activeTimeLog={activeTimeLog} />,
      quickActions: <QuickActions currentUser={currentUser} />,
      inProgressMovement: <InProgressMovement movements={movementsData.inProgress} />,
      assignedMovements: <AssignedMovements movements={movementsData.assigned} />,
      inProgressPreparations: <InProgressPreparations preparations={preparationsData.inProgress} />,
      recentPreparations: <RecentPreparations preparations={preparationsData.recent} />,
      recentMovements: <RecentMovements movements={movementsData.recent} />
    };
    return components[componentType] || null;
  };

  if (loading && !movementsData.assigned.length && !movementsData.inProgress.length && !preparationsData.inProgress.length) {
    return (
      <div>
        <Navigation />
        <div className="loading-container">
          <div className="spinner"></div>
          <div className="loading-text">Chargement du tableau de bord...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      <div className="dashboard-container">
        {error && (
          <div className="alert alert-error">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">{error}</div>
          </div>
        )}
        {componentsByRole.map((item, index) => (
          <React.Fragment key={index}>
            {renderComponent(item.component)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;