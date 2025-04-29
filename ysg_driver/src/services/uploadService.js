// src/services/uploadService.js
import { api } from './authService';
import { ENDPOINTS } from '../config';

const uploadService = {
  /**
   * Obtient une URL pré-signée pour uploader directement vers S3
   * @param {string} fileType - MIME type du fichier (ex: 'image/jpeg')
   * @param {string} fileName - Nom du fichier original (ex: 'photo.jpg')
   * @returns {Promise} Promise avec l'URL pré-signée et l'URL finale du fichier
   */
  getPresignedUrl: async (fileType, fileName) => {
    try {
      const response = await api.post(ENDPOINTS.UPLOAD.PRESIGNED_URL, {
        fileType,
        fileName
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la demande d\'URL pré-signée:', error);
      throw error;
    }
  },
  
  /**
   * Upload un fichier directement vers S3 en utilisant une URL pré-signée
   * @param {string} presignedUrl - URL pré-signée obtenue de l'API
   * @param {File} file - Objet File à uploader
   * @returns {Promise} Promise contenant le résultat de l'upload
   */
  uploadWithPresignedUrl: async (presignedUrl, file) => {
    try {
      
      // Utiliser fetch au lieu d'axios car nous devons envoyer des données binaires brutes
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de l'upload: ${response.status} ${response.statusText}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'upload direct:', error);
      throw error;
    }
  },
  
  /**
   * Méthode simplifiée pour uploader un fichier directement vers S3
   * @param {File} file - Objet File à uploader
   * @returns {Promise} Promise contenant l'URL du fichier et le statut de l'upload
   */
  uploadDirect: async (file) => {
    try {
      
      // 1. Obtenir une URL pré-signée
      const { presignedUrl, fileUrl } = await uploadService.getPresignedUrl(
        file.type,
        file.name
      );
      
      // 2. Uploader directement à S3
      await uploadService.uploadWithPresignedUrl(presignedUrl, file);
      
      // 3. Retourner l'URL publique du fichier
      return {
        url: fileUrl,
        success: true
      };
    } catch (error) {
      console.error('Erreur lors de l\'upload direct:', error);
      throw error;
    }
  },
  
  /**
   * Upload multiple de fichiers en parallèle
   * @param {Array<File>} files - Tableau de fichiers à uploader
   * @returns {Promise} Promise contenant les résultats des uploads
   */
  uploadMultipleDirect: async (files) => {
    try {
      
      const uploadPromises = Array.from(files).map(file => 
        uploadService.uploadDirect(file)
      );
      
      const results = await Promise.all(uploadPromises);
      
      return {
        success: true,
        files: results
      };
    } catch (error) {
      console.error('Erreur lors de l\'upload multiple direct:', error);
      throw error;
    }
  },
  
  /**
   * Méthode alternative: upload via l'API du serveur (pas directement à S3)
   * @param {File} file - Fichier à uploader
   * @returns {Promise} Promise contenant le résultat de l'upload
   */
  uploadViaServer: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        ENDPOINTS.UPLOAD.SINGLE,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000 // 30 secondes
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload via serveur:', error);
      throw error;
    }
  },
  
  /**
   * Upload multiple de fichiers via l'API du serveur
   * @param {Array<File>} files - Tableau de fichiers à uploader
   * @returns {Promise} Promise contenant les résultats des uploads
   */
  uploadMultipleViaServer: async (files) => {
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      
      const response = await api.post(
        ENDPOINTS.UPLOAD.MULTIPLE,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000 // 60 secondes
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'upload multiple via serveur:', error);
      throw error;
    }
  }
};

export default uploadService;