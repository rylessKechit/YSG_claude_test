// src/components/performance/PerformanceOverview.js
import React from 'react';

const PerformanceOverview = ({ 
  performanceData,
  isDriverView = false,
  isPreparatorView = false 
}) => {
  // Vérification de sécurité pour performanceData et ses propriétés
  const period = performanceData?.period || { days: 0 };
  const overallMetrics = isDriverView 
    ? (performanceData?.globalMetrics || {}) 
    : (performanceData?.overallMetrics || {});
  
  // Convertir les minutes en format heures:minutes
  const formatTime = (minutes) => {
    if (minutes === null || isNaN(minutes)) return 'N/A';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  // Calculer le taux de complétion en fonction du type de vue
  const calculateCompletionRate = () => {
    if (isDriverView) {
      const comparativeData = performanceData?.comparativeData || [];
      const completedMovements = comparativeData.reduce(
        (sum, d) => sum + (d.metrics?.completedMovements || 0), 0
      );
      
      const totalMovements = comparativeData.reduce(
        (sum, d) => sum + (d.metrics?.totalMovements || 0), 0
      );
      
      if (totalMovements === 0) return 0;
      return Math.round((completedMovements / totalMovements) * 100);
    } else {
      const preparatorsData = performanceData?.preparatorsData || [];
      const totalCompleted = preparatorsData.reduce(
        (sum, p) => sum + (p.metrics?.completedPreparations || 0), 0
      );
      
      const totalPreps = preparatorsData.reduce(
        (sum, p) => sum + (p.metrics?.totalPreparations || 0), 0
      );
      
      if (totalPreps === 0) return 0;
      return Math.round((totalCompleted / totalPreps) * 100);
    }
  };

  // Statistiques à afficher en fonction du type de vue
  const stats = isDriverView 
    ? [
        {
          icon: "fas fa-car",
          value: overallMetrics.totalMovements || 0,
          label: "Mouvements totaux",
          color: "#3b82f6"
        },
        {
          icon: "fas fa-clock",
          value: formatTime(overallMetrics.averageCompletionTime || 0),
          label: "Temps moyen de complétion",
          color: "#10b981"
        },
        {
          icon: "fas fa-route",
          value: formatTime(overallMetrics.averageMovementTime || 0),
          label: "Temps moyen de trajet",
          color: "#f59e0b"
        },
        {
          icon: "fas fa-chart-line",
          value: ((overallMetrics.totalMovements || 0) / (period.days || 1)).toFixed(1),
          label: "Moyenne par jour",
          color: "#6366f1"
        }
      ]
    : [
        {
          icon: "fas fa-car-side",
          value: overallMetrics.totalPreparations || 0,
          label: "Préparations totales",
          color: "#3b82f6"
        },
        {
          icon: "fas fa-clock",
          value: formatTime(overallMetrics.avgCompletionTime || 0),
          label: "Temps moyen de complétion",
          color: "#10b981"
        },
        {
          icon: "fas fa-calendar-check",
          value: `${calculateCompletionRate()}%`,
          label: "Taux de complétion",
          color: "#f59e0b"
        },
        {
          icon: "fas fa-chart-line",
          value: (overallMetrics.avgPreparationsPerDay || 0).toFixed(1),
          label: "Moyenne par jour",
          color: "#6366f1"
        }
      ];

  return (
    <div className="performance-overview-section">
      <h2 className="section-title">
        <i className="fas fa-tachometer-alt"></i> Vue d'ensemble
        <span className="period-info">
          {period.days || 0} jour{(period.days || 0) > 1 ? 's' : ''}
        </span>
      </h2>
      
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
              <i className={stat.icon}></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceOverview;