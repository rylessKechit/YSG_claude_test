// src/components/performance/CompletionTimeChart.js
import React, { useState } from 'react';

const CompletionTimeChart = ({ performanceData }) => {
  const [chartType, setChartType] = useState('completion'); // 'completion', 'preparation', 'movement'
  const { comparativeData } = performanceData;
  
  // Formatage du temps en minutes en format lisible
  const formatTime = (minutes) => {
    if (minutes === undefined || minutes === null) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  // Obtenir le nom du chauffeur à partir de son ID
  const getDriverName = (id) => {
    const driver = comparativeData.find(d => d.driverId === id);
    if (!driver) return 'Inconnu';
    
    if (driver.driverInfo) return driver.driverInfo.fullName;
    return `Chauffeur ${driver.driverId.slice(0, 5)}...`;
  };

  // Obtenir la valeur métrique appropriée selon le type de graphique
  const getMetricValue = (driver) => {
    switch (chartType) {
      case 'completion':
        return driver.metrics.averageCompletionTime || 0;
      case 'preparation':
        return driver.metrics.averagePreparationTime || 0;
      case 'movement':
        return driver.metrics.averageMovementTime || 0;
      default:
        return 0;
    }
  };

  // Calculer la largeur maximale pour les barres
  const getMaxValue = () => {
    return Math.max(1, ...comparativeData.map(driver => getMetricValue(driver))) * 1.2; // Ajouter 20% de marge
  };

  // Calculer la largeur relative de la barre
  const getBarWidth = (value) => {
    const maxVal = getMaxValue();
    return maxVal > 0 ? (value / maxVal) * 100 : 0;
  };

  // Titres des différents types de graphiques
  const chartTitles = {
    completion: "Temps total de complétion",
    preparation: "Temps de préparation",
    movement: "Temps de trajet"
  };

  return (
    <div className="chart-card completion-time-chart">
      <div className="chart-header">
        <h2 className="chart-title">
          <i className="fas fa-clock"></i> {chartTitles[chartType]}
        </h2>

        <div className="chart-controls">
          <button
            className={`chart-control-btn ${chartType === 'completion' ? 'active' : ''}`}
            onClick={() => setChartType('completion')}
          >
            Temps total
          </button>
          <button
            className={`chart-control-btn ${chartType === 'preparation' ? 'active' : ''}`}
            onClick={() => setChartType('preparation')}
          >
            Préparation
          </button>
          <button
            className={`chart-control-btn ${chartType === 'movement' ? 'active' : ''}`}
            onClick={() => setChartType('movement')}
          >
            Trajet
          </button>
        </div>
      </div>

      <div className="chart-content">
        {comparativeData.map((driver) => {
          const metricValue = getMetricValue(driver);
          const barWidth = getBarWidth(metricValue);
          
          return (
            <div key={driver.driverId} className="time-bar-container">
              <div className="driver-label">
                {getDriverName(driver.driverId)}
              </div>
              <div className="bar-wrapper">
                <div 
                  className="time-bar" 
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: "#3b82f6"
                  }}
                ></div>
                <span className="bar-value">
                  {formatTime(metricValue)}
                </span>
              </div>
            </div>
          );
        })}
        
        {comparativeData.length === 0 && (
          <div className="no-data-message">
            Aucune donnée disponible pour cette période
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletionTimeChart;