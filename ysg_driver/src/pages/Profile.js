import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import userService from '../services/userService';
import '../styles/Profile.css';

const Profile = () => {
  const { currentUser, logout } = useAuth();
  const [profileData, setProfileData] = useState({ fullName: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  // Charger les données du profil
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        fullName: currentUser.fullName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || ''
      });
    }
  }, [currentUser]);

  // Gérer les changements dans les formulaires
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  // Mettre à jour le profil
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setProfileError(null);
      
      await userService.updateProfile(profileData);
      
      setProfileSuccess('Profil mis à jour avec succès');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Erreur lors de la mise à jour du profil');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Changer le mot de passe
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    try {
      setLoading(true);
      setPasswordError(null);
      
      await userService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      // Réinitialiser le formulaire
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setPasswordSuccess('Mot de passe modifié avec succès');
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Erreur lors du changement de mot de passe');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navigation />
      
      <div className="profile-container">
        <h1 className="page-title">Mon profil</h1>
        
        <div className="profile-info-card">
          <h2 className="section-title">Informations personnelles</h2>
          
          {profileError && <div className="error-message">{profileError}</div>}
          {profileSuccess && <div className="success-message">{profileSuccess}</div>}
          
          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">Nom complet</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={profileData.fullName}
                onChange={handleProfileChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={profileData.email}
                onChange={handleProfileChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="phone" className="form-label">Téléphone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={profileData.phone}
                onChange={handleProfileChange}
                className="form-input"
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Mise à jour...' : 'Mettre à jour le profil'}
            </button>
          </form>
        </div>
        
        <div className="change-password-card">
          <h2 className="section-title">Changer le mot de passe</h2>
          
          {passwordError && <div className="error-message">{passwordError}</div>}
          {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}
          
          <form onSubmit={handleChangePassword} className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword" className="form-label">Mot de passe actuel</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">Nouveau mot de passe</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="form-input"
                required
                minLength="6"
              />
              <p className="help-text">Le mot de passe doit contenir au moins 6 caractères</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="form-input"
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Modification...' : 'Changer le mot de passe'}
            </button>
          </form>
        </div>
        
        <div className="account-actions">
          <button onClick={logout} className="btn btn-danger">Se déconnecter</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;