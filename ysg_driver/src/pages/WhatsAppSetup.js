// ysg_driver/src/pages/WhatsAppSetup.js
import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import axios from 'axios';
import { API_URL } from '../config';

const WhatsAppSetup = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState(null);
  
  // Fonction pour vérifier le statut de WhatsApp
  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/whatsapp/status`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStatus(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur lors de la vérification du statut WhatsApp:', err);
      setError(err.response?.data?.message || 'Erreur lors de la vérification du statut WhatsApp');
      setLoading(false);
    }
  };
  
  // Vérifier le statut au chargement et périodiquement
  useEffect(() => {
    checkStatus();
    
    // Vérifier le statut toutes les 20 secondes
    const interval = setInterval(checkStatus, 20000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Fonction pour déconnecter WhatsApp
  const handleDisconnect = async () => {
    try {
      setActionInProgress(true);
      setError(null);
      
      await axios.post(`${API_URL}/admin/whatsapp/disconnect`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Rafraîchir le statut
      await checkStatus();
      setActionInProgress(false);
    } catch (err) {
      console.error('Erreur lors de la déconnexion de WhatsApp:', err);
      setError(err.response?.data?.message || 'Erreur lors de la déconnexion de WhatsApp');
      setActionInProgress(false);
    }
  };
  
  // Fonction pour réinitialiser WhatsApp
  const handleReinitialize = async () => {
    try {
      setActionInProgress(true);
      setError(null);
      
      await axios.post(`${API_URL}/admin/whatsapp/reinitialize`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Rafraîchir le statut
      await checkStatus();
      setActionInProgress(false);
    } catch (err) {
      console.error('Erreur lors de la réinitialisation de WhatsApp:', err);
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation de WhatsApp');
      setActionInProgress(false);
    }
  };
  
  // Fonction pour envoyer un message de test
  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    
    if (!testPhoneNumber || !testMessage) {
      setError('Le numéro de téléphone et le message sont requis');
      return;
    }
    
    try {
      setActionInProgress(true);
      setError(null);
      setTestResult(null);
      
      const response = await axios.post(`${API_URL}/admin/whatsapp/send-message`, {
        phoneNumber: testPhoneNumber,
        message: testMessage
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setTestResult({
        success: true,
        message: 'Message envoyé avec succès',
        details: response.data.result
      });
      setActionInProgress(false);
    } catch (err) {
      console.error('Erreur lors de l\'envoi du message test:', err);
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Erreur lors de l\'envoi du message'
      });
      setActionInProgress(false);
    }
  };
  
  // Fonction pour vérifier un numéro
  const handleVerifyNumber = async () => {
    if (!testPhoneNumber) {
      setError('Le numéro de téléphone est requis');
      return;
    }
    
    try {
      setActionInProgress(true);
      setError(null);
      setTestResult(null);
      
      const response = await axios.post(`${API_URL}/admin/whatsapp/verify-number`, {
        phoneNumber: testPhoneNumber
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setTestResult({
        success: true,
        message: response.data.isValid 
          ? 'Le numéro est valide pour WhatsApp' 
          : 'Le numéro n\'est pas enregistré sur WhatsApp'
      });
      setActionInProgress(false);
    } catch (err) {
      console.error('Erreur lors de la vérification du numéro:', err);
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Erreur lors de la vérification du numéro'
      });
      setActionInProgress(false);
    }
  };
  
  return (
    <div>
      <Navigation />
      
      <div className="whatsapp-setup-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <h1 className="page-title">Configuration WhatsApp</h1>
        
        {error && (
          <div className="error-message" style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="loading-spinner" style={{ textAlign: 'center', padding: '40px' }}>
            Chargement...
          </div>
        ) : (
          <div className="status-card" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <h2>Statut de la connexion WhatsApp</h2>
            
            <div className="status-info" style={{ margin: '20px 0' }}>
              <p><strong>État:</strong> {status?.isReady ? 'Connecté' : 'Déconnecté'}</p>
              <p><strong>Message:</strong> {status?.message}</p>
            </div>
            
            {!status?.isReady && status?.qrCodeUrl && (
              <div className="qr-code-container" style={{ textAlign: 'center', margin: '20px 0' }}>
                <h3>Scannez ce QR code avec WhatsApp sur votre téléphone</h3>
                <img 
                  src={status.qrCodeUrl} 
                  alt="WhatsApp QR Code" 
                  style={{ maxWidth: '300px', margin: '20px auto', display: 'block' }}
                />
                <p style={{ backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>
                  <strong>Instruction :</strong> Ouvrez WhatsApp sur votre téléphone &gt; Menu &gt; WhatsApp Web &gt; Scannez le QR code ci-dessus
                </p>
              </div>
            )}
            
            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              {status?.isReady ? (
                <button 
                  onClick={handleDisconnect} 
                  className="btn btn-danger" 
                  style={{ 
                    backgroundColor: '#dc2626', 
                    color: 'white', 
                    border: 'none', 
                    padding: '10px 20px', 
                    borderRadius: '8px', 
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  disabled={actionInProgress}
                >
                  {actionInProgress ? 'Déconnexion en cours...' : 'Déconnecter WhatsApp'}
                </button>
              ) : (
                <button 
                  onClick={handleReinitialize} 
                  className="btn btn-primary" 
                  style={{ 
                    backgroundColor: '#2563eb', 
                    color: 'white', 
                    border: 'none', 
                    padding: '10px 20px', 
                    borderRadius: '8px', 
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  disabled={actionInProgress}
                >
                  {actionInProgress ? 'Initialisation...' : 'Réinitialiser WhatsApp'}
                </button>
              )}
            </div>
            
            {status?.isReady && (
              <div className="success-message" style={{ backgroundColor: '#d1fae5', padding: '15px', borderRadius: '8px', color: '#047857', marginTop: '20px' }}>
                <h3>WhatsApp est connecté !</h3>
                <p>Vous pouvez maintenant envoyer des notifications aux chauffeurs.</p>
              </div>
            )}
          </div>
        )}
        
        {/* Section de test pour envoyer un message */}
        {status?.isReady && (
          <div className="test-section" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <h2>Tester l'envoi de message</h2>
            
            <form onSubmit={handleSendTestMessage}>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="phoneNumber" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Numéro de téléphone:
                </label>
                <input 
                  type="text" 
                  id="phoneNumber" 
                  value={testPhoneNumber} 
                  onChange={(e) => setTestPhoneNumber(e.target.value)} 
                  placeholder="Ex: 06XXXXXXXX" 
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #d1d5db' }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="testMessage" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Message:
                </label>
                <textarea 
                  id="testMessage" 
                  value={testMessage} 
                  onChange={(e) => setTestMessage(e.target.value)} 
                  placeholder="Entrez votre message de test" 
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #d1d5db', minHeight: '100px' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ 
                    backgroundColor: '#2563eb', 
                    color: 'white', 
                    border: 'none', 
                    padding: '10px 20px', 
                    borderRadius: '8px', 
                    fontWeight: '600',
                    cursor: 'pointer',
                    flex: '1'
                  }}
                  disabled={actionInProgress}
                >
                  {actionInProgress ? 'Envoi en cours...' : 'Envoyer le message'}
                </button>
                
                <button 
                  type="button" 
                  onClick={handleVerifyNumber}
                  className="btn btn-secondary" 
                  style={{ 
                    backgroundColor: '#6b7280', 
                    color: 'white', 
                    border: 'none', 
                    padding: '10px 20px', 
                    borderRadius: '8px', 
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  disabled={actionInProgress}
                >
                  Vérifier le numéro
                </button>
              </div>
            </form>
            
            {testResult && (
              <div 
                className={testResult.success ? "success-message" : "error-message"} 
                style={{ 
                  backgroundColor: testResult.success ? '#d1fae5' : '#fee2e2', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  color: testResult.success ? '#047857' : '#b91c1c', 
                  marginTop: '20px' 
                }}
              >
                <p><strong>{testResult.message}</strong></p>
                {testResult.details && (
                  <pre style={{ 
                    marginTop: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    padding: '8px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    overflowX: 'auto'
                  }}>
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="info-card" style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: '8px' }}>
          <h3>Information importante</h3>
          <p>Cette solution utilise la bibliothèque <code>whatsapp-web.js</code> qui fonctionne via une instance de navigateur Chromium. Elle est destinée uniquement à des fins de test et de développement.</p>
          <p>Pour un environnement de production à grande échelle, nous vous recommandons d'utiliser l'API WhatsApp Business officielle.</p>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#4b5563' }}>
            Note: La liaison WhatsApp doit être maintenue active. Si le serveur redémarre, vous devrez peut-être reconnectez-vous.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSetup;