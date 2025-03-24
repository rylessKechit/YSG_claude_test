// server/controllers/performanceReports.controller.js
const scheduledReportsService = require('../services/scheduledReports.service');
const fs = require('fs');

/**
 * Contrôleur pour gérer la génération de rapports de performance
 */
const performanceReportsController = {
  /**
   * Génère et télécharge un rapport hebdomadaire des performances
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async generateWeeklyReport(req, res) {
    try {
      const filePath = await scheduledReportsService.generateWeeklyReport();
      
      if (!fs.existsSync(filePath)) {
        return res.status(500).json({ message: 'Erreur lors de la génération du rapport' });
      }
      
      const fileName = filePath.split('/').pop();
      
      // Définir les en-têtes pour le téléchargement
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      
      // Envoyer le fichier
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Nettoyer les fichiers temporaires après un certain temps
      setTimeout(() => {
        scheduledReportsService.cleanupTempFiles();
      }, 3600000); // 1 heure
    } catch (error) {
      console.error('Erreur lors de la génération du rapport hebdomadaire:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },
  
  /**
   * Génère et télécharge un rapport mensuel des performances
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async generateMonthlyReport(req, res) {
    try {
      const filePath = await scheduledReportsService.generateMonthlyReport();
      
      if (!fs.existsSync(filePath)) {
        return res.status(500).json({ message: 'Erreur lors de la génération du rapport' });
      }
      
      const fileName = filePath.split('/').pop();
      
      // Définir les en-têtes pour le téléchargement
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      
      // Envoyer le fichier
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Nettoyer les fichiers temporaires après un certain temps
      setTimeout(() => {
        scheduledReportsService.cleanupTempFiles();
      }, 3600000); // 1 heure
    } catch (error) {
      console.error('Erreur lors de la génération du rapport mensuel:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
};

module.exports = performanceReportsController;