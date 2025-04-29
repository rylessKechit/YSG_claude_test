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
const verifyLocationAndIP = async (req, res, next) => {
  try {
    // Exemption pour les rôles spécifiés
    const exemptRoles = ['admin', 'driver', 'team-leader'];
    
    // Si l'utilisateur a un rôle exempté, passer directement à l'étape suivante
    if (req.user && exemptRoles.includes(req.user.role)) {
      // Stocker un indicateur montrant que l'exemption a été appliquée
      req.locationExemption = true;
      
      // Stocker l'IP client pour la traçabilité, même pour les utilisateurs exemptés
      req.clientIPAddress = req.ip;
      
      // Si les coordonnées sont fournies dans la requête, les stocker
      const { latitude, longitude } = req.body;
      if (latitude && longitude) {
        req.locationName = "Localisation fournie (exemption de vérification)";
      }
      
      return next();
    }
    
    // Code de vérification IP pour les utilisateurs non-exemptés
    const clientIP = req.ip;
    console.log('Client IP:', clientIP);
    
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
    
    // Vérification de la géolocalisation
    const { latitude, longitude } = req.body;
    
    // Récupérer tous les emplacements actifs
    const allowedLocations = await AllowedLocation.find({ isActive: true });
    
    // Initialiser ces variables AVANT de les utiliser
    let isLocationAllowed = false;
    let closestLocation = null;
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
  verifyLocationAndIP,
  calculateDistance // Exporté pour être utilisé dans d'autres modules
};