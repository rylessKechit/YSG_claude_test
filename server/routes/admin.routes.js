// server/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth.middleware');
const locationRoutes = require('./admin.location.routes');
const whatsappRoutes = require('./whatsapp.routes');

// Utiliser les routes pour la gestion des emplacements et réseaux
router.use('/', locationRoutes);

// Utiliser les routes WhatsApp sous /whatsapp
router.use('/whatsapp', whatsappRoutes);

// Redirection vers les nouvelles routes pour la compatibilité avec l'ancien code
router.get('/whatsapp-status', isAdmin, (req, res) => {
  res.redirect('/api/admin/whatsapp/status');
});

router.post('/whatsapp-disconnect', isAdmin, (req, res) => {
  res.redirect(307, '/api/admin/whatsapp/disconnect');
});

module.exports = router;