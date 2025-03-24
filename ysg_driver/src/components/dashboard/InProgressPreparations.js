// src/components/dashboard/RecentPreparations.js
import React from 'react';
import { Link } from 'react-router-dom';
import PreparationCard from './PreparationCard';

const InProgressPreparations = ({ preparations }) => {
  return (
    <div className="section-preparations">
      <div className="section-header">
        <h2 className="section-title">
        <i class="fa-solid fa-hand-sparkles"></i> Préparations en cours
        </h2>
        <Link to="/preparations" className="view-all">
          Voir tout <i className="fas fa-arrow-right"></i>
        </Link>
      </div>
      
      <div className="preparation-list-container">
        {preparations.length > 0 ? (
          <div className="preparations-list">
            {preparations.map(preparation => (
              <PreparationCard key={preparation._id} preparation={preparation} />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>Aucune préparation de véhicule trouvée.</p>
            <Link to="/preparations/create" className="btn btn-primary">
              Créer une nouvelle préparation
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default InProgressPreparations;