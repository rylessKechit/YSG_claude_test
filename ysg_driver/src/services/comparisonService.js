// src/services/comparisonService.js (sans système de cache)
import { api, fetchWithCache, invalidateCache } from './authService';
import { ENDPOINTS } from '../config';

const comparisonService = {
  // Obtenir les données de pointage pour un utilisateur et une plage de dates
  getUserTimelogsForPeriod: async (userId, startDate, endDate) => {
    try {
      // Construire l'URL de requête
      let url = `${ENDPOINTS.TIMELOGS.BASE}?userId=${userId}`;
      
      if (startDate) {
        url += `&startDate=${startDate}`;
      }
      
      if (endDate) {
        url += `&endDate=${endDate}`;
      }
      
      // Accès direct à l'API sans cache
      return await fetchWithCache(url);
    } catch (error) {
      throw error;
    }
  },
  
  // Générer un rapport de comparaison entre les horaires planifiés et les pointages
  generateComparisonReport: async (userId, startDate, endDate) => {
    try {
      const url = `${ENDPOINTS.REPORTS.COMPARISON}?userId=${userId}&startDate=${startDate}&endDate=${endDate}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Obtenir les statistiques d'assiduité pour l'ensemble des employés
  getAttendanceStats: async (startDate, endDate, role = null) => {
    try {
      let url = `${ENDPOINTS.REPORTS.ATTENDANCE}?startDate=${startDate}&endDate=${endDate}`;
      
      if (role) {
        url += `&role=${role}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default comparisonService;