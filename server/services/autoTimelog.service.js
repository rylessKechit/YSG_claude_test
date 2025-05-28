// server/services/autoTimelog.service.js - VERSION CORRIGÉE
const TimeLog = require('../models/timelog.model');
const Movement = require('../models/movement.model');
const Preparation = require('../models/preparation.model');
const User = require('../models/user.model');

class AutoTimelogService {
  /**
   * Termine automatiquement les services des utilisateurs inactifs
   * S'exécute à 4h du matin heure de Paris
   */
  async endOrphanedServices() {
    try {
      console.log('🕓 Démarrage du service d\'auto-déconnexion à', new Date().toLocaleString('fr-FR'));
      
      // Récupérer tous les pointages actifs
      const activeLogs = await TimeLog.find({ status: 'active' })
        .populate('userId', 'username fullName role');
      
      if (activeLogs.length === 0) {
        console.log('✅ Aucun pointage actif trouvé');
        return { processed: 0, disconnected: 0, errors: [] };
      }
      
      console.log(`🔍 ${activeLogs.length} pointage(s) actif(s) à vérifier`);
      
      const results = {
        processed: 0,
        disconnected: 0,
        errors: []
      };
      
      for (const log of activeLogs) {
        try {
          results.processed++;
          const user = log.userId;
          
          if (!user) {
            console.log(`⚠️ Pointage sans utilisateur valide: ${log._id}`);
            continue;
          }
          
          // Déterminer si l'utilisateur doit être déconnecté
          const shouldDisconnect = await this.shouldDisconnectUser(log, user);
          
          if (shouldDisconnect.disconnect) {
            await this.disconnectUser(log, user, shouldDisconnect.reason);
            results.disconnected++;
            console.log(`✅ ${user.fullName} (${user.role}) déconnecté automatiquement`);
          } else {
            console.log(`ℹ️ ${user.fullName} (${user.role}) reste connecté: ${shouldDisconnect.reason}`);
          }
        } catch (error) {
          console.error(`❌ Erreur lors du traitement de ${log.userId?.fullName || 'utilisateur inconnu'}:`, error);
          results.errors.push({
            userId: log.userId?._id,
            username: log.userId?.fullName,
            error: error.message
          });
        }
      }
      
      console.log(`✅ Auto-déconnexion terminée: ${results.disconnected}/${results.processed} utilisateurs déconnectés`);
      return results;
    } catch (error) {
      console.error('❌ Erreur dans endOrphanedServices:', error);
      throw error;
    }
  }
  
  /**
   * Détermine si un utilisateur doit être déconnecté automatiquement
   */
  async shouldDisconnectUser(timeLog, user) {
    const now = new Date();
    const logStartTime = new Date(timeLog.startTime);
    const hoursConnected = (now - logStartTime) / (1000 * 60 * 60);
    
    // Si connecté depuis plus de 24h, déconnecter obligatoirement
    if (hoursConnected > 24) {
      return {
        disconnect: true,
        reason: `Connecté depuis ${Math.round(hoursConnected)}h (> 24h)`
      };
    }
    
    // Logique spécifique selon le rôle
    switch (user.role) {
      case 'driver':
      case 'team-leader':
        return await this.shouldDisconnectDriver(user, timeLog);
        
      case 'preparator':
        return await this.shouldDisconnectPreparator(user, timeLog);
        
      default:
        // Pour les autres rôles (admin, direction), déconnecter après 12h
        if (hoursConnected > 12) {
          return {
            disconnect: true,
            reason: `Connecté depuis ${Math.round(hoursConnected)}h (> 12h pour ${user.role})`
          };
        }
        return {
          disconnect: false,
          reason: `Connecté depuis ${Math.round(hoursConnected)}h (< 12h pour ${user.role})`
        };
    }
  }
  
  /**
   * Vérifie si un chauffeur/chef d'équipe doit être déconnecté
   */
  async shouldDisconnectDriver(user, timeLog) {
    try {
      // Chercher le dernier mouvement terminé
      const lastCompletedMovement = await Movement.findOne({
        userId: user._id,
        status: 'completed'
      }).sort({ arrivalTime: -1 });
      
      if (!lastCompletedMovement) {
        // Pas de mouvement terminé, vérifier s'il y a un mouvement en cours
        const activeMovement = await Movement.findOne({
          userId: user._id,
          status: 'in-progress'
        });
        
        if (!activeMovement) {
          const logStartTime = new Date(timeLog.startTime);
          const now = new Date();
          const hoursConnected = (now - logStartTime) / (1000 * 60 * 60);
          
          // Si pas de mouvement du tout et connecté depuis plus de 2h, déconnecter
          if (hoursConnected > 2) {
            return {
              disconnect: true,
              reason: `Aucun mouvement et connecté depuis ${Math.round(hoursConnected)}h`
            };
          }
        }
        
        return {
          disconnect: false,
          reason: 'Mouvement en cours ou récemment connecté'
        };
      }
      
      // Vérifier l'heure du dernier mouvement terminé
      const lastMovementTime = new Date(lastCompletedMovement.arrivalTime || lastCompletedMovement.updatedAt);
      const now = new Date();
      const minutesSinceLastMovement = (now - lastMovementTime) / (1000 * 60);
      
      // CORRECTION: Déconnecter 15 minutes après le dernier mouvement terminé
      if (minutesSinceLastMovement > 15) {
        return {
          disconnect: true,
          reason: `Dernier mouvement terminé il y a ${Math.round(minutesSinceLastMovement)} minutes`
        };
      }
      
      return {
        disconnect: false,
        reason: `Dernier mouvement terminé il y a ${Math.round(minutesSinceLastMovement)} minutes (< 15min)`
      };
    } catch (error) {
      console.error('Erreur lors de la vérification du chauffeur:', error);
      return {
        disconnect: false,
        reason: 'Erreur lors de la vérification'
      };
    }
  }
  
  /**
   * Vérifie si un préparateur doit être déconnecté
   */
  async shouldDisconnectPreparator(user, timeLog) {
    try {
      // Chercher la dernière préparation terminée
      const lastCompletedPreparation = await Preparation.findOne({
        userId: user._id,
        status: 'completed'
      }).sort({ endTime: -1 });
      
      if (!lastCompletedPreparation) {
        // Pas de préparation terminée, vérifier s'il y en a une en cours
        const activePreparation = await Preparation.findOne({
          userId: user._id,
          status: 'in-progress'
        });
        
        if (!activePreparation) {
          const logStartTime = new Date(timeLog.startTime);
          const now = new Date();
          const hoursConnected = (now - logStartTime) / (1000 * 60 * 60);
          
          // Si pas de préparation du tout et connecté depuis plus de 2h, déconnecter
          if (hoursConnected > 2) {
            return {
              disconnect: true,
              reason: `Aucune préparation et connecté depuis ${Math.round(hoursConnected)}h`
            };
          }
        }
        
        return {
          disconnect: false,
          reason: 'Préparation en cours ou récemment connecté'
        };
      }
      
      // Vérifier l'heure de la dernière préparation terminée
      const lastPreparationTime = new Date(lastCompletedPreparation.endTime || lastCompletedPreparation.updatedAt);
      const now = new Date();
      const minutesSinceLastPreparation = (now - lastPreparationTime) / (1000 * 60);
      
      // CORRECTION: Déconnecter 15 minutes après la dernière préparation terminée
      if (minutesSinceLastPreparation > 15) {
        return {
          disconnect: true,
          reason: `Dernière préparation terminée il y a ${Math.round(minutesSinceLastPreparation)} minutes`
        };
      }
      
      return {
        disconnect: false,
        reason: `Dernière préparation terminée il y a ${Math.round(minutesSinceLastPreparation)} minutes (< 15min)`
      };
    } catch (error) {
      console.error('Erreur lors de la vérification du préparateur:', error);
      return {
        disconnect: false,
        reason: 'Erreur lors de la vérification'
      };
    }
  }
  
  /**
   * Déconnecte automatiquement un utilisateur
   */
  async disconnectUser(timeLog, user, reason) {
    try {
      // Terminer le pointage
      timeLog.endTime = new Date();
      timeLog.status = 'completed';
      
      // Ajouter une note explicative
      const autoNote = `Service terminé automatiquement: ${reason}`;
      timeLog.notes = timeLog.notes ? `${timeLog.notes}\n${autoNote}` : autoNote;
      
      // Marquer comme déconnexion automatique
      timeLog.isAutoDisconnected = true;
      timeLog.autoDisconnectReason = reason;
      
      await timeLog.save();
      
      console.log(`🔌 ${user.fullName} déconnecté automatiquement: ${reason}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la déconnexion de ${user.fullName}:`, error);
      throw error;
    }
  }
  
  /**
   * Teste la fonction sur un utilisateur spécifique (pour debug)
   */
  async testUserDisconnection(userId) {
    try {
      const activeLog = await TimeLog.findOne({
        userId,
        status: 'active'
      }).populate('userId', 'username fullName role');
      
      if (!activeLog) {
        return { message: 'Aucun pointage actif trouvé pour cet utilisateur' };
      }
      
      const shouldDisconnect = await this.shouldDisconnectUser(activeLog, activeLog.userId);
      
      return {
        user: activeLog.userId.fullName,
        role: activeLog.userId.role,
        connectedSince: activeLog.startTime,
        shouldDisconnect: shouldDisconnect.disconnect,
        reason: shouldDisconnect.reason
      };
    } catch (error) {
      console.error('Erreur lors du test:', error);
      throw error;
    }
  }
}

module.exports = new AutoTimelogService();