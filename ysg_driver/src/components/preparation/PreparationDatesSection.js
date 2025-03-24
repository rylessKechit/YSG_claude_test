// src/components/preparation/PreparationDatesSection.js
import React from 'react';
import DateDisplay from '../ui/DateDisplay';

const PreparationDatesSection = ({ preparation }) => {
  return (
    <div className="detail-section dates-section">
      <h2 className="section-title">
        <i className="fas fa-calendar-alt"></i> Dates
      </h2>
      
      <div className="dates-grid">
        <div className="date-item">
          <span className="date-label">Créée le:</span>
          <span className="date-value">
            <DateDisplay date={preparation.createdAt} />
          </span>
        </div>
        
        <div className="date-item">
          <span className="date-label">Débutée le:</span>
          <span className="date-value">
            <DateDisplay date={preparation.startTime} />
          </span>
        </div>
        
        <div className="date-item">
          <span className="date-label">Terminée le:</span>
          <span className="date-value">
            <DateDisplay date={preparation.endTime} />
          </span>
        </div>
        
        <div className="date-item">
          <span className="date-label">Dernière modification:</span>
          <span className="date-value">
            <DateDisplay date={preparation.updatedAt} />
          </span>
        </div>
      </div>
    </div>
  );
};

export default PreparationDatesSection;