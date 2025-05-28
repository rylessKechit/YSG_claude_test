// server/services/scheduler.service.js - VERSION CORRIGÉE
const cron = require('node-cron');
const reportAutomationService = require('./reportAutomation.service');
const autoTimelogService = require('./autoTimelog.service'); // Import corrigé
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

    // 1. AUTO-DÉCONNEXION : 4h00 du matin tous les jours
    const autoDisconnectJob = cron.schedule('0 4 * * *', async () => {
      console.log('🔌 Exécution de l\'auto-déconnexion des utilisateurs inactifs');
      try {
        const result = await autoTimelogService.endOrphanedServices();
        
        // Envoyer un rapport si des déconnexions ont eu lieu
        if (result.disconnected > 0) {
          await this.sendAutoDisconnectReport(result);
        }
        
        console.log(`✅ Auto-déconnexion terminée - ${result.disconnected}/${result.processed} utilisateur(s) déconnecté(s)`);
      } catch (error) {
        console.error('❌ Erreur lors de l\'auto-déconnexion:', error);
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

    // 5. Nettoyage des anciens rapports - chaque dimanche à 5h00 du matin
    const cleanupJob = cron.schedule('0 5 * * 0', () => {
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

    // Stocker les jobs
    this.jobs = [
      { name: 'Auto-déconnexion', job: autoDisconnectJob, schedule: '4h00 quotidien' },
      { name: 'Rapport quotidien', job: dailyReportJob, schedule: '1h00 quotidien' },
      { name: 'Rapport hebdomadaire', job: weeklyReportJob, schedule: 'Lundi 2h00' },
      { name: 'Rapport mensuel', job: monthlyReportJob, schedule: '1er du mois 2h30' },
      { name: 'Nettoyage', job: cleanupJob, schedule: 'Dimanche 5h00' }
    ];

    console.log(`✅ ${this.jobs.length} tâche(s) planifiée(s) configurée(s)`);
  }

  /**
   * Démarre toutes les tâches planifiées
   */
  start() {
    console.log('▶️ Démarrage des tâches planifiées...');
    
    this.jobs.forEach(({ name, job, schedule }) => {
      job.start();
      console.log(`  ✓ ${name} démarrée (${schedule})`);
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
   * Exécute manuellement l'auto-déconnexion (pour tests)
   */
  async runAutoDisconnectNow() {
    console.log('🧪 Exécution manuelle de l\'auto-déconnexion...');
    try {
      const result = await autoTimelogService.endOrphanedServices();
      
      if (result.disconnected > 0) {
        await this.sendAutoDisconnectReport(result);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution manuelle:', error);
      throw error;
    }
  }

  /**
   * Envoie le rapport d'auto-déconnexion aux admins
   */
  async sendAutoDisconnectReport(result) {
    try {
      console.log('📧 Envoi du rapport d\'auto-déconnexion...');
      
      // Récupérer les destinataires (admin et direction)
      const User = require('../models/user.model');
      const recipients = await User.find({ 
        role: { $in: ['admin', 'direction'] },
        email: { $exists: true, $ne: '' }
      }).select('email fullName role');
      
      if (recipients.length === 0) {
        console.log('⚠️ Aucun destinataire trouvé pour le rapport d\'auto-déconnexion');
        return;
      }

      // Construire le rapport HTML
      const reportHtml = this.buildAutoDisconnectReportHtml(result);
      
      // Envoyer l'email
      const emailResult = await emailService.sendEmail({
        to: recipients.map(r => r.email),
        subject: `🔌 Rapport d'auto-déconnexion (${new Date().toLocaleDateString('fr-FR')})`,
        templateName: 'default',
        context: {
          title: 'Rapport d\'auto-déconnexion',
          body: reportHtml
        }
      });
      
      if (emailResult.success) {
        console.log(`✅ Rapport d'auto-déconnexion envoyé à ${recipients.length} destinataire(s)`);
      } else {
        console.error('❌ Erreur lors de l\'envoi du rapport d\'auto-déconnexion:', emailResult.error);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du rapport d\'auto-déconnexion:', error);
    }
  }

  /**
   * Construit le HTML du rapport d'auto-déconnexion
   */
  buildAutoDisconnectReportHtml(result) {
    const now = new Date().toLocaleString('fr-FR');
    
    let html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">🔌 Rapport d'auto-déconnexion</h2>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Exécuté le ${now}</p>
        </div>
        
        <div style="background: white; padding: 25px; border: 1px solid #e1e1e1; border-top: none;">
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1F2937;">📊 Résumé</h3>
            <ul style="margin-bottom: 0;">
              <li><strong>Utilisateurs vérifiés :</strong> ${result.processed}</li>
              <li><strong>Utilisateurs déconnectés :</strong> ${result.disconnected}</li>
              <li><strong>Erreurs :</strong> ${result.errors.length}</li>
            </ul>
          </div>
    `;
    
    if (result.disconnected === 0) {
      html += `
        <div style="background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #047857; font-weight: 500;">
            ✅ Aucune déconnexion automatique nécessaire
          </p>
        </div>
      `;
    } else {
      html += `
        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400E; font-weight: 500;">
            ⚠️ ${result.disconnected} utilisateur(s) ont été déconnectés automatiquement
          </p>
        </div>
      `;
    }
    
    if (result.errors.length > 0) {
      html += `<h3 style="color: #EF4444; margin-top: 30px;">❌ Erreurs rencontrées</h3>`;
      
      result.errors.forEach((error, index) => {
        html += `
          <div style="background-color: #FEE2E2; border-left: 3px solid #EF4444; padding: 10px; margin: 10px 0; border-radius: 0 4px 4px 0;">
            <strong>${error.username || 'Utilisateur inconnu'}</strong><br>
            <span style="color: #B91C1C; font-size: 14px;">${error.error}</span>
          </div>
        `;
      });
    }
    
    html += `
          <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 30px 0 20px 0;">
            <p style="margin: 0; color: #1E40AF; font-size: 14px;">
              <strong>ℹ️ Information :</strong> L'auto-déconnexion s'exécute automatiquement chaque jour à 4h du matin. 
              Les utilisateurs sont déconnectés 15 minutes après leur dernière activité (mouvement ou préparation terminée).
            </p>
          </div>
          
          <p style="margin-top: 30px; font-size: 12px; color: #6B7280;">
            Rapport généré automatiquement par le système YSG.
          </p>
        </div>
      </div>
    `;
    
    return html;
  }

  /**
   * Retourne le statut du service
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.length,
      jobs: this.jobs.map(({ name, schedule }) => ({ 
        name, 
        schedule,
        active: this.isRunning 
      })),
      nextScheduledTasks: [
        'Auto-déconnexion: 4h00',
        'Rapport quotidien: 1h00', 
        'Rapport hebdomadaire: Lundi 2h00',
        'Rapport mensuel: 1er du mois 2h30',
        'Nettoyage: Dimanche 5h00'
      ]
    };
  }
}

module.exports = new SchedulerService();