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
          
          console.log(`🔍 Vérification de ${user.fullName} (${user.role})`);
          
          // Déterminer si l'utilisateur doit être déconnecté
          const shouldDisconnect = await this.shouldDisconnectUser(log, user);
          
          if (shouldDisconnect.disconnect) {
            await this.disconnectUser(log, user, shouldDisconnect.reason);
            results.disconnected++;
            console.log(`✅ ${user.fullName} (${user.role}) déconnecté automatiquement: ${shouldDisconnect.reason}`);
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
    
    console.log(`  📊 ${user.fullName}: connecté depuis ${Math.round(hoursConnected * 100) / 100}h`);
    
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
      console.log(`  🚗 Analyse du chauffeur ${user.fullName}...`);
      
      // Chercher le dernier mouvement terminé
      const lastCompletedMovement = await Movement.findOne({
        userId: user._id,
        status: 'completed'
      }).sort({ updatedAt: -1, arrivalTime: -1 });
      
      console.log(`    📊 Dernier mouvement terminé: ${lastCompletedMovement ? 'trouvé' : 'aucun'}`);
      
      if (!lastCompletedMovement) {
        // Pas de mouvement terminé, vérifier s'il y a un mouvement en cours
        const activeMovement = await Movement.findOne({
          userId: user._id,
          status: { $in: ['in-progress', 'preparing'] }
        });
        
        console.log(`    📊 Mouvement actif: ${activeMovement ? activeMovement.status : 'aucun'}`);
        
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
          reason: activeMovement ? `Mouvement ${activeMovement.status}` : 'Récemment connecté sans mouvement'
        };
      }
      
      // Vérifier l'heure du dernier mouvement terminé
      const lastMovementTime = new Date(lastCompletedMovement.arrivalTime || lastCompletedMovement.updatedAt);
      const now = new Date();
      const minutesSinceLastMovement = (now - lastMovementTime) / (1000 * 60);
      
      console.log(`    📊 Dernier mouvement terminé il y a ${Math.round(minutesSinceLastMovement)} minutes`);
      
      // CORRECTION: Déconnecter 15 minutes après le dernier mouvement terminé
      if (minutesSinceLastMovement > 15) {
        return {
          disconnect: true,
          reason: `Dernier mouvement terminé il y a ${Math.round(minutesSinceLastMovement)} minutes (> 15min)`
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
      console.log(`  🔧 Analyse du préparateur ${user.fullName}...`);
      
      // Chercher la dernière préparation terminée
      const lastCompletedPreparation = await Preparation.findOne({
        userId: user._id,
        status: 'completed'
      }).sort({ updatedAt: -1, endTime: -1 });
      
      console.log(`    📊 Dernière préparation terminée: ${lastCompletedPreparation ? 'trouvée' : 'aucune'}`);
      
      if (!lastCompletedPreparation) {
        // Pas de préparation terminée, vérifier s'il y en a une en cours
        const activePreparation = await Preparation.findOne({
          userId: user._id,
          status: 'in-progress'
        });
        
        console.log(`    📊 Préparation active: ${activePreparation ? 'oui' : 'non'}`);
        
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
          reason: activePreparation ? 'Préparation en cours' : 'Récemment connecté sans préparation'
        };
      }
      
      // Vérifier l'heure de la dernière préparation terminée
      const lastPreparationTime = new Date(lastCompletedPreparation.endTime || lastCompletedPreparation.updatedAt);
      const now = new Date();
      const minutesSinceLastPreparation = (now - lastPreparationTime) / (1000 * 60);
      
      console.log(`    📊 Dernière préparation terminée il y a ${Math.round(minutesSinceLastPreparation)} minutes`);
      
      // CORRECTION: Déconnecter 15 minutes après la dernière préparation terminée
      if (minutesSinceLastPreparation > 15) {
        return {
          disconnect: true,
          reason: `Dernière préparation terminée il y a ${Math.round(minutesSinceLastPreparation)} minutes (> 15min)`
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
      console.log(`🔌 Déconnexion de ${user.fullName}...`);
      
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
      
      console.log(`✅ ${user.fullName} déconnecté automatiquement: ${reason}`);
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
  
  /**
   * Force la déconnexion d'un utilisateur spécifique (pour tests)
   */
  async forceDisconnectUser(userId, reason = 'Déconnexion manuelle par admin') {
    try {
      const activeLog = await TimeLog.findOne({
        userId,
        status: 'active'
      }).populate('userId', 'username fullName role');
      
      if (!activeLog) {
        return { success: false, message: 'Aucun pointage actif trouvé' };
      }
      
      await this.disconnectUser(activeLog, activeLog.userId, reason);
      
      return {
        success: true,
        message: `${activeLog.userId.fullName} déconnecté avec succès`,
        user: activeLog.userId.fullName
      };
    } catch (error) {
      console.error('Erreur lors de la déconnexion forcée:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Obtient des statistiques sur les utilisateurs connectés
   */
  async getConnectionStats() {
    try {
      const activeLogs = await TimeLog.find({ status: 'active' })
        .populate('userId', 'username fullName role')
        .sort({ startTime: -1 });
      
      const stats = {
        totalActive: activeLogs.length,
        byRole: {},
        longConnections: [],
        recentConnections: []
      };
      
      const now = new Date();
      
      for (const log of activeLogs) {
        const user = log.userId;
        const role = user.role;
        const connectedHours = (now - new Date(log.startTime)) / (1000 * 60 * 60);
        
        // Statistiques par rôle
        if (!stats.byRole[role]) {
          stats.byRole[role] = 0;
        }
        stats.byRole[role]++;
        
        // Connexions longues (> 8h)
        if (connectedHours > 8) {
          stats.longConnections.push({
            user: user.fullName,
            role: user.role,
            hours: Math.round(connectedHours * 10) / 10,
            startTime: log.startTime
          });
        }
        
        // Connexions récentes (< 1h)
        if (connectedHours < 1) {
          stats.recentConnections.push({
            user: user.fullName,
            role: user.role,
            minutes: Math.round(connectedHours * 60),
            startTime: log.startTime
          });
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
}

module.exports = new AutoTimelogService();