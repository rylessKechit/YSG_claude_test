// server/routes/admin.routes.js - ROUTES CORRIGÉES
const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth.middleware');
const autoTimelogService = require('../services/autoTimelog.service');
const reportAutomationService = require('../services/reportAutomation.service');

// Routes existantes...
const locationRoutes = require('./admin.location.routes');
const whatsappRoutes = require('./whatsapp.routes');

router.use('/locations', locationRoutes);
router.use('/whatsapp', whatsappRoutes);

// NOUVELLE ROUTE: Tester l'auto-déconnexion manuellement
router.post('/test-auto-disconnect', isAdmin, async (req, res) => {
  try {
    console.log(`🧪 Test manuel d'auto-déconnexion lancé par l'admin ${req.user._id}`);
    
    const result = await autoTimelogService.endOrphanedServices();
    
    res.json({
      success: true,
      message: 'Test d\'auto-déconnexion terminé',
      result: {
        processed: result.processed,
        disconnected: result.disconnected,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors du test d\'auto-déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test d\'auto-déconnexion',
      error: error.message
    });
  }
});

// NOUVELLE ROUTE: Tester un utilisateur spécifique
router.post('/test-user-disconnect/:userId', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🧪 Test d'auto-déconnexion pour l'utilisateur ${userId}`);
    
    const result = await autoTimelogService.testUserDisconnection(userId);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('❌ Erreur lors du test utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test utilisateur',
      error: error.message
    });
  }
});

// NOUVELLE ROUTE: Générer un rapport test
router.post('/generate-test-report', isAdmin, async (req, res) => {
  try {
    console.log(`📊 Génération de rapport test par l'admin ${req.user._id}`);
    
    await reportAutomationService.generateAndSendDailyReport();
    
    res.json({
      success: true,
      message: 'Rapport test généré et envoyé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la génération du rapport test:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport test',
      error: error.message
    });
  }
});

// NOUVELLE ROUTE: Obtenir le statut du système
router.get('/system-status', isAdmin, async (req, res) => {
  try {
    const User = require('../models/user.model');
    const TimeLog = require('../models/timelog.model');
    
    // Statistiques des utilisateurs actifs
    const activeUsers = await TimeLog.find({ status: 'active' })
      .populate('userId', 'fullName role')
      .lean();
    
    // Statistiques générales
    const totalUsers = await User.countDocuments({
      role: { $in: ['driver', 'preparator', 'team-leader'] }
    });
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayTimelogs = await TimeLog.countDocuments({
      createdAt: { $gte: startOfDay }
    });
    
    res.json({
      success: true,
      system: {
        activeUsers: activeUsers.length,
        totalUsers,
        todayTimelogs,
        serverTime: new Date().toLocaleString('fr-FR'),
        nextAutoDisconnect: '4h00 du matin'
      },
      activeUsers: activeUsers.map(log => ({
        name: log.userId.fullName,
        role: log.userId.role,
        connectedSince: log.startTime,
        duration: Math.round((new Date() - new Date(log.startTime)) / (1000 * 60))
      }))
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut système'
    });
  }
});

module.exports = router;