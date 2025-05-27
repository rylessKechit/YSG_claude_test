// server/server.js (mis à jour)
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db.config');
const errorHandler = require('./middleware/error.middleware');
const { verifyToken } = require('./middleware/auth.middleware');
const path = require('path');
const fs = require('fs');
const scheduler = require('./services/scheduler.service'); // Service mis à jour

const proxyRoutes = require('./routes/proxy.routes');

// Configuration et initialisation
dotenv.config();
const app = express();
const PORT = process.env.PORT;

// Connexion à la base de données
connectDB().then(() => {
  // Initialize WhatsApp service
  require('./services/whatsapp.service');
  
  // Initialize and start the scheduler service
  scheduler.initialize();
  scheduler.start();
  
  console.log('✅ Tous les services initialisés avec succès');
}).catch(err => {
  console.error('❌ Erreur de connexion à MongoDB:', err);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/proxy', proxyRoutes);

// Importer les routes d'upload
const uploadRoutes = require('./routes/upload.routes');

// Routes principales
const routes = [
  { path: '/api/auth', module: require('./routes/auth.routes') },
  { path: '/api/users', module: require('./routes/user.routes'), auth: true },
  { path: '/api/timelogs', module: require('./routes/timelog.routes'), auth: true }, // Routes mises à jour
  { path: '/api/movements', module: require('./routes/movement.routes'), auth: true },
  { path: '/api/preparations', module: require('./routes/preparation.routes'), auth: true },
  { path: '/api/agencies', module: require('./routes/agency.routes'), auth: true },
  { path: '/api/reports', module: require('./routes/report.routes'), auth: true },
  { path: '/api/schedules', module: require('./routes/schedule.routes'), auth: true },
  { path: '/api/admin', module: require('./routes/admin.routes'), auth: true },
  { path: '/api/analytics', module: require('./routes/analytics.routes'), auth: true },
  { path: '/api/tracking', module: require('./routes/tracking.routes'), auth: true },
  { path: '/api/upload', module: uploadRoutes, auth: true },
];

// Enregistrer les routes
routes.forEach(route => {
  app.use(route.path, route.auth ? verifyToken : (req, res, next) => next(), route.module);
});

// Route de test mise à jour
app.get('/', (req, res) => {
  const schedulerStatus = scheduler.getStatus();
  
  res.json({ 
    message: 'API de gestion des chauffeurs fonctionne correctement!',
    s3Status: process.env.AWS_S3_BUCKET ? 'S3 configuré' : 'S3 non configuré',
    emailStatus: process.env.EMAIL_HOST ? 'Email configuré' : 'Email non configuré',
    schedulerStatus: {
      isRunning: schedulerStatus.isRunning,
      jobCount: schedulerStatus.jobCount,
      jobs: schedulerStatus.jobs
    },
    features: {
      driverTimelogAutomation: 'Actif - Traitement à 3h du matin',
      automaticReports: 'Actif - Quotidien/Hebdomadaire/Mensuel'
    }
  });
});

// NOUVELLE ROUTE: Status détaillé du système (pour monitoring)
app.get('/api/system/status', verifyToken, (req, res) => {
  // Seuls les admins peuvent voir le statut système
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  
  const schedulerStatus = scheduler.getStatus();
  
  res.json({
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    },
    scheduler: schedulerStatus,
    database: {
      status: 'connected' // Simplification - pourrait être amélioré
    },
    services: {
      s3: process.env.AWS_S3_BUCKET ? 'configured' : 'not_configured',
      email: process.env.EMAIL_HOST ? 'configured' : 'not_configured',
      whatsapp: 'initialized', // Simplification
      googleMaps: process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'not_configured'
    }
  });
});

// Middleware de gestion des erreurs
app.use(errorHandler);

// Clean shutdown
process.on('SIGINT', () => {
  console.log('🔄 Arrêt du serveur en cours...');
  scheduler.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔄 Arrêt du serveur en cours...');
  scheduler.shutdown();
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  scheduler.shutdown();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  scheduler.shutdown();
  process.exit(1);
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📅 Traitement automatique des pointages drivers: Chaque jour à 3h00`);
  console.log(`📊 Rapports automatiques activés`);
});