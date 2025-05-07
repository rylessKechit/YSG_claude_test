const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration S3
const bucketName = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION || 'eu-west-3';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Initialiser le client S3 si les variables sont définies
let s3Client = null;
if (bucketName && accessKeyId && secretAccessKey) {
  try {
    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  } catch (error) {
    console.error('❌ Erreur d\'initialisation S3 dans uploadService:', error.message);
  }
}

/**
 * Génère une URL présignée pour un téléchargement direct sur S3
 * @param {string} fileType - Type MIME du fichier
 * @param {string} userId - ID de l'utilisateur
 * @param {string} folder - Dossier dans le bucket (ex: 'movements', 'preparations')
 * @returns {Promise<{presignedUrl: string, fileUrl: string, key: string}>}
 */
const generatePresignedUrl = async (fileType, userId, folder = 'uploads') => {
  if (!s3Client) {
    throw new Error('Client S3 non configuré');
  }
  
  // Déterminer l'extension du fichier à partir du type MIME
  const fileExtension = fileType.split('/')[1] || 'jpg';
  
  // Créer un nom de fichier unique
  const key = `${folder}/user-${userId}/${Date.now()}-${uuidv4()}.${fileExtension}`;
  
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
  
  return {
    presignedUrl,
    fileUrl,
    key
  };
};

/**
 * Vérifie si S3 est configuré correctement
 * @returns {boolean}
 */
const isS3Configured = () => {
  return !!s3Client;
};

module.exports = {
  generatePresignedUrl,
  isS3Configured
};