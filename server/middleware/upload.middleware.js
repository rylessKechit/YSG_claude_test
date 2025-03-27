// server/middleware/upload.middleware.js
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Vérification et configuration des variables d'environnement S3
const bucketName = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION || 'eu-west-3';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// S'assurer que le dossier uploads existe pour le fallback
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Initialiser le client S3 si les variables sont définies
let s3Client;
if (bucketName && accessKeyId && secretAccessKey) {
  try {
    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
    console.log('✅ Client S3 initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du client S3:', error.message);
  }
}

// Configuration du stockage temporaire local (fallback)
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const userId = req.user ? req.user._id : 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `user-${userId}-${uniqueSuffix}${extension}`);
  }
});

// Filtre des fichiers (accepter uniquement les images)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées'), false);
  }
};

// Créer la configuration multer S3
const createS3Storage = () => {
  if (!s3Client) {
    throw new Error('Client S3 non disponible');
  }
  
  return multerS3({
    s3: s3Client,
    bucket: bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const userId = req.user ? req.user._id : 'unknown';
      const taskType = req.params.taskType || 'general';
      const timestamp = Date.now();
      const randomId = Math.round(Math.random() * 1E9);
      const originalName = path.basename(file.originalname);
      const extension = path.extname(originalName);
      const filename = `uploads/user-${userId}/${taskType}/${timestamp}-${randomId}${extension}`;
      cb(null, filename);
    }
  });
};

// Créer une instance multer configurée
let upload;
try {
  if (s3Client) {
    upload = multer({
      storage: createS3Storage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10 // Max 10 fichiers par requête
      },
      fileFilter: fileFilter
    });
    console.log('✅ Middleware d\'upload S3 configuré');
  } else {
    console.warn('⚠️ S3 non configuré, utilisation du stockage local en fallback');
    upload = multer({
      storage: diskStorage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10
      },
      fileFilter: fileFilter
    });
  }
} catch (error) {
  console.error('❌ Erreur lors de la configuration du middleware d\'upload:', error.message);
  // Fallback vers le stockage local
  upload = multer({
    storage: diskStorage,
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 10
    },
    fileFilter: fileFilter
  });
}

// Expose les fonctions multer comme méthodes de l'objet upload
const uploadMiddleware = {
  // Pour un seul fichier
  single: (fieldName) => {
    return (req, res, next) => {
      upload.single(fieldName)(req, res, (err) => {
        if (err) {
          console.error('Erreur upload:', err);
          return next(err);
        }
        
        // Normaliser l'URL du fichier
        if (req.file && !req.file.location && req.file.path) {
          const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
          req.file.location = `${baseUrl}/${req.file.path}`;
          req.file.url = req.file.location;
        }
        
        next();
      });
    };
  },
  
  // Pour plusieurs fichiers
  array: (fieldName, maxCount) => {
    return (req, res, next) => {
      upload.array(fieldName, maxCount)(req, res, (err) => {
        if (err) {
          console.error('Erreur upload multiple:', err);
          return next(err);
        }
        
        // Normaliser les URLs des fichiers
        if (req.files) {
          req.files.forEach(file => {
            if (!file.location && file.path) {
              const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
              file.location = `${baseUrl}/${file.path}`;
              file.url = file.location;
            }
          });
        }
        
        next();
      });
    };
  },
  
  // Pour l'upload multifield
  fields: (fieldsConfig) => {
    return (req, res, next) => {
      upload.fields(fieldsConfig)(req, res, (err) => {
        if (err) {
          console.error('Erreur upload fields:', err);
          return next(err);
        }
        
        // Normaliser les URLs pour tous les champs
        if (req.files) {
          Object.keys(req.files).forEach(fieldName => {
            req.files[fieldName].forEach(file => {
              if (!file.location && file.path) {
                const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
                file.location = `${baseUrl}/${file.path}`;
                file.url = file.location;
              }
            });
          });
        }
        
        next();
      });
    };
  }
};

// Pour rester compatible avec l'ancien code qui pourrait utiliser upload directement
module.exports = uploadMiddleware;