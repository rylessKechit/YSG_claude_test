import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import reportService from '../services/reportService';
import Navigation from '../components/Navigation';
import '../styles/Reports.css';

const Reports = () => {
  const [reportType, setReportType] = useState('movements');
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0], // Aujourd'hui
    endDate: new Date().toISOString().split('T')[0]    // Aujourd'hui
  });
  const [reportPeriod, setReportPeriod] = useState('daily');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { currentUser } = useAuth();

  // Calculer les dates en fonction de la période sélectionnée
  const calculateDateRange = (period) => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate;
    
    switch(period) {
      case 'daily':
        startDate = endDate;
        break;
      case 'weekly':
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        startDate = lastWeek.toISOString().split('T')[0];
        break;
      case 'monthly':
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        startDate = lastMonth.toISOString().split('T')[0];
        break;
      default:
        startDate = endDate;
    }
    
    return { startDate, endDate };
  };

  // Gérer le changement de période
  const handlePeriodChange = (period) => {
    setReportPeriod(period);
    setDateRange(calculateDateRange(period));
  };

  // Gérer le changement de date
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange({
      ...dateRange,
      [name]: value
    });
    
    // Si c'est une date personnalisée, mettre à jour la période
    setReportPeriod('custom');
  };

  // Générer un rapport
  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Paramètres du rapport
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        status: status || undefined
      };
      
      // Appel à l'API en fonction du type de rapport
      if (reportType === 'movements') {
        await reportService.generateMovementsReport(params);
      } else {
        await reportService.generatePreparationsReport(params);
      }
      
      setSuccess('Rapport généré et téléchargé avec succès');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Erreur lors de la génération du rapport:', err);
      setError('Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
    }
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (statusValue) => {
    switch(statusValue) {
      case 'pending': return 'En attente';
      case 'in-progress': return 'En cours';
      case 'completed': return 'Terminés';
      case 'cancelled': return 'Annulés';
      default: return 'Tous';
    }
  };

  return (
    <div>
      <Navigation />
      
      <div className="reports-container">
        <div className="page-header">
          <h1 className="page-title">Rapports</h1>
          <p className="page-subtitle">
            Générez des rapports Excel pour les mouvements de véhicules et les préparations
          </p>
        </div>
        
        {error && (
          <div className="alert alert-error">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">{error}</div>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            <div className="alert-icon">✓</div>
            <div className="alert-content">{success}</div>
          </div>
        )}
        
        <div className="report-card">
          <div className="report-type-selector">
            <button 
              className={`report-type-btn ${reportType === 'movements' ? 'active' : ''}`}
              onClick={() => setReportType('movements')}
            >
              <i className="fas fa-car"></i>
              <span>Mouvements de véhicules</span>
            </button>
            <button 
              className={`report-type-btn ${reportType === 'preparations' ? 'active' : ''}`}
              onClick={() => setReportType('preparations')}
            >
              <i className="fas fa-tools"></i>
              <span>Préparations de véhicules</span>
            </button>
          </div>
          
          <div className="report-filters">
            <div className="filter-section">
              <h2 className="section-title">
                <i className="fas fa-calendar-alt"></i> Période
              </h2>
              
              <div className="period-buttons">
                <button 
                  className={`period-btn ${reportPeriod === 'daily' ? 'active' : ''}`}
                  onClick={() => handlePeriodChange('daily')}
                >
                  Journalier
                </button>
                <button 
                  className={`period-btn ${reportPeriod === 'weekly' ? 'active' : ''}`}
                  onClick={() => handlePeriodChange('weekly')}
                >
                  Hebdomadaire
                </button>
                <button 
                  className={`period-btn ${reportPeriod === 'monthly' ? 'active' : ''}`}
                  onClick={() => handlePeriodChange('monthly')}
                >
                  Mensuel
                </button>
              </div>
              
              <div className="date-inputs">
                <div className="date-input-group">
                  <label htmlFor="startDate">Du:</label>
                  <input 
                    type="date" 
                    id="startDate"
                    name="startDate"
                    value={dateRange.startDate}
                    onChange={handleDateChange}
                    max={dateRange.endDate}
                  />
                </div>
                
                <div className="date-input-group">
                  <label htmlFor="endDate">Au:</label>
                  <input 
                    type="date" 
                    id="endDate"
                    name="endDate"
                    value={dateRange.endDate}
                    onChange={handleDateChange}
                    min={dateRange.startDate}
                  />
                </div>
              </div>
            </div>
            
            <div className="filter-section">
              <h2 className="section-title">
                <i className="fas fa-filter"></i> Filtres
              </h2>
              
              <div className="filter-group">
                <label htmlFor="status">Statut:</label>
                <select 
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Tous</option>
                  <option value="pending">En attente</option>
                  <option value="in-progress">En cours</option>
                  <option value="completed">Terminés</option>
                  <option value="cancelled">Annulés</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="report-summary">
            <h2 className="summary-title">Résumé du rapport</h2>
            
            <div className="summary-details">
              <div className="summary-item">
                <span className="summary-label">Type de rapport:</span>
                <span className="summary-value">
                  {reportType === 'movements' ? 'Mouvements de véhicules' : 'Préparations de véhicules'}
                </span>
              </div>
              
              <div className="summary-item">
                <span className="summary-label">Période:</span>
                <span className="summary-value">
                  {reportPeriod === 'custom' 
                    ? 'Personnalisée'
                    : reportPeriod === 'daily'
                      ? 'Journalier'
                      : reportPeriod === 'weekly'
                        ? 'Hebdomadaire'
                        : 'Mensuel'}
                </span>
              </div>
              
              <div className="summary-item">
                <span className="summary-label">Dates:</span>
                <span className="summary-value">
                  Du {new Date(dateRange.startDate).toLocaleDateString()} au {new Date(dateRange.endDate).toLocaleDateString()}
                </span>
              </div>
              
              <div className="summary-item">
                <span className="summary-label">Statut:</span>
                <span className="summary-value">{getStatusLabel(status)}</span>
              </div>
            </div>
          </div>
          
          <div className="report-actions">
            <button 
              className="btn btn-primary generate-btn"
              onClick={generateReport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner-sm"></div>
                  <span>Génération en cours...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-file-excel"></i>
                  <span>Générer et télécharger le rapport Excel</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="report-info-card">
          <h2 className="info-title">
            <i className="fas fa-info-circle"></i> À propos des rapports
          </h2>
          
          <div className="info-content">
            <p>
              Les rapports sont générés au format Excel (.xlsx) et sont téléchargés automatiquement dans votre navigateur.
            </p>
            
            <h3 className="info-subtitle">Contenu des rapports</h3>
            
            <div className="report-types-info">
              <div className="report-type-info">
                <h4>Mouvements de véhicules</h4>
                <ul>
                  <li>Informations du véhicule (plaque, modèle)</li>
                  <li>Chauffeur assigné</li>
                  <li>Lieu de départ et d'arrivée</li>
                  <li>Heures de départ et d'arrivée</li>
                  <li>Statut du mouvement</li>
                </ul>
              </div>
              
              <div className="report-type-info">
                <h4>Préparations de véhicules</h4>
                <ul>
                  <li>Informations du véhicule (plaque, modèle)</li>
                  <li>Préparateur assigné</li>
                  <li>Tâches réalisées (lavage, nettoyage, carburant, transfert)</li>
                  <li>Quantité de carburant ajoutée</li>
                  <li>Statut de la préparation</li>
                </ul>
              </div>
            </div>
            
            <p className="report-tip">
              <strong>Astuce :</strong> Pour un rapport journalier des activités d'aujourd'hui, utilisez la période "Journalier". Pour des périodes plus étendues, utilisez les boutons "Hebdomadaire" ou "Mensuel", ou sélectionnez des dates personnalisées.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;