// src/services/authService.js
import axios from 'axios';
import { API_URL, ENDPOINTS } from '../config';

// Gestion du cache
const cache = new Map();
const pendingRequests = new Map();
const CACHE_DURATION = 60000; // 1 minute en millisecondes

// Configuration d'Axios avec intercepteurs
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Intercepteur pour ajouter le token aux requêtes
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, error => Promise.reject(error));

// Intercepteur pour gérer les 401 (token expiré)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Fonction optimisée pour faire des requêtes GET avec cache
const fetchWithCache = async (endpoint, options = {}) => {
  const cacheKey = `${endpoint}${JSON.stringify(options)}`;
  
  // Si déjà en cours pour cette clé, attendre la résolution
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Vérification du cache
  const cachedItem = cache.get(cacheKey);
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
    return cachedItem.data;
  }
  
  // Créer une promesse pour cette requête
  const request = api.get(endpoint, options).then(response => {
    // Stocker dans le cache
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });
    
    // Supprimer des requêtes en cours
    pendingRequests.delete(cacheKey);
    
    return response.data;
  }).catch(error => {
    // Supprimer des requêtes en cours
    pendingRequests.delete(cacheKey);
    throw error;
  });
  
  // Enregistrer la requête en cours
  pendingRequests.set(cacheKey, request);
  
  return request;
};

// Fonction sans cache pour les requêtes qui ne doivent pas être mises en cache
const fetchWithoutCache = async (endpoint, options = {}) => {
  const response = await api.get(endpoint, options);
  return response.data;
};

// Vider le cache
const invalidateCache = () => {
  cache.clear();
};

// Service d'authentification
const authService = {
  login: async (username, password) => {
    const response = await api.post(ENDPOINTS.AUTH.LOGIN, { username, password });
    return response.data;
  },
  
  register: async (userData) => {
    const response = await api.post(ENDPOINTS.AUTH.REGISTER, userData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    // Utiliser fetchWithCache pour la requête getCurrentUser
    return fetchWithCache(ENDPOINTS.AUTH.ME);
  },
  
  logout: async () => {
    try {
      await api.post(ENDPOINTS.AUTH.LOGOUT);
    } finally {
      localStorage.removeItem('token');
      invalidateCache(); // Vider le cache lors de la déconnexion
    }
  }
};

export default authService;
export { api, fetchWithCache, fetchWithoutCache, invalidateCache };