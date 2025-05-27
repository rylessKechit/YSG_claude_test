// src/pages/AutoTimelogAdmin.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navigation from '../components/Navigation';
import AlertMessage from '../components/ui/AlertMessage';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ENDPOINTS } from '../config';
import '../styles/AdminPanel.css';

const AutoTimelogAdmin = () => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, isAuthenticated, navigate]);

  // Fetch active users
  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get all users with active timelogs
        const response = await axios.get('/api/timelogs/users/status');
        
        // Filter only active users
        const activeUsersList = response.data.filter(user => user.status === 'active');
        
        setActiveUsers(activeUsersList);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching active users:', err);
        setError('Erreur lors de la récupération des utilisateurs en service');
        setLoading(false);
      }
    };
    
    fetchActiveUsers();
  }, []);

  // Trigger auto-timelog cleanup
  const triggerAutoCleanup = async () => {
    try {
      setTriggerLoading(true);
      setError(null);
      setSuccess(null);
      
      // Call the auto-cleanup endpoint
      const response = await axios.post('/api/timelogs/auto-cleanup');
      
      if (response.data.success) {
        setSuccess('Nettoyage automatique des pointages effectué avec succès');
        
        // Refresh the active users list
        const updatedUsers = await axios.get('/api/timelogs/users/status');
        setActiveUsers(updatedUsers.data.filter(user => user.status === 'active'));
      } else {
        setError('Le nettoyage automatique a échoué');
      }
      
      setTriggerLoading(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err) {
      console.error('Error triggering auto cleanup:', err);
      setError(`Erreur lors du nettoyage automatique: ${err.response?.data?.message || err.message}`);
      setTriggerLoading(false);
    }
  };
  
  // Format the time duration
  const formatDuration = (startTime) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}min`;
  };

  return (
    <div>
      <Navigation />
      
      <div className="admin-container">
        <h1 className="page-title">Gestion des pointages automatiques</h1>
        
        {error && <AlertMessage type="error" message={error} />}
        {success && <AlertMessage type="success" message={success} />}
        
        <div className="admin-section">
          <div className="section-header">
            <h2 className="section-title">
              <i className="fas fa-clock"></i> Utilisateurs en service
            </h2>
            
            <button 
              className="btn btn-primary"
              onClick={triggerAutoCleanup}
              disabled={triggerLoading}
            >
              {triggerLoading ? (
                <>
                  <LoadingSpinner size="small" /> En cours...
                </>
              ) : (
                <>
                  <i className="fas fa-broom"></i> Nettoyer automatiquement
                </>
              )}
            </button>
          </div>
          
          <p className="section-description">
            Ce tableau montre tous les utilisateurs actuellement en service. Le nettoyage automatique mettra fin aux services 
            qui devraient être terminés (15 minutes après la dernière activité).
          </p>
          
          {loading ? (
            <div className="loading-container">
              <LoadingSpinner />
              <p>Chargement des utilisateurs en service...</p>
            </div>
          ) : activeUsers.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-check-circle"></i>
              <p>Aucun utilisateur n'est actuellement en service.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Début de service</th>
                    <th>Durée</th>
                    <th>Localisation</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.map(user => (
                    <tr key={user._id}>
                      <td>{user.fullName}</td>
                      <td>
                        <span className={`role-badge ${user.role}-role`}>
                          {user.role === 'admin' ? 'Admin' : 
                           user.role === 'driver' ? 'Chauffeur' : 
                           user.role === 'preparator' ? 'Préparateur' : 
                           user.role === 'team-leader' ? 'Chef d\'équipe' : 
                           'Direction'}
                        </span>
                      </td>
                      <td>{new Date(user.startTime).toLocaleString('fr-FR')}</td>
                      <td>{formatDuration(user.startTime)}</td>
                      <td>
                        {user.location && user.location.startLocation && user.location.startLocation.name ? 
                          user.location.startLocation.name : 'N/A'}
                      </td>
                      <td>
                        <span className="status-badge active">
                          <i className="fas fa-circle"></i> En service
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="admin-section">
          <h2 className="section-title">
            <i className="fas fa-info-circle"></i> À propos du nettoyage automatique
          </h2>
          
          <div className="info-card">
            <p>
              <strong>Fonctionnement:</strong> Le système nettoie automatiquement les pointages à 4h00 du matin (heure de Paris). 
              Il met fin aux services des utilisateurs 15 minutes après leur dernière activité terminée.
            </p>
            
            <ul className="info-list">
              <li>
                <i className="fas fa-car"></i> 
                <span>Pour les <strong>chauffeurs</strong> et <strong>chefs d'équipe</strong>, le service est terminé 15 minutes après leur dernier mouvement terminé.</span>
              </li>
              <li>
                <i className="fas fa-tools"></i> 
                <span>Pour les <strong>préparateurs</strong>, le service est terminé 15 minutes après leur dernière préparation terminée.</span>
              </li>
            </ul>
            
            <p>
              <strong>Note:</strong> Vous pouvez déclencher manuellement le nettoyage à tout moment en utilisant le bouton ci-dessus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoTimelogAdmin;