// src/pages/DriverPerformance.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import DriverSelector from '../components/performance/DriverSelector';
import PerformanceHeader from '../components/performance/PerformanceHeader';
import PerformanceOverview from '../components/performance/PerformanceOverview';
import DestinationsChart from '../components/performance/DestinationsChart';
import CompletionTimeChart from '../components/performance/CompletionTimeChart';
import ComparisonMetrics from '../components/performance/ComparisonMetrics';
import AlertMessage from '../components/ui/AlertMessage';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import userService from '../services/userService';
import driverPerformanceService from '../services/driverPerformanceService';

import '../styles/DriverPerformance.css';

const DriverPerformance = () => {
  const [allDrivers, setAllDrivers] = useState([]);
  const [selectedDrivers, setSelectedDrivers] = useState([]);
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

  // Charger la liste des chauffeurs
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true);
        // Obtenir tous les utilisateurs
        const users = await userService.getAllUsers();
        // Filtrer pour ne garder que les chauffeurs
        const drivers = users.filter(user => user.role === 'driver');
        setAllDrivers(drivers);
        
        // Sélectionner les 3 premiers chauffeurs par défaut (ou moins s'il n'y en a pas assez)
        if (drivers.length > 0) {
          setSelectedDrivers(drivers.slice(0, Math.min(3, drivers.length)).map(d => d._id));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des chauffeurs:', err);
        setError('Erreur lors du chargement des chauffeurs: ' + (err.message || 'Erreur inconnue'));
        setLoading(false);
      }
    };
    
    fetchDrivers();
  }, []);

  // Charger les données de performance lorsque les chauffeurs sélectionnés changent
  useEffect(() => {
    if (selectedDrivers.length === 0) {
      setPerformanceData(null);
      return;
    }
    
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        
        const data = await driverPerformanceService.getDriversPerformance(
          selectedDrivers, 
          dateRange.startDate, 
          dateRange.endDate
        );
        
        // S'assurer que comparativeData existe
        if (!data.comparativeData) {
          data.comparativeData = [];
        }
        
        // S'assurer que globalMetrics existe
        if (!data.globalMetrics) {
          data.globalMetrics = {};
        }
        
        // S'assurer que la période est définie
        if (!data.period) {
          // Calculer la différence en jours entre startDate et endDate
          const start = new Date(dateRange.startDate);
          const end = new Date(dateRange.endDate);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
          
          data.period = {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            days: diffDays
          };
        }
        
        setPerformanceData(data);
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des données de performance:', err);
        setError('Erreur lors du chargement des données de performance: ' + (err.message || 'Erreur inconnue'));
        setLoading(false);
      }
    };
    
    fetchPerformanceData();
  }, [selectedDrivers, dateRange]);

  // Gérer les changements de sélection des chauffeurs
  const handleDriverChange = (selectedIds) => {
    setSelectedDrivers(selectedIds);
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
        <PerformanceHeader 
          onDateRangeChange={handleDateRangeChange} 
          dateRange={dateRange} 
          title="Performance des chauffeurs"
          subtitle="Analysez et comparez les performances des chauffeurs sur la période sélectionnée"
        />
        
        {error && <AlertMessage type="error" message={error} />}
        
        <DriverSelector 
          allDrivers={allDrivers}
          selectedDrivers={selectedDrivers}
          onChange={handleDriverChange}
        />
        
        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Chargement des données de performance...</p>
          </div>
        ) : (
          <>
            {performanceData && selectedDrivers.length > 0 ? (
              <div className="performance-content">
                <PerformanceOverview performanceData={performanceData} isDriverView={true} />
                
                <div className="charts-grid">
                  <CompletionTimeChart performanceData={performanceData} />
                  <DestinationsChart performanceData={performanceData} />
                </div>
                
                {selectedDrivers.length > 1 && (
                  <ComparisonMetrics 
                    performanceData={performanceData}
                    allUsers={allDrivers}
                    selectedUsers={selectedDrivers}
                    isDriverView={true}
                  />
                )}
              </div>
            ) : (
              <div className="no-data-message">
                <p>Aucune donnée à afficher. Veuillez sélectionner au moins un chauffeur.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DriverPerformance;