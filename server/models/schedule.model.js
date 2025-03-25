// server/models/schedule.model.js
const mongoose = require('mongoose');

const scheduleEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  // Ajout d'un type de journée
  entryType: {
    type: String,
    enum: ['work', 'rest'],
    default: 'work'
  },
  startTime: {
    type: String,  // Format "HH:MM"
    required: function() { return this.entryType === 'work'; } // Obligatoire uniquement pour les jours de travail
  },
  endTime: {
    type: String,  // Format "HH:MM"
    required: function() { return this.entryType === 'work'; } // Obligatoire uniquement pour les jours de travail
  },
  tasks: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index pour rechercher efficacement les entrées de planning par utilisateur et jour
scheduleEntrySchema.index({ userId: 1, day: 1 });

const ScheduleEntry = mongoose.model('ScheduleEntry', scheduleEntrySchema);

module.exports = ScheduleEntry;