// server/controllers/driverAnalytics.controller.js
const driverPerformanceService = require('../services/driverPerformance.service');
const User = require('../models/user.model');
const Movement = require('../models/movement.model');

/**
 * Contrôleur pour gérer les analytics des performances des chauffeurs
 */
const driverAnalyticsController = {
  /**
   * Récupère les performances d'un chauffeur spécifique
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async getDriverPerformance(req, res) {
    try {
      const { userId } = req.params;
      const { refresh, startDate, endDate } = req.query;
      
      // Vérifier que l'utilisateur existe et est un chauffeur
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Chauffeur non trouvé' });
      }
      
      if (user.role !== 'driver') {
        return res.status(400).json({ message: 'L\'utilisateur n\'est pas un chauffeur' });
      }
      
      // Créer un objet plage de dates si nécessaire
      const dateRange = {};
      if (startDate) dateRange.startDate = startDate;
      if (endDate) dateRange.endDate = endDate;
      
      // Générer les métriques de performance
      const performance = await driverPerformanceService.generateDriverPerformance(userId, dateRange);
      
      if (!performance) {
        return res.status(404).json({ message: 'Pas de données de performance disponibles' });
      }
      
      // Ajouter les infos du chauffeur
      performance.driverInfo = {
        _id: user._id,
        username: user.username,
        fullName: user.fullName
      };
      
      res.json(performance);
    } catch (error) {
      console.error('Erreur lors de la récupération des performances du chauffeur:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },
  
  /**
   * Compare les performances entre chauffeurs
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async compareDrivers(req, res) {
    try {
      const { userIds, startDate, endDate } = req.query;
      
      // Si userIds est fourni, le convertir en tableau
      let driverIds = [];
      if (userIds) {
        driverIds = Array.isArray(userIds) ? userIds : userIds.split(',');
        
        // Vérifier que tous les utilisateurs sont des chauffeurs
        const users = await User.find({ 
          _id: { $in: driverIds },
          role: 'driver'
        }).select('_id');
        
        if (users.length !== driverIds.length) {
          return res.status(400).json({ 
            message: 'Certains utilisateurs spécifiés n\'existent pas ou ne sont pas des chauffeurs' 
          });
        }
      }
      
      // Créer un objet plage de dates si nécessaire
      const dateRange = {};
      if (startDate) dateRange.startDate = startDate;
      if (endDate) dateRange.endDate = endDate;
      
      // Récupérer les données comparatives
      const compareData = await driverPerformanceService.compareDrivers(driverIds, dateRange);
      
      // Récupérer les métriques globales
      const globalMetrics = await driverPerformanceService.generateGlobalDriverMetrics(dateRange);
      
      res.json({
        comparativeData: compareData,
        globalMetrics
      });
    } catch (error) {
      console.error('Erreur lors de la comparaison des chauffeurs:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },
  
  /**
   * Récupère les métriques quotidiennes pour un chauffeur
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async getDriverDailyMetrics(req, res) {
    try {
      const { userId, startDate, endDate } = req.query;
      
      // Vérifier que l'utilisateur est un chauffeur si userId est fourni
      if (userId) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: 'Chauffeur non trouvé' });
        }
        
        if (user.role !== 'driver') {
          return res.status(400).json({ message: 'L\'utilisateur n\'est pas un chauffeur' });
        }
      }
      
      // Créer un objet plage de dates si nécessaire
      const dateRange = {};
      if (startDate) dateRange.startDate = startDate;
      if (endDate) dateRange.endDate = endDate;
      
      // Générer les métriques de performance
      const performance = await driverPerformanceService.generateDriverPerformance(userId, dateRange);
      
      if (!performance) {
        return res.status(404).json({ message: 'Pas de données de performance disponibles' });
      }
      
      // Si un userId est fourni, ajouter les infos du chauffeur
      if (userId) {
        const user = await User.findById(userId).select('username fullName');
        if (user) {
          performance.driverInfo = {
            _id: userId,
            username: user.username,
            fullName: user.fullName
          };
        }
      }
      
      res.json({
        driverId: userId,
        dailyMetrics: performance.dailyMetrics
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des métriques quotidiennes:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },
  
  /**
   * Récupère les métriques globales pour tous les chauffeurs
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async getGlobalDriverMetrics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // Créer un objet plage de dates si nécessaire
      const dateRange = {};
      if (startDate) dateRange.startDate = startDate;
      if (endDate) dateRange.endDate = endDate;
      
      // Récupérer les métriques globales
      const globalMetrics = await driverPerformanceService.generateGlobalDriverMetrics(dateRange);
      
      res.json(globalMetrics);
    } catch (error) {
      console.error('Erreur lors de la récupération des métriques globales des chauffeurs:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },
  
  /**
   * Récupère les statistiques des mouvements par destination
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   */
  async getDestinationStats(req, res) {
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
      
      // Utiliser les agrégations MongoDB pour obtenir les statistiques par destination
      const destinationStats = await Movement.aggregate([
        { $match: query },
        { $group: {
            _id: "$arrivalLocation.name",
            count: { $sum: 1 },
            averageCompletionTime: { 
              $avg: { 
                $cond: [
                  { $and: [{ $ne: ["$departureTime", null] }, { $ne: ["$arrivalTime", null] }] },
                  { $subtract: ["$arrivalTime", "$departureTime"] },
                  null
                ]
              } 
            },
            drivers: { $addToSet: "$userId" }
          }
        },
        { $project: {
            destination: "$_id",
            count: 1,
            averageCompletionTimeMinutes: { 
              $divide: [{ $ifNull: ["$averageCompletionTime", 0] }, 60000]  // Convertir ms en minutes
            },
            uniqueDrivers: { $size: "$drivers" }
          }
        },
        { $sort: { count: -1 } }
      ]);
      
      // Calculer des statistiques supplémentaires
      const totalMovements = destinationStats.reduce((sum, dest) => sum + dest.count, 0);
      
      // Transformer les résultats
      const formattedStats = destinationStats.map(dest => ({
        destination: dest.destination || "Non spécifiée",
        count: dest.count,
        percentage: totalMovements > 0 ? Math.round((dest.count / totalMovements) * 100) : 0,
        averageCompletionTimeMinutes: Math.round(dest.averageCompletionTimeMinutes || 0),
        uniqueDrivers: dest.uniqueDrivers
      }));
      
      res.json({
        totalDestinations: formattedStats.length,
        totalMovements,
        destinationStats: formattedStats
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques par destination:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },
  
  /**
   * Récupère les heures de pointe pour les mouvements
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
        query.departureTime = {};
        if (startDate) {
          query.departureTime.$gte = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          query.departureTime.$lte = endDateTime;
        }
      }
      
      // Utiliser les agrégations MongoDB pour obtenir les statistiques par heure
      const hourlyStats = await Movement.aggregate([
        { $match: query },
        { $match: { departureTime: { $ne: null } } },
        { $project: {
            hour: { $hour: "$departureTime" },
            dayOfWeek: { $dayOfWeek: "$departureTime" }
          }
        },
        { $group: {
            _id: { hour: "$hour", dayOfWeek: "$dayOfWeek" },
            count: { $sum: 1 }
          }
        },
        { $project: {
            _id: 0,
            hour: "$_id.hour",
            dayOfWeek: "$_id.dayOfWeek",
            count: 1
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
            count: 0
          }))
        };
      });
      
      // Remplir avec les données réelles
      hourlyStats.forEach(stat => {
        const day = daysOfWeek[stat.dayOfWeek - 1];
        byDayOfWeek[day].hourly[stat.hour] = {
          hour: stat.hour,
          count: stat.count
        };
      });
      
      // Identifier les heures de pointe globales
      const allHourlyData = hourlyStats.reduce((acc, stat) => {
        const hour = stat.hour;
        if (!acc[hour]) {
          acc[hour] = {
            hour,
            count: 0
          };
        }
        acc[hour].count += stat.count;
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

module.exports = driverAnalyticsController;