// src/components/preparation/PreparationInfoSection.js
import React from 'react';

const PreparationInfoSection = ({ preparation }) => {
  return (
    <div className="vehicle-info">
      <h2>
        <i className="fas fa-car"></i> Informations du véhicule
      </h2>
      
      <div className="info-list">
        <div className="info-item">
          <span className="info-label">Plaque d'immatriculation:</span>
          <span className="info-value highlight">{preparation.licensePlate}</span>
        </div>
        
        <div className="info-item">
          <span className="info-label">Modèle:</span>
          <span className="info-value">{preparation.vehicleModel || 'Non disponible'}</span>
        </div>
        
        <div className="info-item">
          <span className="info-label">Statut:</span>
          <span className={`task-status ${preparation.status === 'pending' 
            ? 'not_started' 
            : preparation.status === 'in-progress' 
              ? 'in_progress' 
              : 'completed'}`}>
            <i className={`fas ${preparation.status === 'pending' 
              ? 'fa-clock' 
              : preparation.status === 'in-progress' 
                ? 'fa-spinner' 
                : 'fa-check-circle'}`}></i>
            {preparation.status === 'pending' && 'En attente'}
            {preparation.status === 'in-progress' && 'En cours'}
            {preparation.status === 'completed' && 'Terminée'}
          </span>
        </div>
        
        <div className="info-item">
          <span className="info-label">Préparateur:</span>
          <span className="info-value">
            {preparation.userId ? preparation.userId.fullName : 'Non assigné'}
          </span>
        </div>
      </div>
    </div>
  );
};


export default PreparationInfoSection;