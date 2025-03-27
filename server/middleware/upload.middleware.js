// server/middleware/upload.middleware.js
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const path = require('path');
require('dotenv').config();

// Vérifiez d'abord si les variables d'environnement sont définies
const bucketName = process.env.AWS_S3_BUCKET;
if (!bucketName) {
  console.error('AWS_S3_BUCKET n\'est pas défini dans les variables d\'environnement');
  // Utilisez une valeur par défaut ou lancez une erreur selon votre préférence
}

console.log('Bucket name:', bucketName); // Pour débogage

// Configuration AWS S3
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Configuration de multer avec S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: bucketName,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const userId = req.user ? req.user._id : 'unknown';
      const taskType = req.params ? req.params.taskType || 'general' : 'general';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      cb(null, `uploads/user-${userId}-${taskType}-${uniqueSuffix}${extension}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // Max 10 fichiers par requête
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées!'), false);
    }
  }
});

// Fallback vers un stockage local si S3 n'est pas configuré
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    const userId = req.user ? req.user._id : 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `user-${userId}-${uniqueSuffix}${extension}`);
  }
});

// Export du middleware avec fallback
module.exports = bucketName ? upload : multer({ 
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées!'), false);
    }
  }
});