// src/components/preparation/PreparationInfoSection.js
import React from 'react';
import StatusBadge from '../ui/StatusBadge';

const PreparationInfoSection = ({ preparation }) => {
  return (
    <div className="detail-section vehicle-info">
      <h2 className="section-title">
        <i className="fas fa-car"></i> Informations du véhicule
      </h2>
      <div className="info-item">
        <span className="info-label">Plaque d'immatriculation:</span>
        <span className="info-value highlight">{preparation.licensePlate}</span>
      </div>
      {preparation.vehicleModel && (
        <div className="info-item">
          <span className="info-label">Modèle:</span>
          <span className="info-value">{preparation.vehicleModel}</span>
        </div>
      )}
      <div className="info-item">
        <span className="info-label">Statut:</span>
        <StatusBadge status={preparation.status} />
      </div>
      <div className="info-item">
        <span className="info-label">Préparateur:</span>
        <span className="info-value">
          {preparation.userId ? preparation.userId.fullName : 'Non assigné'}
        </span>
      </div>
    </div>
  );
};

export default PreparationInfoSection;