// src/components/dashboard/MovementCard.js
import React from 'react';
import { Link } from 'react-router-dom';

const MovementCard = ({ movement, actionButton }) => {
  // Formatter la date
  const formatDate = (dateString) => {
    if (!dateString) return 'Non disponible';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Vérifier si la deadline est proche ou expirée
  const isDeadlineUrgent = () => movement.deadline && 
    (new Date(movement.deadline).getTime() - new Date().getTime() > 0) && 
    (new Date(movement.deadline).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000);

  const isDeadlineExpired = () => movement.deadline && new Date(movement.deadline) < new Date();

  // Déterminer la classe de la carte en fonction de la deadline
  const getCardClass = () => {
    if (isDeadlineExpired()) return "movement-card deadline-expired";
    if (isDeadlineUrgent()) return "movement-card deadline-urgent";
    return "movement-card";
  };

  // Mapper les statuts aux labels et icônes
  const statusMap = {
    'pending': { icon: 'fa-hourglass-start', label: 'En attente' },
    'assigned': { icon: 'fa-user-check', label: 'Assigné' },
    'preparing': { icon: 'fa-tools', label: 'En préparation' },
    'in-progress': { icon: 'fa-spinner', label: 'En cours' },
    'completed': { icon: 'fa-check-circle', label: 'Terminé' },
    'cancelled': { icon: 'fa-times-circle', label: 'Annulé' }
  };

  const status = statusMap[movement.status] || { icon: 'fa-question-circle', label: 'Inconnu' };

  return (
    <div className={getCardClass()}>
      <div className="movement-header">
        <div className="vehicle-info">
          <span className="license-plate">{movement.licensePlate}</span>
          {movement.vehicleModel && <span className="vehicle-model">{movement.vehicleModel}</span>}
        </div>
        <span className={`badge badge-${movement.status}`}>
          <i className={`fas ${status.icon}`}></i> {status.label}
        </span>
      </div>
      
      <div className="movement-route">
        <div className="route-item">
          <div className="route-icon">
            <div className="route-icon-circle departure-icon"></div>
          </div>
          <div className="route-details">
            <div className="route-label">Départ</div>
            <div className="route-location">{movement.departureLocation.name}</div>
          </div>
        </div>
        
        <div className="route-item">
          <div className="route-icon">
            <div className="route-icon-circle arrival-icon"></div>
          </div>
          <div className="route-details">
            <div className="route-label">Arrivée</div>
            <div className="route-location">{movement.arrivalLocation.name}</div>
          </div>
        </div>
      </div>
      
      {/* Affichage de la deadline si elle existe */}
      {movement.deadline && (
        <div className={`deadline-info ${isDeadlineUrgent() ? 'urgent' : ''} ${isDeadlineExpired() ? 'expired' : ''}`}>
          <i className="fas fa-clock"></i>
          <span>
            {isDeadlineExpired() 
              ? `Deadline expirée: ${formatDate(movement.deadline)}` 
              : `Deadline: ${formatDate(movement.deadline)}`}
          </span>
        </div>
      )}
      
      <div className="movement-footer">
        <div className="movement-date">
          {movement.status === 'completed' 
            ? `Terminé le ${formatDate(movement.arrivalTime || movement.updatedAt)}` 
            : `Créé le ${formatDate(movement.createdAt)}`}
        </div>
        
        {actionButton ? actionButton : (
          <Link to={`/movement/${movement._id}`} className="view-details">
            Voir les détails <i className="fas fa-chevron-right"></i>
          </Link>
        )}
      </div>
    </div>
  );
};

export default MovementCard;