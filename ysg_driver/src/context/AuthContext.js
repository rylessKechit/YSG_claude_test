import React, { createContext, useState, useContext, useEffect, useMemo, useRef } from 'react';
import authService from '../services/authService';

// Création du contexte
const AuthContext = createContext();

// Hook personnalisé pour utiliser le contexte
export const useAuth = () => useContext(AuthContext);

// Provider du contexte d'authentification
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authCheckPerformed = useRef(false);
  
  // Vérifier l'authentification au chargement
  useEffect(() => {
    if (authCheckPerformed.current) return;

    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        authCheckPerformed.current = true;
        return;
      }
      
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Erreur d\'authentification:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
        authCheckPerformed.current = true;
      }
    };
    
    checkAuth();
  }, []);
  
  // Fonctions d'authentification
  const login = async (username, password) => {
    try {
      setError(null);
      const { token, user } = await authService.login(username, password);
      localStorage.setItem('token', token);
      setCurrentUser(user);
      return user;
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur de connexion';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('token');
      setCurrentUser(null);
    }
  };
  
  // Mémoriser la valeur du contexte pour éviter des re-renders inutiles
  const value = useMemo(() => ({
    currentUser,
    loading,
    error,
    isAuthenticated: !!currentUser,
    login,
    logout
  }), [currentUser, loading, error]);
  
  // Ne rendre les enfants que lorsque l'état d'authentification est déterminé
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};