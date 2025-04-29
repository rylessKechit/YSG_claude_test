// ysg_driver/src/services/agencyService.js
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';

const agencyService = {
  /**
   * Récupère toutes les agences
   * @param {boolean} activeOnly - Si true, ne récupère que les agences actives
   * @returns {Promise<Array>} Promise contenant la liste des agences
   */
  getAgencies: async (activeOnly = true) => {
    const query = activeOnly ? '?activeOnly=true' : '';
    return fetchWithCache(`${ENDPOINTS.AGENCIES.BASE}${query}`);
  },
  
  /**
   * Récupère une agence spécifique
   * @param {string} agencyId - ID de l'agence
   * @returns {Promise<Object>} Promise contenant les détails de l'agence
   */
  getAgency: async (agencyId) => {
    return fetchWithCache(ENDPOINTS.AGENCIES.DETAIL(agencyId));
  },
  
  /**
   * Crée une nouvelle agence
   * @param {Object} agencyData - Données de l'agence à créer
   * @returns {Promise<Object>} Promise contenant la réponse
   */
  createAgency: async (agencyData) => {
    const response = await api.post(ENDPOINTS.AGENCIES.BASE, agencyData);
    return response.data;
  },
  
  /**
   * Met à jour une agence existante
   * @param {string} agencyId - ID de l'agence
   * @param {Object} agencyData - Données de l'agence à mettre à jour
   * @returns {Promise<Object>} Promise contenant la réponse
   */
  updateAgency: async (agencyId, agencyData) => {
    const response = await api.put(ENDPOINTS.AGENCIES.DETAIL(agencyId), agencyData);
    return response.data;
  },
  
  /**
   * Supprime une agence
   * @param {string} agencyId - ID de l'agence à supprimer
   * @returns {Promise<Object>} Promise contenant la réponse
   */
  deleteAgency: async (agencyId) => {
    const response = await api.delete(ENDPOINTS.AGENCIES.DETAIL(agencyId));
    return response.data;
  }
};

export default agencyService;