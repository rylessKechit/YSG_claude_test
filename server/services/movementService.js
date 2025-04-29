// server/services/movement.service.js
const Movement = require('../models/movement.model');
const Agency = require('../models/agency.model');
const User = require('../models/user.model');
const emailService = require('./email.service');

class MovementService {
  /**
   * Gère la création d'un nouveau mouvement avec envoi d'email aux agences
   * @param {Object} movementData - Données du mouvement à créer
   * @param {Object} user - Utilisateur qui crée le mouvement
   * @returns {Promise<Object>} Mouvement créé
   */
  async createMovement(movementData, user) {
    try {
      // Récupérer les informations des agences si des IDs sont fournis
      let departureAgency = null;
      let arrivalAgency = null;
      
      if (movementData.departureAgencyId) {
        departureAgency = await Agency.findById(movementData.departureAgencyId);
        
        // Si l'agence est trouvée, utiliser ses coordonnées et son nom
        if (departureAgency) {
          movementData.departureLocation = {
            name: departureAgency.name,
            coordinates: departureAgency.location.coordinates
          };
        }
      }
      
      if (movementData.arrivalAgencyId) {
        arrivalAgency = await Agency.findById(movementData.arrivalAgencyId);
        
        // Si l'agence est trouvée, utiliser ses coordonnées et son nom
        if (arrivalAgency) {
          movementData.arrivalLocation = {
            name: arrivalAgency.name,
            coordinates: arrivalAgency.location.coordinates
          };
        }
      }
      
      // Créer le mouvement
      const movement = new Movement({
        ...movementData,
        assignedBy: user._id
      });
      
      // Récupérer les informations du chauffeur si assigné
      let driverInfo = null;
      if (movement.userId) {
        driverInfo = await User.findById(movement.userId).select('fullName email phone');
      }
      
      // Si les deux agences sont définies, envoyer une notification par email
      if (departureAgency && arrivalAgency) {
        const emailResult = await emailService.sendMovementNotification(
          movement, 
          departureAgency, 
          arrivalAgency, 
          driverInfo
        );
        
        // Enregistrer le résultat de l'envoi d'email
        movement.emailNotifications.push({
          sentAt: new Date(),
          recipients: [departureAgency.email, arrivalAgency.email].filter(Boolean),
          success: emailResult.success,
          error: emailResult.error
        });
      }
      
      // Sauvegarder le mouvement
      await movement.save();
      
      return movement;
    } catch (error) {
      console.error('Erreur lors de la création du mouvement:', error);
      throw error;
    }
  }
  
  /**
   * Renvoie la notification par email pour un mouvement existant
   * @param {string} movementId - ID du mouvement
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async resendMovementNotification(movementId) {
    try {
      // Récupérer le mouvement avec les références aux agences
      const movement = await Movement.findById(movementId)
        .populate('departureAgencyId')
        .populate('arrivalAgencyId')
        .populate('userId', 'fullName email phone');
      
      if (!movement) {
        throw new Error('Mouvement non trouvé');
      }
      
      // Vérifier si les références aux agences existent
      if (!movement.departureAgencyId || !movement.arrivalAgencyId) {
        throw new Error('Les références aux agences sont manquantes');
      }
      
      // Envoyer la notification
      const emailResult = await emailService.sendMovementNotification(
        movement, 
        movement.departureAgencyId, 
        movement.arrivalAgencyId, 
        movement.userId
      );
      
      // Enregistrer le résultat de l'envoi d'email
      movement.emailNotifications.push({
        sentAt: new Date(),
        recipients: [
          movement.departureAgencyId.email, 
          movement.arrivalAgencyId.email
        ].filter(Boolean),
        success: emailResult.success,
        error: emailResult.error
      });
      
      // Sauvegarder le mouvement
      await movement.save();
      
      return {
        success: emailResult.success,
        message: emailResult.success 
          ? 'Notification envoyée avec succès' 
          : `Erreur lors de l'envoi: ${emailResult.error || 'Erreur inconnue'}`
      };
    } catch (error) {
      console.error('Erreur lors du renvoi de la notification:', error);
      throw error;
    }
  }
  
  /**
   * Met à jour le statut d'un mouvement et envoie une notification si nécessaire
   * @param {string} movementId - ID du mouvement
   * @param {string} status - Nouveau statut
   * @returns {Promise<Object>} Mouvement mis à jour
   */
  async updateMovementStatus(movementId, status) {
    try {
      // Récupérer le mouvement avec les références aux agences
      const movement = await Movement.findById(movementId)
        .populate('departureAgencyId')
        .populate('arrivalAgencyId')
        .populate('userId', 'fullName email phone');
      
      if (!movement) {
        throw new Error('Mouvement non trouvé');
      }
      
      // Mettre à jour le statut
      movement.status = status;
      
      // Si le statut passe à "completed" ou "in-progress", définir l'heure correspondante
      if (status === 'in-progress' && !movement.departureTime) {
        movement.departureTime = new Date();
      } else if (status === 'completed' && !movement.arrivalTime) {
        movement.arrivalTime = new Date();
      }
      
      // Si les agences sont définies et que le statut est "in-progress" ou "completed",
      // envoyer une notification mise à jour
      if (movement.departureAgencyId && movement.arrivalAgencyId && 
          (status === 'in-progress' || status === 'completed')) {
        
        const emailResult = await emailService.sendMovementNotification(
          movement, 
          movement.departureAgencyId, 
          movement.arrivalAgencyId, 
          movement.userId
        );
        
        // Enregistrer le résultat de l'envoi d'email
        movement.emailNotifications.push({
          sentAt: new Date(),
          recipients: [
            movement.departureAgencyId.email, 
            movement.arrivalAgencyId.email
          ].filter(Boolean),
          success: emailResult.success,
          error: emailResult.error
        });
      }
      
      // Sauvegarder le mouvement
      await movement.save();
      
      return movement;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut du mouvement:', error);
      throw error;
    }
  }
}

module.exports = new MovementService();