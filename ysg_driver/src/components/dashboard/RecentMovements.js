// src/components/dashboard/RecentMovements.js
import React from 'react';
import { Link } from 'react-router-dom';
import MovementCard from './MovementCard';

const RecentMovements = ({ movements }) => {
  return (
    <div className="recent-movements">
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-history"></i> Trajets récents
        </h2>
        <Link to="/movement/history" className="view-all">
          Voir tout <i className="fas fa-arrow-right"></i>
        </Link>
      </div>
      
      {movements.length > 0 ? (
        <div className="movements-list">
          {movements.slice(0, 5).map(movement => (
            <MovementCard key={movement._id} movement={movement} />
          ))}
        </div>
      ) : (
        <div className="no-movements">
          <div className="no-data-icon">
            <i className="fas fa-car"></i>
          </div>
          <p className="no-data-message">Aucun trajet récent à afficher.</p>
        </div>
      )}
    </div>
  );
};

export default RecentMovements;