// src/services/timelogService.js (sans système de cache)
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';

const defaultLocation = {
  name: 'Position non disponible',
  coordinates: { latitude: null, longitude: null }
};

const timelogService = {
  // Démarrer un pointage
  startTimeLog: async (data) => {
    try {
      // Assurez-vous que les données sont correctement structurées
      const payload = { location: data.location || defaultLocation };
      
      console.log('Envoi des données au serveur:', payload);
      const response = await api.post(`${ENDPOINTS.TIMELOGS.BASE}/start`, payload);
      return response.data;
    } catch (error) {
      console.error('Erreur dans le service timeLog (start):', error);
      throw error;
    }
  },
  
  // Terminer un pointage
  endTimeLog: async (locationData, notes) => {
    try {
      // Assurez-vous que les données sont correctement structurées
      const payload = {
        location: locationData || defaultLocation,
        notes: notes || ''
      };
      
      const response = await api.post(`${ENDPOINTS.TIMELOGS.BASE}/end`, payload);
      return response.data;
    } catch (error) {
      console.error('Erreur dans le service timeLog (end):', error);
      throw error;
    }
  },
  
  // Récupérer le pointage actif sans cache
  getActiveTimeLog: async () => {
    try {
      return await fetchWithCache(ENDPOINTS.TIMELOGS.ACTIVE);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null; // Aucun pointage actif
      }
      throw error;
    }
  },
  
  // Récupérer l'historique des pointages sans cache
  getTimeLogs: async (page = 1, limit = 10, status = null) => {
    try {
      let url = `${ENDPOINTS.TIMELOGS.BASE}?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      
      // Toujours obtenir des données fraîches
      const response = await api.get(url);
      
      // Si les données ne contiennent pas la propriété timeLogs, ajustez le format
      if (response.data && !response.data.timeLogs && Array.isArray(response.data)) {
        return { timeLogs: response.data, totalPages: 1 };
      }
      
      return response.data;
    } catch (error) {
      console.error('Erreur détaillée lors de la récupération des pointages:', error);
      throw error;
    }
  }
};

export default timelogService;