// ysg_driver/src/services/trackingService.js
import { api } from './authService';
import { ENDPOINTS } from '../config';

const trackingService = {
  // Envoyer la position actuelle
  sendLocation: async (movementId, position) => {
    const response = await api.post(
      `${ENDPOINTS.TRACKING.LOCATION(movementId)}`,
      position
    );
    return response.data;
  },
  
  // Récupérer l'historique des positions pour un mouvement
  getLocations: async (movementId, limit = 100) => {
    const response = await api.get(
      `${ENDPOINTS.TRACKING.LOCATIONS(movementId)}?limit=${limit}`
    );
    return response.data;
  },
  
  // Récupérer la dernière position pour un mouvement
  getLatestLocation: async (movementId) => {
    const response = await api.get(
      `${ENDPOINTS.TRACKING.LATEST_LOCATION(movementId)}`
    );
    return response.data;
  },
  
  // Récupérer tous les mouvements actifs avec leur position
  getActiveMovements: async () => {
    const response = await api.get(ENDPOINTS.TRACKING.ACTIVE_MOVEMENTS);
    return response.data;
  }
};

export default trackingService;