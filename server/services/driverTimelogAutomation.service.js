// server/services/driverTimelogAutomation.service.js
const TimeLog = require('../models/timelog.model');
const Movement = require('../models/movement.model');
const User = require('../models/user.model');
const moment = require('moment');

/**
 * Service pour la gestion automatique des pointages des drivers
 * S'exécute quotidiennement à 3h du matin pour corriger les pointages manquants
 */
class DriverTimelogAutomationService {
  
  /**
   * Point d'entrée principal - traite tous les drivers
   */
  async processAllDrivers() {
    try {
      console.log('🚗 Démarrage du traitement automatique des pointages drivers...');
      
      // Récupérer tous les drivers
      const drivers = await User.find({ role: 'driver' });
      
      if (drivers.length === 0) {
        console.log('ℹ️ Aucun driver trouvé');
        return { processedDrivers: 0, corrections: [] };
      }
      
      console.log(`🔍 Traitement de ${drivers.length} driver(s)`);
      
      const corrections = [];
      let processedDrivers = 0;
      
      // Traiter chaque driver individuellement
      for (const driver of drivers) {
        try {
          const driverCorrections = await this.processDriverTimelogs(driver);
          if (driverCorrections.length > 0) {
            corrections.push({
              driver: {
                id: driver._id,
                name: driver.fullName,
                username: driver.username
              },
              corrections: driverCorrections
            });
          }
          processedDrivers++;
        } catch (error) {
          console.error(`❌ Erreur lors du traitement du driver ${driver.fullName}:`, error);
        }
      }
      
      console.log(`✅ Traitement terminé - ${processedDrivers} driver(s) traité(s), ${corrections.length} driver(s) avec corrections`);
      
      return {
        processedDrivers,
        corrections,
        totalCorrections: corrections.reduce((sum, d) => sum + d.corrections.length, 0)
      };
    } catch (error) {
      console.error('❌ Erreur lors du traitement automatique des pointages drivers:', error);
      throw error;
    }
  }
  
  /**
   * Traite les pointages d'un driver spécifique pour hier
   */
  async processDriverTimelogs(driver) {
    console.log(`🔄 Traitement du driver: ${driver.fullName}`);
    
    // Date d'hier (jour à traiter)
    const yesterday = moment().subtract(1, 'day');
    const dayStart = yesterday.clone().startOf('day').toDate();
    const dayEnd = yesterday.clone().endOf('day').toDate();
    
    // Récupérer les pointages du driver pour hier
    const timelogs = await TimeLog.find({
      userId: driver._id,
      createdAt: { $gte: dayStart, $lte: dayEnd }
    }).sort({ createdAt: 1 });
    
    // Récupérer les mouvements du driver pour hier
    const movements = await Movement.find({
      userId: driver._id,
      $or: [
        { createdAt: { $gte: dayStart, $lte: dayEnd } },
        { updatedAt: { $gte: dayStart, $lte: dayEnd } }
      ]
    }).sort({ createdAt: 1 });
    
    console.log(`  📊 ${timelogs.length} pointage(s) et ${movements.length} mouvement(s) trouvé(s)`);
    
    // Si aucun pointage ni mouvement, ignorer ce driver
    if (timelogs.length === 0 && movements.length === 0) {
      console.log(`  ⏭️ Aucune activité détectée pour ${driver.fullName}, ignoré`);
      return [];
    }
    
    const corrections = [];
    
    // Analyser et corriger les pointages
    const analysisResult = this.analyzeDriverDay(timelogs, movements, dayStart, dayEnd);
    
    // Cas 1: Pause complètement manquante
    if (analysisResult.needsBreak && !analysisResult.hasBreakStart && !analysisResult.hasBreakEnd) {
      const breakCorrections = await this.createMissingBreak(
        driver._id, 
        analysisResult.inactivityPeriod,
        dayStart,
        dayEnd
      );
      corrections.push(...breakCorrections);
    }
    
    // Cas 2: Début de pause loggé mais fin manquante
    if (analysisResult.hasBreakStart && !analysisResult.hasBreakEnd) {
      const breakEndCorrection = await this.createMissingBreakEnd(
        driver._id,
        analysisResult.breakStartTime
      );
      corrections.push(breakEndCorrection);
    }
    
    // Cas 3: Fin de service manquante
    if (analysisResult.needsServiceEnd && analysisResult.lastMovementEndTime) {
      const serviceEndCorrection = await this.createMissingServiceEnd(
        driver._id,
        analysisResult.lastMovementEndTime
      );
      corrections.push(serviceEndCorrection);
    }
    
    if (corrections.length > 0) {
      console.log(`  ✅ ${corrections.length} correction(s) appliquée(s) pour ${driver.fullName}`);
    } else {
      console.log(`  ✨ Aucune correction nécessaire pour ${driver.fullName}`);
    }
    
    return corrections;
  }
  
  /**
   * Analyse la journée d'un driver et détermine les corrections nécessaires
   */
  analyzeDriverDay(timelogs, movements, dayStart, dayEnd) {
    const analysis = {
      hasServiceStart: false,
      hasBreakStart: false,
      hasBreakEnd: false,
      hasServiceEnd: false,
      needsBreak: false,
      needsServiceEnd: false,
      inactivityPeriod: null,
      breakStartTime: null,
      lastMovementEndTime: null,
      hasActiveMovement: false
    };
    
    // Analyser les pointages existants
    timelogs.forEach(timelog => {
      switch (timelog.type) {
        case 'start_service':
          analysis.hasServiceStart = true;
          break;
        case 'start_break':
          analysis.hasBreakStart = true;
          analysis.breakStartTime = timelog.startTime;
          break;
        case 'end_break':
          analysis.hasBreakEnd = true;
          break;
        case 'end_service':
          analysis.hasServiceEnd = true;
          break;
      }
    });
    
    // Analyser les mouvements pour détecter les périodes d'inactivité
    const movementActions = this.extractMovementActions(movements);
    
    // Vérifier s'il y a un mouvement en cours (in-progress)
    analysis.hasActiveMovement = movements.some(m => m.status === 'in-progress');
    
    // Trouver le dernier mouvement terminé
    const lastCompletedMovement = movements
      .filter(m => m.status === 'completed')
      .sort((a, b) => new Date(b.arrivalTime || b.updatedAt) - new Date(a.arrivalTime || a.updatedAt))[0];
    
    if (lastCompletedMovement) {
      analysis.lastMovementEndTime = lastCompletedMovement.arrivalTime || lastCompletedMovement.updatedAt;
    }
    
    // Détecter si une pause est nécessaire (période d'inactivité ≥ 1h)
    if (!analysis.hasBreakStart && !analysis.hasActiveMovement && movementActions.length >= 2) {
      const inactivityPeriod = this.findLongestInactivityPeriod(movementActions);
      if (inactivityPeriod && inactivityPeriod.duration >= 60) { // 60 minutes
        analysis.needsBreak = true;
        analysis.inactivityPeriod = inactivityPeriod;
      }
    }
    
    // Détecter si fin de service est nécessaire
    analysis.needsServiceEnd = !analysis.hasServiceEnd && 
                              (timelogs.length > 0 || movements.length > 0) &&
                              analysis.lastMovementEndTime;
    
    return analysis;
  }
  
  /**
   * Extrait les actions sur mouvements avec timestamps
   */
  extractMovementActions(movements) {
    const actions = [];
    
    movements.forEach(movement => {
      // Action de début (quand le statut passe à 'in-progress')
      if (movement.departureTime) {
        actions.push({
          type: 'start',
          time: new Date(movement.departureTime),
          movementId: movement._id
        });
      }
      
      // Action de fin (quand le statut passe à 'completed')
      if (movement.arrivalTime) {
        actions.push({
          type: 'end',
          time: new Date(movement.arrivalTime),
          movementId: movement._id
        });
      }
    });
    
    // Trier par ordre chronologique
    return actions.sort((a, b) => a.time - b.time);
  }
  
  /**
   * Trouve la plus longue période d'inactivité entre les actions
   */
  findLongestInactivityPeriod(actions) {
    if (actions.length < 2) return null;
    
    let longestPeriod = null;
    let maxDuration = 0;
    
    for (let i = 0; i < actions.length - 1; i++) {
      const currentAction = actions[i];
      const nextAction = actions[i + 1];
      
      // Ne considérer que les périodes entre une fin et un début
      if (currentAction.type === 'end' && nextAction.type === 'start') {
        const duration = (nextAction.time - currentAction.time) / (1000 * 60); // en minutes
        
        if (duration > maxDuration) {
          maxDuration = duration;
          longestPeriod = {
            startTime: currentAction.time,
            endTime: nextAction.time,
            duration: duration
          };
        }
      }
    }
    
    return longestPeriod;
  }
  
  /**
   * Crée une pause manquante (début + fin)
   */
  async createMissingBreak(userId, inactivityPeriod, dayStart, dayEnd) {
    const corrections = [];
    
    // Calculer les heures de début et fin de pause
    const breakStartTime = new Date(inactivityPeriod.startTime);
    const breakEndTime = new Date(breakStartTime.getTime() + 60 * 60 * 1000); // +1 heure
    
    // S'assurer que la pause reste dans la journée
    const maxEndTime = new Date(dayEnd);
    if (breakEndTime > maxEndTime) {
      breakEndTime.setTime(maxEndTime.getTime());
    }
    
    // Créer le début de pause
    const breakStart = new TimeLog({
      userId,
      startTime: breakStartTime,
      endTime: breakStartTime, // Même temps pour un pointage instantané
      status: 'completed',
      type: 'start_break',
      isAutoGenerated: true,
      autoGenerationReason: 'missing_break',
      notes: 'Pause créée automatiquement - période d\'inactivité détectée'
    });
    
    await breakStart.save();
    corrections.push({
      type: 'start_break',
      time: breakStartTime,
      reason: 'Période d\'inactivité de ' + Math.round(inactivityPeriod.duration) + ' minutes détectée'
    });
    
    // Créer la fin de pause
    const breakEnd = new TimeLog({
      userId,
      startTime: breakEndTime,
      endTime: breakEndTime,
      status: 'completed',
      type: 'end_break',
      isAutoGenerated: true,
      autoGenerationReason: 'missing_break',
      notes: 'Fin de pause créée automatiquement - 1h après le début'
    });
    
    await breakEnd.save();
    corrections.push({
      type: 'end_break',
      time: breakEndTime,
      reason: 'Fin automatique 1h après le début de pause'
    });
    
    return corrections;
  }
  
  /**
   * Crée la fin de pause manquante
   */
  async createMissingBreakEnd(userId, breakStartTime) {
    const breakEndTime = new Date(breakStartTime.getTime() + 60 * 60 * 1000); // +1 heure
    
    const breakEnd = new TimeLog({
      userId,
      startTime: breakEndTime,
      endTime: breakEndTime,
      status: 'completed',
      type: 'end_break',
      isAutoGenerated: true,
      autoGenerationReason: 'missing_break_end',
      notes: 'Fin de pause créée automatiquement - 1h après le début'
    });
    
    await breakEnd.save();
    
    return {
      type: 'end_break',
      time: breakEndTime,
      reason: 'Fin de pause manquante - créée 1h après le début'
    };
  }
  
  /**
   * Crée la fin de service manquante
   */
  async createMissingServiceEnd(userId, lastMovementEndTime) {
    const serviceEndTime = new Date(lastMovementEndTime);
    
    const serviceEnd = new TimeLog({
      userId,
      startTime: serviceEndTime,
      endTime: serviceEndTime,
      status: 'completed',
      type: 'end_service',
      isAutoGenerated: true,
      autoGenerationReason: 'missing_service_end',
      notes: 'Fin de service créée automatiquement après le dernier mouvement'
    });
    
    await serviceEnd.save();
    
    return {
      type: 'end_service',
      time: serviceEndTime,
      reason: 'Fin de service manquante - créée après le dernier mouvement terminé'
    };
  }
}

module.exports = new DriverTimelogAutomationService();