// ysg_driver/src/services/timelogService.js (CORRIGÉ)
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
  
  // Démarrer un pointage avec type spécifique
  startTimeLog: async (data) => {
    try {
      const response = await api.post(ENDPOINTS.TIMELOGS.BASE, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // CORRIGÉ: Démarrer un pointage avec type spécifique pour drivers
  startDriverTimeLog: async (type, locationData, notes = '') => {
    try {
      const data = {
        ...locationData,
        notes,
        type // start_service, start_break, end_break, end_service
      };
      
      const response = await api.post(ENDPOINTS.TIMELOGS.BASE, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Terminer un pointage
  endTimeLog: async (data) => {
    try {
      const response = await api.post(`${ENDPOINTS.TIMELOGS.BASE}/end`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Récupérer l'historique des pointages
  getTimeLogs: async (page = 1, limit = 10, status = null, filters = {}) => {
    try {
      let url = `${ENDPOINTS.TIMELOGS.BASE}?page=${page}&limit=${limit}`;
      
      // Ajouter le statut s'il est fourni
      if (status) {
        url += `&status=${status}`;
      }
      
      // S'assurer que les filtres sont correctement ajoutés
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

  // CORRIGÉ: Analyser les pointages d'un driver pour une date
  analyzeDriverTimelogs: async (userId = null, date = null) => {
    try {
      // Construire l'URL correctement
      let url = `${ENDPOINTS.TIMELOGS.BASE}/driver-analysis`;
      
      if (userId) {
        url += `/${userId}`;
      }
      
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

  // Déclencher le traitement automatique (admin seulement)
  triggerDriverAutomation: async () => {
    try {
      const response = await api.post(`${ENDPOINTS.TIMELOGS.BASE}/auto-process-drivers`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtenir les types de pointages valides pour un driver
  getValidTimelogTypes: (currentTypes = []) => {
    const allTypes = [
      { value: 'start_service', label: '🟢 Début de service', description: 'Commencer votre journée de travail' },
      { value: 'start_break', label: '⏸️ Début de pause', description: 'Commencer votre pause (max 1h/jour)' },
      { value: 'end_break', label: '▶️ Fin de pause', description: 'Terminer votre pause' },
      { value: 'end_service', label: '🔴 Fin de service', description: 'Terminer votre journée de travail' }
    ];

    // Logique pour déterminer quels types sont disponibles
    const available = [];
    
    if (!currentTypes.includes('start_service')) {
      available.push(allTypes[0]); // start_service
    } else {
      if (!currentTypes.includes('start_break') && !currentTypes.includes('end_service')) {
        available.push(allTypes[1]); // start_break
      }
      
      if (currentTypes.includes('start_break') && !currentTypes.includes('end_break')) {
        available.push(allTypes[2]); // end_break
      }
      
      if (!currentTypes.includes('end_service') && 
          (!currentTypes.includes('start_break') || currentTypes.includes('end_break'))) {
        available.push(allTypes[3]); // end_service
      }
    }
    
    return { allTypes, available };
  },

  // Valider si un type de pointage est permis
  validateTimelogType: async (type) => {
    try {
      // Obtenir les pointages d'aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const analysis = await timelogService.analyzeDriverTimelogs(null, today);
      
      const existingTypes = analysis.analysis.sequence.map(s => s.type);
      
      // Utiliser la même logique que le backend
      switch (type) {
        case 'start_service':
          if (existingTypes.includes('start_service')) {
            return { valid: false, message: 'Vous avez déjà commencé votre service aujourd\'hui' };
          }
          break;
          
        case 'start_break':
          if (!existingTypes.includes('start_service')) {
            return { valid: false, message: 'Vous devez d\'abord commencer votre service' };
          }
          if (existingTypes.includes('start_break')) {
            return { valid: false, message: 'Vous avez déjà commencé votre pause aujourd\'hui' };
          }
          if (existingTypes.includes('end_service')) {
            return { valid: false, message: 'Vous ne pouvez plus prendre de pause après la fin de service' };
          }
          break;
          
        case 'end_break':
          if (!existingTypes.includes('start_break')) {
            return { valid: false, message: 'Vous devez d\'abord commencer votre pause' };
          }
          if (existingTypes.includes('end_break')) {
            return { valid: false, message: 'Vous avez déjà terminé votre pause aujourd\'hui' };
          }
          break;
          
        case 'end_service':
          if (!existingTypes.includes('start_service')) {
            return { valid: false, message: 'Vous devez d\'abord commencer votre service' };
          }
          if (existingTypes.includes('end_service')) {
            return { valid: false, message: 'Vous avez déjà terminé votre service aujourd\'hui' };
          }
          if (existingTypes.includes('start_break') && !existingTypes.includes('end_break')) {
            return { valid: false, message: 'Vous devez d\'abord terminer votre pause' };
          }
          break;
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      return { valid: false, message: 'Erreur lors de la validation' };
    }
  },

  // Obtenir le résumé de la journée d'un driver
  getDailySummary: async (date = null) => {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const analysis = await timelogService.analyzeDriverTimelogs(null, targetDate);
      
      return {
        date: targetDate,
        isComplete: analysis.analysis.isComplete,
        completedTypes: analysis.analysis.sequence.map(s => s.type),
        missingTypes: analysis.analysis.missingTypes,
        sequence: analysis.analysis.sequence,
        nextAction: timelogService.getNextAction(analysis.analysis),
        progress: timelogService.calculateProgress(analysis.analysis)
      };
    } catch (error) {
      throw error;
    }
  },

  // Déterminer la prochaine action recommandée
  getNextAction: (analysis) => {
    if (!analysis.hasServiceStart) {
      return { type: 'start_service', label: 'Commencer votre service', urgent: false };
    }
    
    if (!analysis.hasBreakStart && !analysis.hasServiceEnd) {
      return { type: 'start_break', label: 'Prendre votre pause', urgent: false };
    }
    
    if (analysis.hasBreakStart && !analysis.hasBreakEnd) {
      return { type: 'end_break', label: 'Terminer votre pause', urgent: true };
    }
    
    if (!analysis.hasServiceEnd) {
      return { type: 'end_service', label: 'Terminer votre service', urgent: false };
    }
    
    return { type: null, label: 'Journée complète', urgent: false };
  },

  // Calculer le pourcentage de progression
  calculateProgress: (analysis) => {
    const totalSteps = 4;
    let completedSteps = 0;
    
    if (analysis.hasServiceStart) completedSteps++;
    if (analysis.hasBreakStart) completedSteps++;
    if (analysis.hasBreakEnd) completedSteps++;
    if (analysis.hasServiceEnd) completedSteps++;
    
    return Math.round((completedSteps / totalSteps) * 100);
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
  }
};

export default timelogService;