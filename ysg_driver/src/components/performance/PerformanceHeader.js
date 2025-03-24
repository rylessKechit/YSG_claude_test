// src/components/performance/PerformanceHeader.js
import React, { useState } from 'react';

const PerformanceHeader = ({ onDateRangeChange, dateRange }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({ ...dateRange });
  
  // Périodes prédéfinies
  const predefinedRanges = [
    { label: '7 derniers jours', days: 7 },
    { label: '30 derniers jours', days: 30 },
    { label: '90 derniers jours', days: 90 }
  ];

  // Calculer une date en fonction du nombre de jours dans le passé
  const getDateDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  // Appliquer une période prédéfinie
  const applyPredefinedRange = (days) => {
    const newRange = {
      startDate: getDateDaysAgo(days),
      endDate: new Date().toISOString().split('T')[0]
    };
    
    onDateRangeChange(newRange);
    setTempDateRange(newRange);
  };

  // Gérer les changements dans le formulaire
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setTempDateRange(prev => ({ ...prev, [name]: value }));
  };

  // Appliquer la plage de dates personnalisée
  const applyCustomRange = () => {
    onDateRangeChange(tempDateRange);
    setShowDatePicker(false);
  };

  // Formater la plage de dates pour l'affichage
  const formatDateRange = () => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    return `${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}`;
  };

  return (
    <div className="performance-header">
      <div className="header-content">
        <h1 className="page-title">Performance des préparateurs</h1>
        
        <div className="date-filter">
          <div className="date-display" onClick={() => setShowDatePicker(!showDatePicker)}>
            <i className="fas fa-calendar-alt"></i>
            <span>{formatDateRange()}</span>
            <i className={`fas fa-chevron-${showDatePicker ? 'up' : 'down'}`}></i>
          </div>
          
          {showDatePicker && (
            <div className="date-picker-dropdown">
              <div className="predefined-ranges">
                <h3>Périodes prédéfinies</h3>
                <div className="range-buttons">
                  {predefinedRanges.map((range, index) => (
                    <button 
                      key={index} 
                      className="range-btn"
                      onClick={() => applyPredefinedRange(range.days)}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="custom-range">
                <h3>Période personnalisée</h3>
                <div className="date-inputs">
                  <div className="date-field">
                    <label>Début:</label>
                    <input 
                      type="date" 
                      name="startDate" 
                      value={tempDateRange.startDate}
                      onChange={handleDateChange}
                      max={tempDateRange.endDate}
                    />
                  </div>
                  
                  <div className="date-field">
                    <label>Fin:</label>
                    <input 
                      type="date" 
                      name="endDate" 
                      value={tempDateRange.endDate}
                      onChange={handleDateChange}
                      min={tempDateRange.startDate}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                
                <div className="range-actions">
                  <button 
                    className="btn-cancel"
                    onClick={() => setShowDatePicker(false)}
                  >
                    Annuler
                  </button>
                  <button 
                    className="btn-apply"
                    onClick={applyCustomRange}
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <p className="page-subtitle">
        Analysez et comparez les performances des préparateurs sur la période sélectionnée
      </p>
    </div>
  );
};

export default PerformanceHeader;