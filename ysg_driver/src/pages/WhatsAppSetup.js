// ysg_driver/src/pages/WhatsAppSetup.js
import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import axios from 'axios';
import { API_URL } from '../config';

const WhatsAppSetup = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);
  
  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/whatsapp-status`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStatus(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur lors de la vérification du statut WhatsApp:', err);
      setError('Erreur lors de la vérification du statut WhatsApp');
      setLoading(false);
    }
  };
  
  useEffect(() => {
    checkStatus();
    
    // Vérifier le statut toutes les 10 secondes
    const interval = setInterval(checkStatus, 20000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Nouvelle fonction pour déconnecter WhatsApp
  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      setError(null);
      
      await axios.post(`${API_URL}/admin/whatsapp-disconnect`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Rafraîchir le statut
      await checkStatus();
      setDisconnecting(false);
    } catch (err) {
      console.error('Erreur lors de la déconnexion de WhatsApp:', err);
      setError('Erreur lors de la déconnexion de WhatsApp');
      setDisconnecting(false);
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
          <div className="status-card" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
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
                <p>
                  <strong>Instruction :</strong> Ouvrez WhatsApp sur votre téléphone &gt; Menu &gt; WhatsApp Web &gt; Scannez le QR code ci-dessus
                </p>
              </div>
            )}
            
            {status?.isReady && (
              <div>
                <div className="success-message" style={{ backgroundColor: '#d1fae5', padding: '15px', borderRadius: '8px', color: '#047857', marginBottom: '20px' }}>
                  <h3>WhatsApp est connecté !</h3>
                  <p>Vous pouvez maintenant envoyer des notifications aux chauffeurs.</p>
                </div>
                
                {/* Bouton de déconnexion (visible uniquement si WhatsApp est connecté) */}
                <div style={{ textAlign: 'center' }}>
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
                    disabled={disconnecting}
                  >
                    {disconnecting ? 'Déconnexion en cours...' : 'Déconnecter WhatsApp'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="info-card" style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
          <h3>Information importante</h3>
          <p>Cette solution utilise une méthode non-officielle pour se connecter à WhatsApp. Elle est destinée uniquement à des fins de test et de développement.</p>
          <p>Pour un environnement de production, nous vous recommandons d'utiliser l'API WhatsApp Business officielle.</p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSetup;