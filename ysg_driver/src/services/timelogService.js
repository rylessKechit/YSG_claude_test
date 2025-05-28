// ysg_driver/src/services/timelogService.js (SIMPLIFIÉ)
import { api, fetchWithCache, invalidateCache } from './authService';
import { ENDPOINTS } from '../config';

const timelogService = {
  // Récupérer le pointage actif
  getActiveTimeLog: async () => {
    try {
      const response = await api.get(ENDPOINTS.TIMELOGS.ACTIVE);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null; // Aucun pointage actif
      }
      throw error;
    }
  },
  
  // Démarrer un pointage avec type spécifique pour drivers
  startDriverTimeLog: async (type, locationData, notes = '') => {
    try {
      const data = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        notes,
        type // start_service, start_break, end_break, end_service
      };
      
      console.log(`🟢 Démarrage du pointage de type: ${type}`);
      const response = await api.post(ENDPOINTS.TIMELOGS.BASE, data);
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur lors du pointage ${type}:`, error);
      throw error;
    }
  },
  
  // Terminer un pointage
  endTimeLog: async (data) => {
    try {
      console.log('🔴 Fin du pointage actif');
      const response = await api.post(`${ENDPOINTS.TIMELOGS.BASE}/end`, data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la fin du pointage:', error);
      throw error;
    }
  },
  
  // Analyser les pointages d'un driver pour une date donnée
  analyzeDriverTimelogs: async (userId = null, date = null) => {
    try {
      let url = `${ENDPOINTS.TIMELOGS.BASE}/my-analysis`;
      
      const params = new URLSearchParams();
      if (date) {
        params.append('date', date);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'analyse des pointages:', error);
      throw error;
    }
  },

  // Récupérer l'historique des pointages
  getTimeLogs: async (page = 1, limit = 10, status = null, filters = {}) => {
    try {
      let url = `${ENDPOINTS.TIMELOGS.BASE}?page=${page}&limit=${limit}`;
      
      if (status) {
        url += `&status=${status}`;
      }
      
      if (filters && typeof filters === 'object') {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            url += `&${key}=${encodeURIComponent(value)}`;
          }
        });
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Erreur dans getTimeLogs:', error);
      throw error;
    }
  },

  // Obtenir le statut et la progression de la journée
  getDayStatus: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const analysis = await timelogService.analyzeDriverTimelogs(null, today);
      
      const sequence = analysis.analysis.sequence || [];
      const completedTypes = sequence.map(s => s.type);
      
      // Définir les étapes dans l'ordre
      const steps = [
        { type: 'start_service', label: 'Prise de service', icon: '🟢' },
        { type: 'start_break', label: 'Début de pause', icon: '⏸️' },
        { type: 'end_break', label: 'Fin de pause', icon: '▶️' },
        { type: 'end_service', label: 'Fin de service', icon: '🔴' }
      ];
      
      // Trouver l'étape suivante
      let nextStepIndex = completedTypes.length;
      let nextStep = null;
      let isComplete = false;
      
      if (nextStepIndex < steps.length) {
        nextStep = steps[nextStepIndex];
      } else {
        isComplete = true;
      }
      
      return {
        sequence,
        completedSteps: completedTypes.length,
        totalSteps: steps.length,
        nextStep,
        isComplete,
        progressPercentage: Math.round((completedTypes.length / steps.length) * 100)
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error);
      throw error;
    }
  },

  // Déterminer l'action recommandée suivante
  getNextAction: (completedTypes = []) => {
    const actions = [
      {
        type: 'start_service',
        label: 'Prendre mon service',
        description: 'Commencer votre journée',
        icon: '🟢',
        color: '#10B981'
      },
      {
        type: 'start_break',
        label: 'Commencer ma pause',
        description: 'Prendre votre pause déjeuner',
        icon: '⏸️',
        color: '#F59E0B'
      },
      {
        type: 'end_break',
        label: 'Reprendre mon service',
        description: 'Terminer votre pause',
        icon: '▶️',
        color: '#3B82F6'
      },
      {
        type: 'end_service',
        label: 'Terminer mon service',
        description: 'Finir votre journée',
        icon: '🔴',
        color: '#EF4444'
      }
    ];
    
    const nextIndex = completedTypes.length;
    
    if (nextIndex < actions.length) {
      return {
        ...actions[nextIndex],
        step: nextIndex + 1,
        totalSteps: actions.length
      };
    }
    
    return {
      type: null,
      label: 'Journée terminée',
      description: 'Tous vos pointages sont complets',
      icon: '✅',
      color: '#10B981',
      step: actions.length,
      totalSteps: actions.length
    };
  },

  // Valider si une action est possible
  validateAction: (type, completedTypes = []) => {
    switch (type) {
      case 'start_service':
        if (completedTypes.includes('start_service')) {
          return { valid: false, message: 'Service déjà démarré aujourd\'hui' };
        }
        break;
        
      case 'start_break':
        if (!completedTypes.includes('start_service')) {
          return { valid: false, message: 'Vous devez d\'abord prendre votre service' };
        }
        if (completedTypes.includes('start_break')) {
          return { valid: false, message: 'Pause déjà prise aujourd\'hui' };
        }
        break;
        
      case 'end_break':
        if (!completedTypes.includes('start_break')) {
          return { valid: false, message: 'Vous devez d\'abord commencer votre pause' };
        }
        if (completedTypes.includes('end_break')) {
          return { valid: false, message: 'Pause déjà terminée aujourd\'hui' };
        }
        break;
        
      case 'end_service':
        if (!completedTypes.includes('start_service')) {
          return { valid: false, message: 'Vous devez d\'abord prendre votre service' };
        }
        if (completedTypes.includes('end_service')) {
          return { valid: false, message: 'Service déjà terminé aujourd\'hui' };
        }
        if (completedTypes.includes('start_break') && !completedTypes.includes('end_break')) {
          return { valid: false, message: 'Vous devez d\'abord terminer votre pause' };
        }
        break;
    }
    
    return { valid: true };
  },

  // Formater la durée entre deux pointages
  formatDuration: (startTime, endTime = null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  },

  // Déclencher le traitement automatique (admin seulement)
  triggerDriverAutomation: async () => {
    try {
      const response = await api.post(`${ENDPOINTS.TIMELOGS.BASE}/auto-process-drivers`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default timelogService;