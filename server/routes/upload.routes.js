// server/routes/upload.routes.js - correction de l'utilisation de uploadMiddleware

const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');
const path = require('path');
require('dotenv').config();

// Configuration S3
const bucketName = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION || 'eu-west-3';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

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
    console.log('✅ Client S3 initialisé pour les routes d\'upload');
  } catch (error) {
    console.error('❌ Erreur S3 (routes d\'upload):', error.message);
  }
}

// Vérifier si S3 est configuré correctement
const isS3Configured = () => {
  return !!s3Client;
};

// Route pour générer des URLs présignées pour S3
router.post('/presigned-url', verifyToken, async (req, res) => {
  try {
    if (!isS3Configured()) {
      return res.status(500).json({ 
        message: 'S3 n\'est pas configuré sur le serveur' 
      });
    }

    const { fileType, fileName } = req.body;
    
    // Validation
    if (!fileType || !fileName) {
      return res.status(400).json({ 
        message: 'Le type et le nom du fichier sont requis' 
      });
    }
    
    // Extraire l'extension du nom de fichier
    const fileExtension = path.extname(fileName);
    
    // Créer un nom de fichier unique
    const key = `uploads/user-${req.user._id}/${Date.now()}-${uuidv4()}${fileExtension}`;
    
    // Créer la commande pour obtenir une URL présignée
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });
    
    // Génération de l'URL présignée (valide 5 minutes)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    
    // Construire l'URL publique pour le fichier
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    
    res.json({
      presignedUrl,
      fileUrl,
      key
    });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL présignée:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération de l\'URL présignée', 
      error: error.message 
    });
  }
});

// Route d'upload standard (si vous préférez ne pas utiliser les URLs présignées)
router.post('/single', verifyToken, uploadMiddleware.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier n\'a été téléchargé' });
    }
    
    let fileUrl;
    
    // Déterminer l'URL du fichier en fonction du type de stockage
    if (req.file.location) {
      // Fichier uploadé sur S3
      fileUrl = req.file.location;
    } else if (req.file.path) {
      // Fichier stocké localement
      fileUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;
    } else {
      return res.status(500).json({ message: 'Erreur lors de la détermination de l\'URL du fichier' });
    }
    
    res.json({
      message: 'Fichier uploadé avec succès',
      file: {
        url: fileUrl,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du fichier:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload du fichier' });
  }
});

// Route d'upload multiple
router.post('/multiple', verifyToken, uploadMiddleware.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Aucun fichier n\'a été téléchargé' });
    }
    
    const files = req.files.map(file => {
      let fileUrl;
      
      // Déterminer l'URL du fichier en fonction du type de stockage
      if (file.location) {
        // Fichier uploadé sur S3
        fileUrl = file.location;
      } else if (file.path) {
        // Fichier stocké localement
        fileUrl = `${req.protocol}://${req.get('host')}/${file.path}`;
      } else {
        fileUrl = null;
      }
      
      return {
        url: fileUrl,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    });
    
    res.json({
      message: `${files.length} fichiers uploadés avec succès`,
      files
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload des fichiers:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload des fichiers' });
  }
});

module.exports = router;