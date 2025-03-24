// src/services/userService.js (sans système de cache)
import { api, fetchWithCache } from './authService';
import { ENDPOINTS } from '../config';

const userService = {
  // Obtenir le profil de l'utilisateur sans cache
  getProfile: async () => fetchWithCache(`${ENDPOINTS.USERS.BASE}/profile`),
  
  // Mettre à jour le profil de l'utilisateur
  updateProfile: async (profileData) => {
    const response = await api.put(`${ENDPOINTS.USERS.BASE}/profile`, profileData);
    return response.data;
  },
  
  // Changer le mot de passe
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put(`${ENDPOINTS.USERS.BASE}/change-password`, {
      currentPassword,
      newPassword
    });
    return response.data;
  },
  
  // --- Méthodes administratives ---
  
  // Obtenir tous les utilisateurs (admin seulement) sans cache
  getAllUsers: async () => {
    try {
      const url = ENDPOINTS.USERS.BASE;
      
      // Vérifier si le token est présent
      if (!localStorage.getItem('token')) {
        throw new Error('Non authentifié - token manquant');
      }
      
      // Récupérer les données directement sans cache
      const data = await fetchWithCache(url);
      
      // Vérifier si les données sont valides
      if (!Array.isArray(data)) {
        console.error('Les données reçues ne sont pas un tableau:', data);
        return []; // Retourner un tableau vide plutôt que de planter
      }
      
      return data;
    } catch (error) {
      console.error('Erreur détaillée dans getAllUsers:', error);
      
      // Construire un message d'erreur plus descriptif
      let errorMessage = 'Une erreur s\'est produite lors de la récupération des utilisateurs';
      
      if (error.response) {
        errorMessage += ` - Statut: ${error.response.status}`;
        if (error.response.data && error.response.data.message) {
          errorMessage += ` - Message: ${error.response.data.message}`;
        }
      } else if (error.request) {
        errorMessage += ' - Aucune réponse du serveur';
      } else {
        errorMessage += ` - ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  },
  
  // Obtenir un utilisateur par ID (admin seulement) sans cache
  getUserById: async (userId) => fetchWithCache(ENDPOINTS.USERS.DETAIL(userId)),
  
  // Créer un nouvel utilisateur (admin seulement)
  createUser: async (userData) => {
    const response = await api.post(ENDPOINTS.USERS.BASE, userData);
    return response.data;
  },
  
  // Mettre à jour un utilisateur (admin seulement)
  updateUser: async (userId, userData) => {
    const response = await api.put(ENDPOINTS.USERS.DETAIL(userId), userData);
    return response.data;
  },
  
  // Supprimer un utilisateur (admin seulement)
  deleteUser: async (userId) => {
    const response = await api.delete(ENDPOINTS.USERS.DETAIL(userId));
    return response.data;
  }
};

export default userService;