const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['driver', 'admin', 'preparator', 'direction', 'team-leader'], // Mise à jour pour inclure tous les rôles
    default: 'driver'
  }
}, {
  timestamps: true
});

// Méthode avant sauvegarde pour hacher le mot de passe
userSchema.pre('save', async function(next) {
  // Seulement hacher le mot de passe s'il a été modifié ou est nouveau
  if (!this.isModified('password')) return next();
  
  try {
    // Générer un sel et hacher le mot de passe
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;