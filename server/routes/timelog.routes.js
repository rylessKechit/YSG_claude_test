// server/routes/timelog.routes.js
const express = require('express');
const router = express.Router();
const TimeLog = require('../models/timelog.model');
const { verifyToken } = require('../middleware/auth.middleware');
const { verifyLocationAndIP } = require('../middleware/location.middleware');

// Route pour démarrer un pointage
router.post('/', verifyToken, verifyLocationAndIP, async (req, res) => {
  try {
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
    const { latitude, longitude, notes } = req.body;
    
    const timeLog = new TimeLog({
      userId: req.user._id,
      startTime: new Date(),
      status: 'active',
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
    });
    
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
    // Trouver le pointage actif
    const activeTimeLog = await TimeLog.findOne({ 
      userId: req.user._id, 
      status: 'active' 
    });
    
    if (!activeTimeLog) {
      return res.status(404).json({ message: 'Aucun pointage actif trouvé' });
    }
    
    // Mettre à jour avec les données de fin
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
    
    const timeLogs = await TimeLog.find({ userId: req.user._id })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await TimeLog.countDocuments({ userId: req.user._id });
    
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

// Obtenir les pointages d'un jour spécifique (pour les admins/team-leaders)
router.get('/day/:date', verifyToken, async (req, res) => {
  try {
    const { date } = req.params;
    const { userId } = req.query;
    
    // Vérifier si l'utilisateur est admin ou team-leader pour voir les pointages des autres
    if (userId && req.user.role !== 'admin' && req.user.role !== 'team-leader') {
      return res.status(403).json({ message: 'Permission refusée' });
    }
    
    // Créer les dates de début et fin pour le jour spécifique
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    // Construire la requête
    const query = {
      startTime: { $gte: startDate, $lte: endDate }
    };
    
    // Si un userId est spécifié et l'utilisateur a les droits, filtrer par cet id
    if (userId) {
      query.userId = userId;
    } else if (req.user.role !== 'admin' && req.user.role !== 'team-leader') {
      // Sinon, pour les utilisateurs normaux, montrer seulement leurs pointages
      query.userId = req.user._id;
    }
    
    // Récupérer les pointages
    const timeLogs = await TimeLog.find(query)
      .sort({ startTime: 1 })
      .populate('userId', 'username fullName');
    
    res.json(timeLogs);
  } catch (error) {
    console.error('Erreur lors de la récupération des pointages du jour:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer le résumé des heures par utilisateur sur une période (pour les admins)
router.get('/summary', verifyToken, async (req, res) => {
  try {
    // Vérifier les droits d'admin
    if (req.user.role !== 'admin' && req.user.role !== 'team-leader' && req.user.role !== 'direction') {
      return res.status(403).json({ message: 'Permission refusée' });
    }
    
    const { startDate, endDate, userId } = req.query;
    
    // Validation des dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Dates de début et de fin requises' });
    }
    
    // Convertir les dates
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Construire la requête de base
    const query = {
      status: 'completed',
      startTime: { $gte: start },
      endTime: { $lte: end }
    };
    
    // Si un userId est spécifié, filtrer par cet id
    if (userId) {
      query.userId = userId;
    }
    
    // Récupérer les pointages
    const timeLogs = await TimeLog.find(query)
      .populate('userId', 'username fullName role');
    
    // Calculer le total des heures par utilisateur
    const userHours = {};
    
    timeLogs.forEach(log => {
      const userId = log.userId._id.toString();
      const userInfo = log.userId;
      const durationMs = log.endTime - log.startTime;
      const durationHours = durationMs / (1000 * 60 * 60);
      
      if (!userHours[userId]) {
        userHours[userId] = {
          userId: userId,
          username: userInfo.username,
          fullName: userInfo.fullName,
          role: userInfo.role,
          totalHours: 0,
          logCount: 0,
          logs: []
        };
      }
      
      userHours[userId].totalHours += durationHours;
      userHours[userId].logCount += 1;
      userHours[userId].logs.push({
        id: log._id,
        startTime: log.startTime,
        endTime: log.endTime,
        duration: durationHours,
        location: log.location
      });
    });
    
    const summary = Object.values(userHours).map(user => ({
      ...user,
      totalHours: Math.round(user.totalHours * 100) / 100 // Arrondir à 2 décimales
    }));
    
    res.json({
      startDate: start,
      endDate: end,
      summary
    });
  } catch (error) {
    console.error('Erreur lors de la génération du résumé des heures:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir le dernier pointage d'un utilisateur (pour les admins/team-leaders)
router.get('/user/:userId/last', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérifier les permissions
    if (req.user._id.toString() !== userId && 
        req.user.role !== 'admin' && 
        req.user.role !== 'team-leader') {
      return res.status(403).json({ message: 'Permission refusée' });
    }
    
    // Trouver le dernier pointage
    const lastTimeLog = await TimeLog.findOne({ userId })
      .sort({ startTime: -1 })
      .limit(1);
    
    if (!lastTimeLog) {
      return res.status(404).json({ message: 'Aucun pointage trouvé pour cet utilisateur' });
    }
    
    res.json(lastTimeLog);
  } catch (error) {
    console.error('Erreur lors de la récupération du dernier pointage:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les statuts des utilisateurs (en service/hors service) - Pour les admins
router.get('/users/status', verifyToken, async (req, res) => {
  try {
    // Vérifier les permissions
    if (req.user.role !== 'admin' && req.user.role !== 'team-leader') {
      return res.status(403).json({ message: 'Permission refusée' });
    }
    
    // Récupérer tous les utilisateurs avec un pointage actif
    const activeLogs = await TimeLog.find({ status: 'active' })
      .populate('userId', 'username fullName role');
    
    // Extraire les IDs des utilisateurs avec un pointage actif
    const activeUserIds = activeLogs.map(log => log.userId._id.toString());
    
    // Récupérer tous les utilisateurs
    const users = await require('../models/user.model').find({
      role: { $in: ['driver', 'preparator', 'team-leader'] }
    }).select('_id username fullName role');
    
    // Créer le résultat
    const userStatuses = users.map(user => {
      const userId = user._id.toString();
      const isActive = activeUserIds.includes(userId);
      const activeLog = isActive ? activeLogs.find(log => log.userId._id.toString() === userId) : null;
      
      return {
        _id: userId,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        status: isActive ? 'active' : 'inactive',
        startTime: activeLog ? activeLog.startTime : null,
        location: activeLog ? activeLog.location : null
      };
    });
    
    res.json(userStatuses);
  } catch (error) {
    console.error('Erreur lors de la récupération des statuts des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;