// src/components/movement/VehicleInfoSection.js
import React from 'react';
import StatusBadge from '../ui/StatusBadge';

const VehicleInfoSection = ({ movement }) => {
  return (
    <div className="detail-section vehicle-info">
      <h2 className="section-title">
        <i className="fas fa-car"></i> Informations du véhicule
      </h2>
      <div className="info-item">
        <span className="info-label">Plaque d'immatriculation:</span>
        <span className="info-value highlight">{movement.licensePlate}</span>
      </div>
      {movement.vehicleModel && (
        <div className="info-item">
          <span className="info-label">Modèle:</span>
          <span className="info-value">{movement.vehicleModel}</span>
        </div>
      )}
      <div className="info-item">
        <span className="info-label">Statut:</span>
        <StatusBadge status={movement.status} />
      </div>
    </div>
  );
};

export default VehicleInfoSection;