// ysg_driver/src/services/trackingService.js
import { api } from './authService';
import { ENDPOINTS } from '../config';

const trackingService = {
  // Envoyer la position actuelle
  sendLocation: async (movementId, position) => {
    try {
      const response = await api.post(
        `${ENDPOINTS.TRACKING.LOCATION(movementId)}`,
        position
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la position:', error);
      throw error;
    }
  },
  
  // Récupérer l'historique des positions pour un mouvement
  getLocations: async (movementId, limit = 100) => {
    try {
      const response = await api.get(
        `${ENDPOINTS.TRACKING.LOCATIONS(movementId)}?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des positions:', error);
      throw error;
    }
  },
  
  // Récupérer la dernière position pour un mouvement
  getLatestLocation: async (movementId) => {
    try {
      const response = await api.get(
        `${ENDPOINTS.TRACKING.LATEST_LOCATION(movementId)}`
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la dernière position:', error);
      throw error;
    }
  },
  
  // Récupérer tous les mouvements actifs avec leur position
  getActiveMovements: async () => {
    try {
      const response = await api.get(ENDPOINTS.TRACKING.ACTIVE_MOVEMENTS);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des mouvements actifs:', error);
      throw error;
    }
  }
};

export default trackingService;