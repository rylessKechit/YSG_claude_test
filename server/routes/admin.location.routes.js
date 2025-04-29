// server/routes/admin.location.routes.js
const express = require('express');
const router = express.Router();
const AllowedLocation = require('../models/allowedLocation.model');
const AllowedNetwork = require('../models/allowedNetwork.model');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// --- Routes pour les emplacements autorisés ---

// Obtenir tous les emplacements
router.get('/locations', verifyToken, isAdmin, async (req, res) => {
  try {
    const locations = await AllowedLocation.find().sort({ name: 1 });
    res.json(locations);
  } catch (error) {
    console.error('Erreur lors de la récupération des emplacements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajouter un nouvel emplacement
router.post('/locations', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, latitude, longitude, radius, isActive } = req.body;
    
    // Validation
    if (!name || !latitude || !longitude) {
      return res.status(400).json({ message: 'Nom, latitude et longitude sont requis' });
    }
    
    const newLocation = new AllowedLocation({
      name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: radius ? parseFloat(radius) : 500,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });
    
    await newLocation.save();
    res.status(201).json({ message: 'Emplacement ajouté avec succès', location: newLocation });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'emplacement:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Un emplacement avec ce nom existe déjà' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour un emplacement
router.put('/locations/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, latitude, longitude, radius, isActive } = req.body;
    
    // Validation
    if (!name || !latitude || !longitude) {
      return res.status(400).json({ message: 'Nom, latitude et longitude sont requis' });
    }
    
    const updatedLocation = await AllowedLocation.findByIdAndUpdate(
      req.params.id,
      {
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: radius ? parseFloat(radius) : 500,
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true }
    );
    
    if (!updatedLocation) {
      return res.status(404).json({ message: 'Emplacement non trouvé' });
    }
    
    res.json({ message: 'Emplacement mis à jour avec succès', location: updatedLocation });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'emplacement:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Un emplacement avec ce nom existe déjà' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un emplacement
router.delete('/locations/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const location = await AllowedLocation.findByIdAndDelete(req.params.id);
    
    if (!location) {
      return res.status(404).json({ message: 'Emplacement non trouvé' });
    }
    
    res.json({ message: 'Emplacement supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'emplacement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// --- Routes pour les réseaux autorisés ---

// Obtenir tous les réseaux
router.get('/networks', verifyToken, isAdmin, async (req, res) => {
  try {
    const networks = await AllowedNetwork.find().sort({ name: 1 });
    res.json(networks);
  } catch (error) {
    console.error('Erreur lors de la récupération des réseaux:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajouter un nouveau réseau
router.post('/networks', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, ipRange, description, isActive } = req.body;
    
    // Validation
    if (!name || !ipRange) {
      return res.status(400).json({ message: 'Nom et plage IP sont requis' });
    }
    
    const newNetwork = new AllowedNetwork({
      name,
      ipRange,
      description,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });
    
    await newNetwork.save();
    res.status(201).json({ message: 'Réseau ajouté avec succès', network: newNetwork });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du réseau:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Un réseau avec ce nom ou cette plage IP existe déjà' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour un réseau
router.put('/networks/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, ipRange, description, isActive } = req.body;
    
    // Validation
    if (!name || !ipRange) {
      return res.status(400).json({ message: 'Nom et plage IP sont requis' });
    }
    
    const updatedNetwork = await AllowedNetwork.findByIdAndUpdate(
      req.params.id,
      { name, ipRange, description, isActive: isActive !== undefined ? isActive : true },
      { new: true }
    );
    
    if (!updatedNetwork) {
      return res.status(404).json({ message: 'Réseau non trouvé' });
    }
    
    res.json({ message: 'Réseau mis à jour avec succès', network: updatedNetwork });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du réseau:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Un réseau avec ce nom ou cette plage IP existe déjà' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un réseau
router.delete('/networks/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const network = await AllowedNetwork.findByIdAndDelete(req.params.id);
    
    if (!network) {
      return res.status(404).json({ message: 'Réseau non trouvé' });
    }
    
    res.json({ message: 'Réseau supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du réseau:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Tester une géolocalisation par rapport aux emplacements autorisés
router.post('/test-location', verifyToken, isAdmin, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude et longitude sont requises' });
    }
    
    const locations = await AllowedLocation.find({ isActive: true });
    
    const results = locations.map(location => {
      const distance = calculateDistance(
        location.latitude, location.longitude,
        parseFloat(latitude), parseFloat(longitude)
      );
      
      return {
        locationId: location._id,
        name: location.name,
        distance: Math.round(distance),
        isInRange: distance <= location.radius,
        radius: location.radius
      };
    });
    
    res.json({
      coordinates: { latitude, longitude },
      locations: results,
      isAuthorized: results.some(r => r.isInRange)
    });
  } catch (error) {
    console.error('Erreur lors du test de localisation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;