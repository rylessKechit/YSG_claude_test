// server/middleware/location.middleware.js
const ipRangeCheck = require('ip-range-check');
const AllowedLocation = require('../models/allowedLocation.model');
const AllowedNetwork = require('../models/allowedNetwork.model');

// Calcul de la distance entre deux points (formule haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance en mètres
};

// Middleware pour vérifier l'IP et la géolocalisation
// Dans votre fichier location.middleware.js (autour de la ligne 49)

const verifyLocationAndIP = async (req, res, next) => {
  try {
    // Code de vérification IP...

    const clientIP = req.ip

    console.log('Client IP:', clientIP);
    
    // Récupérer toutes les plages IP actives
    const allowedNetworks = await AllowedNetwork.find({ isActive: true });
    const isIPAllowed = allowedNetworks.some(network => 
      ipRangeCheck(clientIP, network.ipRange)
    );

    console.log('Client IP:', clientIP);
    console.log('Allowed Networks:', allowedNetworks);
    console.log('Is IP Allowed:', isIPAllowed);
    
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
    
    // Initialiser ces variables AVANT de les utiliser
    let isLocationAllowed = false;
    let closestLocation = null;  // Assurez-vous que cette déclaration est AVANT toute utilisation
    let minDistance = Infinity;
    
    // Vérifier si la position est dans au moins un des emplacements autorisés
    for (const location of allowedLocations) {
      const distance = calculateDistance(
        location.latitude, location.longitude,
        parseFloat(latitude), parseFloat(longitude)
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
          closestLocation,  // Ici, closestLocation doit être initialisé
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
  verifyLocationAndIP,
  calculateDistance // Exporté pour être utilisé dans d'autres modules
};