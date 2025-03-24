// src/services/movementService.js (sans système de cache)
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';

// Service des mouvements (sans aucun cache)
const movementService = {
  // OBTENIR DES DONNÉES
  getMovements: async (page = 1, limit = 10, status = null) => {
    let url = `${ENDPOINTS.MOVEMENTS.BASE}?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    return fetchWithCache(url);
  },
  
  getMovement: async (movementId) => fetchWithCache(ENDPOINTS.MOVEMENTS.DETAIL(movementId)),
  
  searchByLicensePlate: async (licensePlate) => 
    fetchWithCache(`${ENDPOINTS.MOVEMENTS.BASE}/search?licensePlate=${licensePlate}`),
  
  getDriversOnDuty: async () => fetchWithCache(`${ENDPOINTS.MOVEMENTS.BASE}/drivers-on-duty`),
  
  getAllDrivers: async () => fetchWithCache(`${ENDPOINTS.MOVEMENTS.BASE}/all-drivers`),
  
  // MODIFICATIONS
  createMovement: async (movementData) => {
    const response = await api.post(ENDPOINTS.MOVEMENTS.BASE, movementData);
    return response.data;
  },
  
  assignDriver: async (movementId, driverId) => {
    const response = await api.post(
      `${ENDPOINTS.MOVEMENTS.DETAIL(movementId)}/assign`, 
      { userId: driverId }
    );
    return response.data;
  },
  
  prepareMovement: async (movementId) => {
    const response = await api.post(`${ENDPOINTS.MOVEMENTS.DETAIL(movementId)}/prepare`);
    return response.data;
  },
  
  startMovement: async (movementId) => {
    const response = await api.post(`${ENDPOINTS.MOVEMENTS.DETAIL(movementId)}/start`);
    return response.data;
  },
  
  completeMovement: async (movementId, notesData) => {
    const response = await api.post(
      `${ENDPOINTS.MOVEMENTS.DETAIL(movementId)}/complete`, 
      notesData
    );
    return response.data;
  },
  
  cancelMovement: async (movementId) => {
    const response = await api.post(`${ENDPOINTS.MOVEMENTS.DETAIL(movementId)}/cancel`);
    return response.data;
  },
  
  uploadPhotos: async (movementId, formData) => {
    const response = await api.post(
      `${ENDPOINTS.MOVEMENTS.PHOTOS(movementId)}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
  
  deleteMovement: async (movementId) => {
    const response = await api.delete(ENDPOINTS.MOVEMENTS.DETAIL(movementId));
    return response.data;
  }
};

export default movementService;