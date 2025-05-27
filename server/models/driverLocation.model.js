// 1. Backend: Modèle pour stocker les positions
// server/models/driverLocation.model.js
const mongoose = require('mongoose');

const driverLocationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movement',
    required: true
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  speed: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour recherche efficace
driverLocationSchema.index({ movementId: 1, timestamp: -1 });
driverLocationSchema.index({ userId: 1, timestamp: -1 });

const DriverLocation = mongoose.model('DriverLocation', driverLocationSchema);
module.exports = DriverLocation;