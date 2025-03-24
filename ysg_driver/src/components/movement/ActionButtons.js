// src/components/movement/ActionButtons.js
import React from 'react';

const ActionButtons = ({ 
  movement, 
  currentUser, 
  loading, 
  allPhotosTaken,
  allArrivalPhotosTaken = false,
  onPrepareMovement,
  onStartMovement,
  onCompleteMovement,
  onDeleteMovement,
  navigateBack
}) => {
  // Check if user can edit this movement
  const canEdit = () => {
    if (!movement || !currentUser) return false;
    
    // Admins can always edit
    if (currentUser.role === 'admin') return true;
    
    // Drivers can edit only if they are assigned
    return currentUser.role === 'driver' && 
           movement.userId && 
           movement.userId._id === currentUser._id;
  };

  // Configuration des boutons d'action selon l'état et les permissions
  const actionButtons = [
    // Retour à la liste - toujours visible
    {
      id: 'back',
      text: 'Retour à la liste',
      action: navigateBack,
      className: 'btn btn-secondary',
      condition: () => true,
      disabled: false
    },
    
    // Supprimer - admin uniquement et mouvement non démarré
    {
      id: 'delete',
      text: loading ? 'Suppression...' : 'Supprimer le mouvement',
      action: onDeleteMovement,
      className: 'btn btn-danger',
      condition: () => currentUser.role === 'admin' && 
                      (movement.status === 'pending' || movement.status === 'assigned'),
      disabled: loading
    },
    
    // Préparer - chauffeur assigné uniquement
    {
      id: 'prepare',
      text: loading ? 'Démarrage...' : 'Préparer le véhicule',
      action: onPrepareMovement,
      className: 'btn btn-primary',
      condition: () => movement.status === 'assigned' && 
                      movement.userId && 
                      currentUser.role === 'driver' && 
                      movement.userId._id === currentUser._id,
      disabled: loading
    },
    
    // Démarrer - après préparation et photos complètes
    {
      id: 'start',
      text: loading ? 'Démarrage...' : 'En route',
      action: onStartMovement,
      className: 'btn btn-success',
      condition: () => movement.status === 'preparing' && 
                      movement.userId && 
                      currentUser.role === 'driver' && 
                      movement.userId._id === currentUser._id,
      disabled: loading || !allPhotosTaken,
      title: !allPhotosTaken ? "Toutes les photos requises doivent être prises" : ""
    },
    
    // Terminer - après photos d'arrivée
    {
      id: 'complete',
      text: loading ? 'Finalisation...' : 'Terminer le trajet',
      action: onCompleteMovement,
      className: 'btn btn-warning',
      condition: () => movement.status === 'in-progress' && 
                      movement.userId && 
                      currentUser.role === 'driver' && 
                      movement.userId._id === currentUser._id,
      disabled: loading || !allArrivalPhotosTaken,
      title: !allArrivalPhotosTaken ? "Toutes les photos d'arrivée requises doivent être prises" : ""
    }
  ];

  // Filtrer les boutons visibles selon les conditions
  const visibleButtons = actionButtons.filter(button => button.condition());

  return (
    <div className="detail-actions">
      {visibleButtons.map(button => (
        <button
          key={button.id}
          onClick={button.action}
          className={button.className}
          disabled={button.disabled}
          title={button.title}
        >
          {button.text}
        </button>
      ))}
    </div>
  );
};

export default ActionButtons;