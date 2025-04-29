// server/routes/agency.routes.js
const express = require('express');
const router = express.Router();
const Agency = require('../models/agency.model');
const { verifyToken, isAdmin, isTeamLeader } = require('../middleware/auth.middleware');

// Middleware pour vérifier les droits d'accès (admin ou team leader)
const checkAdminOrTeamLeader = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'team-leader') {
    return next();
  }
  return res.status(403).json({ message: 'Accès refusé' });
};

// Récupérer toutes les agences (accessibles par tous les utilisateurs authentifiés)
router.get('/', verifyToken, async (req, res) => {
  try {
    // Option pour filtrer les agences actives uniquement
    const { activeOnly } = req.query;
    const query = activeOnly === 'true' ? { isActive: true } : {};
    
    const agencies = await Agency.find(query).sort({ name: 1 });
    res.json(agencies);
  } catch (error) {
    console.error('Erreur lors de la récupération des agences:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer une agence spécifique
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);
    
    if (!agency) {
      return res.status(404).json({ message: 'Agence non trouvée' });
    }
    
    res.json(agency);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'agence:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une nouvelle agence (admin ou team leader uniquement)
router.post('/', verifyToken, checkAdminOrTeamLeader, async (req, res) => {
  try {
    const { name, address, email, phone, contactPerson, latitude, longitude } = req.body;
    
    // Validation des champs obligatoires
    if (!name || !address || !email || !latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Les champs nom, adresse, email et coordonnées sont obligatoires' 
      });
    }
    
    // Vérifier si l'agence existe déjà
    const existingAgency = await Agency.findOne({ name });
    if (existingAgency) {
      return res.status(400).json({ message: 'Une agence avec ce nom existe déjà' });
    }
    
    // Créer une nouvelle agence
    const newAgency = new Agency({
      name,
      address,
      location: {
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        }
      },
      email,
      phone,
      contactPerson,
      createdBy: req.user._id
    });
    
    await newAgency.save();
    
    res.status(201).json({
      message: 'Agence créée avec succès',
      agency: newAgency
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'agence:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour une agence (admin ou team leader uniquement)
router.put('/:id', verifyToken, checkAdminOrTeamLeader, async (req, res) => {
  try {
    const { name, address, email, phone, contactPerson, latitude, longitude, isActive } = req.body;
    
    // Validation des champs obligatoires
    if (!name || !address || !email || !latitude || !longitude) {
      return res.status(400).json({ 
        message: 'Les champs nom, adresse, email et coordonnées sont obligatoires' 
      });
    }
    
    // Vérifier si l'agence existe déjà avec ce nom (sauf si c'est la même)
    const existingAgency = await Agency.findOne({ 
      name, 
      _id: { $ne: req.params.id } 
    });
    
    if (existingAgency) {
      return res.status(400).json({ message: 'Une agence avec ce nom existe déjà' });
    }
    
    // Mettre à jour l'agence
    const updatedAgency = await Agency.findByIdAndUpdate(
      req.params.id,
      {
        name,
        address,
        location: {
          coordinates: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
          }
        },
        email,
        phone,
        contactPerson,
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true }
    );
    
    if (!updatedAgency) {
      return res.status(404).json({ message: 'Agence non trouvée' });
    }
    
    res.json({
      message: 'Agence mise à jour avec succès',
      agency: updatedAgency
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'agence:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une agence (admin uniquement)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const agency = await Agency.findByIdAndDelete(req.params.id);
    
    if (!agency) {
      return res.status(404).json({ message: 'Agence non trouvée' });
    }
    
    res.json({ message: 'Agence supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'agence:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;