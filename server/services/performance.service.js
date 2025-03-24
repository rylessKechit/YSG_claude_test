// server/services/performance.service.js
const Preparation = require('../models/preparation.model');
const TimeLog = require('../models/timelog.model');
const User = require('../models/user.model');
const PreparatorPerformance = require('../models/performance.model');

class PerformanceService {
  /**
   * Calcule le temps passé en minutes entre deux dates
   * @param {Date} startDate - Date de début
   * @param {Date} endDate - Date de fin
   * @returns {Number} - Durée en minutes
   */
  calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const duration = (new Date(endDate) - new Date(startDate)) / (1000 * 60); // en minutes
    return Math.max(0, Math.round(duration));
  }

  /**
   * Récupère toutes les préparations terminées d'un préparateur
   * @param {String} userId - ID du préparateur
   * @param {Object} dateRange - Plage de dates optionnelle
   * @returns {Promise<Array>} - Liste des préparations
   */
  async getCompletedPreparations(userId, dateRange = {}) {
    const query = { 
      userId,
      status: 'completed'
    };

    if (dateRange.startDate || dateRange.endDate) {
      query.createdAt = {};
      if (dateRange.startDate) {
        query.createdAt.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    return await Preparation.find(query).sort({ createdAt: 1 });
  }

  /**
   * Récupère les journées de travail d'un préparateur
   * @param {String} userId - ID du préparateur
   * @param {Object} dateRange - Plage de dates optionnelle
   * @returns {Promise<Array>} - Liste des pointages
   */
  async getWorkingDays(userId, dateRange = {}) {
    const query = { 
      userId,
      status: 'completed'
    };

    if (dateRange.startDate || dateRange.endDate) {
      query.startTime = {};
      if (dateRange.startDate) {
        query.startTime.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.startTime.$lte = endDate;
      }
    }

    return await TimeLog.find(query).sort({ startTime: 1 });
  }

  /**
   * Calcule les métriques par type de tâche
   * @param {Array} preparations - Liste des préparations
   * @param {String} taskType - Type de tâche
   * @returns {Object} - Métriques de la tâche
   */
  calculateTaskMetrics(preparations, taskType) {
    const completedTasks = preparations.filter(
      prep => prep.tasks[taskType] && prep.tasks[taskType].status === 'completed'
    );
    
    if (completedTasks.length === 0) {
      return {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0
      };
    }
    
    const durations = completedTasks.map(prep => {
      const task = prep.tasks[taskType];
      return this.calculateDuration(task.startedAt, task.completedAt);
    }).filter(duration => duration > 0);
    
    if (durations.length === 0) {
      return {
        count: completedTasks.length,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0
      };
    }
    
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    
    return {
      count: completedTasks.length,
      totalDuration: totalDuration,
      averageDuration: Math.round(totalDuration / durations.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations)
    };
  }

  /**
   * Groupe les préparations par jour
   * @param {Array} preparations - Liste des préparations
   * @returns {Object} - Préparations groupées par jour
   */
  groupPreparationsByDay(preparations) {
    const groupedByDay = {};
    
    preparations.forEach(prep => {
      const date = new Date(prep.createdAt);
      const dateKey = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
      
      if (!groupedByDay[dateKey]) {
        groupedByDay[dateKey] = [];
      }
      
      groupedByDay[dateKey].push(prep);
    });
    
    return groupedByDay;
  }

  /**
   * Calcule les heures de travail par jour
   * @param {Array} timeLogs - Liste des pointages
   * @returns {Object} - Heures de travail par jour
   */
  calculateWorkingHoursByDay(timeLogs) {
    const workingHoursByDay = {};
    
    timeLogs.forEach(log => {
      if (!log.startTime || !log.endTime) return;
      
      const dateKey = new Date(log.startTime).toISOString().split('T')[0];
      const hours = this.calculateDuration(log.startTime, log.endTime) / 60; // Convertir minutes en heures
      
      if (!workingHoursByDay[dateKey]) {
        workingHoursByDay[dateKey] = 0;
      }
      
      workingHoursByDay[dateKey] += hours;
    });
    
    return workingHoursByDay;
  }

  /**
   * Calcule les métriques quotidiennes
   * @param {Object} prepsByDay - Préparations groupées par jour
   * @param {Object} workingHoursByDay - Heures de travail par jour
   * @returns {Array} - Métriques quotidiennes
   */
  calculateDailyMetrics(prepsByDay, workingHoursByDay) {
    const dailyMetrics = [];
    
    for (const [dateKey, preparations] of Object.entries(prepsByDay)) {
      const completedPreps = preparations.filter(prep => prep.status === 'completed');
      const totalCompletionTime = completedPreps.reduce((sum, prep) => {
        if (prep.startTime && prep.endTime) {
          return sum + this.calculateDuration(prep.startTime, prep.endTime);
        }
        return sum;
      }, 0);
      
      const workingHours = workingHoursByDay[dateKey] || 0;
      
      const dailyMetric = {
        date: new Date(dateKey),
        totalPreparations: preparations.length,
        completedPreparations: completedPreps.length,
        averageCompletionTime: completedPreps.length > 0 ? Math.round(totalCompletionTime / completedPreps.length) : 0,
        taskMetrics: {
          exteriorWashing: this.calculateTaskMetrics(preparations, 'exteriorWashing'),
          interiorCleaning: this.calculateTaskMetrics(preparations, 'interiorCleaning'),
          refueling: this.calculateTaskMetrics(preparations, 'refueling'),
          parking: this.calculateTaskMetrics(preparations, 'parking')
        },
        workingHours: workingHours,
        productivity: workingHours > 0 ? Math.round((completedPreps.length / workingHours) * 10) / 10 : 0
      };
      
      dailyMetrics.push(dailyMetric);
    }
    
    return dailyMetrics.sort((a, b) => a.date - b.date);
  }

  /**
   * Calcule les taux de complétion des tâches
   * @param {Array} preparations - Liste des préparations
   * @returns {Object} - Taux de complétion par type de tâche
   */
  calculateCompletionRates(preparations) {
    if (preparations.length === 0) {
      return {
        exteriorWashing: 0,
        interiorCleaning: 0,
        refueling: 0,
        parking: 0
      };
    }
    
    const taskTypes = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];
    const rates = {};
    
    taskTypes.forEach(taskType => {
      const completedTasks = preparations.filter(
        prep => prep.tasks[taskType] && prep.tasks[taskType].status === 'completed'
      );
      
      rates[taskType] = Math.round((completedTasks.length / preparations.length) * 100);
    });
    
    return rates;
  }

  /**
   * Calcule les tendances récentes
   * @param {Array} dailyMetrics - Métriques quotidiennes
   * @returns {Object} - Tendances sur différentes périodes
   */
  calculateTrends(dailyMetrics) {
    if (dailyMetrics.length === 0) {
      return {
        weekly: { preparationsCount: 0, averageCompletionTime: 0, growthRate: 0 },
        monthly: { preparationsCount: 0, averageCompletionTime: 0, growthRate: 0 },
        quarterly: { preparationsCount: 0, averageCompletionTime: 0, growthRate: 0 }
      };
    }
    
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);
    
    const last7DaysMetrics = dailyMetrics.filter(metric => new Date(metric.date) >= sevenDaysAgo);
    const last30DaysMetrics = dailyMetrics.filter(metric => new Date(metric.date) >= thirtyDaysAgo);
    const last90DaysMetrics = dailyMetrics.filter(metric => new Date(metric.date) >= ninetyDaysAgo);
    
    const weekly = this.calculatePeriodMetrics(last7DaysMetrics, 7);
    const monthly = this.calculatePeriodMetrics(last30DaysMetrics, 30);
    const quarterly = this.calculatePeriodMetrics(last90DaysMetrics, 90);
    
    return { weekly, monthly, quarterly };
  }

  /**
   * Calcule les métriques agrégées pour une période
   * @param {Array} metrics - Métriques de la période
   * @param {Number} days - Nombre de jours de la période
   * @returns {Object} - Métriques agrégées
   */
  calculatePeriodMetrics(metrics, days) {
    if (metrics.length === 0) {
      return {
        preparationsCount: 0,
        averageCompletionTime: 0,
        growthRate: 0
      };
    }
    
    // Trier par date
    metrics.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const totalPreparations = metrics.reduce((sum, day) => sum + day.completedPreparations, 0);
    
    const totalCompletionTime = metrics.reduce((sum, day) => {
      return sum + (day.averageCompletionTime * day.completedPreparations);
    }, 0);
    
    const averageCompletionTime = totalPreparations > 0 
      ? Math.round(totalCompletionTime / totalPreparations) 
      : 0;
    
    // Calcul du taux de croissance
    let growthRate = 0;
    
    if (metrics.length >= 2) {
      // Diviser la période en deux moitiés
      const midPoint = Math.floor(metrics.length / 2);
      const firstHalf = metrics.slice(0, midPoint);
      const secondHalf = metrics.slice(midPoint);
      
      const firstHalfTotal = firstHalf.reduce((sum, day) => sum + day.completedPreparations, 0);
      const secondHalfTotal = secondHalf.reduce((sum, day) => sum + day.completedPreparations, 0);
      
      if (firstHalfTotal > 0) {
        growthRate = Math.round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100);
      }
    }
    
    return {
      preparationsCount: totalPreparations,
      averageCompletionTime: averageCompletionTime,
      growthRate: growthRate
    };
  }

  /**
   * Calcule un score de performance global
   * @param {Object} metrics - Métriques du préparateur
   * @returns {Number} - Score de performance
   */
  calculatePerformanceScore(metrics) {
    if (metrics.totalPreparations === 0) return 0;
    
    // Pondération des facteurs
    const weights = {
      completionRate: 0.3,
      efficiency: 0.4,
      volume: 0.3
    };
    
    // Taux de complétion moyen
    const avgCompletionRate = Object.values(metrics.completionRates).reduce((sum, rate) => sum + rate, 0) / 4;
    
    // Efficacité (temps moyen d'exécution)
    const taskEfficiencies = [];
    Object.values(metrics.taskMetrics).forEach(task => {
      if (task.count > 0) {
        taskEfficiencies.push(task.averageDuration);
      }
    });
    
    // Plus le temps est court, meilleure est l'efficacité (score inversement proportionnel)
    const efficiencyScore = taskEfficiencies.length > 0
      ? 100 - Math.min(100, (Math.min(...taskEfficiencies) / Math.max(...taskEfficiencies)) * 100)
      : 0;
    
    // Volume (nombre de préparations par jour)
    const volumeScore = Math.min(100, metrics.averagePreparationsPerDay * 20); // Exemple: 5 prép/jour = 100%
    
    // Score final combiné
    const score = (weights.completionRate * avgCompletionRate) +
                 (weights.efficiency * efficiencyScore) +
                 (weights.volume * volumeScore);
    
    return Math.round(score);
  }

  /**
   * Génère ou met à jour les performances d'un préparateur
   * @param {String} userId - ID du préparateur
   * @param {Object} dateRange - Plage de dates optionnelle
   * @returns {Promise<Object>} - Performances calculées
   */
  async updatePreparatorPerformance(userId, dateRange = {}) {
    // Récupérer les données nécessaires
    const [preparations, timeLogs] = await Promise.all([
      this.getCompletedPreparations(userId, dateRange),
      this.getWorkingDays(userId, dateRange)
    ]);
    
    if (preparations.length === 0) {
      return null; // Pas de données à traiter
    }
    
    // Grouper les préparations par jour
    const prepsByDay = this.groupPreparationsByDay(preparations);
    
    // Calculer les heures de travail par jour
    const workingHoursByDay = this.calculateWorkingHoursByDay(timeLogs);
    
    // Calculer les métriques quotidiennes
    const dailyMetrics = this.calculateDailyMetrics(prepsByDay, workingHoursByDay);
    
    // Calculer les métriques par type de tâche
    const taskMetrics = {
      exteriorWashing: this.calculateTaskMetrics(preparations, 'exteriorWashing'),
      interiorCleaning: this.calculateTaskMetrics(preparations, 'interiorCleaning'),
      refueling: this.calculateTaskMetrics(preparations, 'refueling'),
      parking: this.calculateTaskMetrics(preparations, 'parking')
    };
    
    // Calculer les taux de complétion
    const completionRates = this.calculateCompletionRates(preparations);
    
    // Calculer les tendances
    const trends = this.calculateTrends(dailyMetrics);
    
    // Préparer les métriques globales
    const completedPreparations = preparations.filter(prep => prep.status === 'completed');
    const uniqueDays = new Set(preparations.map(prep => 
      new Date(prep.createdAt).toISOString().split('T')[0]
    )).size;
    
    const metrics = {
      totalPreparations: preparations.length,
      completedPreparations: completedPreparations.length,
      averagePreparationsPerDay: uniqueDays > 0 ? Math.round((completedPreparations.length / uniqueDays) * 10) / 10 : 0,
      taskMetrics: taskMetrics,
      completionRates: completionRates,
      periodMetrics: {
        daily: dailyMetrics,
        lastUpdateDate: new Date()
      },
      trends: trends
    };
    
    // Calculer le score de performance
    metrics.performanceScore = this.calculatePerformanceScore(metrics);
    
    // Mettre à jour ou créer l'entrée de performance
    let performance = await PreparatorPerformance.findOne({ userId });
    
    if (performance) {
      // Mettre à jour l'enregistrement existant
      Object.assign(performance, metrics);
      await performance.save();
    } else {
      // Créer un nouvel enregistrement
      performance = new PreparatorPerformance({
        userId,
        ...metrics
      });
      await performance.save();
    }
    
    return performance;
  }

  /**
   * Compare les performances de plusieurs préparateurs
   * @param {Array} userIds - IDs des préparateurs à comparer
   * @returns {Promise<Object>} - Données comparatives
   */
  async comparePreparators(userIds) {
    // Si aucun ID n'est fourni, récupérer tous les préparateurs
    if (!userIds || userIds.length === 0) {
      const preparators = await User.find({ role: 'preparator' }).select('_id');
      userIds = preparators.map(user => user._id);
    }
    
    // Récupérer les performances pour chaque préparateur
    const performances = await PreparatorPerformance.find({
      userId: { $in: userIds }
    }).populate('userId', 'username fullName');
    
    // Si aucune donnée n'est trouvée, mettre à jour les performances
    if (performances.length === 0 && userIds.length > 0) {
      const updatedPerformances = [];
      
      for (const userId of userIds) {
        const performance = await this.updatePreparatorPerformance(userId);
        if (performance) {
          updatedPerformances.push(performance);
        }
      }
      
      return updatedPerformances;
    }
    
    return performances;
  }

  /**
   * Génère des métriques globales pour tous les préparateurs
   * @returns {Promise<Object>} - Métriques globales
   */
  async generateGlobalMetrics() {
    // Récupérer tous les préparateurs
    const preparators = await User.find({ role: 'preparator' }).select('_id');
    
    // Récupérer toutes les préparations terminées
    const completedPreparations = await Preparation.find({
      status: 'completed',
      userId: { $in: preparators.map(p => p._id) }
    });
    
    if (completedPreparations.length === 0) {
      return {
        totalPreparations: 0,
        preparatorsCount: preparators.length,
        averagePerformanceScore: 0,
        topPerformer: null,
        taskDistribution: {
          exteriorWashing: 0,
          interiorCleaning: 0,
          refueling: 0,
          parking: 0
        }
      };
    }
    
    // Récupérer toutes les performances
    const performances = await PreparatorPerformance.find({
      userId: { $in: preparators.map(p => p._id) }
    }).populate('userId', 'username fullName');
    
    // Calculer les métriques globales
    const totalPreparations = completedPreparations.length;
    const averagePerformanceScore = performances.length > 0 
      ? Math.round(performances.reduce((sum, p) => sum + p.performanceScore, 0) / performances.length) 
      : 0;
    
    // Déterminer le meilleur préparateur
    let topPerformer = null;
    
    if (performances.length > 0) {
      topPerformer = performances.reduce((best, current) => 
        current.performanceScore > best.performanceScore ? current : best, 
        performances[0]
      );
    }
    
    // Calculer la distribution des tâches
    const taskDistribution = {
      exteriorWashing: 0,
      interiorCleaning: 0,
      refueling: 0,
      parking: 0
    };
    
    completedPreparations.forEach(prep => {
      Object.keys(taskDistribution).forEach(taskType => {
        if (prep.tasks[taskType] && prep.tasks[taskType].status === 'completed') {
          taskDistribution[taskType]++;
        }
      });
    });
    
    // Convertir en pourcentages
    Object.keys(taskDistribution).forEach(key => {
      taskDistribution[key] = Math.round((taskDistribution[key] / totalPreparations) * 100);
    });
    
    return {
      totalPreparations,
      preparatorsCount: preparators.length,
      averagePerformanceScore,
      topPerformer: topPerformer ? {
        userId: topPerformer.userId._id,
        fullName: topPerformer.userId.fullName,
        username: topPerformer.userId.username,
        performanceScore: topPerformer.performanceScore
      } : null,
      taskDistribution
    };
  }
}

module.exports = new PerformanceService();