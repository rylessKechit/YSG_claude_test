// server/controllers/whatsapp.controller.js
const whatsAppService = require('../services/whatsapp.service');

/**
 * Obtient le statut actuel du service WhatsApp
 */
exports.getStatus = async (req, res) => {
  try {
    const status = whatsAppService.getStatus();
    
    return res.json({
      isReady: status.isReady,
      qrCodeUrl: status.qrCodeUrl,
      isInitializing: status.isInitializing,
      message: status.isReady 
        ? 'WhatsApp est connecté et prêt à envoyer des messages'
        : (status.isInitializing 
            ? 'Client WhatsApp en cours d\'initialisation...'
            : (status.qrCodeUrl 
                ? 'Veuillez scanner le QR code pour vous connecter'
                : 'En attente du QR code...'))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut WhatsApp:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération du statut WhatsApp',
      error: error.message
    });
  }
};

/**
 * Force la réinitialisation du client WhatsApp
 */
exports.reinitialize = async (req, res) => {
  try {
    // Vérifier si le service est en cours d'initialisation
    if (whatsAppService.getStatus().isInitializing) {
      return res.status(400).json({
        success: false,
        message: 'Le service WhatsApp est déjà en cours d\'initialisation'
      });
    }
    
    // Lancer l'initialisation
    await whatsAppService.initialize();
    
    return res.json({
      success: true,
      message: 'Réinitialisation du service WhatsApp lancée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du service WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation du service WhatsApp',
      error: error.message
    });
  }
};

/**
 * Déconnecte le client WhatsApp
 */
exports.disconnect = async (req, res) => {
  try {
    if (!whatsAppService.isClientReady()) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp n\'est pas connecté'
      });
    }
    
    const result = await whatsAppService.disconnect();
    
    if (result) {
      return res.json({
        success: true,
        message: 'WhatsApp déconnecté avec succès'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la déconnexion de WhatsApp'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la déconnexion de WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion de WhatsApp',
      error: error.message
    });
  }
};

/**
 * Envoie un message WhatsApp
 */
exports.sendMessage = async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    // Validation des données
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de téléphone et le message sont requis'
      });
    }
    
    // Vérifier si le service est prêt
    if (!whatsAppService.isClientReady()) {
      return res.status(503).json({
        success: false,
        message: 'Le service WhatsApp n\'est pas connecté',
        status: whatsAppService.getStatus()
      });
    }
    
    // Envoyer le message
    const result = await whatsAppService.sendMessage(phoneNumber, message);
    
    return res.json({
      success: true,
      message: 'Message WhatsApp envoyé avec succès',
      result
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message WhatsApp',
      error: error.message
    });
  }
};

/**
 * Vérifie si un numéro est valide pour WhatsApp
 */
exports.verifyNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de téléphone est requis'
      });
    }
    
    // Vérifier si le service est prêt
    if (!whatsAppService.isClientReady()) {
      return res.status(503).json({
        success: false,
        message: 'Le service WhatsApp n\'est pas connecté'
      });
    }
    
    const isValid = await whatsAppService.isValidWhatsAppNumber(phoneNumber);
    
    return res.json({
      success: true,
      isValid,
      message: isValid 
        ? 'Le numéro est valide pour WhatsApp'
        : 'Le numéro n\'est pas enregistré sur WhatsApp'
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du numéro WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du numéro',
      error: error.message
    });
  }
};