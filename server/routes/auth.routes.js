const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { verifyToken } = require('../middleware/auth.middleware');

// Route d'inscription
router.post('/register', async (req, res) => {
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
    
    // Générer un token JWT
    const token = jwt.sign(
      { id: newUser._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' } // Expire après 1 jour
    );
    
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
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }
    
    // Générer un token JWT
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' } // Expire après 1 jour
    );
    
    // Renvoyer les données utilisateur (sans le mot de passe)
    const userWithoutPassword = {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role
    };
    
    res.json({
      message: 'Connexion réussie',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour récupérer le profil de l'utilisateur connecté
router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
});

// Route de déconnexion (côté serveur, nous pouvons juste renvoyer un succès)
router.post('/logout', (req, res) => {
  res.json({ message: 'Déconnexion réussie' });
});

module.exports = router;