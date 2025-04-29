// src/components/movement/DriverAssignmentSection.js
import React, { useState } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';

const DriverAssignmentSection = ({ 
  movement, 
  allDrivers, 
  loadingDrivers, 
  onAssignDriver, 
  updateLoading 
}) => {
  const [selectedDriver, setSelectedDriver] = useState('');
  
  // Séparation des chauffeurs en service et hors service
  const driversOnDuty = allDrivers.filter(driver => driver.isOnDuty);
  const driversOffDuty = allDrivers.filter(driver => !driver.isOnDuty);
  
  // Interface d'assignation ou de modification de chauffeur
  const AssignmentUI = ({ buttonText, existingDriver = false }) => (
    <div className="assign-form">
      <select 
        value={selectedDriver} 
        onChange={(e) => setSelectedDriver(e.target.value)}
        className="form-select"
      >
        <option value="">Sélectionnez un chauffeur</option>
        {driversOnDuty.length > 0 && (
          <optgroup label="Chauffeurs en service">
            {driversOnDuty.map(driver => (
              <option key={driver._id} value={driver._id}>
                {driver.fullName} - En service
              </option>
            ))}
          </optgroup>
        )}
        {driversOffDuty.length > 0 && (
          <optgroup label="Chauffeurs hors service">
            {driversOffDuty.map(driver => (
              <option key={driver._id} value={driver._id}>
                {driver.fullName} - Hors service
              </option>
            ))}
          </optgroup>
        )}
      </select>
      
      <button 
        onClick={() => {
          if (selectedDriver) {
            onAssignDriver(selectedDriver);
            setSelectedDriver('');
          }
        }}
        className="btn btn-primary"
        disabled={updateLoading || !selectedDriver}
      >
        {updateLoading ? 'Mise à jour...' : buttonText}
      </button>
    </div>
  );

  // Vérifie si le mouvement peut être modifié (statut)
  const canModifyMovement = movement.status === 'pending' || movement.status === 'assigned';

  return (
    <div className="detail-section driver-assignment">
      <h2 className="section-title">
        <i className="fas fa-user"></i> Chauffeur assigné
      </h2>
      
      {movement.userId ? (
        // Chauffeur déjà assigné
        <div className="assigned-driver">
          <div className="info-item">
            <span className="info-label">Chauffeur:</span>
            <span className="info-value">{movement.userId.fullName}</span>
          </div>
          
          {/* Option pour modifier le chauffeur si le mouvement n'est pas démarré */}
          {canModifyMovement && (
            <div className="change-driver">
              <h3 className="subsection-title">Modifier le chauffeur</h3>
              
              {loadingDrivers ? (
                <div className="loading-indicator-small">
                  <LoadingSpinner size="small" /> Chargement des chauffeurs...
                </div>
              ) : (
                <AssignmentUI buttonText="Changer de chauffeur" existingDriver={true} />
              )}
            </div>
          )}
        </div>
      ) : (
        // Aucun chauffeur assigné
        <div className="no-driver-assigned">
          <p className="no-assignment-message">Aucun chauffeur assigné à ce mouvement.</p>
          
          {loadingDrivers ? (
            <div className="loading-indicator-small">
              <LoadingSpinner size="small" /> Chargement des chauffeurs...
            </div>
          ) : (
            <AssignmentUI buttonText="Assigner un chauffeur" />
          )}
        </div>
      )}
    </div>
  );
};

export default DriverAssignmentSection;