// server/routes/tracking.routes.js
const express = require('express');
const router = express.Router();
const DriverLocation = require('../models/driverLocation.model');
const Movement = require('../models/movement.model');
const { verifyToken, isAdmin, isTeamLeader, isDriverOrTeamLeader } = require('../middleware/auth.middleware');

// Middleware pour vérifier les droits d'accès au mouvement
const checkMovementAccess = async (req, res, next) => {
  try {
    const { movementId } = req.params;
    const movement = await Movement.findById(movementId);
    
    if (!movement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }
    
    // Les admins et team leaders ont accès à tous les mouvements
    if (req.user.role === 'admin' || req.user.role === 'team-leader') {
      req.movement = movement;
      return next();
    }
    
    // Les chauffeurs n'ont accès qu'à leurs propres mouvements
    if (req.user.role === 'driver' && movement.userId && movement.userId.toString() === req.user._id.toString()) {
      req.movement = movement;
      return next();
    }
    
    res.status(403).json({ message: 'Accès non autorisé à ce mouvement' });
  } catch (error) {
    console.error('Erreur lors de la vérification des droits:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Envoyer la position du chauffeur
router.post('/:movementId/location', verifyToken, isDriverOrTeamLeader, checkMovementAccess, async (req, res) => {
  try {
    const { movementId } = req.params;
    const { latitude, longitude, speed } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude et longitude requises' });
    }
    
    // Vérifier que le mouvement est en cours
    if (req.movement.status !== 'in-progress') {
      return res.status(400).json({ message: 'Le mouvement doit être en cours pour enregistrer une position' });
    }
    
    const driverLocation = new DriverLocation({
      userId: req.user._id,
      movementId,
      location: { latitude, longitude },
      speed: speed || 0,
      timestamp: new Date()
    });
    
    await driverLocation.save();
    
    res.status(201).json({ message: 'Position enregistrée avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la position:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer les positions pour un mouvement spécifique
router.get('/:movementId/locations', verifyToken, checkMovementAccess, async (req, res) => {
  try {
    const { movementId } = req.params;
    const { limit = 100 } = req.query;
    
    const locations = await DriverLocation.find({ movementId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json(locations.reverse()); // Renvoyer dans l'ordre chronologique
  } catch (error) {
    console.error('Erreur lors de la récupération des positions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer la dernière position pour un mouvement
router.get('/:movementId/location/latest', verifyToken, checkMovementAccess, async (req, res) => {
  try {
    const { movementId } = req.params;
    
    const latestLocation = await DriverLocation.findOne({ movementId })
      .sort({ timestamp: -1 })
      .lean();
    
    if (!latestLocation) {
      return res.status(404).json({ message: 'Aucune position trouvée pour ce mouvement' });
    }
    
    res.json(latestLocation);
  } catch (error) {
    console.error('Erreur lors de la récupération de la dernière position:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer tous les mouvements en cours avec leur dernière position
// Récupérer tous les mouvements actifs avec leur dernière position
router.get('/active-movements', verifyToken, async (req, res) => {
  try {
    // Seuls les admins et team leaders peuvent voir tous les mouvements actifs
    if (req.user.role !== 'admin' && req.user.role !== 'team-leader') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    // Trouver tous les mouvements en cours
    const activeMovements = await Movement.find({ status: 'in-progress' })
      .populate('userId', 'username fullName')
      .lean();
    
    if (activeMovements.length === 0) {
      return res.json({ movements: [] });
    }
    
    // Pour chaque mouvement, récupérer la dernière position
    const movementsWithLocation = await Promise.all(
      activeMovements.map(async (movement) => {
        const latestLocation = await DriverLocation.findOne({ movementId: movement._id })
          .sort({ timestamp: -1 })
          .lean();
        
        // S'assurer que les coordonnées sont des nombres
        if (latestLocation && latestLocation.location) {
          latestLocation.location.latitude = parseFloat(latestLocation.location.latitude);
          latestLocation.location.longitude = parseFloat(latestLocation.location.longitude);
        }
        
        return {
          ...movement,
          currentLocation: latestLocation ? latestLocation.location : null,
          lastUpdate: latestLocation ? latestLocation.timestamp : null
        };
      })
    );
    
    res.json({ movements: movementsWithLocation });
  } catch (error) {
    console.error('Erreur lors de la récupération des mouvements actifs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;