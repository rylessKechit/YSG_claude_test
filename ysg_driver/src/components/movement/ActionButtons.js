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
  // Vérifier si l'utilisateur peut modifier ce mouvement
  const canEditMovement = () => {
    if (!movement || !currentUser) return false;
    
    // Les administrateurs peuvent toujours modifier
    if (currentUser.role === 'admin' || currentUser.role === 'team-leader') return true;
    
    // Extraire l'ID de manière robuste
    let movementUserId;
    if (typeof movement.userId === 'object' && movement.userId !== null) {
      movementUserId = movement.userId._id;
    } else {
      movementUserId = movement.userId;
    }

    // Les chauffeurs peuvent modifier seulement s'ils sont assignés
    return currentUser.role === 'driver' && 
           movementUserId && 
           String(movementUserId) === String(currentUser._id);
  };

  // Debug - Afficher l'état actuel pour trouver le problème
  console.log('[ActionButtons] État du mouvement:', movement.status);
  console.log('[ActionButtons] canEditMovement:', canEditMovement());
  console.log('[ActionButtons] allPhotosTaken:', allPhotosTaken);
  console.log('[ActionButtons] allArrivalPhotosTaken:', allArrivalPhotosTaken);

  return (
    <div className="detail-actions">
      {/* Bouton de retour - toujours visible */}
      <button 
        onClick={navigateBack} 
        className="btn btn-secondary"
      >
        Retour à la liste
      </button>
      
      {/* Bouton de préparation - visible quand assigné */}
      {movement.status === 'assigned' && canEditMovement() && (
        <button 
          onClick={onPrepareMovement} 
          className="btn btn-primary" 
          disabled={loading}
        >
          {loading ? 'Démarrage...' : 'Préparer le véhicule'}
        </button>
      )}
      
      {/* Bouton "En route" - visible quand en préparation ET que toutes les photos sont prises */}
      {movement.status === 'preparing' && canEditMovement() && (
        <button 
          onClick={onStartMovement} 
          className="btn btn-success" 
          disabled={loading || !allPhotosTaken}
          title={!allPhotosTaken ? "Toutes les photos requises doivent être prises" : ""}
        >
          {loading ? 'Démarrage...' : 'En route'}
        </button>
      )}
      
      {/* Bouton de complétion - visible quand en cours */}
      {movement.status === 'in-progress' && canEditMovement() && (
        <button 
          onClick={onCompleteMovement} 
          className="btn btn-warning" 
          disabled={loading || !allArrivalPhotosTaken}
          title={!allArrivalPhotosTaken ? "Toutes les photos d'arrivée requises doivent être prises" : ""}
        >
          {loading ? 'Finalisation...' : 'Terminer le trajet'}
        </button>
      )}
      
      {/* Bouton de suppression - admin uniquement pour les mouvements non démarrés */}
      {(currentUser.role === 'admin' || currentUser.role === 'team-leader') && 
       ['pending', 'assigned'].includes(movement.status) && (
        <button 
          onClick={onDeleteMovement} 
          className="btn btn-danger" 
          disabled={loading}
        >
          {loading ? 'Suppression...' : 'Supprimer le mouvement'}
        </button>
      )}
    </div>
  );
};

export default ActionButtons;