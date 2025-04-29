// src/services/adminService.js (ajout des méthodes pour les emplacements)
import { api } from './authService';
import { ENDPOINTS } from '../config';

const adminService = {
  // Services existants...
  
  // Emplacements autorisés
  getLocations: async () => {
    const response = await api.get(`${ENDPOINTS.ADMIN.BASE}/locations`);
    return response.data;
  },
  
  createLocation: async (data) => {
    const response = await api.post(`${ENDPOINTS.ADMIN.BASE}/locations`, data);
    return response.data;
  },
  
  updateLocation: async (id, data) => {
    const response = await api.put(`${ENDPOINTS.ADMIN.BASE}/locations/${id}`, data);
    return response.data;
  },
  
  deleteLocation: async (id) => {
    const response = await api.delete(`${ENDPOINTS.ADMIN.BASE}/locations/${id}`);
    return response.data;
  },
  
  // Réseaux autorisés
  getNetworks: async () => {
    const response = await api.get(`${ENDPOINTS.ADMIN.BASE}/networks`);
    return response.data;
  },
  
  createNetwork: async (data) => {
    const response = await api.post(`${ENDPOINTS.ADMIN.BASE}/networks`, data);
    return response.data;
  },
  
  updateNetwork: async (id, data) => {
    const response = await api.put(`${ENDPOINTS.ADMIN.BASE}/networks/${id}`, data);
    return response.data;
  },
  
  deleteNetwork: async (id) => {
    const response = await api.delete(`${ENDPOINTS.ADMIN.BASE}/networks/${id}`);
    return response.data;
  },
  
  // Tester une position
  testLocation: async (latitude, longitude) => {
    const response = await api.post(`${ENDPOINTS.ADMIN.BASE}/test-location`, { latitude, longitude });
    return response.data;
  }
};

export default adminService;