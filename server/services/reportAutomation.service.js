// server/services/reportAutomation.service.js - RAPPORTS RH AMÉLIORÉS
const User = require('../models/user.model');
const TimeLog = require('../models/timelog.model');
const Movement = require('../models/movement.model');
const Preparation = require('../models/preparation.model');
const ExcelJS = require('exceljs');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const emailService = require('./email.service');

class ReportAutomationService {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Génère un rapport quotidien détaillé avec toutes les informations RH
   */
  async generateDailyReport(date, reportDate) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système YSG - Rapport RH';
    workbook.created = new Date();
    
    // Récupérer tous les employés
    const employees = await User.find({ 
      role: { $in: ['driver', 'preparator', 'team-leader'] } 
    }).sort({ role: 1, fullName: 1 });
    
    // Créer la feuille principale
    const worksheet = workbook.addWorksheet('Rapport quotidien détaillé');
    
    // Configuration des colonnes avec titres explicites pour RH
    worksheet.columns = [
      { header: 'EMPLOYÉ', key: 'fullName', width: 25 },
      { header: 'POSTE', key: 'role', width: 15 },
      { header: 'PRISE DE SERVICE', key: 'serviceStart', width: 18 },
      { header: 'FIN DE SERVICE', key: 'serviceEnd', width: 18 },
      { header: 'TEMPS TOTAL TRAVAILLÉ', key: 'totalWorkedTime', width: 20 },
      { header: 'DÉBUT PAUSE', key: 'breakStart', width: 15 },
      { header: 'FIN PAUSE', key: 'breakEnd', width: 15 },
      { header: 'DURÉE PAUSE', key: 'breakDuration', width: 15 },
      { header: 'TEMPS EFFECTIF', key: 'effectiveWorkTime', width: 18 },
      { header: 'STATUT', key: 'status', width: 15 },
      { header: 'OBSERVATIONS', key: 'observations', width: 35 }
    ];
    
    // Style des en-têtes
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2F5496' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;
    
    // Ajouter un titre général
    worksheet.insertRow(1, [`RAPPORT QUOTIDIEN DES POINTAGES - ${reportDate.toUpperCase()}`]);
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1F4E79' }
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;
    
    // Générer les données pour chaque employé
    const startDate = new Date(date + 'T00:00:00');
    const endDate = new Date(date + 'T23:59:59');
    
    let totalEmployees = 0;
    let employeesWorked = 0;
    let totalHoursWorked = 0;
    
    for (const employee of employees) {
      totalEmployees++;
      
      // Récupérer tous les pointages de l'employé pour ce jour
      const timelogs = await TimeLog.find({
        userId: employee._id,
        createdAt: { $gte: startDate, $lte: endDate }
      }).sort({ createdAt: 1 });
      
      // Analyser les pointages
      const analysis = this.analyzeEmployeeDay(timelogs, employee);
      
      if (analysis.hasWorked) {
        employeesWorked++;
        totalHoursWorked += analysis.totalWorkedHours;
      }
      
      // Ajouter la ligne dans le tableau
      const row = worksheet.addRow({
        fullName: employee.fullName,
        role: this.translateRole(employee.role),
        serviceStart: analysis.serviceStart || '-',
        serviceEnd: analysis.serviceEnd || (analysis.isCurrentlyWorking ? 'EN COURS' : '-'),
        totalWorkedTime: analysis.totalWorkedTime || '0h00',
        breakStart: analysis.breakStart || '-',
        breakEnd: analysis.breakEnd || '-',
        breakDuration: analysis.breakDuration || '-',
        effectiveWorkTime: analysis.effectiveWorkTime || '0h00',
        status: analysis.status,
        observations: analysis.observations.join('; ')
      });
      
      // Style conditionnel selon le statut
      this.applyRowStyle(row, analysis.status);
    }
    
    // Ajouter une ligne de résumé
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow([
      'RÉSUMÉ',
      '',
      '',
      '',
      this.formatDuration(totalHoursWorked * 60),
      '',
      '',
      '',
      '',
      `${employeesWorked}/${totalEmployees} présents`,
      `Taux de présence: ${Math.round((employeesWorked/totalEmployees)*100)}%`
    ]);
    
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E7E6E6' }
    };
    
    // Bordures pour toutes les cellules
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) { // Ignorer le titre
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle' };
        });
      }
    });
    
    // Ajouter une feuille avec des statistiques détaillées
    await this.addStatisticsSheet(workbook, date, employees);
    
    // Ajouter une feuille avec les détails des pointages
    await this.addDetailedTimelogsSheet(workbook, date, employees);
    
    // Enregistrer le fichier
    const filePath = path.join(this.tempDir, `rapport_quotidien_detaille_${date}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  }
  
  /**
   * Analyse détaillée de la journée d'un employé
   */
  analyzeEmployeeDay(timelogs, employee) {
    const analysis = {
      hasWorked: false,
      isCurrentlyWorking: false,
      serviceStart: null,
      serviceEnd: null,
      breakStart: null,
      breakEnd: null,
      totalWorkedHours: 0,
      totalWorkedTime: null,
      effectiveWorkTime: null,
      breakDuration: null,
      status: 'Non pointé',
      observations: []
    };
    
    if (timelogs.length === 0) {
      analysis.observations.push('Aucun pointage enregistré');
      return analysis;
    }
    
    analysis.hasWorked = true;
    let totalMinutes = 0;
    let breakMinutes = 0;
    let serviceStartTime = null;
    let serviceEndTime = null;
    
    // Analyser chaque pointage chronologiquement
    for (let i = 0; i < timelogs.length; i++) {
      const timelog = timelogs[i];
      const startTime = new Date(timelog.startTime);
      const endTime = timelog.endTime ? new Date(timelog.endTime) : null;
      const duration = endTime ? (endTime - startTime) / (1000 * 60) : 0;
      
      if (timelog.status === 'active') {
        // Pointage en cours
        analysis.isCurrentlyWorking = true;
        analysis.observations.push('Service en cours');
        
        if (!serviceStartTime) {
          serviceStartTime = startTime;
        }
        
        // Calculer le temps depuis le début jusqu'à maintenant
        const currentDuration = (new Date() - startTime) / (1000 * 60);
        totalMinutes += currentDuration;
        
      } else if (timelog.status === 'completed') {
        // Pointage terminé
        totalMinutes += duration;
        
        if (!serviceStartTime) {
          serviceStartTime = startTime;
        }
        serviceEndTime = endTime;
        
        // Détecter les pauses (durées courtes entre d'autres pointages)
        if (this.isProbablyBreak(timelog, timelogs, duration, i)) {
          if (!analysis.breakStart) {
            analysis.breakStart = this.formatTime(startTime);
            analysis.breakEnd = this.formatTime(endTime);
            breakMinutes = duration;
          } else {
            // Ajouter à la durée de pause existante
            breakMinutes += duration;
            analysis.breakEnd = this.formatTime(endTime);
          }
        }
      }
      
      // Vérifier les pointages automatiques
      if (timelog.isAutoDisconnected) {
        analysis.observations.push('Déconnexion automatique');
      }
    }
    
    // Définir les heures de service
    if (serviceStartTime) {
      analysis.serviceStart = this.formatTime(serviceStartTime);
    }
    if (serviceEndTime && !analysis.isCurrentlyWorking) {
      analysis.serviceEnd = this.formatTime(serviceEndTime);
    }
    
    // Calculer les durées
    analysis.totalWorkedHours = totalMinutes / 60;
    analysis.totalWorkedTime = this.formatDuration(totalMinutes);
    
    if (breakMinutes > 0) {
      analysis.breakDuration = this.formatDuration(breakMinutes);
    }
    
    const effectiveMinutes = Math.max(0, totalMinutes - breakMinutes);
    analysis.effectiveWorkTime = this.formatDuration(effectiveMinutes);
    
    // Déterminer le statut
    if (analysis.isCurrentlyWorking) {
      analysis.status = 'En service';
    } else if (analysis.hasWorked) {
      analysis.status = 'Service terminé';
    } else {
      analysis.status = 'Non pointé';
    }
    
    // Ajouter des observations sur les durées
    if (totalMinutes > 600) { // Plus de 10h
      analysis.observations.push('Journée longue (>10h)');
    } else if (totalMinutes < 240 && totalMinutes > 0) { // Moins de 4h mais a travaillé
      analysis.observations.push('Journée courte (<4h)');
    }
    
    if (breakMinutes === 0 && totalMinutes > 360) { // Pas de pause et plus de 6h
      analysis.observations.push('Aucune pause détectée');
    }
    
    if (breakMinutes > 120) { // Plus de 2h de pause
      analysis.observations.push('Pause longue (>2h)');
    }
    
    return analysis;
  }
  
  /**
   * Détermine si un pointage est probablement une pause
   */
  isProbablyBreak(timelog, allTimelogs, duration, index) {
    // Une pause est typiquement :
    // - Entre 15 minutes et 2 heures
    // - Pas le premier ni le dernier pointage de la journée
    // - Ou explicitement marquée comme pause dans les notes
    
    if (duration < 15 || duration > 120) return false;
    
    // Pas le premier ni le dernier
    if (index === 0 || index === allTimelogs.length - 1) return false;
    
    // Vérifier les notes pour des mots-clés de pause
    const notes = (timelog.notes || '').toLowerCase();
    const pauseKeywords = ['pause', 'repas', 'déjeuner', 'break', 'repos'];
    
    if (pauseKeywords.some(keyword => notes.includes(keyword))) {
      return true;
    }
    
    // Si c'est entre 11h et 15h et dure entre 30min et 2h, probablement une pause déjeuner
    const hour = new Date(timelog.startTime).getHours();
    if (hour >= 11 && hour <= 15 && duration >= 30 && duration <= 120) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Applique un style à une ligne selon le statut
   */
  applyRowStyle(row, status) {
    let color;
    switch (status) {
      case 'En service':
        color = 'E7F3FF'; // Bleu clair
        break;
      case 'Service terminé':
        color = 'E7F7E7'; // Vert clair
        break;
      case 'Non pointé':
        color = 'FFF2E7'; // Orange clair
        break;
      default:
        color = 'FFFFFF';
    }
    
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color }
      };
    });
  }
  
  /**
   * Ajoute une feuille avec des statistiques
   */
  async addStatisticsSheet(workbook, date, employees) {
    const statsSheet = workbook.addWorksheet('Statistiques');
    
    statsSheet.addRow(['STATISTIQUES DÉTAILLÉES', '', '', '']);
    statsSheet.mergeCells('A1:D1');
    const titleCell = statsSheet.getCell('A1');
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };
    
    statsSheet.addRow([]);
    
    // Statistiques par rôle
    const roleStats = {};
    const startDate = new Date(date + 'T00:00:00');
    const endDate = new Date(date + 'T23:59:59');
    
    for (const employee of employees) {
      const role = this.translateRole(employee.role);
      if (!roleStats[role]) {
        roleStats[role] = { total: 0, worked: 0, totalHours: 0 };
      }
      
      roleStats[role].total++;
      
      const timelogs = await TimeLog.find({
        userId: employee._id,
        createdAt: { $gte: startDate, $lte: endDate }
      });
      
      if (timelogs.length > 0) {
        roleStats[role].worked++;
        const totalMinutes = timelogs.reduce((sum, log) => {
          if (log.status === 'completed' && log.endTime) {
            return sum + (new Date(log.endTime) - new Date(log.startTime)) / (1000 * 60);
          } else if (log.status === 'active') {
            return sum + (new Date() - new Date(log.startTime)) / (1000 * 60);
          }
          return sum;
        }, 0);
        roleStats[role].totalHours += totalMinutes / 60;
      }
    }
    
    // Ajouter les statistiques
    statsSheet.addRow(['POSTE', 'TOTAL', 'PRÉSENTS', 'TAUX', 'HEURES TOTALES']);
    Object.entries(roleStats).forEach(([role, stats]) => {
      const rate = Math.round((stats.worked / stats.total) * 100);
      statsSheet.addRow([
        role,
        stats.total,
        stats.worked,
        `${rate}%`,
        this.formatDuration(stats.totalHours * 60)
      ]);
    });
  }
  
  /**
   * Ajoute une feuille avec le détail de tous les pointages
   */
  async addDetailedTimelogsSheet(workbook, date, employees) {
    const detailSheet = workbook.addWorksheet('Détail des pointages');
    
    detailSheet.columns = [
      { header: 'EMPLOYÉ', key: 'employee', width: 25 },
      { header: 'DÉBUT', key: 'start', width: 20 },
      { header: 'FIN', key: 'end', width: 20 },
      { header: 'DURÉE', key: 'duration', width: 15 },
      { header: 'TYPE', key: 'type', width: 15 },
      { header: 'STATUT', key: 'status', width: 15 },
      { header: 'NOTES', key: 'notes', width: 30 }
    ];
    
    const headerRow = detailSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D9E1F2' }
    };
    
    const startDate = new Date(date + 'T00:00:00');
    const endDate = new Date(date + 'T23:59:59');
    
    // Récupérer tous les pointages du jour
    const allTimelogs = await TimeLog.find({
      userId: { $in: employees.map(e => e._id) },
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('userId', 'fullName').sort({ createdAt: 1 });
    
    allTimelogs.forEach(timelog => {
      const duration = timelog.endTime ? 
        (new Date(timelog.endTime) - new Date(timelog.startTime)) / (1000 * 60) : 
        (new Date() - new Date(timelog.startTime)) / (1000 * 60);
      
      detailSheet.addRow({
        employee: timelog.userId.fullName,
        start: this.formatDateTime(timelog.startTime),
        end: timelog.endTime ? this.formatDateTime(timelog.endTime) : 'EN COURS',
        duration: this.formatDuration(duration),
        type: timelog.type || 'Standard',
        status: timelog.status === 'active' ? 'EN COURS' : 'TERMINÉ',
        notes: timelog.notes || ''
      });
    });
  }
  
  /**
   * Récupère les destinataires des rapports
   */
  async getReportRecipients() {
    const recipients = await User.find({ 
      role: { $in: ['admin', 'direction'] },
      email: { $exists: true, $ne: '' }
    }).select('email fullName role');
    
    return recipients.map(r => r.email);
  }
  
  /**
   * Envoie un rapport par email
   */
  async sendReportEmail(recipients, subject, htmlMessage, filePath, fileName) {
    try {
      const fs = require('fs');
      
      // Lire le fichier
      const fileBuffer = fs.readFileSync(filePath);
      
      // Envoyer l'email avec pièce jointe
      const nodemailer = require('nodemailer');
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"YSG RH" <rh@yourservices-group.com>',
        to: recipients.join(','),
        subject: subject,
        html: htmlMessage,
        attachments: [
          {
            filename: fileName,
            content: fileBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        ]
      };
      
      const result = await emailService.transporter.sendMail(mailOptions);
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du rapport:', error);
      throw error;
    } finally {
      // Nettoyer le fichier temporaire
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('⚠️ Erreur lors du nettoyage:', cleanupError.message);
      }
    }
  }
  
  /**
   * Formate une durée en minutes vers HH:MM
   */
  formatDuration(minutes) {
    if (!minutes || minutes === 0) return '0h00';
    
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.round(Math.abs(minutes) % 60);
    
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  }
  
  /**
   * Formate une heure
   */
  formatTime(date) {
    return moment(date).format('HH:mm');
  }
  
  /**
   * Formate une date et heure complète
   */
  formatDateTime(date) {
    return moment(date).format('DD/MM/YYYY HH:mm:ss');
  }
  
  /**
   * Traduit les rôles
   */
  translateRole(role) {
    const roleMap = {
      'driver': 'Chauffeur',
      'preparator': 'Préparateur', 
      'team-leader': 'Chef d\'équipe',
      'admin': 'Administrateur',
      'direction': 'Direction'
    };
    return roleMap[role] || role;
  }
  
  /**
   * Génère et envoie le rapport quotidien amélioré
   */
  async generateAndSendDailyReport() {
    try {
      console.log('📊 Génération du rapport quotidien amélioré...');
      
      const yesterday = moment().subtract(1, 'day');
      const dateStr = yesterday.format('YYYY-MM-DD');
      const reportDate = yesterday.format('DD/MM/YYYY');
      
      // Récupérer les destinataires
      const recipients = await this.getReportRecipients();
      
      if (recipients.length === 0) {
        console.log('⚠️ Aucun destinataire trouvé');
        return;
      }
      
      // Générer le rapport Excel amélioré
      const reportPath = await this.generateDailyReport(dateStr, reportDate);
      
      // Préparer le message email
      const subject = `📊 Rapport RH quotidien - ${reportDate}`;
      const htmlMessage = this.generateEmailTemplate(reportDate);
      
      // Envoyer le rapport
      await this.sendReportEmail(
        recipients,
        subject,
        htmlMessage,
        reportPath,
        `rapport_rh_quotidien_${dateStr}.xlsx`
      );
      
      console.log('✅ Rapport RH quotidien envoyé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la génération du rapport RH:', error);
      throw error;
    }
  }
  
  /**
   * Génère le template email pour les RH
   */
  generateEmailTemplate(reportDate) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Rapport RH Quotidien</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Date: ${reportDate}</p>
        </div>
        
        <div style="background: white; padding: 25px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0;">Bonjour,</p>
          
          <p>Veuillez trouver ci-joint le <strong>rapport RH quotidien détaillé</strong> des pointages de tous vos employés.</p>
          
          <div style="background: #f8f9ff; padding: 20px; border-left: 4px solid #4f46e5; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h3 style="margin-top: 0; color: #4f46e5;">🎯 Contenu du rapport :</h3>
            <ul style="margin-bottom: 0; padding-left: 20px;">
              <li><strong>Rapport principal</strong> : Vue d'ensemble avec heures de travail, pauses, et observations</li>
              <li><strong>Statistiques</strong> : Taux de présence par poste et heures totales</li>
              <li><strong>Détail des pointages</strong> : Historique complet de tous les pointages</li>
            </ul>
          </div>
          
          <div style="background: #fff7ed; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h4 style="margin-top: 0; color: #ea580c;">📋 Nouvelles informations RH :</h4>
            <ul style="margin-bottom: 0; padding-left: 20px; font-size: 14px;">
              <li><strong>Temps effectif de travail</strong> (hors pauses)</li>
              <li><strong>Durée des pauses</strong> automatiquement calculée</li>
              <li><strong>Observations</strong> : journées longues, pauses manquantes, déconnexions automatiques</li>
              <li><strong>Statut en temps réel</strong> : qui est encore en service</li>
            </ul>
          </div>
          
          <div style="background: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #166534;"><strong>✨ Améliorations :</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #166534;">
              Le système détecte maintenant automatiquement les employés qui oublient de pointer leur fin de service 
              et les déconnecte 15 minutes après leur dernière activité.
            </p>
          </div>
          
          <p>Pour toute question concernant ce rapport, n'hésitez pas à nous contacter.</p>
          
          <p style="margin-bottom: 0;">
            Cordialement,<br>
            <strong>L'équipe Your Services Group</strong>
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
          <p style="margin: 0">Rapport généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
          <p style="margin: 5px 0 0 0;">Ce message est automatique, merci de ne pas y répondre directement.</p>
        </div>
      </div>
    `;
  }
  
  /**
   * Génère et envoie le rapport hebdomadaire
   */
  async generateAndSendWeeklyReport() {
    try {
      console.log('📈 Génération du rapport hebdomadaire...');
      
      const lastWeek = moment().subtract(1, 'week');
      const startOfWeek = lastWeek.clone().startOf('isoWeek');
      const endOfWeek = lastWeek.clone().endOf('isoWeek');
      
      const reportDate = `${startOfWeek.format('DD/MM')} au ${endOfWeek.format('DD/MM/YYYY')}`;
      
      // Récupérer les destinataires
      const recipients = await this.getReportRecipients();
      
      if (recipients.length === 0) {
        console.log('⚠️ Aucun destinataire trouvé');
        return;
      }
      
      // Générer le rapport hebdomadaire
      const reportPath = await this.generateWeeklyReport(startOfWeek, endOfWeek);
      
      // Préparer le message email
      const subject = `📈 Rapport RH hebdomadaire - Semaine du ${reportDate}`;
      const htmlMessage = this.generateWeeklyEmailTemplate(reportDate);
      
      // Envoyer le rapport
      await this.sendReportEmail(
        recipients,
        subject,
        htmlMessage,
        reportPath,
        `rapport_rh_hebdomadaire_${startOfWeek.format('YYYY-MM-DD')}.xlsx`
      );
      
      console.log('✅ Rapport RH hebdomadaire envoyé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la génération du rapport hebdomadaire:', error);
      throw error;
    }
  }
  
  /**
   * Génère le rapport hebdomadaire
   */
  async generateWeeklyReport(startOfWeek, endOfWeek) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système YSG - Rapport RH Hebdomadaire';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Rapport hebdomadaire');
    
    // Configuration des colonnes
    worksheet.columns = [
      { header: 'EMPLOYÉ', key: 'fullName', width: 25 },
      { header: 'POSTE', key: 'role', width: 15 },
      { header: 'LUNDI', key: 'monday', width: 12 },
      { header: 'MARDI', key: 'tuesday', width: 12 },
      { header: 'MERCREDI', key: 'wednesday', width: 12 },
      { header: 'JEUDI', key: 'thursday', width: 12 },
      { header: 'VENDREDI', key: 'friday', width: 12 },
      { header: 'SAMEDI', key: 'saturday', width: 12 },
      { header: 'DIMANCHE', key: 'sunday', width: 12 },
      { header: 'TOTAL HEURES', key: 'totalHours', width: 15 },
      { header: 'JOURS TRAVAILLÉS', key: 'daysWorked', width: 18 }
    ];
    
    // Titre
    worksheet.insertRow(1, [`RAPPORT HEBDOMADAIRE - ${startOfWeek.format('DD/MM')} au ${endOfWeek.format('DD/MM/YYYY')}`]);
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1F4E79' }
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Style des en-têtes
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2F5496' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Récupérer les employés et leurs données
    const employees = await User.find({ 
      role: { $in: ['driver', 'preparator', 'team-leader'] } 
    }).sort({ role: 1, fullName: 1 });
    
    for (const employee of employees) {
      const weekData = await this.getEmployeeWeekData(employee, startOfWeek, endOfWeek);
      worksheet.addRow(weekData);
    }
    
    // Enregistrer le fichier
    const filePath = path.join(this.tempDir, `rapport_hebdomadaire_${startOfWeek.format('YYYY-MM-DD')}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  }
  
  /**
   * Récupère les données d'un employé pour une semaine
   */
  async getEmployeeWeekData(employee, startOfWeek, endOfWeek) {
    const weekData = {
      fullName: employee.fullName,
      role: this.translateRole(employee.role),
      monday: '0h00',
      tuesday: '0h00',
      wednesday: '0h00',
      thursday: '0h00',
      friday: '0h00',
      saturday: '0h00',
      sunday: '0h00',
      totalHours: '0h00',
      daysWorked: 0
    };
    
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let totalMinutes = 0;
    let daysWorked = 0;
    
    for (let i = 0; i < 7; i++) {
      const currentDay = startOfWeek.clone().add(i, 'days');
      const startDate = currentDay.clone().startOf('day').toDate();
      const endDate = currentDay.clone().endOf('day').toDate();
      
      const timelogs = await TimeLog.find({
        userId: employee._id,
        createdAt: { $gte: startDate, $lte: endDate }
      });
      
      let dayMinutes = 0;
      
      for (const timelog of timelogs) {
        if (timelog.status === 'completed' && timelog.endTime) {
          dayMinutes += (new Date(timelog.endTime) - new Date(timelog.startTime)) / (1000 * 60);
        } else if (timelog.status === 'active') {
          dayMinutes += (new Date() - new Date(timelog.startTime)) / (1000 * 60);
        }
      }
      
      if (dayMinutes > 0) {
        weekData[dayNames[i]] = this.formatDuration(dayMinutes);
        totalMinutes += dayMinutes;
        daysWorked++;
      }
    }
    
    weekData.totalHours = this.formatDuration(totalMinutes);
    weekData.daysWorked = daysWorked;
    
    return weekData;
  }
  
  /**
   * Template email hebdomadaire
   */
  generateWeeklyEmailTemplate(reportDate) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📈 Rapport RH Hebdomadaire</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Semaine du ${reportDate}</p>
        </div>
        
        <div style="background: white; padding: 25px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0;">Bonjour,</p>
          
          <p>Veuillez trouver en pièce jointe le <strong>rapport hebdomadaire</strong> des temps de travail de tous vos employés.</p>
          
          <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h4 style="margin-top: 0; color: #1e40af;">📋 Contenu du rapport :</h4>
            <ul style="margin-bottom: 0; padding-left: 20px; font-size: 14px;">
              <li>Heures travaillées jour par jour</li>
              <li>Total des heures pour la semaine</li>
              <li>Nombre de jours travaillés</li>
              <li>Vue d'ensemble par employé et par poste</li>
            </ul>
          </div>
          
          <p>Ce rapport vous permet de suivre l'assiduité et les heures de travail de vos équipes sur une base hebdomadaire.</p>
          
          <p style="margin-bottom: 0;">
            Cordialement,<br>
            <strong>L'équipe Your Services Group</strong>
          </p>
        </div>
      </div>
    `;
  }
  
  /**
   * Génère et envoie le rapport mensuel
   */
  async generateAndSendMonthlyReport() {
    try {
      console.log('📅 Génération du rapport mensuel...');
      
      const lastMonth = moment().subtract(1, 'month');
      const startOfMonth = lastMonth.clone().startOf('month');
      const endOfMonth = lastMonth.clone().endOf('month');
      
      const reportDate = lastMonth.format('MMMM YYYY');
      
      // Récupérer les destinataires
      const recipients = await this.getReportRecipients();
      
      if (recipients.length === 0) {
        console.log('⚠️ Aucun destinataire trouvé');
        return;
      }
      
      // Générer le rapport mensuel (similaire à l'hebdomadaire mais avec plus de détails)
      const reportPath = await this.generateMonthlyReport(startOfMonth, endOfMonth);
      
      // Préparer le message email
      const subject = `📅 Rapport RH mensuel - ${reportDate}`;
      const htmlMessage = this.generateMonthlyEmailTemplate(reportDate);
      
      // Envoyer le rapport
      await this.sendReportEmail(
        recipients,
        subject,
        htmlMessage,
        reportPath,
        `rapport_rh_mensuel_${startOfMonth.format('YYYY-MM')}.xlsx`
      );
      
      console.log('✅ Rapport RH mensuel envoyé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la génération du rapport mensuel:', error);
      throw error;
    }
  }
  
  /**
   * Génère le rapport mensuel
   */
  async generateMonthlyReport(startOfMonth, endOfMonth) {
    // Implémentation similaire au rapport hebdomadaire mais pour un mois
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système YSG - Rapport RH Mensuel';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Rapport mensuel');
    
    // Configuration simplifiée pour le rapport mensuel
    worksheet.columns = [
      { header: 'EMPLOYÉ', key: 'fullName', width: 25 },
      { header: 'POSTE', key: 'role', width: 15 },
      { header: 'JOURS TRAVAILLÉS', key: 'daysWorked', width: 18 },
      { header: 'HEURES TOTALES', key: 'totalHours', width: 18 },
      { header: 'MOYENNE/JOUR', key: 'averagePerDay', width: 18 },
      { header: 'TAUX PRÉSENCE', key: 'attendanceRate', width: 18 }
    ];
    
    // Titre
    worksheet.insertRow(1, [`RAPPORT MENSUEL - ${startOfMonth.format('MMMM YYYY')}`]);
    worksheet.mergeCells('A1:F1');
    
    // Récupérer et traiter les données mensuelles
    const employees = await User.find({ 
      role: { $in: ['driver', 'preparator', 'team-leader'] } 
    }).sort({ role: 1, fullName: 1 });
    
    const workingDaysInMonth = this.getWorkingDaysInMonth(startOfMonth, endOfMonth);
    
    for (const employee of employees) {
      const monthData = await this.getEmployeeMonthData(employee, startOfMonth, endOfMonth, workingDaysInMonth);
      worksheet.addRow(monthData);
    }
    
    // Enregistrer le fichier
    const filePath = path.join(this.tempDir, `rapport_mensuel_${startOfMonth.format('YYYY-MM')}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  }
  
  /**
   * Calcule le nombre de jours ouvrables dans un mois
   */
  getWorkingDaysInMonth(startOfMonth, endOfMonth) {
    let workingDays = 0;
    const current = startOfMonth.clone();
    
    while (current.isSameOrBefore(endOfMonth)) {
      // Exclure samedi (6) et dimanche (0), mais inclure samedi dans notre cas
      if (current.day() !== 0) { // Exclure seulement dimanche
        workingDays++;
      }
      current.add(1, 'day');
    }
    
    return workingDays;
  }
  
  /**
   * Récupère les données mensuelles d'un employé
   */
  async getEmployeeMonthData(employee, startOfMonth, endOfMonth, workingDaysInMonth) {
    const timelogs = await TimeLog.find({
      userId: employee._id,
      createdAt: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() }
    });
    
    let totalMinutes = 0;
    const workedDays = new Set();
    
    for (const timelog of timelogs) {
      const logDate = moment(timelog.startTime).format('YYYY-MM-DD');
      workedDays.add(logDate);
      
      if (timelog.status === 'completed' && timelog.endTime) {
        totalMinutes += (new Date(timelog.endTime) - new Date(timelog.startTime)) / (1000 * 60);
      } else if (timelog.status === 'active') {
        totalMinutes += (new Date() - new Date(timelog.startTime)) / (1000 * 60);
      }
    }
    
    const daysWorked = workedDays.size;
    const averageMinutesPerDay = daysWorked > 0 ? totalMinutes / daysWorked : 0;
    const attendanceRate = Math.round((daysWorked / workingDaysInMonth) * 100);
    
    return {
      fullName: employee.fullName,
      role: this.translateRole(employee.role),
      daysWorked: daysWorked,
      totalHours: this.formatDuration(totalMinutes),
      averagePerDay: this.formatDuration(averageMinutesPerDay),
      attendanceRate: `${attendanceRate}%`
    };
  }
  
  /**
   * Template email mensuel
   */
  generateMonthlyEmailTemplate(reportDate) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #1f2937; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📅 Rapport RH Mensuel</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.8;">${reportDate}</p>
        </div>
        
        <div style="background: white; padding: 25px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0;">Bonjour,</p>
          
          <p>Veuillez trouver en pièce jointe le <strong>rapport mensuel</strong> complet des temps de travail et de l'assiduité de vos employés.</p>
          
          <div style="background: #ecfdf5; padding: 15px; border-left: 4px solid #22c55e; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h4 style="margin-top: 0; color: #166534;">📋 Indicateurs mensuels :</h4>
            <ul style="margin-bottom: 0; padding-left: 20px; font-size: 14px;">
              <li>Nombre total de jours travaillés</li>
              <li>Heures totales et moyenne par jour</li>
              <li>Taux de présence (% de jours ouvrés)</li>
              <li>Vue comparative par poste</li>
            </ul>
          </div>
          
          <p>Ce rapport mensuel vous donne une vision complète des performances de vos équipes sur la période.</p>
          
          <p style="margin-bottom: 0;">
            Cordialement,<br>
            <strong>L'équipe Your Services Group</strong>
          </p>
        </div>
      </div>
    `;
  }
  
  /**
   * Nettoie les anciens rapports (plus de 30 jours)
   */
  cleanupOldReports() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
      
      let deletedCount = 0;
      
      files.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtime.getTime();
        
        if (fileAge > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });
      
      console.log(`🧹 Nettoyage terminé: ${deletedCount} fichier(s) supprimé(s)`);
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }
  }
}

module.exports = new ReportAutomationService();