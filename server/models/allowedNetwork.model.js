// server/models/allowedNetwork.model.js
const mongoose = require('mongoose');

const allowedNetworkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  ipRange: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
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

const AllowedNetwork = mongoose.model('AllowedNetwork', allowedNetworkSchema);
module.exports = AllowedNetwork;