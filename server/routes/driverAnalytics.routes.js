// server/routes/driverAnalytics.routes.js
const express = require('express');
const router = express.Router();
const driverAnalyticsController = require('../controllers/driverAnalytics.controller');
const { verifyToken, canAccessReports } = require('../middleware/auth.middleware');
const { cacheMiddleware } = require('../middleware/cache.middleware');

// Middleware pour vérifier si l'utilisateur peut accéder aux données d'analyse
// Réutilisation du middleware existant "canAccessReports" pour les rôles admin et direction

// Route pour récupérer les performances d'un chauffeur spécifique
router.get('/drivers/:userId/performance', verifyToken, canAccessReports, cacheMiddleware(600), driverAnalyticsController.getDriverPerformance);

// Route pour récupérer les métriques quotidiennes d'un chauffeur
router.get('/drivers/daily-metrics', verifyToken, canAccessReports, cacheMiddleware(600), driverAnalyticsController.getDriverDailyMetrics);

// Route pour comparer les performances entre chauffeurs
router.get('/drivers/compare', verifyToken, canAccessReports, cacheMiddleware(300), driverAnalyticsController.compareDrivers);

// Route pour récupérer les métriques globales des chauffeurs
router.get('/drivers/global-metrics', verifyToken, canAccessReports, cacheMiddleware(600), driverAnalyticsController.getGlobalDriverMetrics);

// Route pour récupérer les statistiques par destination
router.get('/drivers/destination-stats', verifyToken, canAccessReports, cacheMiddleware(900), driverAnalyticsController.getDestinationStats);

// Route pour récupérer les heures de pointe
router.get('/drivers/peak-hours', verifyToken, canAccessReports, cacheMiddleware(900), driverAnalyticsController.getPeakHours);

module.exports = router;