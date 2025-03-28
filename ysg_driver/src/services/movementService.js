// src/services/movementService.js
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';
import uploadService from './uploadService';

// Service des mouvements (sans aucun cache)
const movementService = {
  /**
   * Upload multiple photos directement vers S3 puis enregistre les métadonnées
   * @param {string} movementId - ID du mouvement
   * @param {Object} photoFiles - Objet contenant les fichiers par type
   * @param {boolean} isArrival - Si true, ce sont des photos d'arrivée
   * @returns {Promise} Promise avec le résultat de l'opération
   */
  uploadAllPhotosDirectS3: async (movementId, photoFiles, isArrival = false) => {
    try {
      console.log(`Démarrage upload S3 direct pour le mouvement ${movementId}, type: ${isArrival ? 'arrivée' : 'départ'}`);
      
      // 1. Filtrer les fichiers non-null
      const validFiles = [];
      const validTypes = [];
      
      Object.entries(photoFiles).forEach(([type, file]) => {
        if (file) {
          validFiles.push(file);
          validTypes.push(type);
        }
      });
      
      if (validFiles.length === 0) {
        console.warn('Aucun fichier à uploader');
        return { success: false, message: 'Aucun fichier à uploader' };
      }
      
      console.log(`Upload de ${validFiles.length} fichiers pour types: ${validTypes.join(', ')}`);
      
      // 2. Upload direct à S3
      const uploadResults = await uploadService.uploadMultipleDirect(validFiles);
      
      // 3. Enregistrer les métadonnées des photos
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
      
      // 4. Appeler l'API pour mettre à jour la base de données
      const response = await api.post(
        `${ENDPOINTS.MOVEMENTS.BATCH_S3_PHOTOS(movementId)}`,
        formData
      );
      
      console.log(`Photos enregistrées avec succès pour ${movementId}`);
      
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
  
  /**
   * Upload de photos via l'API standard (méthode classique)
   * @param {string} movementId - ID du mouvement
   * @param {FormData} formData - Données du formulaire avec les photos
   * @returns {Promise} Promise avec le résultat de l'opération
   */
  uploadPhotos: async (movementId, formData) => {
    const response = await api.post(
      `${ENDPOINTS.MOVEMENTS.PHOTOS(movementId)}`,
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000 // 30 secondes
      }
    );
    return response.data;
  },

  /**
   * Upload multiple photos en une seule requête
   * @param {string} movementId - ID du mouvement
   * @param {FormData} formData - Données du formulaire avec les photos
   * @returns {Promise} Promise avec le résultat de l'opération
   */
  uploadAllPhotos: async (movementId, formData) => {
    const response = await api.post(
      `${ENDPOINTS.MOVEMENTS.BATCH_PHOTOS(movementId)}`,
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 // 60 secondes
      }
    );
    return response.data;
  },

  uploadPhotosToS3: async (movementId, photos, photoTypes, photoType = 'departure') => {
    try {
      // 1. Obtenir des URLs présignées pour chaque photo
      const presignedUrls = await Promise.all(photos.map(photo => 
        api.post(`${ENDPOINTS.UPLOAD.PRESIGNED_URL}`, { 
          fileType: photo.type, 
          fileName: photo.name 
        })
      ));
      
      // 2. Uploader chaque photo directement à S3
      await Promise.all(presignedUrls.map((urlData, index) => 
        fetch(urlData.data.presignedUrl, {
          method: 'PUT',
          body: photos[index],
          headers: {
            'Content-Type': photos[index].type
          }
        })
      ));
      
      // 3. Envoyer les URLs des photos au serveur pour les enregistrer dans MongoDB
      const photoUrls = presignedUrls.map(urlData => urlData.data.fileUrl);
      
      // 4. Enregistrer les URLs des photos dans le mouvement
      const response = await api.post(`${ENDPOINTS.MOVEMENTS.BATCH_S3_PHOTOS(movementId)}`, {
        photoUrls,
        photoTypes,
        photoType
      });
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload des photos vers S3:', error);
      throw error;
    }
  },
  
  deleteMovement: async (movementId) => {
    const response = await api.delete(ENDPOINTS.MOVEMENTS.DETAIL(movementId));
    return response.data;
  }
};

export default movementService;