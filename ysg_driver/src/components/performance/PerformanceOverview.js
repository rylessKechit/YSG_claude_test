// src/components/performance/PerformanceOverview.js - Adaptation
import React from 'react';

const PerformanceOverview = ({ performanceData }) => {
  const { overallMetrics, period } = performanceData;
  
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

  // Calculer le taux de complétion
  const calculateCompletionRate = () => {
    const totalCompleted = performanceData.preparatorsData.reduce(
      (sum, p) => sum + p.metrics.completedPreparations, 0
    );
    
    const totalPreps = performanceData.preparatorsData.reduce(
      (sum, p) => sum + p.metrics.totalPreparations, 0
    );
    
    if (totalPreps === 0) return 0;
    return Math.round((totalCompleted / totalPreps) * 100);
  };

  // Statistiques à afficher
  const stats = [
    {
      icon: "fas fa-car-side",
      value: overallMetrics.totalPreparations,
      label: "Préparations totales",
      color: "#3b82f6"
    },
    {
      icon: "fas fa-clock",
      value: formatTime(overallMetrics.avgCompletionTime),
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
      value: overallMetrics.avgPreparationsPerDay.toFixed(1),
      label: "Moyenne par jour",
      color: "#6366f1"
    }
  ];

  return (
    <div className="performance-overview-section">
      <h2 className="section-title">
        <i className="fas fa-tachometer-alt"></i> Vue d'ensemble
        <span className="period-info">
          {period.days} jour{period.days > 1 ? 's' : ''}
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