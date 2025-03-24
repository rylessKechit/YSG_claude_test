// server/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware factory pour vérifier les rôles
const createRoleMiddleware = (roles) => (req, res, next) => {
  if (req.user && (Array.isArray(roles) ? roles.includes(req.user.role) : req.user.role === roles)) {
    next();
  } else {
    res.status(403).json({ message: `Accès refusé. Role(s) requis: ${Array.isArray(roles) ? roles.join(', ') : roles}` });
  }
};

exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) 
      return res.status(401).json({ message: 'Token non fourni' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Utilisateur non trouvé' });
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError')
      return res.status(401).json({ message: 'Token invalide' });
    
    if (error.name === 'TokenExpiredError')
      return res.status(401).json({ message: 'Token expiré' });
    
    console.error('Erreur d\'authentification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Création des middlewares de vérification de rôle
exports.isAdmin = createRoleMiddleware('admin');
exports.isDriver = createRoleMiddleware('driver');
exports.isPreparator = createRoleMiddleware('preparator');
exports.isDirection = createRoleMiddleware('direction');
exports.isTeamLeader = createRoleMiddleware('team-leader');
exports.isDriverOrTeamLeader = createRoleMiddleware(['driver', 'team-leader']);
exports.canAccessReports = createRoleMiddleware(['admin', 'direction']);
exports.canCreateMovement = createRoleMiddleware(['admin', 'team-leader']);
exports.canAssignMovement = createRoleMiddleware(['admin', 'team-leader']);
exports.canCreatePreparation = createRoleMiddleware(['admin', 'preparator', 'driver', 'team-leader']);