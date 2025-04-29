// src/services/scheduleService.js (sans système de cache)
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';

const scheduleService = {
  // Obtenir tous les préparateurs sans cache
  getPreparators: async () => {
    try {
      return await fetchWithCache(ENDPOINTS.SCHEDULES.PREPARATORS);
    } catch (error) {
      throw error;
    }
  },
  
  // Obtenir le planning d'un utilisateur sans cache
  getUserSchedule: async (userId) => {
    try {
      return await fetchWithCache(ENDPOINTS.SCHEDULES.USER(userId));
    } catch (error) {
      throw error;
    }
  },
  
  // Obtenir le planning complet de tous les préparateurs sans cache
  getAllSchedules: async () => {
    try {
      return await fetchWithCache(ENDPOINTS.SCHEDULES.ALL);
    } catch (error) {
      throw error;
    }
  },
  
  // Créer ou mettre à jour une entrée de planning
  saveScheduleEntry: async (entryData) => {
    try {
      const response = await api.post(ENDPOINTS.SCHEDULES.BASE, entryData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Supprimer une entrée de planning
  deleteScheduleEntry: async (entryId) => {
    try {
      const response = await api.delete(`${ENDPOINTS.SCHEDULES.BASE}/${entryId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default scheduleService;