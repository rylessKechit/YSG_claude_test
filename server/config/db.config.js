// server/config/db.config.js - Version simplifiée
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Utiliser directement l'URL locale pour tester
    const dbURI = process.env.MONGODB_URI

    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Ces options ne sont plus nécessaires dans les versions récentes de mongoose mais vérifiez votre version
    });
    
    console.log('MongoDB connecté avec succès');
    
  } catch (error) {
    console.error(`Erreur de connexion à MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;