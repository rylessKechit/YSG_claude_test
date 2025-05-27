// ysg_driver/src/pages/AutoTimelogAdmin.js (mis à jour pour les drivers)
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
  const [systemStatus, setSystemStatus] = useState(null);
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

  // Fetch system status and active users
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get system status
        const statusResponse = await axios.get('/api/system/status');
        setSystemStatus(statusResponse.data);
        
        // Get active users with timelogs
        const usersResponse = await axios.get('/api/timelogs/users/status');
        const activeUsersList = usersResponse.data.filter(user => user.status === 'active');
        setActiveUsers(activeUsersList);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Erreur lors de la récupération des données système');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Trigger driver timelog automation manually
  const triggerDriverAutomation = async () => {
    try {
      setTriggerLoading(true);
      setError(null);
      setSuccess(null);
      
      // Call the new driver automation endpoint
      const response = await axios.post('/api/timelogs/auto-process-drivers');
      
      if (response.data.success) {
        const result = response.data.result;
        let message = `Traitement terminé avec succès:\n`;
        message += `• ${result.processedDrivers} driver(s) traité(s)\n`;
        message += `• ${result.corrections.length} driver(s) avec corrections\n`;
        message += `• ${result.totalCorrections} correction(s) appliquée(s)`;
        
        setSuccess(message);
        
        // Refresh the active users list
        const updatedUsers = await axios.get('/api/timelogs/users/status');
        setActiveUsers(updatedUsers.data.filter(user => user.status === 'active'));
      } else {
        setError('Le traitement automatique a échoué');
      }
      
      setTriggerLoading(false);
      
      // Clear success message after 10 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 10000);
    } catch (err) {
      console.error('Error triggering driver automation:', err);
      setError(`Erreur lors du traitement automatique: ${err.response?.data?.message || err.message}`);
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

  // Get status badge color
  const getStatusBadgeColor = (isRunning) => {
    return isRunning ? '#10B981' : '#EF4444';
  };

  return (
    <div>
      <Navigation />
      
      <div className="admin-container">
        <h1 className="page-title">Gestion automatique des pointages drivers</h1>
        
        {error && <AlertMessage type="error" message={error} />}
        {success && (
          <AlertMessage 
            type="success" 
            message={success}
            style={{ whiteSpace: 'pre-line' }}
          />
        )}
        
        {/* System Status Section */}
        {systemStatus && (
          <div className="admin-section">
            <h2 className="section-title">
              <i className="fas fa-cogs"></i> État du système
            </h2>
            
            <div className="info-card">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <strong>Planificateur:</strong>
                  <span style={{ 
                    color: getStatusBadgeColor(systemStatus.scheduler.isRunning),
                    marginLeft: '0.5rem',
                    fontWeight: '500'
                  }}>
                    {systemStatus.scheduler.isRunning ? '✅ Actif' : '❌ Inactif'}
                  </span>
                </div>
                
                <div>
                  <strong>Tâches planifiées:</strong>
                  <span style={{ marginLeft: '0.5rem' }}>
                    {systemStatus.scheduler.jobCount}
                  </span>
                </div>
                
                <div>
                  <strong>Traitement drivers:</strong>
                  <span style={{ color: '#3B82F6', marginLeft: '0.5rem', fontWeight: '500' }}>
                    Quotidien à 3h00
                  </span>
                </div>
                
                <div>
                  <strong>Rapports auto:</strong>
                  <span style={{ color: '#10B981', marginLeft: '0.5rem', fontWeight: '500' }}>
                    Activés
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Active Users Section */}
        <div className="admin-section">
          <div className="section-header">
            <h2 className="section-title">
              <i className="fas fa-users-clock"></i> Utilisateurs en service
            </h2>
            
            <button 
              className="btn btn-primary"
              onClick={triggerDriverAutomation}
              disabled={triggerLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {triggerLoading ? (
                <>
                  <LoadingSpinner size="small" /> 
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-play-circle"></i>
                  <span>Lancer le traitement maintenant</span>
                </>
              )}
            </button>
          </div>
          
          <p className="section-description">
            Ce tableau montre tous les utilisateurs actuellement en service. Le traitement automatique s'exécute 
            chaque jour à <strong>3h00 du matin</strong> pour corriger les pointages manquants des drivers.
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
                    <th>Type de pointage</th>
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
                        <span className="type-badge">
                          {user.type === 'start_service' ? '🟢 Début service' :
                           user.type === 'start_break' ? '⏸️ Début pause' :
                           user.type === 'end_break' ? '▶️ Fin pause' :
                           user.type === 'end_service' ? '🔴 Fin service' :
                           '📝 Général'}
                        </span>
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
        
        {/* Driver Automation Info Section */}
        <div className="admin-section">
          <h2 className="section-title">
            <i className="fas fa-info-circle"></i> Traitement automatique des pointages drivers
          </h2>
          
          <div className="info-card">
            <h3 style={{ marginTop: 0, color: '#1F2937' }}>🚗 Fonctionnement pour les drivers</h3>
            
            <p><strong>Structure des pointages quotidiens (4 pointages par jour) :</strong></p>
            <div className="info-list" style={{ listStyle: 'none', paddingLeft: 0 }}>
              <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#10B981' }}>🟢</span>
                <span><strong>Début de service</strong> - Manuel obligatoire</span>
              </div>
              <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#F59E0B' }}>⏸️</span>
                <span><strong>Début de pause</strong> - Manuel (ou créé automatiquement si manquant)</span>
              </div>
              <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#3B82F6' }}>▶️</span>
                <span><strong>Fin de pause</strong> - Manuel (ou créé automatiquement 1h après le début)</span>
              </div>
              <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#EF4444' }}>🔴</span>
                <span><strong>Fin de service</strong> - Manuel (ou créé automatiquement après le dernier mouvement)</span>
              </div>
            </div>
            
            <h4 style={{ color: '#1F2937', marginTop: '1.5rem' }}>⚙️ Logique de correction automatique :</h4>
            
            <div style={{ backgroundColor: '#F0F9FF', padding: '1rem', borderRadius: '0.5rem', margin: '1rem 0' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500', color: '#0369A1' }}>
                <i className="fas fa-coffee" style={{ marginRight: '0.5rem' }}></i>
                Pause manquante complète
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#0369A1' }}>
                Si aucune pause n'est enregistrée et qu'une période d'inactivité ≥ 1h est détectée 
                entre deux actions sur mouvements, création automatique des 2 pointages de pause.
              </p>
            </div>
            
            <div style={{ backgroundColor: '#FEF3C7', padding: '1rem', borderRadius: '0.5rem', margin: '1rem 0' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500', color: '#92400E' }}>
                <i className="fas fa-play" style={{ marginRight: '0.5rem' }}></i>
                Fin de pause manquante
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400E' }}>
                Si le début de pause est enregistré mais pas la fin, création automatique 
                de la fin de pause exactement 1h après le début.
              </p>
            </div>
            
            <div style={{ backgroundColor: '#FEE2E2', padding: '1rem', borderRadius: '0.5rem', margin: '1rem 0' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500', color: '#B91C1C' }}>
                <i className="fas fa-sign-out-alt" style={{ marginRight: '0.5rem' }}></i>
                Fin de service manquante
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#B91C1C' }}>
                Si la fin de service n'est pas enregistrée, création automatique 
                à la minute près après le dernier mouvement terminé.
              </p>
            </div>
            
            <h4 style={{ color: '#1F2937', marginTop: '1.5rem' }}>📊 Rapport automatique :</h4>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>Envoyé quotidiennement après le traitement (vers 3h15)</li>
              <li>Destinataires : Administrateurs et Direction</li>
              <li>Contient le détail de toutes les corrections effectuées</li>
              <li>Permet le suivi et le contrôle des pointages</li>
            </ul>
          </div>
        </div>
        
        {/* Manual Testing Section */}
        <div className="admin-section">
          <h2 className="section-title">
            <i className="fas fa-flask"></i> Test manuel
          </h2>
          
          <div className="info-card">
            <p style={{ margin: '0 0 1rem 0' }}>
              Utilisez le bouton <strong>"Lancer le traitement maintenant"</strong> pour tester 
              le système sur les données d'hier. Cela permet de vérifier le bon fonctionnement 
              sans attendre 3h du matin.
            </p>
            
            <div style={{ 
              backgroundColor: '#FFFBEB', 
              border: '1px solid #FDE68A', 
              borderRadius: '0.5rem', 
              padding: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <i className="fas fa-exclamation-triangle" style={{ color: '#F59E0B', fontSize: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }}></i>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500', color: '#92400E' }}>
                  Important
                </p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400E' }}>
                  Le traitement manuel analyse les données de la veille. Les corrections 
                  sont définitives et un rapport sera envoyé aux administrateurs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoTimelogAdmin;