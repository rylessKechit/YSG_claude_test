// src/components/preparation/PreparationDatesSection.js
import React from 'react';

const PreparationDatesSection = ({ preparation }) => {
  const formatDate = (date) => {
    if (!date) return 'Non disponible';
    
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="dates-section">
      <h2>
        <i className="fas fa-calendar-alt"></i> Dates
      </h2>
      
      <span className="dates-badge">
        <i className="fas fa-history"></i> Historique
      </span>
      
      <div className="dates-grid">
        <div className="date-item">
          <span className="date-label">Créée le:</span>
          <span className="date-value">
            {formatDate(preparation.createdAt)}
          </span>
        </div>
        
        <div className="date-item">
          <span className="date-label">Débutée le:</span>
          <span className="date-value">
            {formatDate(preparation.startTime)}
          </span>
        </div>
        
        <div className="date-item">
          <span className="date-label">Terminée le:</span>
          <span className="date-value">
            {formatDate(preparation.endTime)}
          </span>
        </div>
        
        <div className="date-item">
          <span className="date-label">Dernière modification:</span>
          <span className="date-value">
            {formatDate(preparation.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PreparationDatesSection;