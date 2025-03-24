// src/services/authService.js (sans système de cache)
import axios from 'axios';
import { API_URL, ENDPOINTS } from '../config';

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

// Fonction directe sans cache
const fetchWithoutCache = async (endpoint, options = {}) => {
  const response = await api.get(endpoint, options);
  return response.data;
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
  
  getCurrentUser: async () => fetchWithoutCache(ENDPOINTS.AUTH.ME),
  
  logout: async () => {
    try {
      await api.post(ENDPOINTS.AUTH.LOGOUT);
    } finally {
      localStorage.removeItem('token');
    }
  }
};

// Fonction vide pour compatibilité avec le code existant (ne fait rien)
const invalidateCache = () => {}; 

export default authService;
export { api, fetchWithoutCache as fetchWithCache, invalidateCache };