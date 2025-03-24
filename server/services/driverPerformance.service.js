// server/services/driverPerformance.service.js
const Movement = require('../models/movement.model');
const TimeLog = require('../models/timelog.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

class DriverPerformanceService {
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
   * Récupère tous les mouvements terminés d'un chauffeur
   * @param {String} userId - ID du chauffeur
   * @param {Object} dateRange - Plage de dates optionnelle
   * @returns {Promise<Array>} - Liste des mouvements
   */
  async getCompletedMovements(userId, dateRange = {}) {
    const query = { 
      userId: userId ? mongoose.Types.ObjectId(userId) : { $exists: true },
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

    return await Movement.find(query)
      .populate('userId', 'username fullName')
      .sort({ createdAt: 1 });
  }

  /**
   * Récupère les journées de travail d'un chauffeur
   * @param {String} userId - ID du chauffeur
   * @param {Object} dateRange - Plage de dates optionnelle
   * @returns {Promise<Array>} - Liste des pointages
   */
  async getWorkingDays(userId, dateRange = {}) {
    const query = { 
      userId: userId ? mongoose.Types.ObjectId(userId) : { $exists: true },
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
   * Groupe les mouvements par jour
   * @param {Array} movements - Liste des mouvements
   * @returns {Object} - Mouvements groupés par jour
   */
  groupMovementsByDay(movements) {
    const groupedByDay = {};
    
    movements.forEach(movement => {
      const date = new Date(movement.createdAt);
      const dateKey = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
      
      if (!groupedByDay[dateKey]) {
        groupedByDay[dateKey] = [];
      }
      
      groupedByDay[dateKey].push(movement);
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
   * Calcule les métriques quotidiennes pour les chauffeurs
   * @param {Object} movementsByDay - Mouvements groupés par jour
   * @param {Object} workingHoursByDay - Heures de travail par jour
   * @returns {Array} - Métriques quotidiennes
   */
  calculateDailyMetrics(movementsByDay, workingHoursByDay) {
    const dailyMetrics = [];
    
    for (const [dateKey, movements] of Object.entries(movementsByDay)) {
      const completedMovements = movements.filter(mov => mov.status === 'completed');
      
      // Calcul des temps moyens
      let preparationTimeTotal = 0;
      let movementTimeTotal = 0;
      let completionTimeTotal = 0;
      let movementsWithPreparationTime = 0;
      let movementsWithMovementTime = 0;
      let movementsWithCompletionTime = 0;
      
      completedMovements.forEach(movement => {
        // Temps de préparation (assigned -> in-progress)
        if (movement.status === 'completed' && movement.departureTime) {
          const preparationTime = this.calculateDuration(movement.createdAt, movement.departureTime);
          if (preparationTime > 0) {
            preparationTimeTotal += preparationTime;
            movementsWithPreparationTime++;
          }
        }
        
        // Temps du mouvement (departure -> arrival)
        if (movement.status === 'completed' && movement.departureTime && movement.arrivalTime) {
          const movementTime = this.calculateDuration(movement.departureTime, movement.arrivalTime);
          if (movementTime > 0) {
            movementTimeTotal += movementTime;
            movementsWithMovementTime++;
          }
        }
        
        // Temps total (creation -> completion)
        if (movement.status === 'completed' && movement.arrivalTime) {
          const completionTime = this.calculateDuration(movement.createdAt, movement.arrivalTime);
          if (completionTime > 0) {
            completionTimeTotal += completionTime;
            movementsWithCompletionTime++;
          }
        }
      });
      
      const workingHours = workingHoursByDay[dateKey] || 0;
      
      const dailyMetric = {
        date: new Date(dateKey),
        totalMovements: movements.length,
        completedMovements: completedMovements.length,
        averagePreparationTime: movementsWithPreparationTime > 0 ? Math.round(preparationTimeTotal / movementsWithPreparationTime) : 0,
        averageMovementTime: movementsWithMovementTime > 0 ? Math.round(movementTimeTotal / movementsWithMovementTime) : 0,
        averageCompletionTime: movementsWithCompletionTime > 0 ? Math.round(completionTimeTotal / movementsWithCompletionTime) : 0,
        workingHours: workingHours,
        productivity: workingHours > 0 ? Math.round((completedMovements.length / workingHours) * 10) / 10 : 0
      };
      
      dailyMetrics.push(dailyMetric);
    }
    
    return dailyMetrics.sort((a, b) => a.date - b.date);
  }

  /**
   * Calcule les tendances récentes pour un chauffeur
   * @param {Array} dailyMetrics - Métriques quotidiennes
   * @returns {Object} - Tendances sur différentes périodes
   */
  calculateTrends(dailyMetrics) {
    if (dailyMetrics.length === 0) {
      return {
        weekly: { movementsCount: 0, averageCompletionTime: 0, growthRate: 0 },
        monthly: { movementsCount: 0, averageCompletionTime: 0, growthRate: 0 },
        quarterly: { movementsCount: 0, averageCompletionTime: 0, growthRate: 0 }
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
        movementsCount: 0,
        averageCompletionTime: 0,
        growthRate: 0
      };
    }
    
    // Trier par date
    metrics.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const totalMovements = metrics.reduce((sum, day) => sum + day.completedMovements, 0);
    
    const totalCompletionTime = metrics.reduce((sum, day) => {
      return sum + (day.averageCompletionTime * day.completedMovements);
    }, 0);
    
    const averageCompletionTime = totalMovements > 0 
      ? Math.round(totalCompletionTime / totalMovements) 
      : 0;
    
    // Calcul du taux de croissance
    let growthRate = 0;
    
    if (metrics.length >= 2) {
      // Diviser la période en deux moitiés
      const midPoint = Math.floor(metrics.length / 2);
      const firstHalf = metrics.slice(0, midPoint);
      const secondHalf = metrics.slice(midPoint);
      
      const firstHalfTotal = firstHalf.reduce((sum, day) => sum + day.completedMovements, 0);
      const secondHalfTotal = secondHalf.reduce((sum, day) => sum + day.completedMovements, 0);
      
      if (firstHalfTotal > 0) {
        growthRate = Math.round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100);
      }
    }
    
    return {
      movementsCount: totalMovements,
      averageCompletionTime: averageCompletionTime,
      growthRate: growthRate
    };
  }

  /**
   * Génère des métriques de performance pour un chauffeur
   * @param {String} userId - ID du chauffeur
   * @param {Object} dateRange - Plage de dates optionnelle
   * @returns {Promise<Object>} - Performances calculées
   */
  async generateDriverPerformance(userId, dateRange = {}) {
    // Récupérer les mouvements et les pointages
    const [movements, timeLogs] = await Promise.all([
      this.getCompletedMovements(userId, dateRange),
      this.getWorkingDays(userId, dateRange)
    ]);
    
    if (movements.length === 0) {
      return {
        driverId: userId,
        metrics: {
          totalMovements: 0,
          completedMovements: 0,
          averagePreparationTime: 0,
          averageMovementTime: 0,
          averageCompletionTime: 0,
          movementsPerDay: 0
        },
        dailyMetrics: [],
        trends: {
          weekly: { movementsCount: 0, averageCompletionTime: 0, growthRate: 0 },
          monthly: { movementsCount: 0, averageCompletionTime: 0, growthRate: 0 },
          quarterly: { movementsCount: 0, averageCompletionTime: 0, growthRate: 0 }
        }
      };
    }
    
    // Grouper les mouvements par jour
    const movementsByDay = this.groupMovementsByDay(movements);
    
    // Calculer les heures de travail par jour
    const workingHoursByDay = this.calculateWorkingHoursByDay(timeLogs);
    
    // Calculer les métriques quotidiennes
    const dailyMetrics = this.calculateDailyMetrics(movementsByDay, workingHoursByDay);
    
    // Calculer les tendances
    const trends = this.calculateTrends(dailyMetrics);
    
    // Calculer les temps moyens globaux
    let totalPreparationTime = 0;
    let totalMovementTime = 0;
    let totalCompletionTime = 0;
    let movementsWithPreparationTime = 0;
    let movementsWithMovementTime = 0;
    let movementsWithCompletionTime = 0;
    
    movements.forEach(movement => {
      // Temps de préparation (assigned -> departure)
      if (movement.status === 'completed' && movement.departureTime) {
        const preparationTime = this.calculateDuration(movement.createdAt, movement.departureTime);
        if (preparationTime > 0) {
          totalPreparationTime += preparationTime;
          movementsWithPreparationTime++;
        }
      }
      
      // Temps du mouvement (departure -> arrival)
      if (movement.status === 'completed' && movement.departureTime && movement.arrivalTime) {
        const movementTime = this.calculateDuration(movement.departureTime, movement.arrivalTime);
        if (movementTime > 0) {
          totalMovementTime += movementTime;
          movementsWithMovementTime++;
        }
      }
      
      // Temps total (creation -> completion)
      if (movement.status === 'completed' && movement.arrivalTime) {
        const completionTime = this.calculateDuration(movement.createdAt, movement.arrivalTime);
        if (completionTime > 0) {
          totalCompletionTime += completionTime;
          movementsWithCompletionTime++;
        }
      }
    });
    
    // Calculer les jours uniques
    const uniqueDays = new Set(movements.map(mov => 
      new Date(mov.createdAt).toISOString().split('T')[0]
    )).size;
    
    // Préparer les métriques globales
    const metrics = {
      totalMovements: movements.length,
      completedMovements: movements.filter(mov => mov.status === 'completed').length,
      averagePreparationTime: movementsWithPreparationTime > 0 ? Math.round(totalPreparationTime / movementsWithPreparationTime) : 0,
      averageMovementTime: movementsWithMovementTime > 0 ? Math.round(totalMovementTime / movementsWithMovementTime) : 0,
      averageCompletionTime: movementsWithCompletionTime > 0 ? Math.round(totalCompletionTime / movementsWithCompletionTime) : 0,
      movementsPerDay: uniqueDays > 0 ? Math.round((movements.length / uniqueDays) * 10) / 10 : 0
    };
    
    // Résultat final
    return {
      driverId: userId,
      metrics,
      dailyMetrics,
      trends
    };
  }
  
  /**
   * Compare les performances de plusieurs chauffeurs
   * @param {Array} userIds - IDs des chauffeurs à comparer
   * @param {Object} dateRange - Plage de dates optionnelle
   * @returns {Promise<Array>} - Données comparatives
   */
  async compareDrivers(userIds, dateRange = {}) {
    // Si aucun ID n'est fourni, récupérer tous les chauffeurs
    if (!userIds || userIds.length === 0) {
      const drivers = await User.find({ role: 'driver' }).select('_id');
      userIds = drivers.map(user => user._id);
    }
    
    // Récupérer les données pour chaque chauffeur
    const driverPerformances = [];
    
    for (const userId of userIds) {
      try {
        const driverData = await this.generateDriverPerformance(userId, dateRange);
        if (driverData) {
          // Récupérer les informations de l'utilisateur
          const user = await User.findById(userId).select('username fullName');
          if (user) {
            driverData.driverInfo = {
              _id: userId,
              username: user.username,
              fullName: user.fullName
            };
          }
          driverPerformances.push(driverData);
        }
      } catch (error) {
        console.error(`Erreur lors du calcul des performances pour le chauffeur ${userId}:`, error);
        // Continuer avec le chauffeur suivant
      }
    }
    
    return driverPerformances;
  }
  
  /**
   * Génère des métriques globales pour tous les chauffeurs
   * @param {Object} dateRange - Plage de dates optionnelle
   * @returns {Promise<Object>} - Métriques globales
   */
  async generateGlobalDriverMetrics(dateRange = {}) {
    // Récupérer tous les chauffeurs
    const drivers = await User.find({ role: 'driver' }).select('_id');
    
    // Récupérer tous les mouvements terminés
    const query = { 
      status: 'completed',
      userId: { $in: drivers.map(d => d._id) }
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
    
    const completedMovements = await Movement.find(query);
    
    if (completedMovements.length === 0) {
      return {
        totalMovements: 0,
        driversCount: drivers.length,
        averagePreparationTime: 0,
        averageMovementTime: 0,
        averageCompletionTime: 0,
        topPerformer: null
      };
    }
    
    // Calculer les métriques globales
    let totalPreparationTime = 0;
    let totalMovementTime = 0;
    let totalCompletionTime = 0;
    let movementsWithPreparationTime = 0;
    let movementsWithMovementTime = 0;
    let movementsWithCompletionTime = 0;
    
    // Compteur par chauffeur pour identifier le meilleur
    const driverMovementCounts = {};
    
    completedMovements.forEach(movement => {
      // Compter les mouvements par chauffeur
      const driverId = movement.userId.toString();
      if (!driverMovementCounts[driverId]) {
        driverMovementCounts[driverId] = {
          count: 0,
          preparationTime: 0,
          movementTime: 0,
          completionTime: 0,
          withPreparationTime: 0,
          withMovementTime: 0,
          withCompletionTime: 0
        };
      }
      driverMovementCounts[driverId].count++;
      
      // Temps de préparation (assigned -> departure)
      if (movement.departureTime) {
        const preparationTime = this.calculateDuration(movement.createdAt, movement.departureTime);
        if (preparationTime > 0) {
          totalPreparationTime += preparationTime;
          movementsWithPreparationTime++;
          driverMovementCounts[driverId].preparationTime += preparationTime;
          driverMovementCounts[driverId].withPreparationTime++;
        }
      }
      
      // Temps du mouvement (departure -> arrival)
      if (movement.departureTime && movement.arrivalTime) {
        const movementTime = this.calculateDuration(movement.departureTime, movement.arrivalTime);
        if (movementTime > 0) {
          totalMovementTime += movementTime;
          movementsWithMovementTime++;
          driverMovementCounts[driverId].movementTime += movementTime;
          driverMovementCounts[driverId].withMovementTime++;
        }
      }
      
      // Temps total (creation -> completion)
      if (movement.arrivalTime) {
        const completionTime = this.calculateDuration(movement.createdAt, movement.arrivalTime);
        if (completionTime > 0) {
          totalCompletionTime += completionTime;
          movementsWithCompletionTime++;
          driverMovementCounts[driverId].completionTime += completionTime;
          driverMovementCounts[driverId].withCompletionTime++;
        }
      }
    });
    
    // Trouver le meilleur chauffeur (pour l'instant, basé sur le nombre de mouvements)
    let topPerformerId = null;
    let topPerformerCount = 0;
    
    for (const [driverId, data] of Object.entries(driverMovementCounts)) {
      if (data.count > topPerformerCount) {
        topPerformerCount = data.count;
        topPerformerId = driverId;
      }
    }
    
    let topPerformer = null;
    if (topPerformerId) {
      const driver = await User.findById(topPerformerId).select('username fullName');
      if (driver) {
        const data = driverMovementCounts[topPerformerId];
        topPerformer = {
          driverId: topPerformerId,
          username: driver.username,
          fullName: driver.fullName,
          movementsCount: data.count,
          averageCompletionTime: data.withCompletionTime > 0 
            ? Math.round(data.completionTime / data.withCompletionTime) 
            : 0
        };
      }
    }
    
    return {
      totalMovements: completedMovements.length,
      driversCount: drivers.length,
      averagePreparationTime: movementsWithPreparationTime > 0 
        ? Math.round(totalPreparationTime / movementsWithPreparationTime) 
        : 0,
      averageMovementTime: movementsWithMovementTime > 0 
        ? Math.round(totalMovementTime / movementsWithMovementTime) 
        : 0,
      averageCompletionTime: movementsWithCompletionTime > 0 
        ? Math.round(totalCompletionTime / movementsWithCompletionTime) 
        : 0,
      topPerformer
    };
  }
}

module.exports = new DriverPerformanceService();