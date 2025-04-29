// server/services/scheduledReports.service.js
const mongoose = require('mongoose');
const User = require('../models/user.model');
const performanceService = require('./performance.service');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

/**
 * Service pour générer des rapports programmés sur les performances des préparateurs
 */
class ScheduledReportsService {
  /**
   * Crée un répertoire temporaire pour les rapports si nécessaire
   */
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Génère un rapport hebdomadaire des performances
   * @returns {Promise<String>} Chemin du fichier Excel généré
   */
  async generateWeeklyReport() {
    // Récupérer tous les préparateurs
    const preparators = await User.find({ role: 'preparator' }).select('_id username fullName');
    
    // Créer la plage de dates pour la semaine écoulée
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const dateRange = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    // Mettre à jour les performances de tous les préparateurs
    const performancePromises = preparators.map(preparator => 
      performanceService.updatePreparatorPerformance(preparator._id, dateRange)
    );
    
    const performances = await Promise.all(performancePromises);
    
    // Créer un nouveau classeur Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système de Gestion des Préparateurs';
    workbook.created = new Date();
    
    // Ajouter une feuille pour les performances individuelles
    const individualSheet = workbook.addWorksheet('Performances individuelles');
    
    // Définir les colonnes
    individualSheet.columns = [
      { header: 'Préparateur', key: 'preparator', width: 25 },
      { header: 'Score performance', key: 'score', width: 15 },
      { header: 'Préparations complètes', key: 'completedPreparations', width: 20 },
      { header: 'Préparations/jour', key: 'preparationsPerDay', width: 15 },
      { header: 'Temps moyen lavage ext.', key: 'exteriorWashingTime', width: 20 },
      { header: 'Temps moyen nettoyage int.', key: 'interiorCleaningTime', width: 20 },
      { header: 'Temps moyen carburant', key: 'refuelingTime', width: 20 },
      { header: 'Temps moyen stationnement', key: 'parkingTime', width: 20 },
      { header: 'Taux de progression', key: 'growth', width: 15 }
    ];
    
    // En-têtes en gras
    individualSheet.getRow(1).font = { bold: true };
    
    // Ajouter les données
    performances.forEach(performance => {
      if (!performance) return; // Ignorer les performances null
      
      individualSheet.addRow({
        preparator: performance.userId.fullName,
        score: performance.performanceScore,
        completedPreparations: performance.trends.weekly.preparationsCount,
        preparationsPerDay: (performance.trends.weekly.preparationsCount / 7).toFixed(1),
        exteriorWashingTime: `${performance.taskMetrics.exteriorWashing.averageDuration} min`,
        interiorCleaningTime: `${performance.taskMetrics.interiorCleaning.averageDuration} min`,
        refuelingTime: `${performance.taskMetrics.refueling.averageDuration} min`,
        parkingTime: `${performance.taskMetrics.parking.averageDuration} min`,
        growth: `${performance.trends.weekly.growthRate}%`
      });
    });
    
    // Ajouter des couleurs conditionnelles
    individualSheet.eachRow((row, rowIndex) => {
      if (rowIndex > 1) { // Ignorer l'en-tête
        // Coloration du score de performance
        const scoreCell = row.getCell('score');
        const score = parseInt(scoreCell.value);
        
        if (score >= 80) {
          scoreCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'D1FAE5' } // Vert clair
          };
        } else if (score >= 60) {
          scoreCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FEF3C7' } // Jaune clair
          };
        } else {
          scoreCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FEE2E2' } // Rouge clair
          };
        }
        
        // Coloration du taux de croissance
        const growthCell = row.getCell('growth');
        const growthValue = parseInt(growthCell.value);
        
        if (growthValue > 0) {
          growthCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'D1FAE5' } // Vert clair
          };
        } else if (growthValue < 0) {
          growthCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FEE2E2' } // Rouge clair
          };
        }
      }
    });
    
    // Ajouter une feuille pour les métriques de tâches
    const tasksSheet = workbook.addWorksheet('Métriques des tâches');
    
    // Définir les colonnes
    tasksSheet.columns = [
      { header: 'Type de tâche', key: 'taskType', width: 25 },
      { header: 'Nombre total', key: 'count', width: 15 },
      { header: 'Durée moyenne (min)', key: 'averageDuration', width: 20 },
      { header: 'Durée minimum (min)', key: 'minDuration', width: 20 },
      { header: 'Durée maximum (min)', key: 'maxDuration', width: 20 }
    ];
    
    // En-têtes en gras
    tasksSheet.getRow(1).font = { bold: true };
    
    // Calculer les métriques agrégées pour chaque type de tâche
    const taskTypes = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];
    const taskLabels = {
      exteriorWashing: 'Lavage extérieur',
      interiorCleaning: 'Nettoyage intérieur',
      refueling: 'Carburant',
      parking: 'Stationnement'
    };
    
    // Calculer les agrégations
    taskTypes.forEach(taskType => {
      const tasksData = performances
        .filter(p => p && p.taskMetrics[taskType].count > 0)
        .map(p => p.taskMetrics[taskType]);
      
      if (tasksData.length === 0) {
        tasksSheet.addRow({
          taskType: taskLabels[taskType],
          count: 0,
          averageDuration: 0,
          minDuration: 0,
          maxDuration: 0
        });
        return;
      }
      
      const totalCount = tasksData.reduce((sum, task) => sum + task.count, 0);
      const weightedAvgDuration = tasksData.reduce((sum, task) => 
        sum + (task.averageDuration * task.count), 0) / totalCount;
      
      const minDurations = tasksData.map(task => task.minDuration).filter(d => d > 0);
      const maxDurations = tasksData.map(task => task.maxDuration);
      
      tasksSheet.addRow({
        taskType: taskLabels[taskType],
        count: totalCount,
        averageDuration: Math.round(weightedAvgDuration),
        minDuration: minDurations.length > 0 ? Math.min(...minDurations) : 0,
        maxDuration: maxDurations.length > 0 ? Math.max(...maxDurations) : 0
      });
    });
    
    // Ajouter une feuille pour la tendance hebdomadaire
    const trendSheet = workbook.addWorksheet('Tendance hebdomadaire');
    
    // Définir les colonnes pour la tendance
    trendSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Préparations totales', key: 'totalPreparations', width: 20 },
      { header: 'Préparations complétées', key: 'completedPreparations', width: 20 },
      { header: 'Nombre de préparateurs', key: 'preparators', width: 20 },
      { header: 'Lavages extérieurs', key: 'exteriorWashing', width: 15 },
      { header: 'Nettoyages intérieurs', key: 'interiorCleaning', width: 15 },
      { header: 'Pleins de carburant', key: 'refueling', width: 15 },
      { header: 'Stationnements', key: 'parking', width: 15 }
    ];
    
    // En-têtes en gras
    trendSheet.getRow(1).font = { bold: true };
    
    // Agréger les données quotidiennes
    const dailyData = {};
    
    performances.forEach(performance => {
      if (!performance) return;
      
      performance.periodMetrics.daily.forEach(dailyMetric => {
        const dateObj = new Date(dailyMetric.date);
        
        // Vérifier si la date est dans la plage de la semaine
        if (dateObj >= startDate && dateObj <= endDate) {
          const dateKey = dateObj.toISOString().split('T')[0];
          
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
              date: dateObj,
              totalPreparations: 0,
              completedPreparations: 0,
              preparators: 0,
              taskCounts: {
                exteriorWashing: 0,
                interiorCleaning: 0,
                refueling: 0,
                parking: 0
              }
            };
          }
          
          dailyData[dateKey].totalPreparations += dailyMetric.totalPreparations;
          dailyData[dateKey].completedPreparations += dailyMetric.completedPreparations;
          dailyData[dateKey].preparators += 1;
          
          // Agréger les compteurs de tâches
          Object.keys(dailyMetric.taskMetrics).forEach(taskType => {
            dailyData[dateKey].taskCounts[taskType] += dailyMetric.taskMetrics[taskType].count;
          });
        }
      });
    });
    
    // Convertir en tableau et trier par date
    const aggregatedDailyData = Object.values(dailyData).sort((a, b) => a.date - b.date);
    
    // Ajouter les données à la feuille
    aggregatedDailyData.forEach(dayData => {
      trendSheet.addRow({
        date: dayData.date.toLocaleDateString('fr-FR'),
        totalPreparations: dayData.totalPreparations,
        completedPreparations: dayData.completedPreparations,
        preparators: dayData.preparators,
        exteriorWashing: dayData.taskCounts.exteriorWashing,
        interiorCleaning: dayData.taskCounts.interiorCleaning,
        refueling: dayData.taskCounts.refueling,
        parking: dayData.taskCounts.parking
      });
    });
    
    // Générer le nom du fichier avec la date
    const dateStr = new Date().toISOString().split('T')[0];
    const filePath = path.join(this.tempDir, `rapport_performance_hebdomadaire_${dateStr}.xlsx`);
    
    // Écrire le fichier
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  }

  /**
   * Génère un rapport mensuel des performances
   * @returns {Promise<String>} Chemin du fichier Excel généré
   */
  async generateMonthlyReport() {
    // Récupérer tous les préparateurs
    const preparators = await User.find({ role: 'preparator' }).select('_id username fullName');
    
    // Créer la plage de dates pour le mois écoulé
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    const dateRange = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    // Mettre à jour les performances de tous les préparateurs
    const performancePromises = preparators.map(preparator => 
      performanceService.updatePreparatorPerformance(preparator._id, dateRange)
    );
    
    const performances = await Promise.all(performancePromises);
    
    // Créer un nouveau classeur Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système de Gestion des Préparateurs';
    workbook.created = new Date();
    
    // Ajouter une feuille pour les performances individuelles
    const individualSheet = workbook.addWorksheet('Performances mensuelles');
    
    // Définir les colonnes
    individualSheet.columns = [
      { header: 'Préparateur', key: 'preparator', width: 25 },
      { header: 'Score performance', key: 'score', width: 15 },
      { header: 'Préparations complètes', key: 'completedPreparations', width: 20 },
      { header: 'Préparations/jour', key: 'preparationsPerDay', width: 15 },
      { header: 'Temps moyen lavage ext.', key: 'exteriorWashingTime', width: 20 },
      { header: 'Temps moyen nettoyage int.', key: 'interiorCleaningTime', width: 20 },
      { header: 'Temps moyen carburant', key: 'refuelingTime', width: 20 },
      { header: 'Temps moyen stationnement', key: 'parkingTime', width: 20 },
      { header: 'Taux de progression', key: 'growth', width: 15 }
    ];
    
    // En-têtes en gras
    individualSheet.getRow(1).font = { bold: true };
    
    // Ajouter les données
    performances.forEach(performance => {
      if (!performance) return; // Ignorer les performances null
      
      individualSheet.addRow({
        preparator: performance.userId.fullName,
        score: performance.performanceScore,
        completedPreparations: performance.trends.monthly.preparationsCount,
        preparationsPerDay: (performance.trends.monthly.preparationsCount / 30).toFixed(1),
        exteriorWashingTime: `${performance.taskMetrics.exteriorWashing.averageDuration} min`,
        interiorCleaningTime: `${performance.taskMetrics.interiorCleaning.averageDuration} min`,
        refuelingTime: `${performance.taskMetrics.refueling.averageDuration} min`,
        parkingTime: `${performance.taskMetrics.parking.averageDuration} min`,
        growth: `${performance.trends.monthly.growthRate}%`
      });
    });
    
    // Ajouter des couleurs conditionnelles (identique au rapport hebdomadaire)
    individualSheet.eachRow((row, rowIndex) => {
      if (rowIndex > 1) {
        const scoreCell = row.getCell('score');
        const score = parseInt(scoreCell.value);
        
        if (score >= 80) {
          scoreCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'D1FAE5' }
          };
        } else if (score >= 60) {
          scoreCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FEF3C7' }
          };
        } else {
          scoreCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FEE2E2' }
          };
        }
        
        const growthCell = row.getCell('growth');
        const growthValue = parseInt(growthCell.value);
        
        if (growthValue > 0) {
          growthCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'D1FAE5' }
          };
        } else if (growthValue < 0) {
          growthCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FEE2E2' }
          };
        }
      }
    });
    
    // Générer le nom du fichier avec la date
    const dateStr = new Date().toISOString().split('T')[0];
    const filePath = path.join(this.tempDir, `rapport_performance_mensuel_${dateStr}.xlsx`);
    
    // Écrire le fichier
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  }
  
  /**
   * Nettoie les fichiers temporaires obsolètes
   */
  cleanupTempFiles() {
    const files = fs.readdirSync(this.tempDir);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes
    
    files.forEach(file => {
      const filePath = path.join(this.tempDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtime.getTime();
      
      if (fileAge > maxAge) {
        fs.unlinkSync(filePath);
      }
    });
  }
}

module.exports = new ScheduledReportsService();