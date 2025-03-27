// src/services/uploadService.js
import { api } from './authService';
import { ENDPOINTS } from '../config';

const uploadService = {
  // Obtenir une URL pré-signée pour un upload direct vers S3
  getPresignedUrl: async (fileType, fileName) => {
    const response = await api.post(ENDPOINTS.UPLOAD.PRESIGNED_URL, {
      fileType,
      fileName
    });
    return response.data;
  },
  
  // Upload direct vers S3 en utilisant une URL pré-signée
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
  
  // Méthode simplifiée pour uploader un fichier directement
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
  
  // Upload multiple de fichiers en parallèle
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
  }
};

export default uploadService;