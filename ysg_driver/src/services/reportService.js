// src/services/reportService.js
import { api, fetchWithCache, invalidateCache } from './authService';
import { ENDPOINTS } from '../config';

const downloadFile = (blob, filename) => {
  // Créer un URL pour le blob
  const url = window.URL.createObjectURL(blob);
  
  // Créer un élément de lien temporaire
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  
  // Ajouter à la page, cliquer puis supprimer
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Libérer l'URL
  window.URL.revokeObjectURL(url);
};

const reportService = {
  // Générer un rapport de mouvements de véhicules
  generateMovementsReport: async (params) => {
    try {
      // Construire l'URL avec les paramètres
      let url = `${ENDPOINTS.REPORTS.MOVEMENTS}`;
      const queryParams = [];
      
      if (params.startDate) {
        queryParams.push(`startDate=${params.startDate}`);
      }
      
      if (params.endDate) {
        queryParams.push(`endDate=${params.endDate}`);
      }
      
      if (params.status) {
        queryParams.push(`status=${params.status}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      // Note: pas de cache pour les rapports, car ce sont des fichiers binaires
      // Faire la requête avec responseType 'blob' pour recevoir un fichier
      const response = await api.get(url, {
        responseType: 'blob'
      });
      
      // Définir un nom de fichier avec la date actuelle
      const filename = `mouvements_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Télécharger le fichier
      downloadFile(response.data, filename);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  },
  
  // Générer un rapport de préparations de véhicules
  generatePreparationsReport: async (params) => {
    try {
      // Construire l'URL avec les paramètres
      let url = `${ENDPOINTS.REPORTS.PREPARATIONS}`;
      const queryParams = [];
      
      if (params.startDate) {
        queryParams.push(`startDate=${params.startDate}`);
      }
      
      if (params.endDate) {
        queryParams.push(`endDate=${params.endDate}`);
      }
      
      if (params.status) {
        queryParams.push(`status=${params.status}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      // Note: pas de cache pour les rapports, car ce sont des fichiers binaires
      // Faire la requête avec responseType 'blob' pour recevoir un fichier
      const response = await api.get(url, {
        responseType: 'blob'
      });
      
      // Définir un nom de fichier avec la date actuelle
      const filename = `preparations_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Télécharger le fichier
      downloadFile(response.data, filename);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
};

export default reportService;