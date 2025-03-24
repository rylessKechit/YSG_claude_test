// src/components/dashboard/AssignedMovements.js
import React from 'react';
import { Link } from 'react-router-dom';
import MovementCard from './MovementCard';

const AssignedMovements = ({ movements }) => {
  return (
    <div className="assigned-movements">
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-tasks"></i> Trajets assignés
        </h2>
      </div>
      
      <div className="movements-list">
        {movements.map(movement => (
          <MovementCard 
            key={movement._id} 
            movement={movement}
            actionButton={
              <Link to={`/movement/${movement._id}`} className="btn btn-primary btn-sm">
                <i className="fas fa-play"></i> Démarrer
              </Link>
            }
          />
        ))}
      </div>
    </div>
  );
};

export default AssignedMovements;