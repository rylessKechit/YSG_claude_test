// server/models/movement.model.js - Ajout du champ deadline
const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
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
    enum: [
      'departure', 'arrival', 'damage', 'other',
      // Nouveaux types de photos
      'front', 'passenger', 'driver', 'rear', 'windshield', 'roof', 'meter'
    ],
    default: 'other'
  },
  // Nouveau champ pour distinguer les photos de départ des photos d'arrivée
  photoType: {
    type: String,
    enum: ['departure', 'arrival'],
    default: 'departure'
  }
});

const movementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  vehicleModel: {
    type: String,
    trim: true
  },
  departureLocation: {
    name: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  arrivalLocation: {
    name: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  departureTime: {
    type: Date
  },
  arrivalTime: {
    type: Date
  },
  // Nouveau champ pour la deadline
  deadline: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'preparing', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  photos: [photoSchema],
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Index pour rechercher efficacement les mouvements par plaque d'immatriculation
movementSchema.index({ licensePlate: 1 });
// Index pour rechercher les mouvements d'un utilisateur
movementSchema.index({ userId: 1, status: 1 });
// Nouvel index pour trier efficacement par deadline
movementSchema.index({ status: 1, deadline: 1 });

const Movement = mongoose.model('Movement', movementSchema);

module.exports = Movement;