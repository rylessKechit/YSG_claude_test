// src/components/performance/ComparisonMetrics.js - Adaptation pour la nouvelle API
import React, { useState } from 'react';

const ComparisonMetrics = ({ performanceData, allPreparators, selectedPreparators }) => {
  const [selectedMetric, setSelectedMetric] = useState('avgCompletionTime');
  const { preparatorsData } = performanceData;
  
  // Liste des métriques disponibles pour la comparaison
  const metrics = [
    { 
      id: 'avgCompletionTime', 
      label: 'Temps moyen de complétion', 
      unit: 'min',
      inverse: true // Plus faible est meilleur
    },
    { 
      id: 'totalPreparations', 
      label: 'Nombre total de préparations', 
      unit: '',
      inverse: false // Plus élevé est meilleur
    },
    { 
      id: 'exteriorWashingTime', 
      label: 'Temps moyen - Lavage extérieur', 
      unit: 'min',
      inverse: true
    },
    { 
      id: 'interiorCleaningTime', 
      label: 'Temps moyen - Nettoyage intérieur', 
      unit: 'min',
      inverse: true
    },
    { 
      id: 'refuelingTime', 
      label: 'Temps moyen - Mise de carburant', 
      unit: 'min',
      inverse: true
    },
    { 
      id: 'parkingTime', 
      label: 'Temps moyen - Stationnement', 
      unit: 'min',
      inverse: true
    },
    { 
      id: 'preparationsPerDay', 
      label: 'Préparations par jour', 
      unit: '',
      inverse: false
    },
    {
      id: 'completionRate',
      label: 'Taux de complétion',
      unit: '%',
      inverse: false
    }
  ];

  // Obtenir la valeur d'une métrique pour un préparateur spécifique
  const getMetricValue = (preparator, metricId) => {
    const p = preparatorsData.find(p => p.preparatorId === preparator._id);
    if (!p) return 0;
    
    switch (metricId) {
      case 'avgCompletionTime':
        return p.metrics.avgCompletionTime;
      case 'totalPreparations':
        return p.metrics.totalPreparations;
      case 'exteriorWashingTime':
        return p.metrics.taskMetrics.exteriorWashing.avgTime;
      case 'interiorCleaningTime':
        return p.metrics.taskMetrics.interiorCleaning.avgTime;
      case 'refuelingTime':
        return p.metrics.taskMetrics.refueling.avgTime;
      case 'parkingTime':
        return p.metrics.taskMetrics.parking.avgTime;
      case 'preparationsPerDay':
        return parseFloat((p.metrics.totalPreparations / performanceData.period.days).toFixed(1));
      case 'completionRate':
        return p.metrics.completedPreparations > 0 && p.metrics.totalPreparations > 0 
          ? parseFloat((p.metrics.completedPreparations / p.metrics.totalPreparations * 100).toFixed(1)) 
          : 0;
      default:
        return 0;
    }
  };

  // Le reste du composant reste inchangé...
  // Formater la valeur d'une métrique selon son type
  const formatMetricValue = (value, metricId) => {
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return value;
    
    if (metricId === 'preparationsPerDay' || metricId === 'completionRate') {
      return value.toFixed(1) + (metric.unit ? ` ${metric.unit}` : '');
    }
    
    return metric.unit ? `${value} ${metric.unit}` : value;
  };

  // Filtrer les préparateurs à comparer
  const preparatorsToCompare = allPreparators.filter(p => 
    selectedPreparators.includes(p._id)
  );

  // Trier les préparateurs selon la métrique sélectionnée
  const sortedPreparators = [...preparatorsToCompare].sort((a, b) => {
    const valueA = getMetricValue(a, selectedMetric);
    const valueB = getMetricValue(b, selectedMetric);
    const metric = metrics.find(m => m.id === selectedMetric);
    
    return metric.inverse 
      ? valueA - valueB  // Si inverse, le plus petit est meilleur
      : valueB - valueA; // Sinon, le plus grand est meilleur
  });

  // Obtenir le meilleur préparateur pour la métrique sélectionnée
  const getBestPreparator = () => {
    if (sortedPreparators.length === 0) return null;
    return sortedPreparators[0];
  };

  // Calculer le pourcentage relatif pour la barre de progression
  const calculatePercentage = (preparator) => {
    const bestPreparatorValue = getMetricValue(getBestPreparator(), selectedMetric);
    const currentValue = getMetricValue(preparator, selectedMetric);
    const metric = metrics.find(m => m.id === selectedMetric);
    
    if (bestPreparatorValue === 0) return 0;
    
    if (metric.inverse) {
      // Pour les métriques inverses (temps), plus faible est meilleur
      return (bestPreparatorValue / currentValue) * 100;
    } else {
      // Pour les métriques régulières, plus élevé est meilleur
      return (currentValue / bestPreparatorValue) * 100;
    }
  };

  return (
    <div className="comparison-metrics-section">
      {/* Le reste du rendu reste inchangé */}
      <h2 className="section-title">
        <i className="fas fa-chart-bar"></i> Comparaison des préparateurs
      </h2>
      
      <div className="metric-selector">
        <label htmlFor="metric-select">Métrique:</label>
        <div className="select-wrapper">
          <select 
            id="metric-select" 
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            {metrics.map(metric => (
              <option key={metric.id} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </select>
          <i className="fas fa-chevron-down"></i>
        </div>
      </div>
      
      <div className="comparison-table">
        <div className="comparison-header">
          <div className="comparison-col preparator-col">Préparateur</div>
          <div className="comparison-col value-col">Valeur</div>
          <div className="comparison-col progress-col">Performance relative</div>
        </div>
        
        <div className="comparison-body">
          {sortedPreparators.map((preparator, index) => {
            const value = getMetricValue(preparator, selectedMetric);
            const percentage = calculatePercentage(preparator);
            const isFirst = index === 0;
            
            return (
              <div 
                key={preparator._id} 
                className={`comparison-row ${isFirst ? 'best-performer' : ''}`}
              >
                <div className="comparison-col preparator-col">
                  {isFirst && <i className="fas fa-trophy trophy-icon"></i>}
                  <span className="preparator-name">{preparator.fullName}</span>
                </div>
                <div className="comparison-col value-col">
                  {formatMetricValue(value, selectedMetric)}
                </div>
                <div className="comparison-col progress-col">
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: isFirst ? '#10b981' : '#3b82f6'
                      }}
                    ></div>
                  </div>
                  <span className="progress-value">{percentage.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ComparisonMetrics;