// server/routes/admin.routes.js (créez ce fichier s'il n'existe pas)
const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth.middleware');
const whatsAppService = require('../services/whatsapp.service');

// Route pour vérifier le statut de WhatsApp et obtenir le QR code
router.get('/whatsapp-status', isAdmin, (req, res) => {
  try {
    const isReady = whatsAppService.isClientReady();
    const qrCodeUrl = whatsAppService.getQrCodeUrl();
    
    res.json({
      isReady,
      qrCodeUrl,
      message: isReady 
        ? 'WhatsApp est connecté et prêt à envoyer des messages' 
        : (qrCodeUrl 
            ? 'Veuillez scanner le QR code pour vous connecter' 
            : 'En attente du QR code...')
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du statut WhatsApp:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Nouvelle route pour déconnecter WhatsApp
router.post('/whatsapp-disconnect', isAdmin, async (req, res) => {
  try {
    if (!whatsAppService.isClientReady()) {
      return res.status(400).json({ message: 'WhatsApp n\'est pas connecté' });
    }

    const disconnected = await whatsAppService.disconnect();
    
    if (disconnected) {
      res.json({ message: 'WhatsApp déconnecté avec succès' });
    } else {
      res.status(500).json({ message: 'Erreur lors de la déconnexion de WhatsApp' });
    }
  } catch (error) {
    console.error('Erreur lors de la déconnexion de WhatsApp:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


module.exports = router;