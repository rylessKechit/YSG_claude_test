// src/components/dashboard/RecentMovements.js
import React from 'react';
import MovementCard from './MovementCard';
import { Link } from 'react-router-dom';

const InProgressMovement = ({ movements }) => {
  return (
    <div className="recent-movements">
      <div className="section-header">
        <h2 className="section-title">
            <i class="fa-solid fa-road"></i> Trajet en cour
        </h2>
      </div>
      
      <div className="movements-list">
        {movements.map(movement => (
          <MovementCard 
            key={movement._id} 
            movement={movement}
            actionButton={
              <Link to={`/movement/${movement._id}`} className="btn btn-warning btn-sm">
                <i class="fa-solid fa-flag-checkered"></i> Terminer
              </Link>
            }
          />
        ))}
      </div>
    </div>
  );
};

export default InProgressMovement;