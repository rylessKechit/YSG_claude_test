// server/middleware/error.middleware.js
module.exports = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ message: 'Erreur de validation', errors: messages });
  }

  if (err.name === 'CastError')
    return res.status(400).json({ message: `Ressource introuvable (ID invalide: ${err.value})` });

  if (err.name === 'JsonWebTokenError')
    return res.status(401).json({ message: 'Token non valide, authentification refusée' });

  if (err.name === 'TokenExpiredError')
    return res.status(401).json({ message: 'Token expiré, authentification refusée' });

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ message: 'Fichier trop volumineux (limite: 5MB)' });
    return res.status(400).json({ message: err.message });
  }

  if (err.statusCode)
    return res.status(err.statusCode).json({ message: err.message });

  console.error(`Erreur serveur: ${err.message}`);
  res.status(500).json({ message: 'Erreur serveur' });
};