// server/routes/timelog.routes.js (CORRIGÉ - routes manquantes ajoutées)
const express = require('express');
const router = express.Router();
const TimeLog = require('../models/timelog.model');
const { verifyToken, canAccessReports, isAdmin } = require('../middleware/auth.middleware');
const { verifyLocationAndIP } = require('../middleware/location.middleware');

// Route pour démarrer un pointage avec type spécifique
router.post('/', verifyToken, verifyLocationAndIP, async (req, res) => {
  try {
    const { latitude, longitude, notes, type = 'general' } = req.body;
    
    // Validation du type de pointage
    const validTypes = ['start_service', 'start_break', 'end_break', 'end_service', 'general'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        message: 'Type de pointage invalide',
        validTypes 
      });
    }
    
    // Pour les drivers, vérifier la logique des pointages
    if (req.user.role === 'driver' && type !== 'general') {
      const validationError = await validateDriverTimelogSequence(req.user._id, type);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
    }
    
    // Vérifier s'il existe déjà un pointage actif
    const existingTimeLog = await TimeLog.findOne({ 
      userId: req.user._id, 
      status: 'active' 
    });
    
    if (existingTimeLog) {
      return res.status(400).json({ 
        message: 'Un pointage est déjà en cours',
        timeLog: existingTimeLog
      });
    }
    
    // Créer un nouveau pointage
    const timeLogData = {
      userId: req.user._id,
      startTime: new Date(),
      status: 'active',
      type: type,
      location: {
        startLocation: {
          name: req.locationName || 'Emplacement autorisé',
          coordinates: {
            latitude,
            longitude
          },
          ipAddress: req.clientIPAddress
        }
      },
      notes
    };

    const timeLog = new TimeLog(timeLogData);
    await timeLog.save();
    
    res.status(201).json({
      message: 'Pointage démarré avec succès',
      timeLog
    });
  } catch (error) {
    console.error('Erreur lors du démarrage du pointage:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour terminer un pointage
router.post('/end', verifyToken, verifyLocationAndIP, async (req, res) => {
  try {
    const activeTimeLog = await TimeLog.findOne({ 
      userId: req.user._id, 
      status: 'active' 
    });
    
    if (!activeTimeLog) {
      return res.status(404).json({ message: 'Aucun pointage actif trouvé' });
    }
    
    const { latitude, longitude, notes } = req.body;
    
    activeTimeLog.endTime = new Date();
    activeTimeLog.status = 'completed';
    activeTimeLog.location.endLocation = {
      name: req.locationName || 'Emplacement autorisé',
      coordinates: {
        latitude,
        longitude
      },
      ipAddress: req.clientIPAddress
    };
    
    if (notes) {
      activeTimeLog.notes = notes;
    }
    
    await activeTimeLog.save();
    
    res.json({
      message: 'Pointage terminé avec succès',
      timeLog: activeTimeLog
    });
  } catch (error) {
    console.error('Erreur lors de la fin du pointage:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ROUTE MANQUANTE AJOUTÉE: Obtenir les pointages d'un driver avec types (pour analyse)
router.get('/driver-analysis/:userId?', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    
    // CORRECTION: Convertir l'ObjectId en string pour la comparaison
    const requestedUserId = userId.toString();
    const currentUserId = req.user._id.toString();
    
    // Vérifier les permissions - permettre à l'utilisateur de voir ses propres données
    if (requestedUserId !== currentUserId && 
        !['admin', 'team-leader', 'direction'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission refusée' });
    }
    
    const { date } = req.query;
    let startDate, endDate;
    
    if (date) {
      startDate = new Date(date + 'T00:00:00');
      endDate = new Date(date + 'T23:59:59');
    } else {
      // Par défaut, prendre aujourd'hui
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    }
    
    // Récupérer les pointages du driver pour la date
    const timelogs = await TimeLog.find({
      userId: requestedUserId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: 1 });
    
    // Analyser les pointages
    const analysis = analyzeDriverTimelogs(timelogs);
    
    res.json({
      date: startDate.toISOString().split('T')[0],
      timelogs,
      analysis
    });
  } catch (error) {
    console.error('Erreur lors de l\'analyse des pointages:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ROUTE ALTERNATIVE sans paramètre userId (pour éviter les conflits)
router.get('/my-analysis', verifyToken, async (req, res) => {
  try {
    // Toujours utiliser l'ID de l'utilisateur connecté
    const userId = req.user._id.toString();
    
    const { date } = req.query;
    let startDate, endDate;
    
    if (date) {
      startDate = new Date(date + 'T00:00:00');
      endDate = new Date(date + 'T23:59:59');
    } else {
      // Par défaut, prendre aujourd'hui
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    }
    
    // Récupérer les pointages du driver pour la date
    const timelogs = await TimeLog.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: 1 });
    
    // Analyser les pointages
    const analysis = analyzeDriverTimelogs(timelogs);
    
    res.json({
      date: startDate.toISOString().split('T')[0],
      timelogs,
      analysis
    });
  } catch (error) {
    console.error('Erreur lors de l\'analyse des pointages:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ROUTE MANQUANTE AJOUTÉE: Déclencher manuellement le traitement automatique (admin seulement)
router.post('/auto-process-drivers', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log(`🔄 Déclenchement manuel du traitement des pointages drivers par l'admin ${req.user._id}`);
    
    const schedulerService = require('../services/scheduler.service');
    const result = await schedulerService.runDriverTimelogProcessingNow();
    
    res.json({ 
      message: 'Traitement automatique des pointages drivers terminé avec succès',
      success: true,
      result
    });
  } catch (error) {
    console.error('❌ Erreur lors du traitement manuel des pointages drivers:', error);
    res.status(500).json({ 
      message: 'Erreur lors du traitement automatique des pointages drivers',
      error: error.message
    });
  }
});

// ROUTE MANQUANTE AJOUTÉE: Obtenir le statut des utilisateurs avec pointages actifs
router.get('/users/status', verifyToken, isAdmin, async (req, res) => {
  try {
    // Récupérer tous les pointages actifs avec les informations utilisateur
    const activeTimelogs = await TimeLog.find({ status: 'active' })
      .populate('userId', 'username fullName email phone role')
      .sort({ startTime: -1 });
    
    // Formater les données pour la réponse
    const usersStatus = activeTimelogs.map(timelog => ({
      _id: timelog.userId._id,
      username: timelog.userId.username,
      fullName: timelog.userId.fullName,
      email: timelog.userId.email,
      phone: timelog.userId.phone,
      role: timelog.userId.role,
      status: timelog.status,
      startTime: timelog.startTime,
      type: timelog.type,
      location: timelog.location,
      notes: timelog.notes
    }));
    
    res.json(usersStatus);
  } catch (error) {
    console.error('Erreur lors de la récupération du statut des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour récupérer le pointage actif
router.get('/active', verifyToken, async (req, res) => {
  try {
    const activeTimeLog = await TimeLog.findOne({ 
      userId: req.user._id, 
      status: 'active' 
    });
    
    if (!activeTimeLog) {
      return res.status(404).json({ message: 'Aucun pointage actif trouvé' });
    }
    
    res.json(activeTimeLog);
  } catch (error) {
    console.error('Erreur lors de la récupération du pointage actif:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour obtenir l'historique des pointages
router.get('/', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { userId, startDate, endDate, status, type } = req.query;
    
    // Construction de la requête avec filtres
    const query = {};
    
    // Définir explicitement l'userId
    if (userId) {
      query.userId = userId;
    } else {
      query.userId = req.user._id;
    }
    
    // Amélioration du filtrage par date
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.startTime.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.startTime.$lte = end;
      }
    }
    
    // Filtrage par statut
    if (status) {
      query.status = status;
    }
    
    // Filtrage par type de pointage
    if (type) {
      query.type = type;
    }
    
    // Vérifier les autorisations pour voir les pointages d'autres utilisateurs
    if (userId && userId !== req.user._id.toString() && 
        !['admin', 'direction', 'team-leader'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    const [timeLogs, total] = await Promise.all([
      TimeLog.find(query)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username fullName'),
      TimeLog.countDocuments(query)
    ]);
    
    res.json({
      timeLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalItems: total
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des pointages:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * Valide la séquence des pointages pour un driver
 */
async function validateDriverTimelogSequence(userId, newType) {
  try {
    // Obtenir les pointages d'aujourd'hui
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const todayTimelogs = await TimeLog.find({
      userId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: 1 });
    
    const existingTypes = todayTimelogs.map(t => t.type);
    
    // Règles de validation
    switch (newType) {
      case 'start_service':
        if (existingTypes.includes('start_service')) {
          return 'Vous avez déjà commencé votre service aujourd\'hui';
        }
        break;
        
      case 'start_break':
        if (!existingTypes.includes('start_service')) {
          return 'Vous devez d\'abord commencer votre service';
        }
        if (existingTypes.includes('start_break')) {
          return 'Vous avez déjà commencé votre pause aujourd\'hui';
        }
        if (existingTypes.includes('end_service')) {
          return 'Vous ne pouvez plus prendre de pause après la fin de service';
        }
        break;
        
      case 'end_break':
        if (!existingTypes.includes('start_break')) {
          return 'Vous devez d\'abord commencer votre pause';
        }
        if (existingTypes.includes('end_break')) {
          return 'Vous avez déjà terminé votre pause aujourd\'hui';
        }
        break;
        
      case 'end_service':
        if (!existingTypes.includes('start_service')) {
          return 'Vous devez d\'abord commencer votre service';
        }
        if (existingTypes.includes('end_service')) {
          return 'Vous avez déjà terminé votre service aujourd\'hui';
        }
        // Si pause commencée mais pas terminée, ne pas permettre la fin de service
        if (existingTypes.includes('start_break') && !existingTypes.includes('end_break')) {
          return 'Vous devez d\'abord terminer votre pause';
        }
        break;
    }
    
    return null; // Pas d'erreur
  } catch (error) {
    console.error('Erreur lors de la validation des pointages:', error);
    return 'Erreur lors de la validation';
  }
}

/**
 * Analyse les pointages d'un driver pour une journée
 */
function analyzeDriverTimelogs(timelogs) {
  const analysis = {
    hasServiceStart: false,
    hasBreakStart: false,
    hasBreakEnd: false,
    hasServiceEnd: false,
    isComplete: false,
    missingTypes: [],
    sequence: []
  };
  
  const types = timelogs.map(t => t.type);
  
  analysis.hasServiceStart = types.includes('start_service');
  analysis.hasBreakStart = types.includes('start_break');
  analysis.hasBreakEnd = types.includes('end_break');
  analysis.hasServiceEnd = types.includes('end_service');
  
  // Déterminer les types manquants
  if (!analysis.hasServiceStart) analysis.missingTypes.push('start_service');
  if (!analysis.hasBreakStart) analysis.missingTypes.push('start_break');
  if (!analysis.hasBreakEnd) analysis.missingTypes.push('end_break');
  if (!analysis.hasServiceEnd) analysis.missingTypes.push('end_service');
  
  analysis.isComplete = analysis.missingTypes.length === 0;
  
  // Créer la séquence chronologique
  analysis.sequence = timelogs.map(t => ({
    type: t.type,
    time: t.startTime,
    isAutoGenerated: t.isAutoGenerated || false
  })).sort((a, b) => new Date(a.time) - new Date(b.time));
  
  return analysis;
}

module.exports = router;