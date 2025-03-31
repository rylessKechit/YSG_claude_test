// src/services/preparationService.js - Optimisé et simplifié
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';
import uploadService from './uploadService';

const preparationService = {
  /**
   * Démarre une tâche (sans photo requise)
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {string} notes - Notes optionnelles
   * @returns {Promise} Résultat de l'opération
   */
  startTask: async (preparationId, taskType, notes = '') => {
    try {
      console.log(`[preparationService] Démarrage de la tâche ${taskType} pour la préparation ${preparationId}`);
      const response = await api.post(
        `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/start`,
        { notes }
      );
      
      console.log(`[preparationService] Résultat du démarrage:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[preparationService] Erreur lors du démarrage de la tâche ${taskType}:`, error);
      throw error;
    }
  },
  
  /**
   * Termine une tâche avec une photo via S3
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo "after"
   * @param {Object} additionalData - Données additionnelles
   * @returns {Promise} Résultat de l'opération
   */
  completeTaskWithDirectS3: async (preparationId, taskType, photo, additionalData = {}) => {
    try {
      console.log(`[preparationService] Complétion de la tâche ${taskType} avec photo via S3`);
      
      // 1. Upload direct à S3
      const uploadResult = await uploadService.uploadDirect(photo);
      console.log(`[preparationService] Photo uploadée avec succès:`, uploadResult.url);
      
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
      
      console.log(`[preparationService] Tâche complétée avec succès:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[preparationService] Erreur lors de la complétion de la tâche ${taskType} avec S3:`, error);
      throw error;
    }
  },
  
  /**
   * Upload batch de photos pour une tâche via S3
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {Array<File>} photos - Photos à uploader
   * @param {Array<string>} photoPositions - Positions des photos (before, after, additional)
   * @param {Object} additionalData - Données additionnelles
   * @returns {Promise} Résultat de l'opération
   */
  uploadBatchTaskPhotosWithDirectS3: async (preparationId, taskType, photos, photoPositions, additionalData = {}) => {
    try {
      console.log(`[preparationService] Upload batch de ${photos.length} photos pour la tâche ${taskType}`);
      
      // Filtrer pour ne garder que les fichiers non-null
      const validPhotos = [];
      const validPositions = [];
      
      photos.forEach((photo, index) => {
        if (photo) {
          validPhotos.push(photo);
          validPositions.push(photoPositions[index] || 'after');
        }
      });
      
      console.log(`[preparationService] Photos valides: ${validPhotos.length}`);
      
      // 1. Upload direct à S3
      const uploadResults = await uploadService.uploadMultipleDirect(validPhotos);
      console.log(`[preparationService] Photos uploadées avec succès:`, uploadResults);
      
      // 2. Préparer la data à envoyer à l'API
      const formData = new FormData();
      
      // S'assurer que chaque URL est correctement ajoutée
      uploadResults.files.forEach((result, index) => {
        const photoUrl = typeof result.url === 'string' 
          ? result.url
          : Array.isArray(result.url) 
            ? result.url[0]
            : String(result.url);
            
        formData.append('photoUrls', photoUrl);
        formData.append('photoPositions', validPositions[index]);
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
      
      // 3. Appeler l'API pour enregistrer les photos
      const response = await api.post(
        `${ENDPOINTS.PREPARATIONS.BATCH_PHOTOS_S3(preparationId)}`,
        formData
      );
      
      console.log(`[preparationService] Photos enregistrées avec succès:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[preparationService] Erreur lors de l'upload batch:`, error);
      throw error;
    }
  },
  
  /**
   * Ajoute une photo additionnelle à une tâche via S3
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo
   * @param {string} description - Description de la photo
   * @returns {Promise} Résultat de l'opération
   */
  addTaskPhotoWithDirectS3: async (preparationId, taskType, photo, description) => {
    try {
      console.log(`[preparationService] Ajout d'une photo additionnelle à la tâche ${taskType}`);
      
      // 1. Upload direct à S3
      const uploadResult = await uploadService.uploadDirect(photo);
      console.log(`[preparationService] Photo additionnelle uploadée:`, uploadResult.url);
      
      // 2. Préparer les données à envoyer
      const formData = new FormData();
      formData.append('photoUrl', uploadResult.url);
      if (description) formData.append('description', description);
      
      // 3. Appeler l'API pour enregistrer la photo
      const response = await api.post(
        `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/photos-with-s3`,
        formData
      );
      
      console.log(`[preparationService] Photo additionnelle enregistrée:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[preparationService] Erreur lors de l'ajout de photo additionnelle:`, error);
      throw error;
    }
  },
  
  /**
   * Terminer une préparation
   * @param {string} preparationId - ID de la préparation
   * @param {Object} data - Données additionnelles (notes, etc.)
   * @returns {Promise} Résultat de l'opération
   */
  completePreparation: async (preparationId, data) => {
    try {
      console.log(`[preparationService] Terminer la préparation ${preparationId}`);
      const response = await api.put(`${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/complete`, data);
      console.log(`[preparationService] Préparation terminée:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[preparationService] Erreur lors de la complétion de la préparation:`, error);
      throw error;
    }
  },
  
  /**
   * Récupérer une préparation
   * @param {string} preparationId - ID de la préparation
   * @returns {Promise} Détails de la préparation
   */
  getPreparation: async (preparationId) => {
    try {
      console.log(`[preparationService] Récupération de la préparation ${preparationId}`);
      const response = await api.get(ENDPOINTS.PREPARATIONS.DETAIL(preparationId));
      console.log(`[preparationService] Préparation récupérée:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[preparationService] Erreur lors de la récupération de la préparation:`, error);
      throw error;
    }
  },
  
  /**
   * Récupérer la liste des préparations
   * @param {number} page - Numéro de page
   * @param {number} limit - Limite d'éléments par page
   * @param {string} status - Statut à filtrer
   * @param {string} userId - ID d'utilisateur à filtrer
   * @returns {Promise} Liste des préparations
   */
  getPreparations: async (page = 1, limit = 10, status = null, userId = null) => {
    try {
      let url = `${ENDPOINTS.PREPARATIONS.BASE}?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      if (userId) url += `&userId=${userId}`;
      
      console.log(`[preparationService] Récupération des préparations:`, url);
      const response = await api.get(url);
      console.log(`[preparationService] Préparations récupérées:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[preparationService] Erreur lors de la récupération des préparations:`, error);
      throw error;
    }
  },
  
  /**
   * Créer une nouvelle préparation
   * @param {Object} preparationData - Données de la préparation
   * @returns {Promise} Résultat de la création
   */
  createPreparation: async (preparationData) => {
    try {
      console.log(`[preparationService] Création d'une préparation:`, preparationData);
      const response = await api.post(ENDPOINTS.PREPARATIONS.BASE, preparationData);
      console.log(`[preparationService] Préparation créée:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[preparationService] Erreur lors de la création de la préparation:`, error);
      throw error;
    }
  },
  
  /**
   * Obtenir les préparateurs en service
   * @returns {Promise} Liste des préparateurs en service
   */
  getPreparatorsOnDuty: async () => {
    try {
      console.log(`[preparationService] Récupération des préparateurs en service`);
      const response = await api.get(`${ENDPOINTS.PREPARATIONS.BASE}/preparators-on-duty`);
      console.log(`[preparationService] Préparateurs en service récupérés:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[preparationService] Erreur lors de la récupération des préparateurs en service:`, error);
      throw error;
    }
  }
};

export default preparationService;