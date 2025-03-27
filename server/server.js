// server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db.config');
const errorHandler = require('./middleware/error.middleware');
const { verifyToken } = require('./middleware/auth.middleware');
const path = require('path');
const fs = require('fs');

// Configuration et initialisation
dotenv.config();
const app = express();
const PORT = process.env.PORT;

// Débogage des variables d'environnement AWS
console.log('AWS S3 Config Check:');
console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_ACCESS_KEY_ID présent:', process.env.AWS_ACCESS_KEY_ID ? 'Oui' : 'Non');
console.log('AWS_SECRET_ACCESS_KEY présent:', process.env.AWS_SECRET_ACCESS_KEY ? 'Oui' : 'Non');

// Connexion à la base de données
connectDB().then(() => {
  require('./services/whatsapp.service');
}).catch(err => {
  console.error('Erreur de connexion à MongoDB:', err);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Répertoire des uploads pour le stockage local de secours
// S'assurer que le dossier uploads existe
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads', { recursive: true });
  console.log('Dossier "uploads" créé avec succès');
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importer les routes d'upload
const uploadRoutes = require('./routes/upload.routes');

// Routes principales
const routes = [
  { path: '/api/auth', module: require('./routes/auth.routes') },
  { path: '/api/users', module: require('./routes/user.routes'), auth: true },
  { path: '/api/timelogs', module: require('./routes/timelog.routes'), auth: true },
  { path: '/api/movements', module: require('./routes/movement.routes'), auth: true },
  { path: '/api/preparations', module: require('./routes/preparation.routes'), auth: true },
  { path: '/api/reports', module: require('./routes/report.routes'), auth: true },
  { path: '/api/schedules', module: require('./routes/schedule.routes'), auth: true },
  { path: '/api/admin', module: require('./routes/admin.routes'), auth: true },
  { path: '/api/analytics', module: require('./routes/analytics.routes'), auth: true },
  { path: '/api/tracking', module: require('./routes/tracking.routes'), auth: true },
  // Nouvelle route pour les uploads S3
  { path: '/api/upload', module: uploadRoutes, auth: true },
];

// Enregistrer les routes
routes.forEach(route => {
  app.use(route.path, route.auth ? verifyToken : (req, res, next) => next(), route.module);
});

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de gestion des chauffeurs fonctionne correctement!',
    s3Status: process.env.AWS_S3_BUCKET ? 'S3 configuré' : 'S3 non configuré'
  });
});

// Middleware de gestion des erreurs
app.use(errorHandler);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Configuration d'upload: ${process.env.AWS_S3_BUCKET ? 'AWS S3' : process.env.CLOUDINARY_CLOUD_NAME ? 'Cloudinary' : 'Local'}`);
});