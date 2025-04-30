// server/routes/whatsapp.routes.js
const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const whatsappController = require('../controllers/whatsapp.controller');

// Routes protégées par authentification et rôle admin
router.use(verifyToken, isAdmin);

// Route pour vérifier le statut de WhatsApp et obtenir le QR code
router.get('/status', whatsappController.getStatus);

// Route pour forcer la réinitialisation du client WhatsApp
router.post('/reinitialize', whatsappController.reinitialize);

// Route pour déconnecter WhatsApp
router.post('/disconnect', whatsappController.disconnect);

// Route pour envoyer un message WhatsApp
router.post('/send-message', whatsappController.sendMessage);

// Route pour vérifier si un numéro est valide sur WhatsApp
router.post('/verify-number', whatsappController.verifyNumber);

module.exports = router;