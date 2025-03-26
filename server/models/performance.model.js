// server/models/performance.model.js
const mongoose = require('mongoose');

// Schéma pour les métriques par type de tâche
const taskMetricsSchema = new mongoose.Schema({
  count: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,  // Durée totale en minutes
    default: 0
  },
  averageDuration: {
    type: Number,  // Durée moyenne en minutes
    default: 0
  },
  minDuration: {
    type: Number,  // Durée minimale en minutes
    default: 0
  },
  maxDuration: {
    type: Number,  // Durée maximale en minutes
    default: 0
  }
}, { _id: false });

// Schéma pour les métriques journalières
const dailyMetricsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  totalPreparations: {
    type: Number,
    default: 0
  },
  completedPreparations: {
    type: Number,
    default: 0
  },
  averageCompletionTime: {
    type: Number,  // En minutes
    default: 0
  },
  taskMetrics: {
    exteriorWashing: {
      type: taskMetricsSchema,
      default: () => ({})
    },
    interiorCleaning: {
      type: taskMetricsSchema,
      default: () => ({})
    },
    refueling: {
      type: taskMetricsSchema,
      default: () => ({})
    },
    parking: {
      type: taskMetricsSchema,
      default: () => ({})
    }
  },
  workingHours: {
    type: Number,  // Durée de travail en heures
    default: 0
  },
  productivity: {
    type: Number,  // Préparations par heure
    default: 0
  }
});

// Schéma principal des performances des préparateurs
const preparatorPerformanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Métriques globales
  totalPreparations: {
    type: Number,
    default: 0
  },
  completedPreparations: {
    type: Number,
    default: 0
  },
  averagePreparationsPerDay: {
    type: Number,
    default: 0
  },
  // Métriques par type de tâche (cumul)
  taskMetrics: {
    exteriorWashing: {
      type: taskMetricsSchema,
      default: () => ({})
    },
    interiorCleaning: {
      type: taskMetricsSchema,
      default: () => ({})
    },
    refueling: {
      type: taskMetricsSchema,
      default: () => ({})
    },
    parking: {
      type: taskMetricsSchema,
      default: () => ({})
    }
  },
  // Taux de complétion des tâches (pourcentage des préparations où la tâche est terminée)
  completionRates: {
    exteriorWashing: {
      type: Number,
      default: 0
    },
    interiorCleaning: {
      type: Number,
      default: 0
    },
    refueling: {
      type: Number,
      default: 0
    },
    parking: {
      type: Number,
      default: 0
    }
  },
  // Métriques sur les plages de temps
  periodMetrics: {
    daily: [dailyMetricsSchema],
    // Agrégations hebdomadaires et mensuelles calculées dynamiquement
    lastUpdateDate: {
      type: Date,
      default: Date.now
    }
  },
  // Score global de performance (calculé à partir de l'efficacité et du volume)
  performanceScore: {
    type: Number,
    default: 0
  },
  // Tendances récentes (périodes de 7, 30 et 90 jours)
  trends: {
    weekly: {
      preparationsCount: {
        type: Number,
        default: 0
      },
      averageCompletionTime: {
        type: Number,
        default: 0
      },
      growthRate: {
        type: Number,
        default: 0
      }
    },
    monthly: {
      preparationsCount: {
        type: Number,
        default: 0
      },
      averageCompletionTime: {
        type: Number,
        default: 0
      },
      growthRate: {
        type: Number,
        default: 0
      }
    },
    quarterly: {
      preparationsCount: {
        type: Number,
        default: 0
      },
      averageCompletionTime: {
        type: Number,
        default: 0
      },
      growthRate: {
        type: Number,
        default: 0
      }
    }
  }
}, {
  timestamps: true
});

// Index pour rechercher efficacement par utilisateur
preparatorPerformanceSchema.index({ userId: 1 });

const PreparatorPerformance = mongoose.model('PreparatorPerformance', preparatorPerformanceSchema);

module.exports = PreparatorPerformance;