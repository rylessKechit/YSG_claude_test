// server/services/reportAutomation.service.js
const User = require('../models/user.model');
const TimeLog = require('../models/timelog.model');
const Preparation = require('../models/preparation.model');
const Movement = require('../models/movement.model');
const Agency = require('../models/agency.model');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const emailService = require('./email.service');
const moment = require('moment');

/**
 * Service de génération et envoi automatique de rapports périodiques
 * Génère des rapports quotidiens, hebdomadaires et mensuels pour les administrateurs et la direction
 */
class ReportAutomationService {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp/reports');
    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Génère et envoie un rapport quotidien
   */
  async generateAndSendDailyReport() {
    try {
      console.log('🔄 Génération du rapport quotidien...');
      const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
      const reportDate = moment().subtract(1, 'day').format('DD/MM/YYYY');
      
      // Récupérer les administrateurs et la direction (destinataires)
      const recipients = await this.getReportRecipients();
      
      if (recipients.length === 0) {
        console.log('⚠️ Aucun destinataire trouvé pour le rapport quotidien');
        return;
      }

      // Générer le rapport Excel
      const reportPath = await this.generateDailyReport(yesterday, reportDate);
      
      // Envoyer le rapport par email
      await this.sendReportEmail(
        recipients, 
        `Rapport quotidien des pointages du ${reportDate}`,
        `Veuillez trouver ci-joint le rapport quotidien des pointages de tous les employés pour la journée du ${reportDate}.`,
        reportPath,
        `rapport_quotidien_${yesterday}.xlsx`
      );
      
      console.log('✅ Rapport quotidien généré et envoyé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la génération du rapport quotidien:', error);
    }
  }

  /**
   * Génère et envoie un rapport hebdomadaire
   */
  async generateAndSendWeeklyReport() {
    try {
      console.log('🔄 Génération du rapport hebdomadaire...');
      
      // Date de début et de fin de la semaine précédente (du lundi au dimanche)
      const endOfLastWeek = moment().startOf('week').subtract(1, 'day');
      const startOfLastWeek = moment(endOfLastWeek).startOf('week');
      
      const startDate = startOfLastWeek.format('YYYY-MM-DD');
      const endDate = endOfLastWeek.format('YYYY-MM-DD');
      const reportPeriod = `${startOfLastWeek.format('DD/MM/YYYY')} au ${endOfLastWeek.format('DD/MM/YYYY')}`;
      
      // Récupérer les administrateurs et la direction (destinataires)
      const recipients = await this.getReportRecipients();
      
      if (recipients.length === 0) {
        console.log('⚠️ Aucun destinataire trouvé pour le rapport hebdomadaire');
        return;
      }

      // Générer le rapport Excel
      const reportPath = await this.generateWeeklyReport(startDate, endDate, reportPeriod);
      
      // Envoyer le rapport par email
      await this.sendReportEmail(
        recipients, 
        `Rapport hebdomadaire des pointages - Semaine du ${reportPeriod}`,
        `Veuillez trouver ci-joint le rapport hebdomadaire des pointages de tous les employés pour la semaine du ${reportPeriod}.`,
        reportPath,
        `rapport_hebdomadaire_${startDate}_${endDate}.xlsx`
      );
      
      console.log('✅ Rapport hebdomadaire généré et envoyé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la génération du rapport hebdomadaire:', error);
    }
  }

  /**
   * Génère et envoie un rapport mensuel
   */
  async generateAndSendMonthlyReport() {
    try {
      console.log('🔄 Génération du rapport mensuel...');
      
      // Date de début et de fin du mois précédent
      const lastMonth = moment().subtract(1, 'month');
      const startOfLastMonth = moment(lastMonth).startOf('month').format('YYYY-MM-DD');
      const endOfLastMonth = moment(lastMonth).endOf('month').format('YYYY-MM-DD');
      
      const monthName = lastMonth.format('MMMM YYYY');
      
      // Récupérer les administrateurs et la direction (destinataires)
      const recipients = await this.getReportRecipients();
      
      if (recipients.length === 0) {
        console.log('⚠️ Aucun destinataire trouvé pour le rapport mensuel');
        return;
      }

      // Générer le rapport Excel
      const reportPath = await this.generateMonthlyReport(startOfLastMonth, endOfLastMonth, monthName);
      
      // Envoyer le rapport par email
      await this.sendReportEmail(
        recipients, 
        `Rapport mensuel des pointages - ${monthName}`,
        `Veuillez trouver ci-joint le rapport mensuel des pointages de tous les employés pour ${monthName}.`,
        reportPath,
        `rapport_mensuel_${lastMonth.format('YYYY-MM')}.xlsx`
      );
      
      console.log('✅ Rapport mensuel généré et envoyé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la génération du rapport mensuel:', error);
    }
  }

  /**
   * Récupère la liste des destinataires des rapports (admin et direction)
   * @returns {Promise<Array>} Liste des emails des destinataires
   */
  async getReportRecipients() {
    try {
      const admins = await User.find({ role: { $in: ['admin', 'direction'] } })
        .select('email fullName role');
      
      return admins.filter(admin => admin.email).map(admin => ({
        email: admin.email,
        name: admin.fullName,
        role: admin.role
      }));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des destinataires:', error);
      return [];
    }
  }

  /**
   * Génère un rapport Excel quotidien des pointages
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {string} reportDate - Date formatée pour affichage
   * @returns {Promise<string>} Chemin du fichier Excel généré
   */
  async generateDailyReport(date, reportDate) {
    // Créer un nouveau classeur Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système de Gestion YSG';
    workbook.created = new Date();
    
    // Récupérer tous les employés actifs (chauffeurs, préparateurs, team-leaders)
    const employees = await User.find({ 
      role: { $in: ['driver', 'preparator', 'team-leader'] } 
    });
    
    // Créer une feuille pour le résumé général
    const summarySheet = workbook.addWorksheet('Résumé général');
    this.setupSummarySheet(summarySheet, `Rapport quotidien du ${reportDate}`);
    
    // Créer une feuille pour les pointages détaillés
    const timelogsSheet = workbook.addWorksheet('Détail des pointages');
    await this.setupTimelogsSheet(timelogsSheet, date, date);
    
    // Créer une feuille spéciale pour les préparateurs avec les agences
    const preparatorsSheet = workbook.addWorksheet('Préparateurs - Agences');
    await this.setupPreparatorsAgenciesSheet(preparatorsSheet, date);
    
    // Générer le résumé pour chaque employé
    const dailyData = await this.generateDailySummary(date, employees);
    this.fillSummarySheet(summarySheet, dailyData);
    
    // Enregistrer le fichier Excel
    const filePath = path.join(this.tempDir, `rapport_quotidien_${date}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  }

  /**
   * Génère un rapport Excel hebdomadaire des pointages
   * @param {string} startDate - Date de début au format YYYY-MM-DD
   * @param {string} endDate - Date de fin au format YYYY-MM-DD
   * @param {string} reportPeriod - Période formatée pour affichage
   * @returns {Promise<string>} Chemin du fichier Excel généré
   */
  async generateWeeklyReport(startDate, endDate, reportPeriod) {
    // Créer un nouveau classeur Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système de Gestion YSG';
    workbook.created = new Date();
    
    // Récupérer tous les employés actifs (chauffeurs, préparateurs, team-leaders)
    const employees = await User.find({ 
      role: { $in: ['driver', 'preparator', 'team-leader'] } 
    });
    
    // Créer une feuille pour le résumé général
    const summarySheet = workbook.addWorksheet('Résumé hebdomadaire');
    this.setupSummarySheet(summarySheet, `Rapport hebdomadaire du ${reportPeriod}`);
    
    // Créer une feuille pour les pointages détaillés
    const timelogsSheet = workbook.addWorksheet('Détail des pointages');
    await this.setupTimelogsSheet(timelogsSheet, startDate, endDate);
    
    // Créer une feuille spéciale pour les préparateurs avec les agences
    const preparatorsSheet = workbook.addWorksheet('Préparateurs - Agences');
    await this.setupPreparatorsAgenciesSheet(preparatorsSheet, startDate, endDate);
    
    // Créer une feuille par jour de la semaine
    const currentDate = moment(startDate);
    const endMoment = moment(endDate);
    
    while (currentDate.isSameOrBefore(endMoment)) {
      const dayDate = currentDate.format('YYYY-MM-DD');
      const dayName = currentDate.format('dddd DD/MM/YYYY');
      
      const daySheet = workbook.addWorksheet(dayName);
      const dailyData = await this.generateDailySummary(dayDate, employees);
      
      this.setupDailySheet(daySheet, `Pointages du ${dayName}`);
      this.fillSummarySheet(daySheet, dailyData);
      
      currentDate.add(1, 'day');
    }
    
    // Générer le résumé hebdomadaire
    const weeklyData = await this.generateWeeklySummary(startDate, endDate, employees);
    this.fillSummarySheet(summarySheet, weeklyData);
    
    // Enregistrer le fichier Excel
    const filePath = path.join(this.tempDir, `rapport_hebdomadaire_${startDate}_${endDate}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  }

  /**
   * Génère un rapport Excel mensuel des pointages
   * @param {string} startDate - Date de début au format YYYY-MM-DD
   * @param {string} endDate - Date de fin au format YYYY-MM-DD
   * @param {string} monthName - Nom du mois formaté pour affichage
   * @returns {Promise<string>} Chemin du fichier Excel généré
   */
  async generateMonthlyReport(startDate, endDate, monthName) {
    // Créer un nouveau classeur Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système de Gestion YSG';
    workbook.created = new Date();
    
    // Récupérer tous les employés actifs (chauffeurs, préparateurs, team-leaders)
    const employees = await User.find({ 
      role: { $in: ['driver', 'preparator', 'team-leader'] } 
    });
    
    // Créer une feuille pour le résumé général
    const summarySheet = workbook.addWorksheet('Résumé mensuel');
    this.setupSummarySheet(summarySheet, `Rapport mensuel de ${monthName}`);
    
    // Créer une feuille pour les pointages détaillés
    const timelogsSheet = workbook.addWorksheet('Détail des pointages');
    await this.setupTimelogsSheet(timelogsSheet, startDate, endDate);
    
    // Créer une feuille spéciale pour les préparateurs avec les agences
    const preparatorsSheet = workbook.addWorksheet('Préparateurs - Agences');
    await this.setupPreparatorsAgenciesSheet(preparatorsSheet, startDate, endDate);
    
    // Créer une feuille par semaine du mois
    const currentDate = moment(startDate).startOf('week');
    const endMoment = moment(endDate);
    
    let weekNumber = 1;
    
    while (currentDate.isSameOrBefore(endMoment)) {
      const weekStartDate = moment(currentDate).format('YYYY-MM-DD');
      const weekEndDate = moment(currentDate).add(6, 'days').format('YYYY-MM-DD');
      
      // Ne pas dépasser la fin du mois
      const adjustedEndDate = moment(weekEndDate).isAfter(endMoment) 
        ? endMoment.format('YYYY-MM-DD') 
        : weekEndDate;
      
      const weekSheet = workbook.addWorksheet(`Semaine ${weekNumber}`);
      const weekData = await this.generateWeeklySummary(
        weekStartDate, 
        adjustedEndDate, 
        employees
      );
      
      this.setupDailySheet(
        weekSheet,
        `Semaine ${weekNumber} - du ${moment(weekStartDate).format('DD/MM/YYYY')} au ${moment(adjustedEndDate).format('DD/MM/YYYY')}`
      );
      this.fillSummarySheet(weekSheet, weekData);
      
      currentDate.add(7, 'days');
      weekNumber++;
    }
    
    // Générer le résumé mensuel
    const monthlyData = await this.generateMonthlySummary(startDate, endDate, employees);
    this.fillSummarySheet(summarySheet, monthlyData);
    
    // Enregistrer le fichier Excel
    const filePath = path.join(this.tempDir, `rapport_mensuel_${monthName.replace(' ', '_')}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  }

  /**
   * Configure une feuille de résumé 
   * @param {Object} sheet - Feuille Excel
   * @param {string} title - Titre du rapport
   */
  setupSummarySheet(sheet, title) {
    // Définir les colonnes
    sheet.columns = [
      { header: 'Employé', key: 'fullName', width: 30 },
      { header: 'Rôle', key: 'role', width: 15 },
      { header: 'Heures travaillées', key: 'totalHours', width: 18 },
      { header: 'Nombre de pointages', key: 'totalTimelogs', width: 18 },
      { header: 'Heure moyenne de début', key: 'avgStartTime', width: 22 },
      { header: 'Heure moyenne de fin', key: 'avgEndTime', width: 22 },
      { header: 'Statut', key: 'status', width: 15 }
    ];
    
    // Ajouter un titre
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };
    
    // Styliser les en-têtes
    sheet.getRow(2).font = { bold: true };
    sheet.getRow(2).alignment = { horizontal: 'center' };
    
    // Ajouter une rangée pour l'espacement
    sheet.addRow([]);
  }

  /**
   * Configure une feuille journalière
   * @param {Object} sheet - Feuille Excel
   * @param {string} title - Titre du jour
   */
  setupDailySheet(sheet, title) {
    // Définir les colonnes (identiques à la feuille de résumé)
    sheet.columns = [
      { header: 'Employé', key: 'fullName', width: 30 },
      { header: 'Rôle', key: 'role', width: 15 },
      { header: 'Heures travaillées', key: 'totalHours', width: 18 },
      { header: 'Nombre de pointages', key: 'totalTimelogs', width: 18 },
      { header: 'Heure moyenne de début', key: 'avgStartTime', width: 22 },
      { header: 'Heure moyenne de fin', key: 'avgEndTime', width: 22 },
      { header: 'Statut', key: 'status', width: 15 }
    ];
    
    // Ajouter un titre
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };
    
    // Styliser les en-têtes
    sheet.getRow(2).font = { bold: true };
    sheet.getRow(2).alignment = { horizontal: 'center' };
    
    // Ajouter une rangée pour l'espacement
    sheet.addRow([]);
  }

  /**
   * Prépare la feuille des pointages détaillés
   * @param {Object} sheet - Feuille Excel
   * @param {string} startDate - Date de début
   * @param {string} endDate - Date de fin
   */
  async setupTimelogsSheet(sheet, startDate, endDate) {
    // Définir les colonnes
    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Employé', key: 'fullName', width: 30 },
      { header: 'Rôle', key: 'role', width: 15 },
      { header: 'Début', key: 'startTime', width: 20 },
      { header: 'Fin', key: 'endTime', width: 20 },
      { header: 'Durée (h)', key: 'duration', width: 15 },
      { header: 'Lieu de début', key: 'startLocation', width: 30 },
      { header: 'Lieu de fin', key: 'endLocation', width: 30 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];
    
    // Récupérer tous les pointages pour la période
    const timelogs = await TimeLog.find({
      $or: [
        // Pointages commencés dans la période
        { startTime: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') } },
        // Pointages terminés dans la période
        { endTime: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') } }
      ]
    }).populate('userId', 'fullName role');
    
    // Trier par date
    timelogs.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
    // Ajouter les données
    for (const timelog of timelogs) {
      // Calculer la durée en heures
      let duration = '';
      if (timelog.status === 'completed' && timelog.endTime) {
        const start = new Date(timelog.startTime);
        const end = new Date(timelog.endTime);
        // Arrondir à 2 décimales
        duration = Math.round((end - start) / 36000) / 100;
      }
      
      const row = {
        date: moment(timelog.startTime).format('DD/MM/YYYY'),
        fullName: timelog.userId ? timelog.userId.fullName : 'Inconnu',
        role: timelog.userId ? this.translateRole(timelog.userId.role) : 'Inconnu',
        startTime: moment(timelog.startTime).format('DD/MM/YYYY HH:mm:ss'),
        endTime: timelog.endTime ? moment(timelog.endTime).format('DD/MM/YYYY HH:mm:ss') : 'En cours',
        duration: duration,
        startLocation: timelog.location && timelog.location.startLocation ? 
          timelog.location.startLocation.name : 'Non spécifié',
        endLocation: timelog.location && timelog.location.endLocation ? 
          timelog.location.endLocation.name : 'Non spécifié',
        notes: timelog.notes || ''
      };
      
      sheet.addRow(row);
    }
    
    // Styliser les en-têtes
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: 'center' };
  }

  /**
   * Prépare la feuille spéciale pour les préparateurs avec les agences
   * @param {Object} sheet - Feuille Excel
   * @param {string} startDate - Date de début
   * @param {string} endDate - Date de fin (optionnel pour rapport quotidien)
   */
  async setupPreparatorsAgenciesSheet(sheet, startDate, endDate = null) {
    // Si pas de date de fin, utiliser la date de début
    if (!endDate) endDate = startDate;
    
    // Définir les colonnes
    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Préparateur', key: 'fullName', width: 30 },
      { header: 'Début', key: 'startTime', width: 20 },
      { header: 'Fin', key: 'endTime', width: 20 },
      { header: 'Durée (h)', key: 'duration', width: 15 },
      { header: 'Agence', key: 'agency', width: 30 },
      { header: 'Plaques traitées', key: 'licensePlates', width: 30 },
      { header: 'Nombre de véhicules', key: 'vehicleCount', width: 20 }
    ];
    
    // Récupérer tous les préparateurs
    const preparators = await User.find({ role: 'preparator' });
    
    // Pour chaque préparateur, récupérer les préparations effectuées
    for (const preparator of preparators) {
      // Récupérer les préparations pour la période
      const preparations = await Preparation.find({
        userId: preparator._id,
        $or: [
          // Préparations commencées dans la période
          { startTime: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') } },
          // Préparations terminées dans la période
          { endTime: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') } }
        ]
      });
      
      // Regrouper les préparations par jour et par agence
      const prepsByDayAndAgency = {};
      
      preparations.forEach(prep => {
        const date = moment(prep.startTime || prep.createdAt).format('YYYY-MM-DD');
        const agency = prep.agency || 'Non spécifiée';
        
        if (!prepsByDayAndAgency[date]) {
          prepsByDayAndAgency[date] = {};
        }
        
        if (!prepsByDayAndAgency[date][agency]) {
          prepsByDayAndAgency[date][agency] = {
            preparations: [],
            totalDuration: 0
          };
        }
        
        prepsByDayAndAgency[date][agency].preparations.push(prep);
        
        // Calculer la durée si la préparation est terminée
        if (prep.status === 'completed' && prep.startTime && prep.endTime) {
          const start = new Date(prep.startTime);
          const end = new Date(prep.endTime);
          const durationHours = (end - start) / (1000 * 60 * 60);
          prepsByDayAndAgency[date][agency].totalDuration += durationHours;
        }
      });
      
      // Récupérer les pointages pour identifier les heures de travail
      const timelogs = await TimeLog.find({
        userId: preparator._id,
        $or: [
          { startTime: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') } },
          { endTime: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') } }
        ]
      });
      
      // Regrouper les pointages par jour
      const timelogsByDay = {};
      
      timelogs.forEach(timelog => {
        const date = moment(timelog.startTime).format('YYYY-MM-DD');
        
        if (!timelogsByDay[date]) {
          timelogsByDay[date] = [];
        }
        
        timelogsByDay[date].push(timelog);
      });
      
      // Ajouter une ligne pour chaque jour et agence
      for (const date in prepsByDayAndAgency) {
        for (const agency in prepsByDayAndAgency[date]) {
          const agencyData = prepsByDayAndAgency[date][agency];
          const dayTimelogs = timelogsByDay[date] || [];
          
          // Calculer les heures de début et de fin pour ce jour
          let startTime = null;
          let endTime = null;
          let duration = 0;
          
          if (dayTimelogs.length > 0) {
            // Trier par heure de début
            dayTimelogs.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            
            // Premier pointage = début, dernier pointage terminé = fin
            startTime = new Date(dayTimelogs[0].startTime);
            
            const completedLogs = dayTimelogs.filter(log => log.status === 'completed');
            if (completedLogs.length > 0) {
              // Trier par heure de fin
              completedLogs.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
              endTime = new Date(completedLogs[0].endTime);
              
              // Calculer la durée totale des pointages
              dayTimelogs.forEach(log => {
                if (log.status === 'completed' && log.endTime) {
                  const start = new Date(log.startTime);
                  const end = new Date(log.endTime);
                  duration += (end - start) / (1000 * 60 * 60);
                }
              });
            }
          }
          
          // Liste des plaques d'immatriculation
          const licensePlates = agencyData.preparations
            .map(prep => prep.licensePlate)
            .filter((plate, index, self) => self.indexOf(plate) === index)
            .join(', ');
          
          // Ajouter la ligne
          sheet.addRow({
            date: moment(date).format('DD/MM/YYYY'),
            fullName: preparator.fullName,
            startTime: startTime ? moment(startTime).format('HH:mm:ss') : '',
            endTime: endTime ? moment(endTime).format('HH:mm:ss') : '',
            duration: duration.toFixed(2),
            agency: agency,
            licensePlates: licensePlates,
            vehicleCount: agencyData.preparations.length
          });
        }
      }
    }
    
    // Styliser les en-têtes
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: 'center' };
  }

  /**
   * Génère les données quotidiennes pour le résumé
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {Array} employees - Liste des employés
   * @returns {Promise<Array>} Données pour le résumé
   */
  async generateDailySummary(date, employees) {
    const startDate = new Date(date + 'T00:00:00');
    const endDate = new Date(date + 'T23:59:59');
    
    const summaryData = [];
    
    for (const employee of employees) {
      // Récupérer les pointages de l'employé pour ce jour
      const timelogs = await TimeLog.find({
        userId: employee._id,
        $or: [
          // Pointages commencés dans la période
          { startTime: { $gte: startDate, $lte: endDate } },
          // Pointages terminés dans la période
          { endTime: { $gte: startDate, $lte: endDate } },
          // Pointages actifs qui chevauchent la période
          { 
            startTime: { $lte: endDate },
            endTime: null,
            status: 'active'
          }
        ]
      });
      
      // Calculer les métriques
      let totalHours = 0;
      let startTimes = [];
      let endTimes = [];
      
      timelogs.forEach(timelog => {
        // Calculer la durée pour les pointages terminés
        if (timelog.status === 'completed' && timelog.endTime) {
          const start = new Date(timelog.startTime);
          const end = new Date(timelog.endTime);
          
          // S'assurer que nous ne comptons que la partie du pointage dans la journée
          const effectiveStart = start < startDate ? startDate : start;
          const effectiveEnd = end > endDate ? endDate : end;
          
          // Calculer la durée en heures
          totalHours += (effectiveEnd - effectiveStart) / (1000 * 60 * 60);
          
          // Stocker les heures de début et de fin
          startTimes.push(start);
          endTimes.push(end);
        } else if (timelog.status === 'active') {
          // Pour les pointages actifs, calculer jusqu'à la fin de la journée ou maintenant
          const start = new Date(timelog.startTime);
          const now = new Date();
          const end = now < endDate ? now : endDate;
          
          const effectiveStart = start < startDate ? startDate : start;
          
          // Calculer la durée en heures
          totalHours += (end - effectiveStart) / (1000 * 60 * 60);
          
          // Stocker l'heure de début
          startTimes.push(start);
        }
      });
      
      // Calculer les heures moyennes de début et de fin
      let avgStartTime = '';
      let avgEndTime = '';
      
      if (startTimes.length > 0) {
        // Trier les heures de début
        startTimes.sort((a, b) => a - b);
        // Prendre la première heure comme moyenne (la plus tôt)
        avgStartTime = moment(startTimes[0]).format('HH:mm:ss');
      }
      
      if (endTimes.length > 0) {
        // Trier les heures de fin
        endTimes.sort((a, b) => b - a);
        // Prendre la dernière heure comme moyenne (la plus tard)
        avgEndTime = moment(endTimes[0]).format('HH:mm:ss');
      }
      
      // Vérifier s'il y a un pointage actif
      const hasActiveTimelog = timelogs.some(timelog => timelog.status === 'active');
      
      // Ajouter l'employé au résumé
      summaryData.push({
        fullName: employee.fullName,
        role: this.translateRole(employee.role),
        totalHours: totalHours.toFixed(2),
        totalTimelogs: timelogs.length,
        avgStartTime: avgStartTime,
        avgEndTime: avgEndTime,
        status: hasActiveTimelog ? 'En service' : timelogs.length > 0 ? 'Terminé' : 'Non pointé'
      });
    }
    
    return summaryData;
  }

  /**
   * Génère les données hebdomadaires pour le résumé
   * @param {string} startDate - Date de début au format YYYY-MM-DD
   * @param {string} endDate - Date de fin au format YYYY-MM-DD
   * @param {Array} employees - Liste des employés
   * @returns {Promise<Array>} Données pour le résumé
   */
  async generateWeeklySummary(startDate, endDate, employees) {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    
    const summaryData = [];
    
    for (const employee of employees) {
      // Récupérer les pointages de l'employé pour la semaine
      const timelogs = await TimeLog.find({
        userId: employee._id,
        $or: [
          // Pointages commencés dans la période
          { startTime: { $gte: start, $lte: end } },
          // Pointages terminés dans la période
          { endTime: { $gte: start, $lte: end } },
          // Pointages actifs qui chevauchent la période
          { 
            startTime: { $lte: end },
            endTime: null,
            status: 'active'
          }
        ]
      });
      
      // Calculer les métriques
      let totalHours = 0;
      let startTimes = [];
      let endTimes = [];
      
      timelogs.forEach(timelog => {
        // Calculer la durée pour les pointages terminés
        if (timelog.status === 'completed' && timelog.endTime) {
          const timeStart = new Date(timelog.startTime);
          const timeEnd = new Date(timelog.endTime);
          
          // S'assurer que nous ne comptons que la partie du pointage dans la semaine
          const effectiveStart = timeStart < start ? start : timeStart;
          const effectiveEnd = timeEnd > end ? end : timeEnd;
          
          // Calculer la durée en heures
          totalHours += (effectiveEnd - effectiveStart) / (1000 * 60 * 60);
          
          // Stocker les heures de début et de fin
          startTimes.push(timeStart);
          endTimes.push(timeEnd);
        } else if (timelog.status === 'active') {
          // Pour les pointages actifs, calculer jusqu'à la fin de la semaine ou maintenant
          const timeStart = new Date(timelog.startTime);
          const now = new Date();
          const timeEnd = now < end ? now : end;
          
          const effectiveStart = timeStart < start ? start : timeStart;
          
          // Calculer la durée en heures
          totalHours += (timeEnd - effectiveStart) / (1000 * 60 * 60);
          
          // Stocker l'heure de début
          startTimes.push(timeStart);
        }
      });
      
      // Calculer les heures moyennes de début et de fin
      let avgStartTime = '';
      let avgEndTime = '';
      
      if (startTimes.length > 0) {
        // Calculer la moyenne des heures de début
        const totalStartTimeMinutes = startTimes.reduce((total, time) => {
          const hours = time.getHours();
          const minutes = time.getMinutes();
          return total + (hours * 60 + minutes);
        }, 0);
        
        const avgStartMinutes = Math.round(totalStartTimeMinutes / startTimes.length);
        const avgStartHours = Math.floor(avgStartMinutes / 60);
        const avgStartMins = avgStartMinutes % 60;
        
        avgStartTime = `${avgStartHours.toString().padStart(2, '0')}:${avgStartMins.toString().padStart(2, '0')}:00`;
      }
      
      if (endTimes.length > 0) {
        // Calculer la moyenne des heures de fin
        const totalEndTimeMinutes = endTimes.reduce((total, time) => {
          const hours = time.getHours();
          const minutes = time.getMinutes();
          return total + (hours * 60 + minutes);
        }, 0);
        
        const avgEndMinutes = Math.round(totalEndTimeMinutes / endTimes.length);
        const avgEndHours = Math.floor(avgEndMinutes / 60);
        const avgEndMins = avgEndMinutes % 60;
        
        avgEndTime = `${avgEndHours.toString().padStart(2, '0')}:${avgEndMins.toString().padStart(2, '0')}:00`;
      }
      
      // Vérifier s'il y a un pointage actif
      const hasActiveTimelog = timelogs.some(timelog => timelog.status === 'active');
      
      // Ajouter l'employé au résumé
      summaryData.push({
        fullName: employee.fullName,
        role: this.translateRole(employee.role),
        totalHours: totalHours.toFixed(2),
        totalTimelogs: timelogs.length,
        avgStartTime: avgStartTime,
        avgEndTime: avgEndTime,
        status: hasActiveTimelog ? 'En service' : timelogs.length > 0 ? 'Actif' : 'Inactif'
      });
    }
    
    return summaryData;
  }

  /**
   * Génère les données mensuelles pour le résumé
   * @param {string} startDate - Date de début au format YYYY-MM-DD
   * @param {string} endDate - Date de fin au format YYYY-MM-DD
   * @param {Array} employees - Liste des employés
   * @returns {Promise<Array>} Données pour le résumé
   */
  /**
   * Remplit une feuille de résumé avec les données calculées
   * @param {Object} sheet - Feuille Excel
   * @param {Array} data - Données à ajouter à la feuille
   */
  fillSummarySheet(sheet, data) {
    // Trier les données par rôle puis par nom
    data.sort((a, b) => {
      const roleOrder = {
        'Direction': 1,
        'Chef d\'équipe': 2,
        'Préparateur': 3,
        'Chauffeur': 4
      };
      
      const roleA = roleOrder[a.role] || 999;
      const roleB = roleOrder[b.role] || 999;
      
      if (roleA !== roleB) {
        return roleA - roleB;
      }
      
      return a.fullName.localeCompare(b.fullName);
    });
    
    // Ajouter les données à la feuille
    data.forEach(row => {
      const excelRow = sheet.addRow(row);
      
      // Appliquer des couleurs selon le statut
      const statusCell = excelRow.getCell('status');
      
      if (row.status === 'En service') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'D1FAE5' } // Vert clair
        };
      } else if (row.status === 'Non pointé' || row.status === 'Inactif') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FEE2E2' } // Rouge clair
        };
      } else if (row.status === 'Terminé' || row.status === 'Actif') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'DBEAFE' } // Bleu clair
        };
      }
      
      // Formater les nombres
      const hoursCell = excelRow.getCell('totalHours');
      hoursCell.numFmt = '0.00';
    });
    
    // Ajouter une ligne totale
    sheet.addRow([]);
    
    const totalRow = sheet.addRow({
      fullName: 'TOTAL',
      totalHours: data.reduce((sum, row) => sum + parseFloat(row.totalHours), 0).toFixed(2),
      totalTimelogs: data.reduce((sum, row) => sum + parseInt(row.totalTimelogs), 0)
    });
    
    // Mettre en gras la ligne totale
    totalRow.font = { bold: true };
    
    // Appliquer le format de nombre à la cellule des heures totales
    const totalHoursCell = totalRow.getCell('totalHours');
    totalHoursCell.numFmt = '0.00';
  }

  /**
   * Traduit les rôles de l'anglais vers le français
   * @param {string} role - Rôle en anglais
   * @returns {string} Rôle traduit en français
   */
  translateRole(role) {
    const roleMap = {
      'admin': 'Admin',
      'driver': 'Chauffeur',
      'preparator': 'Préparateur',
      'direction': 'Direction',
      'team-leader': 'Chef d\'équipe'
    };
    
    return roleMap[role] || role;
  }

  /**
   * Envoie un rapport par email aux destinataires
   * @param {Array} recipients - Liste des destinataires
   * @param {string} subject - Sujet de l'email
   * @param {string} message - Corps du message
   * @param {string} filePath - Chemin du fichier à attacher
   * @param {string} fileName - Nom du fichier à attacher
   * @returns {Promise<boolean>} Succès de l'envoi
   */
  async sendReportEmail(recipients, subject, message, filePath, fileName) {
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Fichier non trouvé: ${filePath}`);
        return false;
      }
      
      // Lire le fichier
      const fileBuffer = fs.readFileSync(filePath);
      
      // Construire le HTML pour le corps du message
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #3B82F6; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px;">
            ${subject}
          </h2>
          
          <p>${message}</p>
          
          <p>Ce rapport est généré automatiquement par le système de gestion des chauffeurs YSG.</p>
          
          <p style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; font-size: 14px; color: #4B5563;">
            <strong>Note:</strong> Pour les préparateurs, une feuille spécifique "Préparateurs - Agences" 
            contient des informations détaillées sur les agences où ils ont travaillé.
          </p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #6B7280;">
            Ce message est automatique, merci de ne pas y répondre directement.
          </p>
        </div>
      `;
      
      // Préparer les destinataires
      const to = recipients.map(r => r.email).join(', ');
      
      // Utiliser directement le transporter pour envoyer l'email avec la pièce jointe
      // comme dans votre méthode sendMovementNotification
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"YSG convoyage" <convoyages@yourservices-group.com>',
        to,
        subject,
        html: htmlBody,
        attachments: [
          {
            filename: fileName,
            content: fileBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        ]
      };
      
      // Envoyer l'email en utilisant directement le transporter
      // comme dans votre méthode sendMovementNotification
      const info = await emailService.transporter.sendMail(mailOptions);
      
      console.log(`✅ Rapport envoyé avec succès à ${recipients.length} destinataire(s)`);
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
      return false;
    }
  }
  
  /**
   * Nettoie les fichiers temporaires des anciens rapports
   * @param {number} maxAgeDays - Âge maximum des fichiers en jours
   */
  cleanupOldReports(maxAgeDays = 30) {
    try {
      console.log('🧹 Nettoyage des anciens rapports...');
      
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000; // Convertir en millisecondes
      
      let deletedCount = 0;
      
      files.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        
        // Ignorer les dossiers
        if (fs.statSync(filePath).isDirectory()) {
          return;
        }
        
        // Vérifier l'âge du fichier
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtime.getTime();
        
        if (fileAge > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });
      
      console.log(`✅ Nettoyage terminé: ${deletedCount} fichier(s) supprimé(s)`);
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des anciens rapports:', error);
    }
  }

  async generateMonthlySummary(startDate, endDate, employees) {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    
    const summaryData = [];
    
    for (const employee of employees) {
      // Récupérer les pointages de l'employé pour le mois
      const timelogs = await TimeLog.find({
        userId: employee._id,
        $or: [
          // Pointages commencés dans la période
          { startTime: { $gte: start, $lte: end } },
          // Pointages terminés dans la période
          { endTime: { $gte: start, $lte: end } },
          // Pointages actifs qui chevauchent la période
          { 
            startTime: { $lte: end },
            endTime: null,
            status: 'active'
          }
        ]
      });
      
      // Calculer les métriques
      let totalHours = 0;
      let workingDays = new Set(); // Pour compter les jours de travail uniques
      
      // Pour les moyennes de début et de fin par jour
      const dailyStartTimes = {};
      const dailyEndTimes = {};
      
      timelogs.forEach(timelog => {
        // Calculer la durée pour les pointages terminés
        if (timelog.status === 'completed' && timelog.endTime) {
          const timeStart = new Date(timelog.startTime);
          const timeEnd = new Date(timelog.endTime);
          
          // S'assurer que nous ne comptons que la partie du pointage dans le mois
          const effectiveStart = timeStart < start ? start : timeStart;
          const effectiveEnd = timeEnd > end ? end : timeEnd;
          
          // Calculer la durée en heures
          totalHours += (effectiveEnd - effectiveStart) / (1000 * 60 * 60);
          
          // Compter le jour de travail
          const day = moment(timeStart).format('YYYY-MM-DD');
          workingDays.add(day);
          
          // Stocker les heures de début et de fin pour ce jour
          if (!dailyStartTimes[day]) {
            dailyStartTimes[day] = [];
          }
          dailyStartTimes[day].push(timeStart);
          
          if (!dailyEndTimes[day]) {
            dailyEndTimes[day] = [];
          }
          dailyEndTimes[day].push(timeEnd);
        } else if (timelog.status === 'active') {
          // Pour les pointages actifs, calculer jusqu'à la fin du mois ou maintenant
          const timeStart = new Date(timelog.startTime);
          const now = new Date();
          const timeEnd = now < end ? now : end;
          
          const effectiveStart = timeStart < start ? start : timeStart;
          
          // Calculer la durée en heures
          totalHours += (timeEnd - effectiveStart) / (1000 * 60 * 60);
          
          // Compter le jour de travail
          const day = moment(timeStart).format('YYYY-MM-DD');
          workingDays.add(day);
          
          // Stocker l'heure de début pour ce jour
          if (!dailyStartTimes[day]) {
            dailyStartTimes[day] = [];
          }
          dailyStartTimes[day].push(timeStart);
        }
      });
      
      // Calculer les heures moyennes de début et de fin sur tous les jours
      let avgStartTimeMinutes = 0;
      let startTimesCount = 0;
      let avgEndTimeMinutes = 0;
      let endTimesCount = 0;
      
      // Pour chaque jour, calculer la première heure de début et la dernière heure de fin
      for (const day in dailyStartTimes) {
        if (dailyStartTimes[day].length > 0) {
          // Trier les heures de début pour ce jour
          dailyStartTimes[day].sort((a, b) => a - b);
          // Prendre la première heure de la journée
          const firstStartTime = dailyStartTimes[day][0];
          avgStartTimeMinutes += firstStartTime.getHours() * 60 + firstStartTime.getMinutes();
          startTimesCount++;
        }
      }
      
      for (const day in dailyEndTimes) {
        if (dailyEndTimes[day].length > 0) {
          // Trier les heures de fin pour ce jour
          dailyEndTimes[day].sort((a, b) => b - a);
          // Prendre la dernière heure de la journée
          const lastEndTime = dailyEndTimes[day][0];
          avgEndTimeMinutes += lastEndTime.getHours() * 60 + lastEndTime.getMinutes();
          endTimesCount++;
        }
      }
      
      // Calculer les moyennes
      let avgStartTime = '';
      let avgEndTime = '';
      
      if (startTimesCount > 0) {
        const avgMinutes = Math.round(avgStartTimeMinutes / startTimesCount);
        const avgHours = Math.floor(avgMinutes / 60);
        const avgMins = avgMinutes % 60;
        
        avgStartTime = `${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}:00`;
      }
      
      if (endTimesCount > 0) {
        const avgMinutes = Math.round(avgEndTimeMinutes / endTimesCount);
        const avgHours = Math.floor(avgMinutes / 60);
        const avgMins = avgMinutes % 60;
        
        avgEndTime = `${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}:00`;
      }
      
      // Vérifier s'il y a un pointage actif
      const hasActiveTimelog = timelogs.some(timelog => timelog.status === 'active');
      
      // Ajouter l'employé au résumé
      summaryData.push({
        fullName: employee.fullName,
        role: this.translateRole(employee.role),
        totalHours: totalHours.toFixed(2),
        totalTimelogs: timelogs.length,
        avgStartTime: avgStartTime,
        avgEndTime: avgEndTime,
        status: hasActiveTimelog ? 'En service' : workingDays.size > 0 ? `${workingDays.size} jours travaillés` : 'Inactif'
      });
    }
    
    return summaryData;
  }
}

// Exporter une instance unique du service
module.exports = new ReportAutomationService();