// server/controllers/analytics.controller.js
const performanceService = require('../services/performance.service');
const PreparatorPerformance = require('../models/performance.model');
const User = require('../models/user.model');
const Preparation = require('../models/preparation.model');

/**
 * Controller pour gérer les endpoints d'analytique des performances
 */
const analyticsController = {
  /**
   * Récupère les performances d'un préparateur
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async getPreparatorPerformance(req, res) {
    try {
      const { userId } = req.params;
      const { refresh, startDate, endDate } = req.query;
      
      // Vérifier que l'utilisateur existe et est un préparateur
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      if (user.role !== 'preparator') {
        return res.status(400).json({ message: 'L\'utilisateur n\'est pas un préparateur' });
      }
      
      // Créer un objet plage de dates si nécessaire
      const dateRange = {};
      if (startDate) dateRange.startDate = startDate;
      if (endDate) dateRange.endDate = endDate;
      
      let performance;
      
      // Si refresh=true ou pas de performance existante, recalculer
      if (refresh === 'true') {
        performance = await performanceService.updatePreparatorPerformance(userId, dateRange);
      } else {
        performance = await PreparatorPerformance.findOne({ userId }).populate('userId', 'username fullName');
        
        // Si les performances n'existent pas, les calculer
        if (!performance) {
          performance = await performanceService.updatePreparatorPerformance(userId, dateRange);
        }
        // Si les dernières mesures sont trop anciennes (plus de 24h), les mettre à jour
        else if (performance.periodMetrics && performance.periodMetrics.lastUpdateDate && 
                (new Date() - new Date(performance.periodMetrics.lastUpdateDate) > 24 * 60 * 60 * 1000)) {
          performance = await performanceService.updatePreparatorPerformance(userId, dateRange);
        }
      }
      
      if (!performance) {
        return res.status(404).json({ message: 'Pas de données de performance disponibles' });
      }
      
      res.json(performance);
    } catch (error) {
      console.error('Erreur lors de la récupération des performances:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },
  
  /**
   * Récupère les métriques spécifiques à un type de tâche
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async getTaskMetrics(req, res) {
    try {
      const { taskType } = req.params;
      const { userId, startDate, endDate } = req.query;
      
      // Valider le type de tâche
      const validTaskTypes = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];
      if (!validTaskTypes.includes(taskType)) {
        return res.status(400).json({ message: 'Type de tâche invalide' });
      }
      
      // Construire la requête
      const query = {};
      
      // Filtrer par utilisateur si fourni
      if (userId) {
        // Vérifier que l'utilisateur existe et est un préparateur
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        if (user.role !== 'preparator') {
          return res.status(400).json({ message: 'L\'utilisateur n\'est pas un préparateur' });
        }
        
        query.userId = userId;
      } else {
        // Si pas d'utilisateur spécifié, récupérer tous les préparateurs
        const preparators = await User.find({ role: 'preparator' }).select('_id');
        query.userId = { $in: preparators.map(p => p._id) };
      }
      
      // Ajouter les filtres de date si nécessaire
      if (startDate || endDate) {
        query[`tasks.${taskType}.startedAt`] = {};
        if (startDate) {
          query[`tasks.${taskType}.startedAt`].$gte = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          query[`tasks.${taskType}.startedAt`].$lte = endDateTime;
        }
      }
      
      // Ajouter le filtre de statut pour ne récupérer que les tâches complétées
      query[`tasks.${taskType}.status`] = 'completed';
      
      // Récupérer les préparations avec la tâche spécifiée
      const preparations = await Preparation.find(query)
        .select(`userId tasks.${taskType}`)
        .populate('userId', 'username fullName');
      
      if (preparations.length === 0) {
        return res.json({
          message: 'Aucune donnée disponible pour cette tâche',
          taskType,
          metrics: {
            count: 0,
            averageDuration: 0,
            minDuration: 0,
            maxDuration: 0
          }
        });
      }
      
      // Calculer les métriques
      const durations = preparations.map(prep => {
        const task = prep.tasks[taskType];
        return performanceService.calculateDuration(task.startedAt, task.completedAt);
      }).filter(duration => duration > 0);
      
      const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
      const metrics = {
        count: preparations.length,
        averageDuration: durations.length > 0 ? Math.round(totalDuration / durations.length) : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0
      };
      
      // Si requête pour un utilisateur spécifique, ajouter les détails utilisateur
      if (userId) {
        metrics.userDetails = {
          userId,
          fullName: preparations[0]?.userId?.fullName,
          username: preparations[0]?.userId?.username
        };
      }
      
      res.json({
        taskType,
        metrics,
        preparations: preparations.map(prep => {
          const task = prep.tasks[taskType];
          return {
            preparationId: prep._id,
            userId: prep.userId._id,
            preparator: prep.userId.fullName,
            startTime: task.startedAt,
            endTime: task.completedAt,
            duration: performanceService.calculateDuration(task.startedAt, task.completedAt),
            notes: task.notes || ''
          };
        })
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des métriques de tâche:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },
  
  /**
   * Récupère les métriques quotidiennes pour un ou tous les préparateurs
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async getDailyMetrics(req, res) {
    try {
      const { userId, startDate, endDate } = req.query;
      
      // Construire la plage de dates
      const dateRange = {};
      
      if (startDate) {
        dateRange.startDate = new Date(startDate);
      } else {
        // Par défaut, un mois en arrière
        dateRange.startDate = new Date();
        dateRange.startDate.setMonth(dateRange.startDate.getMonth() - 1);
      }
      
      if (endDate) {
        dateRange.endDate = new Date(endDate);
        dateRange.endDate.setHours(23, 59, 59, 999);
      } else {
        // Par défaut, aujourd'hui
        dateRange.endDate = new Date();
        dateRange.endDate.setHours(23, 59, 59, 999);
      }
      
      // Si un userId est fourni, récupérer les métriques pour ce préparateur
      if (userId) {
        // Vérifier que l'utilisateur existe et est un préparateur
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        if (user.role !== 'preparator') {
          return res.status(400).json({ message: 'L\'utilisateur n\'est pas un préparateur' });
        }
        
        // Récupérer ou calculer les performances
        let performance = await PreparatorPerformance.findOne({ userId }).populate('userId', 'username fullName');
        
        if (!performance || (performance.periodMetrics && performance.periodMetrics.lastUpdateDate && 
            new Date() - new Date(performance.periodMetrics.lastUpdateDate) > 24 * 60 * 60 * 1000)) {
          performance = await performanceService.updatePreparatorPerformance(userId, {
            startDate: dateRange.startDate.toISOString().split('T')[0],
            endDate: dateRange.endDate.toISOString().split('T')[0]
          });
        }
        
        if (!performance || !performance.periodMetrics || !performance.periodMetrics.daily) {
          return res.json({
            userId,
            metrics: []
          });
        }
        
        // Filtrer les métriques quotidiennes selon la plage de dates
        const metrics = performance.periodMetrics.daily.filter(metric => {
          const metricDate = new Date(metric.date);
          return metricDate >= dateRange.startDate && metricDate <= dateRange.endDate;
        });
        
        return res.json({
          userId,
          preparator: {
            fullName: performance.userId.fullName,
            username: performance.userId.username
          },
          metrics
        });
      } 
      // Sinon, récupérer les métriques pour tous les préparateurs
      else {
        // Récupérer tous les préparateurs
        const preparators = await User.find({ role: 'preparator' }).select('_id username fullName');
        
        // Récupérer les performances pour chaque préparateur
        const performances = await PreparatorPerformance.find({
          userId: { $in: preparators.map(p => p._id) }
        }).populate('userId', 'username fullName');
        
        // Combiner et agréger les métriques quotidiennes
        const dailyData = {};
        
        performances.forEach(performance => {
          if (!performance.periodMetrics || !performance.periodMetrics.daily) return;
          
          performance.periodMetrics.daily.forEach(dailyMetric => {
            const date = new Date(dailyMetric.date);
            
            // Vérifier si la date est dans la plage demandée
            if (date >= dateRange.startDate && date <= dateRange.endDate) {
              const dateKey = date.toISOString().split('T')[0];
              
              if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                  date,
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
        const aggregatedMetrics = Object.values(dailyData).sort((a, b) => a.date - b.date);
        
        return res.json({
          metrics: aggregatedMetrics
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des métriques quotidiennes:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },
  
  /**
   * Compare les performances entre préparateurs
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async comparePreparators(req, res) {
    try {
      const { userIds, refresh } = req.query;
      
      // Si userIds est fourni, le convertir en tableau
      let preparatorIds = [];
      if (userIds) {
        preparatorIds = Array.isArray(userIds) ? userIds : userIds.split(',');
        
        // Vérifier que tous les utilisateurs sont des préparateurs
        const users = await User.find({ 
          _id: { $in: preparatorIds },
          role: 'preparator'
        }).select('_id');
        
        if (users.length !== preparatorIds.length) {
          return res.status(400).json({ 
            message: 'Certains utilisateurs spécifiés n\'existent pas ou ne sont pas des préparateurs' 
          });
        }
      }
      
      // Si refresh=true, mettre à jour les performances de tous les préparateurs
      if (refresh === 'true') {
        if (preparatorIds.length > 0) {
          await Promise.all(preparatorIds.map(id => 
            performanceService.updatePreparatorPerformance(id)
          ));
        } else {
          // Récupérer tous les préparateurs et mettre à jour leurs performances
          const allPreparators = await User.find({ role: 'preparator' }).select('_id');
          await Promise.all(allPreparators.map(p => 
            performanceService.updatePreparatorPerformance(p._id)
          ));
        }
      }
      
      // Récupérer les données comparatives
      let compareData;
      
      if (preparatorIds.length > 0) {
        compareData = await performanceService.comparePreparators(preparatorIds);
      } else {
        compareData = await performanceService.comparePreparators();
      }
      
      // Formater la réponse
      const formattedData = compareData.map(perf => ({
        userId: perf.userId._id,
        preparator: {
          fullName: perf.userId.fullName,
          username: perf.userId.username
        },
        metrics: {
          performanceScore: perf.performanceScore,
          totalPreparations: perf.totalPreparations,
          completedPreparations: perf.completedPreparations,
          averagePreparationsPerDay: perf.averagePreparationsPerDay,
          completionRates: perf.completionRates,
          taskMetrics: {
            exteriorWashing: {
              count: perf.taskMetrics.exteriorWashing.count,
              averageDuration: perf.taskMetrics.exteriorWashing.averageDuration
            },
            interiorCleaning: {
              count: perf.taskMetrics.interiorCleaning.count,
              averageDuration: perf.taskMetrics.interiorCleaning.averageDuration
            },
            refueling: {
              count: perf.taskMetrics.refueling.count,
              averageDuration: perf.taskMetrics.refueling.averageDuration
            },
            parking: {
              count: perf.taskMetrics.parking.count,
              averageDuration: perf.taskMetrics.parking.averageDuration
            }
          },
          trends: perf.trends
        }
      }));
      
      // Ajouter des métriques globales
      const globalMetrics = await performanceService.generateGlobalMetrics();
      
      res.json({
        comparativeData: formattedData,
        globalMetrics
      });
    } catch (error) {
      console.error('Erreur lors de la comparaison des préparateurs:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },
  
  /**
   * Récupère les métriques globales pour tous les préparateurs
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async getGlobalMetrics(req, res) {
    try {
      const globalMetrics = await performanceService.generateGlobalMetrics();
      res.json(globalMetrics);
    } catch (error) {
      console.error('Erreur lors de la récupération des métriques globales:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  /**
   * Récupère les statistiques des préparations par modèle de véhicule
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async getVehicleModelStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // Construire la requête
      const query = { status: 'completed' };
      
      // Ajouter les filtres de date si nécessaire
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          query.createdAt.$lte = endDateTime;
        }
      }
      
      // Utiliser les agrégations MongoDB pour obtenir les statistiques par modèle
      const modelStats = await Preparation.aggregate([
        { $match: query },
        { $group: {
            _id: "$vehicleModel",
            count: { $sum: 1 },
            averageCompletionTime: { 
              $avg: { 
                $subtract: ["$endTime", "$startTime"] 
              } 
            },
            preparators: { $addToSet: "$userId" }
          }
        },
        { $project: {
            vehicleModel: { $ifNull: ["$_id", "Non spécifié"] },
            count: 1,
            averageCompletionTimeMinutes: { 
              $divide: [{ $ifNull: ["$averageCompletionTime", 0] }, 60000]  // Convertir ms en minutes
            },
            uniquePreparators: { $size: "$preparators" }
          }
        },
        { $sort: { count: -1 } }
      ]);
      
      // Calculer des statistiques supplémentaires
      const totalPreparations = modelStats.reduce((sum, model) => sum + model.count, 0);
      
      // Transformer les résultats
      const formattedStats = modelStats.map(model => ({
        vehicleModel: model.vehicleModel === "" ? "Non spécifié" : model.vehicleModel,
        count: model.count,
        percentage: Math.round((model.count / totalPreparations) * 100),
        averageCompletionTimeMinutes: Math.round(model.averageCompletionTimeMinutes),
        uniquePreparators: model.uniquePreparators
      }));
      
      res.json({
        totalVehicleModels: formattedStats.length,
        totalPreparations,
        modelStats: formattedStats
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques par modèle:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  /**
   * Récupère les heures de pointe des préparations
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async getPeakHours(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // Construire la requête
      const query = { status: 'completed' };
      
      // Ajouter les filtres de date si nécessaire
      if (startDate || endDate) {
        query.startTime = {};
        if (startDate) {
          query.startTime.$gte = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          query.startTime.$lte = endDateTime;
        }
      }
      
      // Utiliser les agrégations MongoDB pour obtenir les statistiques par heure
      const hourlyStats = await Preparation.aggregate([
        { $match: query },
        { $project: {
            hour: { $hour: "$startTime" },
            dayOfWeek: { $dayOfWeek: "$startTime" },
            tasks: 1
          }
        },
        { $group: {
            _id: { hour: "$hour", dayOfWeek: "$dayOfWeek" },
            count: { $sum: 1 },
            exteriorWashing: { 
              $sum: { $cond: [{ $eq: ["$tasks.exteriorWashing.status", "completed"] }, 1, 0] }
            },
            interiorCleaning: { 
              $sum: { $cond: [{ $eq: ["$tasks.interiorCleaning.status", "completed"] }, 1, 0] }
            },
            refueling: { 
              $sum: { $cond: [{ $eq: ["$tasks.refueling.status", "completed"] }, 1, 0] }
            },
            parking: { 
              $sum: { $cond: [{ $eq: ["$tasks.parking.status", "completed"] }, 1, 0] }
            }
          }
        },
        { $project: {
            _id: 0,
            hour: "$_id.hour",
            dayOfWeek: "$_id.dayOfWeek",
            count: 1,
            exteriorWashing: 1,
            interiorCleaning: 1,
            refueling: 1,
            parking: 1
          }
        },
        { $sort: { dayOfWeek: 1, hour: 1 } }
      ]);
      
      // Transformer les résultats pour un format plus convivial
      const daysOfWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      
      // Organiser par jour de la semaine
      const byDayOfWeek = {};
      daysOfWeek.forEach((day, index) => {
        byDayOfWeek[day] = {
          dayIndex: index + 1,
          hourly: Array(24).fill().map((_, hourIndex) => ({
            hour: hourIndex,
            count: 0,
            exteriorWashing: 0,
            interiorCleaning: 0,
            refueling: 0,
            parking: 0
          }))
        };
      });
      
      // Remplir avec les données réelles
      hourlyStats.forEach(stat => {
        const day = daysOfWeek[stat.dayOfWeek - 1];
        byDayOfWeek[day].hourly[stat.hour] = {
          hour: stat.hour,
          count: stat.count,
          exteriorWashing: stat.exteriorWashing,
          interiorCleaning: stat.interiorCleaning,
          refueling: stat.refueling,
          parking: stat.parking
        };
      });
      
      // Identifier les heures de pointe globales
      const allHourlyData = hourlyStats.reduce((acc, stat) => {
        const hour = stat.hour;
        if (!acc[hour]) {
          acc[hour] = {
            hour,
            count: 0,
            exteriorWashing: 0,
            interiorCleaning: 0,
            refueling: 0,
            parking: 0
          };
        }
        acc[hour].count += stat.count;
        acc[hour].exteriorWashing += stat.exteriorWashing;
        acc[hour].interiorCleaning += stat.interiorCleaning;
        acc[hour].refueling += stat.refueling;
        acc[hour].parking += stat.parking;
        return acc;
      }, {});
      
      const peakHours = Object.values(allHourlyData)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      res.json({
        peakHours,
        byDayOfWeek
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des heures de pointe:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
};

module.exports = analyticsController;