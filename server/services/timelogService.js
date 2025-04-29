import { api } from './authService';
import { ENDPOINTS } from '../config';

const timelogService = {
  // Démarrer un pointage
  startTimeLog: async (locationData) => {
    try {
      const response = await api.post(`${ENDPOINTS.TIMELOGS.BASE}/start`, {
        location: locationData
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Terminer un pointage
  endTimeLog: async (locationData, notes) => {
    try {
      const response = await api.post(`${ENDPOINTS.TIMELOGS.BASE}/end`, {
        location: locationData,
        notes
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Récupérer le pointage actif
  getActiveTimeLog: async () => {
    try {
      const response = await api.get(`${ENDPOINTS.TIMELOGS.ACTIVE}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null; // Aucun pointage actif
      }
      throw error;
    }
  },
  
  // Récupérer l'historique des pointages
  getTimeLogs: async (page = 1, limit = 10, status = null, filters = {}) => {
    try {
      // Construction de l'URL de base
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
  }
};

export default timelogService;