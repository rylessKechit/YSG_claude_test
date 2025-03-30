// server/models/preparation.model.js
const mongoose = require('mongoose');

// Schéma pour les photos liées à une tâche spécifique
const taskPhotoSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Schéma pour les photos additionnelles avec description
const additionalPhotoSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String
  }
});

// Schéma pour les photos d'une tâche
const taskPhotosSchema = new mongoose.Schema({
  before: taskPhotoSchema,
  after: taskPhotoSchema,
  additional: [additionalPhotoSchema]
});

// Schéma pour une tâche
const taskSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  startedAt: Date,
  completedAt: Date,
  notes: String,
  photos: {
    type: taskPhotosSchema,
    default: { additional: [] }
  },
  // Champs spécifiques conservés pour certaines tâches
  amount: Number, // pour refueling (litres)
  departureLocation: {
    name: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }, // pour vehicleTransfer
  arrivalLocation: {
    name: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  } // pour vehicleTransfer
});

const preparationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timeLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeLog'
  },
  licensePlate: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  agency : {
    type: String,
  },
  vehicleModel: {
    type: String,
    trim: true
  },
  tasks: {
    exteriorWashing: {
      type: taskSchema,
      default: () => ({})
    },
    interiorCleaning: {
      type: taskSchema,
      default: () => ({})
    },
    refueling: {
      type: taskSchema,
      default: () => ({})
    },
    // Ajout de la nouvelle tâche "stationnement"
    parking: {
      type: taskSchema,
      default: () => ({})
    }
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  // Conserver ce tableau pour les photos générales de la préparation (dommages, etc.)
  photos: [{
    url: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['damage', 'other'],
      default: 'other'
    }
  }],
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Index pour rechercher efficacement les préparations par plaque d'immatriculation
preparationSchema.index({ licensePlate: 1 });
// Index pour rechercher les préparations d'un utilisateur
preparationSchema.index({ userId: 1, status: 1 });

const Preparation = mongoose.model('Preparation', preparationSchema);

module.exports = Preparation;