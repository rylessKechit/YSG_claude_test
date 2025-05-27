// server/services/scheduler.service.js (mis à jour avec le nouveau service)
const cron = require('node-cron');
const reportAutomationService = require('./reportAutomation.service');
const driverTimelogAutomationService = require('./driverTimelogAutomation.service');
const emailService = require('./email.service');

class SchedulerService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Initialise toutes les tâches planifiées
   */
  initialize() {
    console.log('🕒 Initialisation du service de planification...');

    // 1. NOUVEAU: Traitement automatique des pointages drivers - 3h00 du matin
    const driverTimelogJob = cron.schedule('0 3 * * *', async () => {
      console.log('🚗 Exécution du traitement automatique des pointages drivers');
      try {
        const result = await driverTimelogAutomationService.processAllDrivers();
        
        // Envoyer le rapport des corrections aux admins
        await this.sendDriverTimelogReport(result);
        
        console.log(`✅ Traitement des pointages drivers terminé - ${result.totalCorrections} correction(s) effectuée(s)`);
      } catch (error) {
        console.error('❌ Erreur lors du traitement des pointages drivers:', error);
      }
    }, {
      scheduled: false,
      timezone: "Europe/Paris"
    });

    // 2. Rapport quotidien - 1h00 du matin
    const dailyReportJob = cron.schedule('0 1 * * *', async () => {
      console.log('📊 Exécution du rapport quotidien automatique');
      try {
        await reportAutomationService.generateAndSendDailyReport();
        console.log('✅ Rapport quotidien envoyé avec succès');
      } catch (error) {
        console.error('❌ Erreur lors du rapport quotidien:', error);
      }
    }, {
      scheduled: false,
      timezone: "Europe/Paris"
    });

    // 3. Rapport hebdomadaire - chaque lundi à 2h00 du matin
    const weeklyReportJob = cron.schedule('0 2 * * 1', async () => {
      console.log('📈 Exécution du rapport hebdomadaire automatique');
      try {
        await reportAutomationService.generateAndSendWeeklyReport();
        console.log('✅ Rapport hebdomadaire envoyé avec succès');
      } catch (error) {
        console.error('❌ Erreur lors du rapport hebdomadaire:', error);
      }
    }, {
      scheduled: false,
      timezone: "Europe/Paris"
    });

    // 4. Rapport mensuel - le premier jour de chaque mois à 2h30 du matin
    const monthlyReportJob = cron.schedule('30 2 1 * *', async () => {
      console.log('📅 Exécution du rapport mensuel automatique');
      try {
        await reportAutomationService.generateAndSendMonthlyReport();
        console.log('✅ Rapport mensuel envoyé avec succès');
      } catch (error) {
        console.error('❌ Erreur lors du rapport mensuel:', error);
      }
    }, {
      scheduled: false,
      timezone: "Europe/Paris"
    });

    // 5. Nettoyage des anciens rapports - chaque dimanche à 4h00 du matin
    const cleanupJob = cron.schedule('0 4 * * 0', () => {
      console.log('🧹 Nettoyage automatique des anciens rapports');
      try {
        reportAutomationService.cleanupOldReports();
        console.log('✅ Nettoyage des anciens rapports terminé');
      } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
      }
    }, {
      scheduled: false,
      timezone: "Europe/Paris"
    });

    // Stocker les jobs pour pouvoir les arrêter plus tard
    this.jobs = [
      { name: 'Driver Timelog Automation', job: driverTimelogJob },
      { name: 'Daily Report', job: dailyReportJob },
      { name: 'Weekly Report', job: weeklyReportJob },
      { name: 'Monthly Report', job: monthlyReportJob },
      { name: 'Cleanup', job: cleanupJob }
    ];

    console.log(`✅ ${this.jobs.length} tâche(s) planifiée(s) configurée(s)`);
  }

  /**
   * Démarre toutes les tâches planifiées
   */
  start() {
    console.log('▶️ Démarrage des tâches planifiées...');
    
    this.jobs.forEach(({ name, job }) => {
      job.start();
      console.log(`  ✓ ${name} démarrée`);
    });
    
    this.isRunning = true;
    console.log('✅ Toutes les tâches planifiées sont actives');
  }

  /**
   * Arrête toutes les tâches planifiées
   */
  stop() {
    console.log('⏹️ Arrêt des tâches planifiées...');
    
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`  ✓ ${name} arrêtée`);
    });
    
    this.isRunning = false;
    console.log('✅ Toutes les tâches planifiées sont arrêtées');
  }

  /**
   * Arrêt propre du service
   */
  shutdown() {
    console.log('🔄 Arrêt du service de planification...');
    this.stop();
    
    this.jobs.forEach(({ job }) => {
      if (job.destroy) {
        job.destroy();
      }
    });
    
    console.log('✅ Service de planification arrêté proprement');
  }

  /**
   * Exécute manuellement le traitement des pointages drivers (pour tests)
   */
  async runDriverTimelogProcessingNow() {
    console.log('🧪 Exécution manuelle du traitement des pointages drivers...');
    try {
      const result = await driverTimelogAutomationService.processAllDrivers();
      await this.sendDriverTimelogReport(result);
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution manuelle:', error);
      throw error;
    }
  }

  /**
   * Envoie le rapport des corrections de pointages aux admins et direction
   */
  async sendDriverTimelogReport(result) {
    try {
      console.log('📧 Envoi du rapport de corrections des pointages...');
      
      // Récupérer les destinataires (admin et direction)
      const User = require('../models/user.model');
      const recipients = await User.find({ 
        role: { $in: ['admin', 'direction'] },
        email: { $exists: true, $ne: '' }
      }).select('email fullName role');
      
      if (recipients.length === 0) {
        console.log('⚠️ Aucun destinataire trouvé pour le rapport de pointages');
        return;
      }

      // Construire le rapport HTML
      const reportHtml = this.buildDriverTimelogReportHtml(result);
      
      // Envoyer l'email
      const emailResult = await emailService.sendEmail({
        to: recipients.map(r => r.email),
        subject: `Rapport automatique - Corrections des pointages drivers (${new Date().toLocaleDateString('fr-FR')})`,
        templateName: 'default',
        context: {
          title: 'Rapport de corrections des pointages',
          body: reportHtml
        }
      });
      
      if (emailResult.success) {
        console.log(`✅ Rapport de pointages envoyé à ${recipients.length} destinataire(s)`);
      } else {
        console.error('❌ Erreur lors de l\'envoi du rapport de pointages:', emailResult.error);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du rapport de pointages:', error);
    }
  }

  /**
   * Construit le HTML du rapport de corrections
   */
  buildDriverTimelogReportHtml(result) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toLocaleDateString('fr-FR');
    
    let html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #3B82F6; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;">
          🚗 Rapport de traitement automatique des pointages drivers
        </h2>
        
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1F2937;">📊 Résumé</h3>
          <ul style="margin-bottom: 0;">
            <li><strong>Date traitée :</strong> ${dateStr}</li>
            <li><strong>Drivers traités :</strong> ${result.processedDrivers}</li>
            <li><strong>Drivers avec corrections :</strong> ${result.corrections.length}</li>
            <li><strong>Total des corrections :</strong> ${result.totalCorrections}</li>
          </ul>
        </div>
    `;
    
    if (result.corrections.length === 0) {
      html += `
        <div style="background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #047857; font-weight: 500;">
            ✅ Aucune correction nécessaire - Tous les pointages sont complets !
          </p>
        </div>
      `;
    } else {
      html += `<h3 style="color: #1F2937; margin-top: 30px;">📝 Détail des corrections</h3>`;
      
      result.corrections.forEach((driverData, index) => {
        html += `
          <div style="background-color: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin: 15px 0;">
            <h4 style="margin-top: 0; color: #1F2937; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">
              👤 ${driverData.driver.name} (${driverData.driver.username})
            </h4>
            
            <div style="margin-left: 15px;">
        `;
        
        driverData.corrections.forEach((correction, corrIndex) => {
          const timeStr = new Date(correction.time).toLocaleString('fr-FR');
          const typeLabel = this.getTypeLabel(correction.type);
          const iconColor = this.getTypeColor(correction.type);
          
          html += `
            <div style="margin: 10px 0; padding: 10px; background-color: #F9FAFB; border-left: 3px solid ${iconColor}; border-radius: 0 4px 4px 0;">
              <strong style="color: ${iconColor};">${typeLabel}</strong><br>
              <span style="color: #6B7280; font-size: 14px;">⏰ ${timeStr}</span><br>
              <span style="color: #4B5563; font-size: 14px;">📝 ${correction.reason}</span>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      });
    }
    
    html += `
        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 30px 0 20px 0;">
          <p style="margin: 0; color: #92400E; font-size: 14px;">
            <strong>ℹ️ Information :</strong> Ce rapport est généré automatiquement chaque jour à 3h du matin. 
            Les corrections sont appliquées selon les règles de gestion des pointages drivers.
          </p>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #6B7280;">
          Rapport généré automatiquement le ${new Date().toLocaleString('fr-FR')} par le système YSG.
        </p>
      </div>
    `;
    
    return html;
  }

  /**
   * Retourne le libellé d'un type de pointage
   */
  getTypeLabel(type) {
    const labels = {
      'start_service': '🟢 Début de service',
      'start_break': '⏸️ Début de pause',
      'end_break': '▶️ Fin de pause',
      'end_service': '🔴 Fin de service'
    };
    return labels[type] || type;
  }

  /**
   * Retourne la couleur d'un type de pointage
   */
  getTypeColor(type) {
    const colors = {
      'start_service': '#10B981',
      'start_break': '#F59E0B', 
      'end_break': '#3B82F6',
      'end_service': '#EF4444'
    };
    return colors[type] || '#6B7280';
  }

  /**
   * Retourne le statut du service
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.length,
      jobs: this.jobs.map(({ name }) => ({ name, active: this.isRunning }))
    };
  }
}

module.exports = new SchedulerService();