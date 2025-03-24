// src/services/driverPerformanceService.js
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';

const driverPerformanceService = {
  // Récupérer les performances pour un ou plusieurs chauffeurs
  getDriversPerformance: async (driverIds, startDate, endDate) => {
    try {
      // Construire l'URL avec les paramètres
      let url = `${ENDPOINTS.ANALYTICS_ENDPOINTS.DRIVERS_COMPARE}`;
      
      // Paramètres de la requête
      const params = new URLSearchParams();
      
      // Ajouter les ID des chauffeurs si fournis
      if (driverIds && driverIds.length > 0) {
        params.append('userIds', driverIds.join(','));
      }
      
      // Ajouter les dates
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      // Ajouter les paramètres à l'URL
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      // Faire l'appel API avec authentification
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des données de performance des chauffeurs:', error);
      throw error;
    }
  },
  
  // Récupérer les performances d'un chauffeur spécifique
  getDriverPerformance: async (driverId, startDate, endDate) => {
    if (!driverId) throw new Error('ID de chauffeur requis');
    
    let url = `${ENDPOINTS.ANALYTICS_ENDPOINTS.DRIVER_PERFORMANCE.replace(':userId', driverId)}`;
    
    // Paramètres de la requête
    const params = new URLSearchParams();
    
    // Ajouter les dates
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    // Ajouter les paramètres à l'URL
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return await fetchWithCache(url);
  },
  
  // Récupérer les métriques globales des chauffeurs
  getGlobalDriverMetrics: async (startDate, endDate) => {
    let url = `${ENDPOINTS.ANALYTICS_ENDPOINTS.DRIVER_GLOBAL_METRICS}`;
    
    // Paramètres de la requête
    const params = new URLSearchParams();
    
    // Ajouter les dates
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    // Ajouter les paramètres à l'URL
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return await fetchWithCache(url);
  },
  
  // Récupérer les statistiques de destinations
  getDestinationStats: async (startDate, endDate) => {
    let url = `${ENDPOINTS.ANALYTICS_ENDPOINTS.DESTINATION_STATS}`;
    
    // Paramètres de la requête
    const params = new URLSearchParams();
    
    // Ajouter les dates
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    // Ajouter les paramètres à l'URL
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return await fetchWithCache(url);
  },
  
  // Récupérer les heures de pointe
  getPeakHours: async (startDate, endDate) => {
    let url = `${ENDPOINTS.ANALYTICS_ENDPOINTS.DRIVER_PEAK_HOURS}`;
    
    // Paramètres de la requête
    const params = new URLSearchParams();
    
    // Ajouter les dates
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    // Ajouter les paramètres à l'URL
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return await fetchWithCache(url);
  }
};

export default driverPerformanceService;