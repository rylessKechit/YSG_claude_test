// src/components/performance/DestinationsChart.js
import React, { useState, useEffect } from 'react';
import driverPerformanceService from '../../services/driverPerformanceService';

const DestinationsChart = ({ performanceData }) => {
  const [destinationStats, setDestinationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // S'assurer que period existe avec des valeurs par défaut
  const period = performanceData?.period || { 
    startDate: new Date().toISOString().split('T')[0], 
    endDate: new Date().toISOString().split('T')[0],
    days: 0
  };
  
  // Charger les statistiques de destination
  useEffect(() => {
    const loadDestinationStats = async () => {
      try {
        setLoading(true);
        
        // S'assurer que startDate et endDate sont définis
        const startDate = period.startDate;
        const endDate = period.endDate;
        
        if (!startDate || !endDate) {
          setDestinationStats({
            totalDestinations: 0,
            totalMovements: 0,
            destinationStats: []
          });
          setLoading(false);
          return;
        }
        
        const stats = await driverPerformanceService.getDestinationStats(
          startDate, 
          endDate
        );
        setDestinationStats(stats);
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des statistiques de destination:', err);
        setError('Erreur de chargement des données');
        setLoading(false);
      }
    };
    
    if (period.startDate && period.endDate) {
      loadDestinationStats();
    } else {
      setLoading(false);
    }
  }, [period]);

  // Formatage du temps en minutes
  const formatTime = (minutes) => {
    if (minutes === undefined || minutes === null) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  // Obtenir un dégradé de couleurs pour les barres
  const getBarColor = (index, total) => {
    const colors = [
      '#3b82f6', // bleu
      '#10b981', // vert
      '#f59e0b', // orange
      '#6366f1', // indigo
      '#ec4899', // rose
      '#8b5cf6'  // violet
    ];
    return colors[index % colors.length];
  };

  // Calculer le pourcentage pour la largeur des barres
  const getBarWidth = (value, total) => {
    if (!total) return 0;
    return (value / total) * 100;
  };

  if (loading) {
    return (
      <div className="chart-card destinations-chart">
        <div className="chart-header">
          <h2 className="chart-title">
            <i className="fas fa-map-marker-alt"></i> Destinations principales
          </h2>
        </div>
        <div className="chart-content loading">
          <div className="loading-spinner-small"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-card destinations-chart">
        <div className="chart-header">
          <h2 className="chart-title">
            <i className="fas fa-map-marker-alt"></i> Destinations principales
          </h2>
        </div>
        <div className="chart-content error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Limiter à 5 destinations principales et s'assurer que destinationStats existe
  const topDestinations = (destinationStats && destinationStats.destinationStats) 
    ? destinationStats.destinationStats.slice(0, 5) 
    : [];

  return (
    <div className="chart-card destinations-chart">
      <div className="chart-header">
        <h2 className="chart-title">
          <i className="fas fa-map-marker-alt"></i> Destinations principales
        </h2>
      </div>
      
      <div className="chart-content">
        {topDestinations.length > 0 ? (
          <>
            <div className="destination-stats">
              <div className="stats-header">
                <div className="destination-name">Destination</div>
                <div className="destination-count">Trajets</div>
                <div className="destination-time">Temps moyen</div>
              </div>
              
              {topDestinations.map((dest, index) => (
                <div key={index} className="destination-row">
                  <div className="destination-name">
                    {dest.destination}
                  </div>
                  <div className="destination-count">
                    <div className="destination-bar-container">
                      <div 
                        className="destination-bar" 
                        style={{
                          width: `${getBarWidth(dest.count, destinationStats.totalMovements)}%`,
                          backgroundColor: getBarColor(index, topDestinations.length)
                        }}
                      ></div>
                      <span>{dest.count} ({dest.percentage}%)</span>
                    </div>
                  </div>
                  <div className="destination-time">
                    {formatTime(dest.averageCompletionTimeMinutes)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="destinations-summary">
              <div className="summary-item">
                <div className="summary-value">{destinationStats.totalDestinations || 0}</div>
                <div className="summary-label">Destinations uniques</div>
              </div>
              <div className="summary-item">
                <div className="summary-value">{destinationStats.totalMovements || 0}</div>
                <div className="summary-label">Mouvements totaux</div>
              </div>
            </div>
          </>
        ) : (
          <div className="no-data-message">
            Aucune donnée de destination disponible pour cette période
          </div>
        )}
      </div>
    </div>
  );
};

export default DestinationsChart;