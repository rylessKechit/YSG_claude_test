// ysg_driver/src/pages/SystemMonitoring.js - COMPLET
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navigation from '../components/Navigation';
import AlertMessage from '../components/ui/AlertMessage';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import '../styles/AdminPanel.css';

const SystemMonitoring = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testResults, setTestResults] = useState(null);
  
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirection si pas admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, isAuthenticated, navigate]);

  // Charger le statut du système
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const statusResponse = await axios.get('/api/admin/system-status');
        setSystemStatus(statusResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur lors de la récupération du statut système');
        setLoading(false);
      }
    };
    
    if (currentUser?.role === 'admin') {
      fetchSystemStatus();
      // Actualiser toutes les 30 secondes
      const interval = setInterval(fetchSystemStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Tester l'auto-déconnexion
  const testAutoDisconnect = async () => {
    try {
      setActionLoading('disconnect');
      setError(null);
      setSuccess(null);
      
      const response = await axios.post('/api/admin/test-auto-disconnect');
      
      if (response.data.success) {
        const result = response.data.result;
        setTestResults(result);
        setSuccess(
          `Test terminé: ${result.disconnected}/${result.processed} utilisateur(s) déconnecté(s)`
        );
        
        // Actualiser le statut système
        const statusResponse = await axios.get('/api/admin/system-status');
        setSystemStatus(statusResponse.data);
      } else {
        setError('Le test d\'auto-déconnexion a échoué');
      }
      
      setActionLoading('');
    } catch (err) {
      console.error('Erreur:', err);
      setError(`Erreur lors du test: ${err.response?.data?.message || err.message}`);
      setActionLoading('');
    }
  };

  // Générer un rapport test
  const generateTestReport = async () => {
    try {
      setActionLoading('report');
      setError(null);
      setSuccess(null);
      
      const response = await axios.post('/api/admin/generate-test-report');
      
      if (response.data.success) {
        setSuccess('Rapport test généré et envoyé avec succès');
      } else {
        setError('La génération du rapport a échoué');
      }
      
      setActionLoading('');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Erreur:', err);
      setError(`Erreur lors de la génération: ${err.response?.data?.message || err.message}`);
      setActionLoading('');
    }
  };

  // Formater la durée
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  return (
    <div>
      <Navigation />
      
      <div className="admin-container">
        <h1 className="page-title">🖥️ Monitoring Système</h1>
        
        {error && <AlertMessage type="error" message={error} />}
        {success && <AlertMessage type="success" message={success} />}
        
        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Chargement du statut système...</p>
          </div>
        ) : (
          <>
            {/* Statut général du système */}
            {systemStatus && (
              <div className="admin-section">
                <h2 className="section-title">
                  <i className="fas fa-server"></i> État général du système
                </h2>
                
                <div className="info-card">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div className="stat-card">
                      <div className="stat-icon">👥</div>
                      <div className="stat-content">
                        <div className="stat-value">{systemStatus.system.activeUsers}</div>
                        <div className="stat-label">Utilisateurs en service</div>
                      </div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="stat-icon">📊</div>
                      <div className="stat-content">
                        <div className="stat-value">{systemStatus.system.todayTimelogs}</div>
                        <div className="stat-label">Pointages aujourd'hui</div>
                      </div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="stat-icon">🏢</div>
                      <div className="stat-content">
                        <div className="stat-value">{systemStatus.system.totalUsers}</div>
                        <div className="stat-label">Total employés</div>
                      </div>
                    </div>
                    
                    <div className="stat-card">
                      <div className="stat-icon">⏰</div>
                      <div className="stat-content">
                        <div className="stat-value">{systemStatus.system.nextAutoDisconnect}</div>
                        <div className="stat-label">Prochaine auto-déconnexion</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Utilisateurs actuellement en service */}
            {systemStatus && systemStatus.activeUsers && (
              <div className="admin-section">
                <h2 className="section-title">
                  <i className="fas fa-users-clock"></i> Utilisateurs en service
                </h2>
                
                {systemStatus.activeUsers.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-check-circle"></i>
                    <p>Aucun utilisateur n'est actuellement en service.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Poste</th>
                          <th>Début de service</th>
                          <th>Durée</th>
                          <th>État</th>
                        </tr>
                      </thead>
                      <tbody>
                        {systemStatus.activeUsers.map((user, index) => (
                          <tr key={index}>
                            <td>{user.name}</td>
                            <td>
                              <span className={`role-badge ${user.role}-role`}>
                                {user.role === 'driver' ? 'Chauffeur' : 
                                 user.role === 'preparator' ? 'Préparateur' : 
                                 user.role === 'team-leader' ? 'Chef d\'équipe' : user.role}
                              </span>
                            </td>
                            <td>{new Date(user.connectedSince).toLocaleString('fr-FR')}</td>
                            <td>{formatDuration(user.duration)}</td>
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
            )}

            {/* Actions de test */}
            <div className="admin-section">
              <h2 className="section-title">
                <i className="fas fa-flask"></i> Tests et actions manuelles
              </h2>
              
              <div className="info-card">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                  
                  {/* Test auto-déconnexion */}
                  <div className="test-section">
                    <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>
                      <i className="fas fa-power-off"></i> Auto-déconnexion
                    </h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                      Teste le système d'auto-déconnexion sur tous les utilisateurs actuellement en service.
                    </p>
                    <button 
                      className="btn btn-primary"
                      onClick={testAutoDisconnect}
                      disabled={actionLoading === 'disconnect'}
                      style={{ width: '100%' }}
                    >
                      {actionLoading === 'disconnect' ? (
                        <>
                          <LoadingSpinner size="small" />
                          <span>Test en cours...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-play"></i>
                          <span>Tester l'auto-déconnexion</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Test rapport */}
                  <div className="test-section">
                    <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>
                      <i className="fas fa-file-alt"></i> Rapport RH
                    </h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                      Génère et envoie un rapport quotidien de test aux destinataires configurés.
                    </p>
                    <button 
                      className="btn btn-primary"
                      onClick={generateTestReport}
                      disabled={actionLoading === 'report'}
                      style={{ width: '100%' }}
                    >
                      {actionLoading === 'report' ? (
                        <>
                          <LoadingSpinner size="small" />
                          <span>Génération...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane"></i>
                          <span>Générer rapport test</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Résultats du dernier test */}
            {testResults && (
              <div className="admin-section">
                <h2 className="section-title">
                  <i className="fas fa-clipboard-list"></i> Résultats du dernier test
                </h2>
                
                <div className="info-card">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="result-stat">
                      <div className="result-value">{testResults.processed}</div>
                      <div className="result-label">Utilisateurs vérifiés</div>
                    </div>
                    <div className="result-stat">
                      <div className="result-value" style={{ color: testResults.disconnected > 0 ? '#ef4444' : '#10b981' }}>
                        {testResults.disconnected}
                      </div>
                      <div className="result-label">Déconnectés</div>
                    </div>
                    <div className="result-stat">
                      <div className="result-value" style={{ color: testResults.errors.length > 0 ? '#f59e0b' : '#10b981' }}>
                        {testResults.errors.length}
                      </div>
                      <div className="result-label">Erreurs</div>
                    </div>
                  </div>

                  {testResults.errors.length > 0 && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', color: '#b91c1c' }}>Erreurs rencontrées :</h4>
                      {testResults.errors.map((error, index) => (
                        <div key={index} style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          <strong>{error.username || 'Utilisateur inconnu'}</strong>: {error.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informations système */}
            <div className="admin-section">
              <h2 className="section-title">
                <i className="fas fa-info-circle"></i> Informations système
              </h2>
              
              <div className="info-card">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>⏰ Planification automatique</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#4b5563' }}>
                      <li>Auto-déconnexion : 4h00 quotidien</li>
                      <li>Rapport quotidien : 1h00 quotidien</li>
                      <li>Rapport hebdomadaire : Lundi 2h00</li>
                      <li>Rapport mensuel : 1er du mois 2h30</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>🔧 Logique d'auto-déconnexion</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#4b5563' }}>
                      <li>Chauffeurs : 15min après dernier mouvement</li>
                      <li>Préparateurs : 15min après dernière préparation</li>
                      <li>Autres : après 12h de connexion</li>
                      <li>Tous : déconnexion forcée après 24h</li>
                    </ul>
                  </div>
                </div>
                
                <div style={{ 
                  backgroundColor: '#eff6ff', 
                  border: '1px solid #bfdbfe', 
                  borderRadius: '0.5rem', 
                  padding: '1rem',
                  marginTop: '1.5rem'
                }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e40af' }}>
                    <i className="fas fa-lightbulb" style={{ marginRight: '0.5rem' }}></i>
                    <strong>Conseil :</strong> Utilisez ces tests pour vérifier le bon fonctionnement du système avant la mise en production. 
                    Les rapports seront envoyés aux destinataires configurés (admin et direction).
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SystemMonitoring;