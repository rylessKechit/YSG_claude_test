// src/services/timelogService.js
import { api } from './authService';
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
  
  // Démarrer un pointage avec position GPS
  startTimeLog: async (data) => {
    try {
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
      
      // Ajouter les filtres optionnels
      if (status) {
        url += `&status=${status}`;
      }
      
      // Ajouter d'autres filtres (userId, startDate, endDate, etc.)
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          url += `&${key}=${encodeURIComponent(value)}`;
        }
      });
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Récupérer les pointages d'un jour spécifique
  getDayTimeLogs: async (date, userId = null) => {
    try {
      let url = `${ENDPOINTS.TIMELOGS.BASE}/day/${date}`;
      
      if (userId) {
        url += `?userId=${userId}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Récupérer un résumé des heures (pour les admins)
  getTimeSummary: async (startDate, endDate, userId = null) => {
    try {
      let url = `${ENDPOINTS.TIMELOGS.BASE}/summary?startDate=${startDate}&endDate=${endDate}`;
      
      if (userId) {
        url += `&userId=${userId}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default timelogService;