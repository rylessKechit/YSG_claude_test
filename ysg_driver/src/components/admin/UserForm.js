// src/components/admin/UserForm.js
import React from 'react';

const UserForm = ({ 
  formData, 
  formMode, 
  onChange, 
  onSubmit, 
  onCancel, 
  loading 
}) => {
  return (
    <div className="user-form-container">
      <h3 className="form-title">
        {formMode === 'create' ? 'Créer un utilisateur' : 'Modifier un utilisateur'}
      </h3>
      
      <form onSubmit={onSubmit} className="user-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Nom d'utilisateur *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={onChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              {formMode === 'create' ? 'Mot de passe *' : 'Mot de passe (laisser vide pour ne pas changer)'}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={onChange}
              className="form-input"
              required={formMode === 'create'}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">
              Nom complet *
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={onChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              className="form-input"
              required
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Téléphone *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={onChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="sixtNumber" className="form-label">
              Numéro Sixt
            </label>
            <input
              type="text"
              id="sixtNumber"
              name="sixtNumber"
              value={formData.sixtNumber}
              onChange={onChange}
              className="form-input"
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="role" className="form-label">
              Rôle *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={onChange}
              className="form-input"
              required
            >
              <option value="driver">Chauffeur</option>
              <option value="preparator">Préparateur</option>
              <option value="team-leader">Chef d'équipe</option>
              <option value="direction">Direction</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            Annuler
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'En cours...' : formMode === 'create' ? 'Créer' : 'Mettre à jour'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;