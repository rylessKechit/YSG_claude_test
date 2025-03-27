// src/services/movementService.js (sans système de cache)
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';
import uploadService from './uploadService';

// Service des mouvements (sans aucun cache)
const movementService = {
  uploadAllPhotosDirectS3: async (movementId, photoFiles, photoTypes, isArrival = false) => {
    try {
      // 1. Uploader tous les fichiers directement à S3
      const validFiles = [];
      const validTypes = [];
      
      // Ne garder que les fichiers non-null
      Object.entries(photoFiles).forEach(([type, file]) => {
        if (file) {
          validFiles.push(file);
          validTypes.push(type);
        }
      });
      
      // Si aucun fichier à uploader
      if (validFiles.length === 0) {
        return { success: false, message: 'Aucun fichier à uploader' };
      }
      
      // Upload direct à S3
      const uploadResults = await uploadService.uploadMultipleDirect(validFiles);
      
      // 2. Associer les URLs aux types de photos et mettre à jour le mouvement
      const formData = new FormData();
      
      // Ajouter les URLs et les types
      uploadResults.files.forEach((result, index) => {
        formData.append('photoUrls', result.url);
        formData.append('photoTypes', validTypes[index]);
      });
      
      // Ajouter le type de photo (arrivée ou départ)
      if (isArrival) {
        formData.append('photoType', 'arrival');
      }
      
      // 3. Appeler l'API pour mettre à jour la base de données avec les URLs S3
      const response = await api.post(
        `${ENDPOINTS.MOVEMENTS.BATCH_S3_PHOTOS(movementId)}`,
        formData
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload batch direct:', error);
      throw error;
    }
  },
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

  // Upload multiple photos en une seule requête
  uploadAllPhotos: async (movementId, formData) => {
    const response = await api.post(
      `${ENDPOINTS.MOVEMENTS.BATCH_PHOTOS(movementId)}`,
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        // Ajouter un timeout plus long pour les uploads multiples
        timeout: 60000 // 60 secondes
      }
    );
    return response.data;
  },
  
  deleteMovement: async (movementId) => {
    const response = await api.delete(ENDPOINTS.MOVEMENTS.DETAIL(movementId));
    return response.data;
  }
};

export default movementService;