// src/services/preparationService.js
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';
import uploadService from './uploadService';

const preparationService = {
  /**
   * Upload photo à S3 puis démarre une tâche
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo
   * @param {Object} notes - Notes additionnelles
   * @returns {Promise} Résultat de l'opération
   */
  startTaskWithDirectS3: async (preparationId, taskType, photo, notes = '') => {
    try {
      console.log(`Démarrage de la tâche ${taskType} avec upload S3 direct`);
      
      // 1. Upload direct à S3
      const uploadResult = await uploadService.uploadDirect(photo);
      
      // 2. Appeler l'API pour démarrer la tâche avec l'URL S3
      const formData = new FormData();
      formData.append('photoUrl', uploadResult.url);
      if (notes) formData.append('notes', notes);
      
      const response = await api.post(
        `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/start-with-s3`,
        formData
      );
      
      return response.data;
    } catch (error) {
      console.error(`Erreur lors du démarrage de la tâche ${taskType} avec S3:`, error);
      throw error;
    }
  },
  
  /**
   * Upload photo à S3 puis complète une tâche
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo
   * @param {Object} additionalData - Données additionnelles
   * @returns {Promise} Résultat de l'opération
   */
  completeTaskWithDirectS3: async (preparationId, taskType, photo, additionalData = {}) => {
    try {
      console.log(`Completion de la tâche ${taskType} avec upload S3 direct`);
      
      // 1. Upload direct à S3
      const uploadResult = await uploadService.uploadDirect(photo);
      
      // 2. Préparer les données à envoyer
      const formData = new FormData();
      formData.append('photoUrl', uploadResult.url);
      
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
      
      // 3. Appeler l'API pour compléter la tâche
      const response = await api.post(
        `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/complete-with-s3`,
        formData
      );
      
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la complétion de la tâche ${taskType} avec S3:`, error);
      throw error;
    }
  },
  
  // Créer une nouvelle préparation
  createPreparation: async (preparationData) => {
    const response = await api.post(ENDPOINTS.PREPARATIONS.BASE, preparationData);
    return response.data;
  },
  
  // Obtenir les préparateurs en service (admin seulement)
  getPreparatorsOnDuty: async () => fetchWithCache(`${ENDPOINTS.PREPARATIONS.BASE}/preparators-on-duty`),
  
  /**
   * Démarrer une tâche (méthode standard via serveur)
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo "before"
   * @param {string} notes - Notes optionnelles
   * @returns {Promise} Résultat de l'opération
   */
  startTask: async (preparationId, taskType, photo, notes) => {
    const formData = new FormData();
    formData.append('photos', photo);
    if (notes) formData.append('notes', notes);
    
    const response = await api.post(
      `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/start`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
  
  /**
   * Terminer une tâche (méthode standard via serveur)
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo "after"
   * @param {Object} additionalData - Données additionnelles
   * @returns {Promise} Résultat de l'opération
   */
  completeTask: async (preparationId, taskType, photo, additionalData = {}) => {
    const formData = new FormData();
    formData.append('photos', photo);
    
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
  
  /**
   * Ajouter une photo additionnelle à une tâche
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo
   * @param {string} description - Description de la photo
   * @returns {Promise} Résultat de l'opération
   */
  addTaskPhoto: async (preparationId, taskType, photo, description) => {
    const formData = new FormData();
    formData.append('photos', photo);
    if (description) formData.append('description', description);
    
    const response = await api.post(
      `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
  
  /**
   * Ajouter une photo à une tâche via S3
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo
   * @param {string} description - Description de la photo
   * @returns {Promise} Résultat de l'opération
   */
  addTaskPhotoWithDirectS3: async (preparationId, taskType, photo, description) => {
    try {
      // 1. Upload direct à S3
      const uploadResult = await uploadService.uploadDirect(photo);
      
      // 2. Enregistrer les métadonnées
      const formData = new FormData();
      formData.append('photoUrl', uploadResult.url);
      if (description) formData.append('description', description);
      
      const response = await api.post(
        `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/photos-with-s3`,
        formData
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de photo avec S3:', error);
      throw error;
    }
  },
  
  // Terminer une préparation
  completePreparation: async (preparationId, data) => {
    const response = await api.put(`${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/complete`, data);
    return response.data;
  },
  
  /**
   * Uploader des photos pour une préparation (dommages, etc.)
   * @param {string} preparationId - ID de la préparation
   * @param {File|Array<File>} photos - Photo(s) à uploader
   * @param {string} type - Type de photo (damage, other, etc.)
   * @returns {Promise} Résultat de l'opération
   */
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
  
  /**
   * Uploader des photos pour une préparation via S3
   * @param {string} preparationId - ID de la préparation
   * @param {File|Array<File>} photos - Photo(s) à uploader
   * @param {string} type - Type de photo (damage, other, etc.)
   * @returns {Promise} Résultat de l'opération
   */
  uploadPhotosWithDirectS3: async (preparationId, photos, type = 'other') => {
    try {
      // Convertir en tableau si ce n'est pas déjà un tableau
      const photosArray = Array.isArray(photos) ? photos : [photos];
      
      // 1. Upload direct à S3
      const uploadResults = await uploadService.uploadMultipleDirect(photosArray);
      
      // 2. Enregistrer les métadonnées
      const formData = new FormData();
      
      uploadResults.files.forEach(result => {
        formData.append('photoUrls', result.url);
      });
      
      formData.append('type', type);
      
      const response = await api.post(
        `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/photos-with-s3`,
        formData
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload des photos avec S3:', error);
      throw error;
    }
  },
  
  /**
   * Obtenir toutes les préparations
   * @param {number} page - Numéro de page
   * @param {number} limit - Limite d'éléments par page
   * @param {string} status - Statut à filtrer
   * @param {string} userId - ID d'utilisateur à filtrer
   * @returns {Promise} Liste des préparations
   */
  getPreparations: async (page = 1, limit = 10, status = null, userId = null) => {
    let url = `${ENDPOINTS.PREPARATIONS.BASE}?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    if (userId) url += `&userId=${userId}`;
    
    return fetchWithCache(url);
  },
  
  // Obtenir une préparation spécifique
  getPreparation: async (preparationId) => fetchWithCache(ENDPOINTS.PREPARATIONS.DETAIL(preparationId)),
  
  // Rechercher des préparations par plaque d'immatriculation
  searchByLicensePlate: async (licensePlate) => 
    fetchWithCache(`${ENDPOINTS.PREPARATIONS.BASE}/search/plate?licensePlate=${licensePlate}`),

  /**
   * Upload batch de photos pour une tâche
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {Array<File>} photos - Photos à uploader
   * @param {Array<string>} photoPositions - Positions des photos (before, after, additional)
   * @returns {Promise} Résultat de l'opération
   */
  uploadBatchTaskPhotos: async (preparationId, taskType, photos, photoPositions) => {
    const formData = new FormData();

    // Ajouter chaque photo au formData
    photos.forEach((photo, index) => {
      if (photo) {
        formData.append('photos', photo);
        formData.append('photoPositions', photoPositions[index]); // before, after ou additional
      }
    });

    formData.append('taskType', taskType);
    
    const response = await api.post(
      `${ENDPOINTS.PREPARATIONS.BATCH_PHOTOS(preparationId)}`,
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 // 60 secondes
      }
    );
    return response.data;
  },
  
  /**
   * Upload batch de photos pour une tâche via S3
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {Array<File>} photos - Photos à uploader
   * @param {Array<string>} photoPositions - Positions des photos (before, after, additional)
   * @returns {Promise} Résultat de l'opération
   */
  uploadBatchTaskPhotosWithDirectS3: async (preparationId, taskType, photos, photoPositions) => {
    try {
      // Filtrer pour ne garder que les fichiers non-null
      const validPhotos = [];
      const validPositions = [];
      
      photos.forEach((photo, index) => {
        if (photo) {
          validPhotos.push(photo);
          validPositions.push(photoPositions[index]);
        }
      });
      
      // 1. Upload direct à S3
      const uploadResults = await uploadService.uploadMultipleDirect(validPhotos);
      
      // 2. Enregistrer les métadonnées
      const formData = new FormData();
      
      uploadResults.files.forEach((result, index) => {
        formData.append('photoUrls', result.url);
        formData.append('photoPositions', validPositions[index]);
      });
      
      formData.append('taskType', taskType);
      
      const response = await api.post(
        `${ENDPOINTS.PREPARATIONS.BATCH_PHOTOS_S3(preparationId)}`,
        formData
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload batch avec S3:', error);
      throw error;
    }
  },
  
  /**
   * Compléter une tâche en une seule fois (before + after)
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} beforePhoto - Photo "before"
   * @param {File} afterPhoto - Photo "after"
   * @param {Object} additionalData - Données additionnelles
   * @returns {Promise} Résultat de l'opération
   */
  completeTaskInOneGo: async (preparationId, taskType, beforePhoto, afterPhoto, additionalData = {}) => {
    const formData = new FormData();
    
    // Ajouter les photos before et after
    if (beforePhoto) {
      formData.append('photos', beforePhoto);
      formData.append('photoPositions', 'before');
    }
    
    if (afterPhoto) {
      formData.append('photos', afterPhoto);
      formData.append('photoPositions', 'after');
    }
    
    formData.append('taskType', taskType);
    
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
      `${ENDPOINTS.PREPARATIONS.BATCH_PHOTOS(preparationId)}`,
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 // 60 secondes
      }
    );
    return response.data;
  },
  
  /**
   * Compléter une tâche en une seule fois via S3
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} beforePhoto - Photo "before"
   * @param {File} afterPhoto - Photo "after"
   * @param {Object} additionalData - Données additionnelles
   * @returns {Promise} Résultat de l'opération
   */
  completeTaskInOneGoWithDirectS3: async (preparationId, taskType, beforePhoto, afterPhoto, additionalData = {}) => {
    try {
      const photos = [];
      const positions = [];
      
      // Ajouter les photos valides
      if (beforePhoto) {
        photos.push(beforePhoto);
        positions.push('before');
      }
      
      if (afterPhoto) {
        photos.push(afterPhoto);
        positions.push('after');
      }
      
      // 1. Upload direct à S3
      const uploadResults = await uploadService.uploadMultipleDirect(photos);
      
      // 2. Enregistrer les métadonnées
      const formData = new FormData();
      
      uploadResults.files.forEach((result, index) => {
        formData.append('photoUrls', result.url);
        formData.append('photoPositions', positions[index]);
      });
      
      formData.append('taskType', taskType);
      
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
        `${ENDPOINTS.PREPARATIONS.BATCH_PHOTOS_S3(preparationId)}`,
        formData
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la complétion de tâche en une fois avec S3:', error);
      throw error;
    }
  }
};

export default preparationService;