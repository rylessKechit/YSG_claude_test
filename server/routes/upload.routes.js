// server/middleware/upload.middleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// S'assurer que le dossier uploads existe
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration pour le stockage local (fallback)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const userId = req.user ? req.user._id : 'unknown';
    const taskType = req.params ? req.params.taskType || 'general' : 'general';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `user-${userId}-${taskType}-${uniqueSuffix}${extension}`);
  }
});

// Filtre pour accepter uniquement les images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées!'), false);
  }
};

// Middleware multer simple avec stockage local
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // Max 10 fichiers par requête
  },
  fileFilter: fileFilter
});

// Exposer le middleware en tant que fonction
const uploadMiddleware = (req, res, next) => {
  // Utiliser la fonction array de multer
  upload.array('photos', 10)(req, res, function(err) {
    if (err) {
      console.error('Erreur dans uploadMiddleware:', err);
      return next(err);
    }
    
    // Traiter les fichiers pour normaliser la structure
    if (req.files && req.files.length > 0) {
      req.files = req.files.map(file => {
        // Assurer que chaque fichier a une propriété url
        return {
          ...file,
          url: `/uploads/${file.filename}`,
          location: `/uploads/${file.filename}`
        };
      });
    }
    
    next();
  });
};

module.exports = uploadMiddleware;