// Dans server.js ou scheduler.js
const cron = require('node-cron');
const reportAutomationService = require('./services/reportAutomation.service');

// Configuration des tâches planifiées
function setupScheduledJobs() {
  console.log('🕒 Configuration des tâches planifiées pour les rapports...');

  // Rapport quotidien - chaque jour à 1h du matin
  cron.schedule('0 1 * * *', () => {
    console.log('🔄 Exécution du rapport quotidien automatique');
    reportAutomationService.generateAndSendDailyReport();
  });

  // Rapport hebdomadaire - chaque lundi à 2h du matin
  cron.schedule('0 2 * * 1', () => {
    console.log('🔄 Exécution du rapport hebdomadaire automatique');
    reportAutomationService.generateAndSendWeeklyReport();
  });

  // Rapport mensuel - le premier jour de chaque mois à 3h du matin
  cron.schedule('0 3 1 * *', () => {
    console.log('🔄 Exécution du rapport mensuel automatique');
    reportAutomationService.generateAndSendMonthlyReport();
  });

  // Nettoyage des anciens rapports - chaque dimanche à 4h du matin
  cron.schedule('0 4 * * 0', () => {
    console.log('🧹 Nettoyage automatique des anciens rapports');
    reportAutomationService.cleanupOldReports();
  });

  console.log('✅ Tâches planifiées configurées avec succès');
}

// Exporter la fonction pour l'utiliser dans server.js
module.exports = setupScheduledJobs;