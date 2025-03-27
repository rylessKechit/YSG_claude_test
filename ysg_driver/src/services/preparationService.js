// src/services/preparationService.js (sans système de cache)
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';

const preparationService = {
  // Créer une nouvelle préparation
  createPreparation: async (preparationData) => {
    const response = await api.post(ENDPOINTS.PREPARATIONS.BASE, preparationData);
    return response.data;
  },
  
  // Obtenir les préparateurs en service (admin seulement) sans cache
  getPreparatorsOnDuty: async () => fetchWithCache(`${ENDPOINTS.PREPARATIONS.BASE}/preparators-on-duty`),
  
  // Démarrer une tâche avec photo "before"
  startTask: async (preparationId, taskType, photo, notes) => {
    const formData = new FormData();
    formData.append('photo', photo);
    if (notes) formData.append('notes', notes);
    
    const response = await api.post(
      `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/start`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
  
  // Terminer une tâche avec photo "after"
  completeTask: async (preparationId, taskType, photo, additionalData = {}) => {
    const formData = new FormData();
    formData.append('photo', photo);
    
    // Ajouter les données supplémentaires
    Object.keys(additionalData).forEach(key => {
      if (additionalData[key] !== null && additionalData[key] !== undefined) {
        if (typeof additionalData[key] === 'object') {
          formData.append(key, JSON.stringify(additionalData[key]));
        } else {
          formData.append(key, additionalData[key]);
        }
      }
    });
    
    const response = await api.post(
      `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/complete`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
  
  // Ajouter une photo additionnelle à une tâche
  addTaskPhoto: async (preparationId, taskType, photo, description) => {
    const formData = new FormData();
    formData.append('photo', photo);
    if (description) formData.append('description', description);
    
    const response = await api.post(
      `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
  
  // Terminer une préparation
  completePreparation: async (preparationId, data) => {
    const response = await api.put(`${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/complete`, data);
    return response.data;
  },
  
  // Uploader des photos pour une préparation (dommages, etc.)
  uploadPhotos: async (preparationId, photos, type = 'other') => {
    const formData = new FormData();
    
    // Si photos est un tableau de fichiers
    if (Array.isArray(photos)) {
      photos.forEach(photo => formData.append('photos', photo));
    } else {
      // Si c'est un seul fichier
      formData.append('photos', photos);
    }
    
    formData.append('type', type);
    
    const response = await api.post(
      `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
  
  // Obtenir toutes les préparations sans cache
  getPreparations: async (page = 1, limit = 10, status = null, userId = null) => {
    let url = `${ENDPOINTS.PREPARATIONS.BASE}?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    if (userId) url += `&userId=${userId}`;
    
    return fetchWithCache(url);
  },
  
  // Obtenir une préparation spécifique sans cache
  getPreparation: async (preparationId) => fetchWithCache(ENDPOINTS.PREPARATIONS.DETAIL(preparationId)),
  
  // Rechercher des préparations par plaque d'immatriculation sans cache
  searchByLicensePlate: async (licensePlate) => 
    fetchWithCache(`${ENDPOINTS.PREPARATIONS.BASE}/search/plate?licensePlate=${licensePlate}`)
};

export default preparationService;