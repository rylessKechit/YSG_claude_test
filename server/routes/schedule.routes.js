// server/routes/schedule.routes.js
const express = require('express');
const router = express.Router();
const Schedule = require('../models/schedule.model');
const User = require('../models/user.model');
const { verifyToken, canAccessReports } = require('../middleware/auth.middleware');

// Middleware pour vérifier si l'utilisateur peut gérer les plannings
const canManageSchedules = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'direction')) {
    next();
  } else {
    res.status(403).json({ message: 'Accès refusé. Droits insuffisants pour gérer les plannings.' });
  }
};

// Obtenir tous les préparateurs (pour le formulaire de planning)
router.get('/preparators', verifyToken, canManageSchedules, async (req, res) => {
  try {
    const preparators = await User.find({ role: 'preparator' })
      .select('_id username fullName');
    
    res.json(preparators);
  } catch (error) {
    console.error('Erreur lors de la récupération des préparateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir le planning hebdomadaire d'un préparateur
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    // Vérifier les permissions: admin, direction ou l'utilisateur lui-même
    if (req.user.role !== 'admin' && req.user.role !== 'direction' && 
        req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    const scheduleEntries = await Schedule.find({ userId: req.params.userId })
      .sort({ day: 1 }) // Trier par jour
      .populate('createdBy', 'username fullName');
    
    res.json(scheduleEntries);
  } catch (error) {
    console.error('Erreur lors de la récupération du planning:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir le planning hebdomadaire complet de tous les préparateurs
router.get('/all', verifyToken, canManageSchedules, async (req, res) => {
  try {
    const preparators = await User.find({ role: 'preparator' })
      .select('_id username fullName');
    
    const scheduleEntries = await Schedule.find({
      userId: { $in: preparators.map(p => p._id) }
    }).populate('userId', 'username fullName');
    
    // Restructurer les données pour un affichage plus facile dans le frontend
    const scheduleByPreparator = {};
    
    preparators.forEach(preparator => {
      scheduleByPreparator[preparator._id] = {
        info: preparator,
        schedule: {
          monday: null,
          tuesday: null,
          wednesday: null,
          thursday: null,
          friday: null,
          saturday: null,
          sunday: null
        }
      };
    });
    
    scheduleEntries.forEach(entry => {
      if (scheduleByPreparator[entry.userId._id]) {
        scheduleByPreparator[entry.userId._id].schedule[entry.day] = entry;
      }
    });
    
    res.json(Object.values(scheduleByPreparator));
  } catch (error) {
    console.error('Erreur lors de la récupération du planning complet:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer ou mettre à jour une entrée de planning
router.post('/', verifyToken, canManageSchedules, async (req, res) => {
    try {
      const { userId, day, entryType, startTime, endTime, tasks, location } = req.body;
      
      // Validation des données
      if (!userId || !day || !entryType) {
        return res.status(400).json({ message: 'Données incomplètes' });
      }
      
      // Validation supplémentaire pour les jours de travail
      if (entryType === 'work' && (!startTime || !endTime)) {
        return res.status(400).json({ message: 'Pour un jour de travail, les heures de début et de fin sont requises' });
      }
      
      // Vérifier que l'utilisateur existe et est un préparateur
      const user = await User.findById(userId);
      if (!user || user.role !== 'preparator') {
        return res.status(404).json({ message: 'Préparateur non trouvé' });
      }
      
      // Rechercher s'il existe déjà une entrée pour cet utilisateur et ce jour
      let scheduleEntry = await Schedule.findOne({ userId, day });
      
      if (scheduleEntry) {
        // Mettre à jour l'entrée existante
        scheduleEntry.entryType = entryType;
        
        if (entryType === 'work') {
          scheduleEntry.startTime = startTime;
          scheduleEntry.endTime = endTime;
          scheduleEntry.tasks = tasks || '';
          scheduleEntry.location = location || '';
        } else {
          // Pour un jour de repos, on efface les champs inutiles
          scheduleEntry.startTime = '';
          scheduleEntry.endTime = '';
          scheduleEntry.tasks = '';
          scheduleEntry.location = '';
        }
        
        scheduleEntry.updatedBy = req.user._id;
        
        await scheduleEntry.save();
        
        res.json({
          message: 'Planning mis à jour avec succès',
          scheduleEntry
        });
      } else {
        // Créer une nouvelle entrée
        const newScheduleEntry = new Schedule({
          userId,
          day,
          entryType,
          startTime: entryType === 'work' ? startTime : '',
          endTime: entryType === 'work' ? endTime : '',
          tasks: entryType === 'work' ? (tasks || '') : '',
          location: entryType === 'work' ? (location || '') : '',
          createdBy: req.user._id,
          updatedBy: req.user._id
        });
        
        await newScheduleEntry.save();
        
        res.status(201).json({
          message: 'Entrée de planning créée avec succès',
          scheduleEntry: newScheduleEntry
        });
      }
    } catch (error) {
      console.error('Erreur lors de la création/mise à jour du planning:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Supprimer une entrée de planning
router.delete('/:id', verifyToken, canManageSchedules, async (req, res) => {
  try {
    const scheduleEntry = await Schedule.findById(req.params.id);
    
    if (!scheduleEntry) {
      return res.status(404).json({ message: 'Entrée de planning non trouvée' });
    }
    
    await Schedule.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Entrée de planning supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'entrée de planning:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;