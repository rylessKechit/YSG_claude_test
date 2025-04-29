// src/components/ui/StatusBadge.js
import React from 'react';

const StatusBadge = ({ status, customLabel, showIcon = true }) => {
  // Configuration des différents statuts avec leurs styles et icônes
  const statusConfig = {
    pending: { 
      label: 'En attente', 
      className: 'status-pending',
      icon: 'fa-hourglass-start'
    },
    assigned: { 
      label: 'Assigné', 
      className: 'status-assigned',
      icon: 'fa-user-check'
    },
    preparing: { 
      label: 'En préparation', 
      className: 'status-preparing',
      icon: 'fa-tools'
    },
    'in-progress': { 
      label: 'En cours', 
      className: 'status-in-progress',
      icon: 'fa-spinner'
    },
    completed: { 
      label: 'Terminé', 
      className: 'status-completed',
      icon: 'fa-check-circle'
    },
    cancelled: { 
      label: 'Annulé', 
      className: 'status-cancelled',
      icon: 'fa-times-circle'
    }
  };
  
  // Utiliser la configuration pour le statut donné ou une configuration par défaut
  const { label, className, icon } = statusConfig[status] || { 
    label: 'Inconnu', 
    className: '',
    icon: 'fa-question-circle'
  };

  return (
    <span className={`status-badge ${className}`}>
      {showIcon && <i className={`fas ${icon}`}></i>}
      <span>{customLabel || label}</span>
    </span>
  );
};

export default StatusBadge;