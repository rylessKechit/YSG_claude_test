// src/pages/PreparatorPerformance.js - Mise à jour
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import PerformanceHeader from '../components/performance/PerformanceHeader';
import PreparatorSelector from '../components/performance/PreparatorSelector';
import PerformanceOverview from '../components/performance/PerformanceOverview';
import TaskCompletionChart from '../components/performance/TaskCompletionChart';
import PreparationsPerDay from '../components/performance/PreparationsPerDay';
import ComparisonMetrics from '../components/performance/ComparisonMetrics';
import AlertMessage from '../components/ui/AlertMessage';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import userService from '../services/userService';
import performanceService from '../services/performanceService';

import '../styles/PreparatorPerformance.css';

const PreparatorPerformance = () => {
  const [allPreparators, setAllPreparators] = useState([]);
  const [selectedPreparators, setSelectedPreparators] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: getLastMonthDate(),
    endDate: new Date().toISOString().split('T')[0]
  });
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Rediriger si l'utilisateur n'est pas admin ou direction
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'direction') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Charger la liste des préparateurs
  useEffect(() => {
    const fetchPreparators = async () => {
      try {
        setLoading(true);
        // Obtenir tous les utilisateurs
        const users = await userService.getAllUsers();
        // Filtrer pour ne garder que les préparateurs
        const preparators = users.filter(user => user.role === 'preparator');
        setAllPreparators(preparators);
        
        // Sélectionner les 3 premiers préparateurs par défaut (ou moins s'il n'y en a pas assez)
        if (preparators.length > 0) {
          setSelectedPreparators(preparators.slice(0, Math.min(3, preparators.length)).map(p => p._id));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des préparateurs:', err);
        setError('Erreur lors du chargement des préparateurs: ' + err.message);
        setLoading(false);
      }
    };
    
    fetchPreparators();
  }, []);

  // Charger les données de performance lorsque les préparateurs sélectionnés changent
  useEffect(() => {
    if (selectedPreparators.length === 0) {
      setPerformanceData(null);
      return;
    }
    
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        
        const data = await performanceService.getPreparatorsPerformance(
          selectedPreparators, 
          dateRange.startDate, 
          dateRange.endDate
        );
        
        setPerformanceData(data);
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des données de performance:', err);
        setError('Erreur lors du chargement des données de performance: ' + err.message);
        setLoading(false);
      }
    };
    
    fetchPerformanceData();
  }, [selectedPreparators, dateRange]);

  // Gérer les changements de sélection des préparateurs
  const handlePreparatorChange = (selectedIds) => {
    setSelectedPreparators(selectedIds);
  };

  // Gérer les changements de plage de dates
  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  // Fonction pour obtenir la date d'il y a un mois
  function getLastMonthDate() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  return (
    <div>
      <Navigation />
      
      <div className="performance-container">
        <PerformanceHeader onDateRangeChange={handleDateRangeChange} dateRange={dateRange} />
        
        {error && <AlertMessage type="error" message={error} />}
        
        <PreparatorSelector 
          allPreparators={allPreparators}
          selectedPreparators={selectedPreparators}
          onChange={handlePreparatorChange}
        />
        
        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Chargement des données de performance...</p>
          </div>
        ) : (
          <>
            {performanceData && selectedPreparators.length > 0 ? (
              <div className="performance-content">
                <PerformanceOverview performanceData={performanceData} />
                
                <div className="charts-grid">
                  <TaskCompletionChart performanceData={performanceData} />
                  <PreparationsPerDay performanceData={performanceData} />
                </div>
                
                {selectedPreparators.length > 1 && (
                  <ComparisonMetrics 
                    performanceData={performanceData}
                    allPreparators={allPreparators}
                    selectedPreparators={selectedPreparators}
                  />
                )}
              </div>
            ) : (
              <div className="no-data-message">
                <p>Aucune donnée à afficher. Veuillez sélectionner au moins un préparateur.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PreparatorPerformance;