// src/components/preparation/PreparationActions.js
import React from 'react';

const PreparationActions = ({ 
  preparation, 
  canEdit, 
  loading, 
  hasCompletedTasks, 
  onCompletePreparation, 
  navigateBack 
}) => {
  return (
    <div className="detail-actions">
      <button
        onClick={navigateBack}
        className="btn btn-secondary"
      >
        Retour à la liste
      </button>
      
      {canEdit && preparation.status !== 'completed' && hasCompletedTasks && (
        <button
          onClick={onCompletePreparation}
          className="btn btn-success"
          disabled={loading}
        >
          {loading ? 'Finalisation...' : 'Terminer la préparation'}
        </button>
      )}
    </div>
  );
};

export default PreparationActions;