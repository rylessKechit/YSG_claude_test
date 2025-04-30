// server/services/whatsapp.service.js
const { Client, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// Configuration AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const bucketName = process.env.AWS_S3_BUCKET;

class WhatsAppService {
  constructor() {
    // Initialisation des propriétés
    this.client = null;
    this.isReady = false;
    this.qrCodeUrl = null;
    this.qrCodeKey = null;
    this.qrGenerationInProgress = false;
    this.lastQRGeneration = 0;
    this.qrRefreshInterval = 60000; // 1 minute entre les régénérations
    this.isInitializing = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.clientId = "ysg-driver-app";

    // Utiliser le volume Railway si disponible, sinon chemin par défaut
    this.dataPath = path.join(__dirname, '../.wwebjs_auth');

    this.tempDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
      ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/temp`
      : path.join(__dirname, '../temp');

    // S'assurer que les dossiers existent
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Initialise le client WhatsApp avec les bons paramètres
   */
  async initialize() {
    // Éviter les initialisations simultanées
    if (this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    
    try {
      // Vérifier si le client est déjà prêt
      if (this.client && this.isReady) {
        this.isInitializing = false;
        return;
      }

      // Configuration spécifique pour Puppeteer sur Railway
      const clientOptions = {
        puppeteer: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- Ceci est important sur Railway
            '--disable-gpu'
          ],
          headless: 'new',
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          defaultViewport: { width: 1280, height: 720 }
        },
        qrMaxRetries: 5,
        authTimeoutMs: 60000,
        restartOnAuthFail: true
      };

      // Utiliser RemoteAuth avec MongoDB si disponible
      if (mongoose.connection.readyState === 1) {
        try {
          const store = new MongoStore({ mongoose });
          clientOptions.authStrategy = new RemoteAuth({
            store,
            clientId: this.clientId,
            backupSyncIntervalMs: 300000, // 5 minutes
            dataPath: this.dataPath
          });
        } catch (err) {
          console.error('Erreur lors de la configuration de RemoteAuth:', err);
        }
      }

      // Création du client WhatsApp
      this.client = new Client(clientOptions);

      // Configuration des écouteurs d'événements
      this.setupEventListeners();

      // Démarrer le client
      console.log('Démarrage du client WhatsApp...');
      await this.client.initialize();
      console.log('Client WhatsApp initialisé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du client WhatsApp:', error);
      
      // Nettoyage
      if (this.client) {
        try {
          await this.client.destroy();
        } catch (e) {
          console.error('Erreur lors de la destruction du client après échec:', e);
        }
        this.client = null;
      }
      
      this.isReady = false;
      
      // Stratégie de reconnexion exponentielle
      this.reconnectAttempts++;
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(30000 * Math.pow(2, this.reconnectAttempts - 1), 300000);
        
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.isInitializing = false;
          this.initialize();
        }, delay);
      } else {
        console.error(`Nombre maximum de tentatives de reconnexion (${this.maxReconnectAttempts}) atteint`);
      }
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Configure tous les écouteurs d'événements pour le client WhatsApp
   */
  setupEventListeners() {
    // Gestion du QR code
    this.client.on('qr', async (qr) => {
      const currentTime = Date.now();
      
      // Limiter la génération du QR code
      if (this.qrGenerationInProgress || (currentTime - this.lastQRGeneration < this.qrRefreshInterval)) {
        return;
      }
      
      this.qrGenerationInProgress = true;
      this.lastQRGeneration = currentTime;
      
      try {
        await this.generateAndUploadQRCode(qr);
      } catch (error) {
        console.error('Erreur lors de la génération du QR code:', error);
        this.qrCodeUrl = null;
      } finally {
        this.qrGenerationInProgress = false;
      }
    });

    // Gestion de l'authentification
    this.client.on('authenticated', () => {
      this.reconnectAttempts = 0;
      
      // Supprimer le QR code de S3
      this.deleteQRCodeFromS3();
    });

    // Gestion de l'état prêt
    this.client.on('ready', () => {
      this.isReady = true;
      this.reconnectAttempts = 0;
      
      // Supprimer le QR code de S3
      this.deleteQRCodeFromS3();
    });

    // Gestion des déconnexions
    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      
      // Nettoyage du QR
      this.qrCodeUrl = null;
      
      // Reconnexion automatique après 30 secondes
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => {
        if (!this.isInitializing && !this.isReady) {
          this.initialize();
        }
      }, 30000);
    });

    // Gestion des échecs d'authentification
    this.client.on('auth_failure', (msg) => {
      console.error('Échec d\'authentification WhatsApp:', msg);
      this.isReady = false;
      
      // Essayer de nettoyer le stockage d'auth si problème persistant
      if (this.reconnectAttempts >= 3) {
        try {
          if (fs.existsSync(this.dataPath)) {
            fs.rmdirSync(this.dataPath, { recursive: true });
          }
        } catch (e) {
          console.error('Erreur lors du nettoyage des données d\'authentification:', e);
        }
      }
    });
  }

  /**
   * Génère un QR code et le téléverse sur S3
   */
  async generateAndUploadQRCode(qrData) {
    try {
      // Générer un identifiant unique pour ce QR code
      const qrId = uuidv4();
      const filename = `whatsapp-qr-${qrId}.png`;
      const localFilePath = path.join(this.tempDir, filename);
      
      // Générer le QR code localement d'abord
      await qrcode.toFile(localFilePath, qrData, {
        errorCorrectionLevel: 'H',
        margin: 4,
        scale: 8
      });
      
      // Vérifier que bucketName est défini
      if (!bucketName) {
        console.error('AWS_S3_BUCKET non défini, impossible de téléverser le QR code');
        
        // Utiliser une URL de fichier local si S3 n'est pas disponible
        this.qrCodeUrl = `file://${localFilePath}`;
        return;
      }
      
      // Chemin dans S3
      const s3Key = `whatsapp/qr-codes/${filename}`;
      this.qrCodeKey = s3Key;
      
      // Lire le fichier
      const fileContent = fs.readFileSync(localFilePath);
      
      // Téléverser sur S3
      const uploadParams = {
        Bucket: bucketName,
        Key: s3Key,
        Body: fileContent,
        ContentType: 'image/png'
      };
      
      // Exécuter la commande de téléversement
      await s3Client.send(new PutObjectCommand(uploadParams));
      
      // Construire l'URL publique
      this.qrCodeUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'eu-west-3'}.amazonaws.com/${s3Key}`;
      
      // Nettoyer le fichier local
      fs.unlinkSync(localFilePath);
    } catch (error) {
      console.error('Erreur lors du téléversement du QR code vers S3:', error);
      throw error;
    }
  }

  /**
   * Supprime le QR code de S3 quand il n'est plus nécessaire
   */
  async deleteQRCodeFromS3() {
    if (this.qrCodeKey && bucketName) {
      try {
        const deleteParams = {
          Bucket: bucketName,
          Key: this.qrCodeKey
        };
        
        await s3Client.send(new DeleteObjectCommand(deleteParams));
        
        this.qrCodeUrl = null;
        this.qrCodeKey = null;
      } catch (error) {
        console.error('Erreur lors de la suppression du QR code de S3:', error);
      }
    }
  }

  /**
   * Envoie un message WhatsApp à un numéro donné
   */
  async sendMessage(phoneNumber, message) {
    // Vérifier si le client est prêt
    if (!this.isReady || !this.client) {
      throw new Error('Client WhatsApp non initialisé ou non connecté');
    }
    
    try {
      // Formater le numéro pour WhatsApp
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      // Envoyer le message et attendre la confirmation
      const result = await this.client.sendMessage(formattedNumber, message);
      
      return {
        success: true,
        messageId: result.id._serialized,
        timestamp: result.timestamp
      };
    } catch (error) {
      console.error(`Erreur lors de l'envoi du message à ${phoneNumber}:`, error);
      throw new Error(`Échec d'envoi du message WhatsApp: ${error.message}`);
    }
  }

  /**
   * Formate un numéro de téléphone pour WhatsApp
   */
  formatPhoneNumber(phoneNumber) {
    // Éliminer tous les caractères non numériques sauf le +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Traitement spécifique pour les numéros français
    if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
    if (cleaned.startsWith('330')) cleaned = '33' + cleaned.substring(3);
    else if (cleaned.startsWith('0')) cleaned = '33' + cleaned.substring(1);
    else if (!cleaned.startsWith('33') && cleaned.length <= 10) cleaned = '33' + cleaned;
    
    // Format WhatsApp attendu
    return `${cleaned}@c.us`;
  }

  /**
   * Vérifie si un numéro est valide pour WhatsApp
   */
  async isValidWhatsAppNumber(phoneNumber) {
    if (!this.isReady || !this.client) {
      throw new Error('Client WhatsApp non initialisé ou non connecté');
    }
    
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const isRegistered = await this.client.isRegisteredUser(formattedNumber);
      return isRegistered;
    } catch (error) {
      console.error(`Erreur lors de la vérification du numéro ${phoneNumber}:`, error);
      return false;
    }
  }
  
  /**
   * Retourne l'état actuel du client
   */
  getStatus() {
    return {
      isReady: this.isReady,
      qrCodeUrl: this.qrCodeUrl,
      isInitializing: this.isInitializing,
      reconnectAttempts: this.reconnectAttempts
    };
  }
  
  /**
   * Indique si le client est prêt
   */
  isClientReady() {
    return this.isReady;
  }
  
  /**
   * Retourne l'URL du QR code
   */
  getQrCodeUrl() {
    return this.qrCodeUrl;
  }

  /**
   * Déconnecte le client WhatsApp
   */
  async disconnect() {
    try {
      if (!this.client || !this.isReady) {
        return false;
      }
      
      // Déconnexion propre
      await this.client.logout();
      
      // Mise à jour de l'état
      this.isReady = false;
      this.qrCodeUrl = null;
      
      // Supprimer le QR code de S3
      this.deleteQRCodeFromS3();
      
      // Réinitialiser après un délai
      setTimeout(() => {
        if (!this.isInitializing && !this.isReady) {
          this.initialize();
        }
      }, 15000);
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la déconnexion du client WhatsApp:', error);
      return false;
    }
  }
}

// Instance singleton du service
const whatsAppService = new WhatsAppService();

// Gérer les arrêts proprement
process.on('SIGTERM', async () => {
  try {
    if (whatsAppService && whatsAppService.client) {
      await whatsAppService.client.destroy();
      console.log('Client WhatsApp déconnecté proprement');
    }
  } catch (error) {
    console.error('Erreur lors de la déconnexion de WhatsApp:', error);
  }
  process.exit(0);
});

// Gérer les erreurs non captées
process.on('uncaughtException', (error) => {
  console.error('Erreur non captée:', error);
  // Ne pas quitter le processus pour Railway
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesse rejetée non gérée:', reason);
  // Ne pas quitter le processus pour Railway
});

// Initialisation différée pour laisser le temps à la BD de se connecter
setTimeout(() => {
  console.log('Démarrage initial du service WhatsApp...');
  whatsAppService.initialize();
}, 15000);

module.exports = whatsAppService;