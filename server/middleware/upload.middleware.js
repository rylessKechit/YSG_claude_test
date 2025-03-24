const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Configuration de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuration du stockage Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ysg-driver-app',
    format: async (req, file) => {
      // Convertir en jpg pour optimiser la taille
      return 'jpg';
    },
    public_id: (req, file) => {
      const userId = req.user ? req.user._id : 'unknown';
      const taskType = req.params ? req.params.taskType || 'general' : 'general';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `user-${userId}-${taskType}-${uniqueSuffix}`;
    }
  }
});

// Filtre pour n'accepter que les images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports = upload;