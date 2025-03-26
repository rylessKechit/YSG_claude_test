// server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db.config');
const errorHandler = require('./middleware/error.middleware');
const { verifyToken } = require('./middleware/auth.middleware');

// Configuration et initialisation
dotenv.config();
const app = express();
const PORT = process.env.PORT;

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

// Routes
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
];

routes.forEach(route => {
  app.use(route.path, route.auth ? verifyToken : (req, res, next) => next(), route.module);
});

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API de gestion des chauffeurs fonctionne correctement!' });
});

// Middleware de gestion des erreurs
app.use(errorHandler);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});