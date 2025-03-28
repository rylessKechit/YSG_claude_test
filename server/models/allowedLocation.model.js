// server/models/allowedLocation.model.js
const mongoose = require('mongoose');

const allowedLocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  radius: {
    type: Number,
    required: true,
    default: 500  // Rayon par défaut: 500 mètres
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const AllowedLocation = mongoose.model('AllowedLocation', allowedLocationSchema);
module.exports = AllowedLocation;