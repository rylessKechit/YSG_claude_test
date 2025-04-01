// src/services/preparationService.js - Optimisé
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';
import uploadService from './uploadService';

// Cache local pour minimiser les appels API
const preparationCache = {
  items: new Map(),
  expiryTimes: new Map(),
  
  // Ajouter un élément au cache avec expiration en secondes
  add(key, data, expirySeconds = 300) {
    this.items.set(key, data);
    this.expiryTimes.set(key, Date.now() + (expirySeconds * 1000));
  },
  
  // Récupérer un élément s'il existe et n'est pas expiré
  get(key) {
    if (this.items.has(key) && Date.now() < this.expiryTimes.get(key)) {
      return this.items.get(key);
    }
    return null;
  },
  
  // Invalider un élément du cache
  invalidate(key) {
    this.items.delete(key);
    this.expiryTimes.delete(key);
  },
  
  // Invalider tous les éléments liés à une préparation
  invalidatePreparation(id) {
    // Invalider la préparation spécifique
    this.invalidate(`preparation_${id}`);
    
    // Invalider aussi toutes les listes de préparations
    this.items.forEach((_, key) => {
      if (key.startsWith('preparations_list')) {
        this.invalidate(key);
      }
    });
  }
};

const preparationService = {
  /**
   * Upload photo à S3 puis démarre une tâche - optimisé avec mise en cache
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo
   * @param {Object} notes - Notes additionnelles
   * @returns {Promise} Résultat de l'opération
   */
  startTaskWithDirectS3: async (preparationId, taskType, photo, notes = '') => {
    try {
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
      
      // Invalider le cache pour cette préparation
      preparationCache.invalidatePreparation(preparationId);
      
      return response.data;
    } catch (error) {
      console.error(`Erreur lors du démarrage de la tâche ${taskType} avec S3:`, error);
      throw error;
    }
  },
  
  /**
   * Upload photo à S3 puis complète une tâche - optimisé pour traitement parallèle
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo
   * @param {Object} additionalData - Données additionnelles
   * @returns {Promise} Résultat de l'opération
   */
  completeTaskWithDirectS3: async (preparationId, taskType, photo, additionalData = {}) => {
    try {
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
      
      // Invalider le cache pour cette préparation
      preparationCache.invalidatePreparation(preparationId);
      
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la complétion de la tâche ${taskType} avec S3:`, error);
      throw error;
    }
  },
  
  // Créer une nouvelle préparation
  createPreparation: async (preparationData) => {
    const response = await api.post(ENDPOINTS.PREPARATIONS.BASE, preparationData);
    // Invalider le cache des listes
    preparationCache.items.forEach((_, key) => {
      if (key.startsWith('preparations_list')) {
        preparationCache.invalidate(key);
      }
    });
    return response.data;
  },
  
  // Obtenir les préparateurs en service (admin seulement)
  getPreparatorsOnDuty: async () => fetchWithCache(`${ENDPOINTS.PREPARATIONS.BASE}/preparators-on-duty`),
  
  /**
   * Démarrer une tâche (sans photo requise) - optimisé avec mise en cache
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {string} notes - Notes optionnelles
   * @returns {Promise} Résultat de l'opération
   */
  startTask: async (preparationId, taskType, notes = '') => {
    try {
      const response = await api.post(
        `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/start`,
        { notes }
      );
      
      // Invalider le cache pour cette préparation
      preparationCache.invalidatePreparation(preparationId);
      
      return response.data;
    } catch (error) {
      console.error(`Erreur lors du démarrage de la tâche ${taskType}:`, error);
      throw error;
    }
  },
  
  /**
   * Terminer une tâche (photo requise) - optimisé
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo "after"
   * @param {Object} additionalData - Données additionnelles
   * @returns {Promise} Résultat de l'opération
   */
  completeTask: async (preparationId, taskType, photo, additionalData = {}) => {
    // Si photo est un tableau, on utilise uploadBatchTaskPhotosWithDirectS3
    if (Array.isArray(photo)) {
      return preparationService.uploadBatchTaskPhotosWithDirectS3(
        preparationId,
        taskType,
        photo,
        Array(photo.length).fill('after'),
        additionalData
      );
    }
    
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
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000  // Augmenté pour les uploads plus volumineux
      }
    );
    
    // Invalider le cache pour cette préparation
    preparationCache.invalidatePreparation(preparationId);
    
    return response.data;
  },
  
  /**
   * Ajouter une photo additionnelle à une tâche - optimisé
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
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000  // Augmenté pour les uploads plus volumineux
      }
    );
    
    // Invalider le cache pour cette préparation
    preparationCache.invalidatePreparation(preparationId);
    
    return response.data;
  },
  
  /**
   * Ajouter une photo à une tâche via S3 - optimisé
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {File} photo - Fichier photo
   * @param {string} description - Description de la photo
   * @returns {Promise} Résultat de l'opération
   */
  addTaskPhotoWithDirectS3: async (preparationId, taskType, photo, description) => {
    try {
      // 1. Upload direct à S3 - Utiliser le cache localement si disponible
      const uploadResult = await uploadService.uploadDirect(photo);
      
      // 2. Enregistrer les métadonnées
      const formData = new FormData();
      formData.append('photoUrl', uploadResult.url);
      if (description) formData.append('description', description);
      
      const response = await api.post(
        `${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/tasks/${taskType}/photos-with-s3`,
        formData
      );
      
      // Invalider le cache pour cette préparation
      preparationCache.invalidatePreparation(preparationId);
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de photo avec S3:', error);
      throw error;
    }
  },
  
  // Terminer une préparation
  completePreparation: async (preparationId, data) => {
    const response = await api.put(`${ENDPOINTS.PREPARATIONS.DETAIL(preparationId)}/complete`, data);
    
    // Invalider le cache pour cette préparation et toutes les listes
    preparationCache.invalidatePreparation(preparationId);
    
    return response.data;
  },
  
  /**
   * Upload batch de photos pour une tâche en utilisant S3 direct upload
   * Optimisé pour traiter plusieurs photos en parallèle et mise en cache
   * @param {string} preparationId - ID de la préparation
   * @param {string} taskType - Type de tâche
   * @param {Array<File>} photos - Photos à uploader
   * @param {Array<string>} photoPositions - Positions des photos (before, after, additional)
   * @param {Object} additionalData - Données additionnelles
   * @returns {Promise} Résultat de l'opération
   */
  uploadBatchTaskPhotosWithDirectS3: async (preparationId, taskType, photos, photoPositions, additionalData = {}) => {
    try {
      // Filtrer pour ne garder que les fichiers non-null
      const validPhotos = [];
      const validPositions = [];
      
      photos.forEach((photo, index) => {
        if (photo) {
          validPhotos.push(photo);
          validPositions.push(photoPositions[index] || 'after');
        }
      });
      
      // 1. Upload direct à S3
      const uploadResults = await uploadService.uploadMultipleDirect(validPhotos);
      
      // 2. Enregistrer les métadonnées
      const formData = new FormData();
      
      // CORRECTION: S'assurer que chaque URL est une chaîne de caractères
      uploadResults.files.forEach((result, index) => {
        // Vérifier que result.url est bien une chaîne
        const photoUrl = typeof result.url === 'string' 
          ? result.url
          : Array.isArray(result.url) 
            ? result.url[0] // Si c'est un tableau, prendre le premier élément
            : String(result.url); // Convertir en chaîne en dernier recours
            
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
      
      const response = await api.post(
        `${ENDPOINTS.PREPARATIONS.BATCH_PHOTOS_S3(preparationId)}`,
        formData,
        { timeout: 60000 }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload batch avec S3:', error);
      throw error;
    }
  },
  
  /**
   * Obtenir toutes les préparations avec cache optimisé
   * @param {number} page - Numéro de page
   * @param {number} limit - Limite d'éléments par page
   * @param {string} status - Statut à filtrer
   * @param {string} userId - ID d'utilisateur à filtrer
   * @returns {Promise} Liste des préparations
   */
  getPreparations: async (page = 1, limit = 10, status = null, userId = null) => {
    // Construire la clé de cache
    const cacheKey = `preparations_list_${page}_${limit}_${status || 'all'}_${userId || 'all'}`;
    
    // Vérifier si les données sont en cache
    const cachedData = preparationCache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    // Sinon, faire la requête
    let url = `${ENDPOINTS.PREPARATIONS.BASE}?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    if (userId) url += `&userId=${userId}`;
    
    const data = await fetchWithCache(url);
    
    // Mettre en cache pour 5 minutes
    preparationCache.add(cacheKey, data, 300);
    
    return data;
  },
  
  /**
   * Obtenir une préparation spécifique avec cache optimisé
   * @param {string} preparationId - ID de la préparation
   * @returns {Promise} Détails de la préparation
   */
  getPreparation: async (preparationId) => {
    // Construire la clé de cache
    const cacheKey = `preparation_${preparationId}`;
    
    // Vérifier si les données sont en cache
    const cachedData = preparationCache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    // Sinon, faire la requête
    const data = await fetchWithCache(ENDPOINTS.PREPARATIONS.DETAIL(preparationId));
    
    // Mettre en cache pour 2 minutes (plus court pour les détails qui peuvent changer)
    preparationCache.add(cacheKey, data, 120);
    
    return data;
  },
  
  // Rechercher des préparations par plaque d'immatriculation
  searchByLicensePlate: async (licensePlate) => {
    // Construire la clé de cache
    const cacheKey = `preparations_search_${licensePlate}`;
    
    // Vérifier si les données sont en cache
    const cachedData = preparationCache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    // Sinon, faire la requête
    const data = await fetchWithCache(`${ENDPOINTS.PREPARATIONS.BASE}/search/plate?licensePlate=${licensePlate}`);
    
    // Mettre en cache pour 2 minutes
    preparationCache.add(cacheKey, data, 120);
    
    return data;
  }
};

export default preparationService;