// src/components/dashboard/StatusCard.js
import React from 'react';
import { Link } from 'react-router-dom';

const StatusCard = ({ activeTimeLog }) => {
  // Formatter la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="status-card">
      <div className="status-header">
        <h2 className="status-title">Statut de service</h2>
        <div className="status-indicator">
          <div className={`status-dot ${activeTimeLog ? 'active' : 'inactive'}`}></div>
          <span>{activeTimeLog ? 'En service' : 'Hors service'}</span>
        </div>
      </div>
      
      <div className="service-info">
        {activeTimeLog ? (
          <div className="active-service">
            <p className="service-time">Service démarré le {formatDate(activeTimeLog.startTime)}</p>
            <Link to="/timelog" className="btn btn-danger">
              <i className="fas fa-clock"></i> Terminer le service
            </Link>
          </div>
        ) : (
          <div className="inactive-service">
            <p className="service-time">Vous n'êtes pas actuellement en service.</p>
            <Link to="/timelog" className="btn btn-success">
              <i className="fas fa-play"></i> Démarrer le service
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusCard;