// server/middleware/location.middleware.js (mise à jour)
const ipRangeCheck = require('ip-range-check');
const AllowedLocation = require('../models/allowedLocation.model');
const AllowedNetwork = require('../models/allowedNetwork.model');

// Calcul de la distance entre deux points (formule haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Code identique à celui fourni précédemment
};

// Middleware pour vérifier l'IP et la géolocalisation
const verifyLocationAndIP = async (req, res, next) => {
  try {
    // 1. Vérification de l'IP
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Récupérer toutes les plages IP actives
    const allowedNetworks = await AllowedNetwork.find({ isActive: true });
    const isIPAllowed = allowedNetworks.some(network => 
      ipRangeCheck(clientIP, network.ipRange)
    );
    
    if (!isIPAllowed) {
      return res.status(403).json({
        message: 'Accès refusé: réseau non autorisé',
        error: 'NETWORK_NOT_ALLOWED'
      });
    }
    
    // 2. Vérification de la géolocalisation
    const { latitude, longitude } = req.body;
    
    // Récupérer tous les emplacements actifs
    const allowedLocations = await AllowedLocation.find({ isActive: true });
    
    let isLocationAllowed = false;
    let closestLocation = null;
    let minDistance = Infinity;
    
    // Vérifier si la position est dans au moins un des emplacements autorisés
    for (const location of allowedLocations) {
      const distance = calculateDistance(
        location.latitude, location.longitude,
        latitude, longitude
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location.name;
      }
      
      if (distance <= location.radius) {
        isLocationAllowed = true;
        // Stocker le nom de l'emplacement pour référence
        req.locationName = location.name;
        break;
      }
    }
    
    if (!isLocationAllowed) {
      return res.status(403).json({
        message: 'Accès refusé: emplacement non autorisé',
        error: 'LOCATION_NOT_ALLOWED',
        details: {
          closestLocation,
          distance: Math.round(minDistance)
        }
      });
    }
    
    // Si on est là, tout est bon
    // Stocker l'IP pour le logging
    req.clientIPAddress = clientIP;
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification de la localisation:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  verifyLocationAndIP
};