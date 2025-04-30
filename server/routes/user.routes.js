// server/routes/user.routes.js
const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Obtenir le profil de l'utilisateur connecté
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour le profil de l'utilisateur connecté
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { fullName, email, phone, sixtNumber } = req.body;
    
    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.user._id } 
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
    }
    
    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { 
        $set: { 
          fullName: fullName || req.user.fullName,
          email: email || req.user.email,
          phone: phone || req.user.phone,
          sixtNumber: sixtNumber // Ajout du numéro Sixt
        } 
      },
      { new: true }
    ).select('-password');
    
    res.json({ 
      message: 'Profil mis à jour avec succès',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Changer le mot de passe
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Vérifier si les deux mots de passe sont fournis
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Le mot de passe actuel et le nouveau mot de passe sont requis'
      });
    }
    
    // Vérifier si le nouveau mot de passe est assez long
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }
    
    // Trouver l'utilisateur avec le mot de passe
    const user = await User.findById(req.user._id);
    
    // Vérifier le mot de passe actuel
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }
    
    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Mot de passe changé avec succès' });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// --- Routes administratives (protégées par isAdmin) ---

// Obtenir tous les utilisateurs (admin seulement)
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir un utilisateur spécifique (admin seulement)
router.get('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer un nouvel utilisateur (admin seulement)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { username, password, fullName, email, phone, sixtNumber, role } = req.body;
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Nom d\'utilisateur ou email déjà utilisé' 
      });
    }
    
    // Créer un nouvel utilisateur
    const newUser = new User({
      username,
      password, // sera haché par le middleware pre-save
      fullName,
      email,
      phone,
      sixtNumber: sixtNumber || '',
      role: role || 'driver' // Par défaut, rôle de chauffeur
    });
    
    // Sauvegarder l'utilisateur
    await newUser.save();
    
    // Renvoyer les données utilisateur (sans le mot de passe)
    const userWithoutPassword = {
      _id: newUser._id,
      username: newUser.username,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      sixtNumber: newUser.sixtNumber,
      role: newUser.role
    };
    
    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour un utilisateur (admin seulement)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { username, fullName, email, phone, sixtNumber, role } = req.body;
    
    // Vérifier si l'utilisateur existe
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Vérifier si le nom d'utilisateur ou l'email est déjà utilisé par un autre utilisateur
    if (username || email) {
      const query = { _id: { $ne: req.params.id } };
      
      if (username) query.username = username;
      if (email) query.email = email;
      
      const existingUser = await User.findOne(query);
      
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Nom d\'utilisateur ou email déjà utilisé' 
        });
      }
    }
    
    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          username: username || user.username,
          fullName: fullName || user.fullName,
          email: email || user.email,
          phone: phone || user.phone,
          sixtNumber: sixtNumber !== undefined ? sixtNumber : user.sixtNumber,
          role: role || user.role
        } 
      },
      { new: true }
    ).select('-password');
    
    res.json({ 
      message: 'Utilisateur mis à jour avec succès',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un utilisateur (admin seulement)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    // Vérifier si l'utilisateur existe
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Ne pas permettre de supprimer son propre compte
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        message: 'Vous ne pouvez pas supprimer votre propre compte' 
      });
    }
    
    // Supprimer l'utilisateur
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;