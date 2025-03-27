// server/routes/preparation.routes.js
const router = require('express').Router();
const Preparation = require('../models/preparation.model');
const TimeLog = require('../models/timelog.model');
const User = require('../models/user.model');
const { verifyToken, isAdmin, canCreatePreparation } = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');

// Vérifier si préparateur en service
const checkPreparatorActiveTimeLog = async id => await TimeLog.findOne({ userId: id, status: 'active' });

// Validation permissions
const checkPermissions = (preparation, userId, role, res) => {
  if (role !== 'admin' && preparation.userId.toString() !== userId.toString())
    return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette préparation' });
  return null;
};

// Créer une nouvelle préparation
router.post('/', verifyToken, canCreatePreparation, async (req, res) => {
  try {
    const { agency, licensePlate, vehicleModel, notes } = req.body;
    if (!agency) return res.status(400).json({ message: 'L\'agence est requise' });
    if (!licensePlate) return res.status(400).json({ message: 'La plaque d\'immatriculation est requise' });
    
    let userId = req.user._id;
    
    if (req.user.role === 'admin' && req.body.userId) {
      const preparator = await User.findById(req.body.userId);
      if (!preparator) return res.status(404).json({ message: 'Préparateur non trouvé' });
      if (preparator.role !== 'preparator')
        return res.status(400).json({ message: 'L\'utilisateur sélectionné n\'est pas un préparateur' });
      userId = preparator._id;
    }

    const activeTimeLog = await checkPreparatorActiveTimeLog(userId);
    const status = activeTimeLog ? 'in-progress' : 'pending';
    
    const preparation = new Preparation({
      userId,
      timeLogId: activeTimeLog ? activeTimeLog._id : null,
      agency,
      licensePlate,
      vehicleModel,
      status,
      notes,
      startTime: activeTimeLog ? new Date() : null
    });
    
    await preparation.save();
    
    res.status(201).json({
      message: activeTimeLog ? 'Préparation créée et démarrée' : 'Préparation créée, mais le préparateur n\'est pas en service',
      preparation
    });
  } catch (e) {
    console.error('Erreur lors de la création de la préparation:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les préparateurs en service
router.get('/preparators-on-duty', verifyToken, isAdmin, async (req, res) => {
  try {
    const activeLogs = await TimeLog.find({ status: 'active' }).populate('userId', 'username fullName email phone role');
    const preparatorsOnDuty = activeLogs.filter(l => l.userId.role === 'preparator').map(l => ({
      _id: l.userId._id,
      username: l.userId.username,
      fullName: l.userId.fullName,
      email: l.userId.email,
      phone: l.userId.phone,
      serviceStartTime: l.startTime
    }));
    res.json(preparatorsOnDuty);
  } catch (e) {
    console.error('Erreur lors de la récupération des préparateurs en service:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Commencer une tâche (avec photo "before")
router.post('/:id/tasks/:taskType/start', verifyToken, (req, res) => {
  // Utiliser le middleware d'upload pour gérer les photos
  uploadMiddleware.single('photos')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Erreur d\'upload:', err);
        return res.status(400).json({ message: `Erreur lors de l'upload: ${err.message}` });
      }
      
      const { id, taskType } = req.params;
      const { notes } = req.body;
      
      const preparation = await Preparation.findById(id);
      if (!preparation) return res.status(404).json({ message: 'Préparation non trouvée' });
      
      const permError = checkPermissions(preparation, req.user._id, req.user.role, res);
      if (permError) return permError;
      
      const validTasks = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];
      if (!validTasks.includes(taskType)) return res.status(400).json({ message: 'Type de tâche invalide' });
      
      if (!preparation.tasks[taskType]) preparation.tasks[taskType] = { status: 'not_started', photos: { additional: [] } };
      
      if (preparation.tasks[taskType].status !== 'not_started')
        return res.status(400).json({ message: `La tâche ${taskType} est déjà ${preparation.tasks[taskType].status === 'in_progress' ? 'en cours' : 'terminée'}` });
      
      if (!req.file) return res.status(400).json({ message: 'Une photo "before" est requise pour commencer la tâche' });
      
      preparation.tasks[taskType].status = 'in_progress';
      preparation.tasks[taskType].startedAt = new Date();
      preparation.tasks[taskType].notes = notes || preparation.tasks[taskType].notes;
      
      if (!preparation.tasks[taskType].photos) preparation.tasks[taskType].photos = { additional: [] };
      
      // Gestion des différents formats d'URL selon le fournisseur de stockage (S3, Cloudinary, local)
      preparation.tasks[taskType].photos.before = {
        url: req.file.location || req.file.path || req.file.url, // Supporte S3, Cloudinary et local
        timestamp: new Date()
      };
      
      if (preparation.status === 'pending') {
        preparation.status = 'in-progress';
        preparation.startTime = new Date();
      }
      
      await preparation.save();
      
      res.json({ message: `Tâche ${taskType} commencée avec succès`, preparation });
    } catch (e) {
      console.error('Erreur lors du démarrage de la tâche:', e);
      res.status(500).json({ message: `Erreur lors du démarrage de la tâche: ${e.message}` });
    }
  });
});

// Terminer une tâche (avec photo "after")
router.post('/:id/tasks/:taskType/complete', verifyToken, (req, res) => {
  uploadMiddleware.single('photos')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Erreur d\'upload:', err);
        return res.status(400).json({ message: `Erreur lors de l'upload: ${err.message}` });
      }
      
      const { id, taskType } = req.params;
      const { notes, amount, departureLocation, arrivalLocation } = req.body;
      
      const preparation = await Preparation.findById(id);
      if (!preparation) return res.status(404).json({ message: 'Préparation non trouvée' });
      
      const permError = checkPermissions(preparation, req.user._id, req.user.role, res);
      if (permError) return permError;
      
      const validTasks = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];
      if (!validTasks.includes(taskType)) return res.status(400).json({ message: 'Type de tâche invalide' });
      
      if (!preparation.tasks[taskType]) return res.status(400).json({ message: 'La tâche doit d\'abord être commencée' });
      
      if (preparation.tasks[taskType].status !== 'in_progress')
        return res.status(400).json({ message: `La tâche ${taskType} n'est pas en cours. Statut actuel: ${preparation.tasks[taskType].status}` });
      
      if (!req.file) return res.status(400).json({ message: 'Une photo "after" est requise pour terminer la tâche' });
      
      // Ajouter des données spécifiques selon le type de tâche
      if (taskType === 'refueling' && amount) preparation.tasks[taskType].amount = parseFloat(amount);
      
      if (taskType === 'vehicleTransfer') {
        if (departureLocation) {
          try {
            preparation.tasks[taskType].departureLocation = typeof departureLocation === 'string' ?
              JSON.parse(departureLocation) : departureLocation;
          } catch (e) {
            preparation.tasks[taskType].departureLocation = { name: departureLocation };
          }
        }
        if (arrivalLocation) {
          try {
            preparation.tasks[taskType].arrivalLocation = typeof arrivalLocation === 'string' ?
              JSON.parse(arrivalLocation) : arrivalLocation;
          } catch (e) {
            preparation.tasks[taskType].arrivalLocation = { name: arrivalLocation };
          }
        }
      }
      
      preparation.tasks[taskType].status = 'completed';
      preparation.tasks[taskType].completedAt = new Date();
      if (notes) preparation.tasks[taskType].notes = notes;
      
      if (!preparation.tasks[taskType].photos) preparation.tasks[taskType].photos = { additional: [] };
      
      // Gestion des différents formats d'URL selon le fournisseur de stockage (S3, Cloudinary, local)
      preparation.tasks[taskType].photos.after = {
        url: req.file.location || req.file.path || req.file.url, // Supporte S3, Cloudinary et local
        timestamp: new Date()
      };
      
      await preparation.save();
      
      res.json({ message: `Tâche ${taskType} terminée avec succès`, preparation });
    } catch (e) {
      console.error('Erreur lors de la finalisation de la tâche:', e);
      res.status(500).json({ message: `Erreur lors de la finalisation de la tâche: ${e.message}` });
    }
  });
});

// Ajouter une photo additionnelle
router.post('/:id/tasks/:taskType/photos', verifyToken, (req, res) => {
  uploadMiddleware.single('photos')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Erreur d\'upload:', err);
        return res.status(400).json({ message: `Erreur lors de l'upload: ${err.message}` });
      }
      
      const { id, taskType } = req.params;
      const { description } = req.body;
      
      const preparation = await Preparation.findById(id);
      if (!preparation) return res.status(404).json({ message: 'Préparation non trouvée' });
      
      const permError = checkPermissions(preparation, req.user._id, req.user.role, res);
      if (permError) return permError;
      
      const validTasks = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];
      if (!validTasks.includes(taskType)) return res.status(400).json({ message: 'Type de tâche invalide' });
      
      if (!req.file) return res.status(400).json({ message: 'Une photo est requise' });
      
      if (!preparation.tasks[taskType].photos) preparation.tasks[taskType].photos = { additional: [] };
      if (!preparation.tasks[taskType].photos.additional) preparation.tasks[taskType].photos.additional = [];
      
      preparation.tasks[taskType].photos.additional.push({
        url: req.file.location || req.file.path || req.file.url, // Supporte S3, Cloudinary et local
        timestamp: new Date(),
        description: description || ''
      });
      
      await preparation.save();
      
      res.json({ message: 'Photo additionnelle ajoutée avec succès', preparation });
    } catch (e) {
      console.error('Erreur lors de l\'ajout de la photo:', e);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });
});

// Upload batch de photos pour les tâches
router.post('/:id/photos/batch', verifyToken, (req, res) => {
  uploadMiddleware.array('photos')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Erreur d\'upload batch:', err);
        return res.status(400).json({ message: `Erreur lors de l'upload batch: ${err.message}` });
      }
      
      const preparation = await Preparation.findById(req.params.id);
      if (!preparation) return res.status(404).json({ message: 'Préparation non trouvée' });
      
      const permError = checkPermissions(preparation, req.user._id, req.user.role, res);
      if (permError) return permError;
      
      const { taskType } = req.body;
      
      if (!req.files || req.files.length === 0)
        return res.status(400).json({ message: 'Aucune photo n\'a été téléchargée' });
      
      // Si un type de tâche est spécifié, nous ajoutons les photos à cette tâche
      if (taskType) {
        const validTasks = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];
        if (!validTasks.includes(taskType))
          return res.status(400).json({ message: 'Type de tâche invalide' });
        
        // Récupérer les types de photos (before, after, additional)
        const photoPositions = Array.isArray(req.body.photoPositions) ? req.body.photoPositions : [req.body.photoPositions];
        
        if (photoPositions.length !== req.files.length)
          return res.status(400).json({ message: 'Le nombre de positions ne correspond pas au nombre de photos' });
        
        // Vérifier si la tâche existe
        if (!preparation.tasks[taskType]) preparation.tasks[taskType] = { 
          status: 'not_started',
          photos: { additional: [] }
        };
        
        // Pour chaque photo...
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const position = photoPositions[i];
          
          // Selon la position, on ajoute la photo
          if (position === 'before') {
            preparation.tasks[taskType].photos.before = {
              url: file.location || file.path || file.url, // Supporte S3, Cloudinary et local
              timestamp: new Date()
            };
            // Si c'est une photo "before", on met à jour le statut
            if (preparation.tasks[taskType].status === 'not_started') {
              preparation.tasks[taskType].status = 'in_progress';
              preparation.tasks[taskType].startedAt = new Date();
            }
          } else if (position === 'after') {
            preparation.tasks[taskType].photos.after = {
              url: file.location || file.path || file.url, // Supporte S3, Cloudinary et local
              timestamp: new Date()
            };
            // Si c'est une photo "after", on met à jour le statut
            if (preparation.tasks[taskType].status === 'in_progress') {
              preparation.tasks[taskType].status = 'completed';
              preparation.tasks[taskType].completedAt = new Date();
            }
          } else if (position === 'additional') {
            preparation.tasks[taskType].photos.additional.push({
              url: file.location || file.path || file.url, // Supporte S3, Cloudinary et local
              timestamp: new Date(),
              description: ''
            });
          }
        }
        
        // Mise à jour du statut général de la préparation
        if (preparation.status === 'pending') {
          preparation.status = 'in-progress';
          preparation.startTime = new Date();
        }
      } else {
        // Sinon, nous les ajoutons comme photos générales
        const photoTypes = Array.isArray(req.body.photoTypes) ? req.body.photoTypes : [req.body.photoTypes];
        
        if (photoTypes.length !== req.files.length)
          return res.status(400).json({ message: 'Le nombre de types ne correspond pas au nombre de photos' });
        
        // Créer un tableau de photos à ajouter à la préparation
        const photos = req.files.map((file, index) => ({
          url: file.location || file.path || file.url, // Supporte S3, Cloudinary et local
          type: photoTypes[index] || 'other',
          timestamp: new Date()
        }));
        
        preparation.photos.push(...photos);
      }
      
      await preparation.save();
      
      res.json({ 
        message: `${req.files.length} photos ajoutées avec succès`, 
        photosUploaded: req.files.length,
        preparation
      });
    } catch (e) {
      console.error('Erreur lors de l\'upload batch des photos:', e);
      res.status(500).json({ message: 'Erreur serveur lors de l\'upload des photos' });
    }
  });
});

// Terminer une préparation
router.put('/:id/complete', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const preparation = await Preparation.findById(id);
    if (!preparation) return res.status(404).json({ message: 'Préparation non trouvée' });
    
    const permError = checkPermissions(preparation, req.user._id, req.user.role, res);
    if (permError) return permError;
    
    const hasTasks = Object.values(preparation.tasks).some(task => task.status === 'completed');
    if (!hasTasks) return res.status(400).json({ message: 'Vous devez compléter au moins une tâche avant de terminer la préparation' });
    
    preparation.status = 'completed';
    preparation.endTime = new Date();
    if (notes) preparation.notes = notes;
    
    await preparation.save();
    
    res.json({ message: 'Préparation terminée avec succès', preparation });
  } catch (e) {
    console.error('Erreur lors de la fin de la préparation:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Upload photos générales
router.post('/:id/photos', verifyToken, (req, res) => {
  uploadMiddleware.array('photos')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Erreur d\'upload:', err);
        return res.status(400).json({ message: `Erreur lors de l'upload: ${err.message}` });
      }
      
      const { id } = req.params;
      
      const preparation = await Preparation.findById(id);
      if (!preparation) return res.status(404).json({ message: 'Préparation non trouvée' });
      
      const permError = checkPermissions(preparation, req.user._id, req.user.role, res);
      if (permError) return permError;
      
      const { type = 'other' } = req.body;
      
      if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Aucune photo n\'a été téléchargée' });
      
      const photos = req.files.map(file => ({
        url: file.location || file.path || file.url, // Supporte S3, Cloudinary et local
        type,
        timestamp: new Date()
      }));
      
      preparation.photos.push(...photos);
      await preparation.save();
      
      res.json({ message: 'Photos ajoutées avec succès', photos: preparation.photos });
    } catch (e) {
      console.error('Erreur lors de l\'upload des photos:', e);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });
});

// Liste préparations
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, day, userId } = req.query,
          skip = (page - 1) * limit,
          query = {};
    
    if (req.user.role === 'preparator') query.userId = req.user._id;
    if (userId) query.userId = userId;
    if (status) query.status = status;
    
    if (day === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      query.$or = [
        { createdAt: { $gte: today, $lt: tomorrow } },
        { startTime: { $gte: today, $lt: tomorrow } },
        { endTime: { $gte: today, $lt: tomorrow } }
      ];
    }
    
    const preparations = await Preparation.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username fullName');
    
    const total = await Preparation.countDocuments(query);
    
    res.json({
      preparations,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalItems: total
    });
  } catch (e) {
    console.error('Erreur lors de la récupération des préparations:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Détail préparation
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const preparation = await Preparation.findById(id).populate('userId', 'username fullName');
    
    if (!preparation) return res.status(404).json({ message: 'Préparation non trouvée' });
    
    if (req.user.role === 'preparator' && preparation.userId._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à accéder à cette préparation' });
    
    res.json(preparation);
  } catch (e) {
    console.error('Erreur lors de la récupération de la préparation:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Recherche préparations
router.get('/search/plate', verifyToken, async (req, res) => {
  try {
    const { licensePlate } = req.query;
    
    if (!licensePlate) return res.status(400).json({ message: 'Plaque d\'immatriculation requise pour la recherche' });
    
    const query = { licensePlate: { $regex: new RegExp(licensePlate, 'i') } };
    
    if (req.user.role === 'preparator') query.userId = req.user._id;
    
    const preparations = await Preparation.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'username fullName');
    
    res.json({ preparations, totalItems: preparations.length });
  } catch (e) {
    console.error('Erreur lors de la recherche de préparations:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route S3 pour preparation.routes.js (à ajouter)

// Photos S3 pour les tâches - démarrer une tâche avec URL S3
router.post('/:id/tasks/:taskType/start-with-s3', verifyToken, async (req, res) => {
  try {
    const { id, taskType } = req.params;
    const { photoUrl, notes } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json({ message: 'URL de photo requise' });
    }
    
    const preparation = await Preparation.findById(id);
    if (!preparation) {
      return res.status(404).json({ message: 'Préparation non trouvée' });
    }
    
    // Vérification des permissions
    const permError = checkPermissions(preparation, req.user._id, req.user.role, res);
    if (permError) return permError;
    
    const validTasks = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];
    if (!validTasks.includes(taskType)) {
      return res.status(400).json({ message: 'Type de tâche invalide' });
    }
    
    // Initialiser la tâche si elle n'existe pas
    if (!preparation.tasks[taskType]) {
      preparation.tasks[taskType] = { status: 'not_started', photos: { additional: [] } };
    }
    
    // Vérifier si la tâche peut être démarrée
    if (preparation.tasks[taskType].status !== 'not_started') {
      return res.status(400).json({ 
        message: `La tâche ${taskType} est déjà ${preparation.tasks[taskType].status === 'in_progress' ? 'en cours' : 'terminée'}` 
      });
    }
    
    // Mettre à jour la tâche
    preparation.tasks[taskType].status = 'in_progress';
    preparation.tasks[taskType].startedAt = new Date();
    if (notes) preparation.tasks[taskType].notes = notes;
    
    // Initialiser les photos si nécessaire
    if (!preparation.tasks[taskType].photos) {
      preparation.tasks[taskType].photos = { additional: [] };
    }
    
    // Ajouter la photo "before"
    preparation.tasks[taskType].photos.before = {
      url: photoUrl,
      timestamp: new Date()
    };
    
    // Mettre à jour le statut de la préparation si nécessaire
    if (preparation.status === 'pending') {
      preparation.status = 'in-progress';
      preparation.startTime = new Date();
    }
    
    await preparation.save();
    
    res.json({ 
      message: `Tâche ${taskType} commencée avec succès via S3`, 
      preparation 
    });
  } catch (error) {
    console.error('Erreur lors du démarrage de la tâche via S3:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Photos S3 pour les tâches - terminer une tâche avec URL S3
router.post('/:id/tasks/:taskType/complete-with-s3', verifyToken, async (req, res) => {
  try {
    const { id, taskType } = req.params;
    const { photoUrl, notes, amount, departureLocation, arrivalLocation } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json({ message: 'URL de photo requise' });
    }
    
    const preparation = await Preparation.findById(id);
    if (!preparation) {
      return res.status(404).json({ message: 'Préparation non trouvée' });
    }
    
    // Vérification des permissions
    const permError = checkPermissions(preparation, req.user._id, req.user.role, res);
    if (permError) return permError;
    
    const validTasks = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];
    if (!validTasks.includes(taskType)) {
      return res.status(400).json({ message: 'Type de tâche invalide' });
    }
    
    // Vérifier si la tâche existe
    if (!preparation.tasks[taskType]) {
      return res.status(400).json({ message: 'La tâche doit d\'abord être commencée' });
    }
    
    // Vérifier si la tâche est en cours
    if (preparation.tasks[taskType].status !== 'in_progress') {
      return res.status(400).json({ 
        message: `La tâche ${taskType} n'est pas en cours. Statut actuel: ${preparation.tasks[taskType].status}` 
      });
    }
    
    // Ajouter des données spécifiques selon le type de tâche
    if (taskType === 'refueling' && amount) {
      preparation.tasks[taskType].amount = parseFloat(amount);
    }
    
    if (taskType === 'vehicleTransfer') {
      if (departureLocation) {
        try {
          preparation.tasks[taskType].departureLocation = typeof departureLocation === 'string' ?
            JSON.parse(departureLocation) : departureLocation;
        } catch (e) {
          preparation.tasks[taskType].departureLocation = { name: departureLocation };
        }
      }
      if (arrivalLocation) {
        try {
          preparation.tasks[taskType].arrivalLocation = typeof arrivalLocation === 'string' ?
            JSON.parse(arrivalLocation) : arrivalLocation;
        } catch (e) {
          preparation.tasks[taskType].arrivalLocation = { name: arrivalLocation };
        }
      }
    }
    
    // Mettre à jour la tâche
    preparation.tasks[taskType].status = 'completed';
    preparation.tasks[taskType].completedAt = new Date();
    if (notes) preparation.tasks[taskType].notes = notes;
    
    // Initialiser les photos si nécessaire
    if (!preparation.tasks[taskType].photos) {
      preparation.tasks[taskType].photos = { additional: [] };
    }
    
    // Ajouter la photo "after"
    preparation.tasks[taskType].photos.after = {
      url: photoUrl,
      timestamp: new Date()
    };
    
    await preparation.save();
    
    res.json({ 
      message: `Tâche ${taskType} terminée avec succès via S3`, 
      preparation 
    });
  } catch (error) {
    console.error('Erreur lors de la finalisation de la tâche via S3:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Photos S3 pour les tâches - ajouter une photo additionnelle
router.post('/:id/tasks/:taskType/photos-with-s3', verifyToken, async (req, res) => {
  try {
    const { id, taskType } = req.params;
    const { photoUrl, description } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json({ message: 'URL de photo requise' });
    }
    
    const preparation = await Preparation.findById(id);
    if (!preparation) {
      return res.status(404).json({ message: 'Préparation non trouvée' });
    }
    
    // Vérification des permissions
    const permError = checkPermissions(preparation, req.user._id, req.user.role, res);
    if (permError) return permError;
    
    const validTasks = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];
    if (!validTasks.includes(taskType)) {
      return res.status(400).json({ message: 'Type de tâche invalide' });
    }
    
    // Initialiser les photos si nécessaire
    if (!preparation.tasks[taskType].photos) {
      preparation.tasks[taskType].photos = { additional: [] };
    }
    if (!preparation.tasks[taskType].photos.additional) {
      preparation.tasks[taskType].photos.additional = [];
    }
    
    // Ajouter la photo additionnelle
    preparation.tasks[taskType].photos.additional.push({
      url: photoUrl,
      timestamp: new Date(),
      description: description || ''
    });
    
    await preparation.save();
    
    res.json({
      message: 'Photo additionnelle ajoutée avec succès via S3',
      preparation
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la photo via S3:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Photos S3 pour une préparation
router.post('/:id/photos-with-s3', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { photoUrls, type = 'other' } = req.body;
    
    if (!photoUrls || (Array.isArray(photoUrls) && photoUrls.length === 0)) {
      return res.status(400).json({ message: 'URLs de photos requises' });
    }
    
    const preparation = await Preparation.findById(id);
    if (!preparation) {
      return res.status(404).json({ message: 'Préparation non trouvée' });
    }
    
    // Vérification des permissions
    const permError = checkPermissions(preparation, req.user._id, req.user.role, res);
    if (permError) return permError;
    
    // Convertir en tableau si ce n'est pas déjà un tableau
    const urls = Array.isArray(photoUrls) ? photoUrls : [photoUrls];
    
    // Créer les objets photo
    const photos = urls.map(url => ({
      url,
      type,
      timestamp: new Date()
    }));
    
    // Ajouter les photos
    preparation.photos.push(...photos);
    await preparation.save();
    
    res.json({
      message: `${photos.length} photo(s) ajoutée(s) avec succès via S3`,
      photos: preparation.photos
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout des photos via S3:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Photos S3 - upload batch pour les tâches
router.post('/:id/photos/batch-s3', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { photoUrls, photoPositions, taskType } = req.body;
    
    if (!photoUrls || (Array.isArray(photoUrls) && photoUrls.length === 0)) {
      return res.status(400).json({ message: 'URLs de photos requises' });
    }
    
    const preparation = await Preparation.findById(id);
    if (!preparation) {
      return res.status(404).json({ message: 'Préparation non trouvée' });
    }
    
    // Vérification des permissions
    const permError = checkPermissions(preparation, req.user._id, req.user.role, res);
    if (permError) return permError;
    
    // Si un type de tâche est spécifié, nous ajoutons les photos à cette tâche
    if (taskType) {
      const validTasks = ['exteriorWashing', 'interiorCleaning', 'refueling', 'parking'];
      if (!validTasks.includes(taskType)) {
        return res.status(400).json({ message: 'Type de tâche invalide' });
      }
      
      // Convertir en tableaux si nécessaire
      const urls = Array.isArray(photoUrls) ? photoUrls : [photoUrls];
      const positions = Array.isArray(photoPositions) ? photoPositions : [photoPositions];
      
      if (urls.length !== positions.length) {
        return res.status(400).json({ message: 'Le nombre de positions ne correspond pas au nombre de photos' });
      }
      
      // Vérifier si la tâche existe
      if (!preparation.tasks[taskType]) {
        preparation.tasks[taskType] = { 
          status: 'not_started',
          photos: { additional: [] }
        };
      }
      
      // Pour chaque photo...
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const position = positions[i];
        
        // Selon la position, on ajoute la photo
        if (position === 'before') {
          preparation.tasks[taskType].photos.before = {
            url: url,
            timestamp: new Date()
          };
          // Si c'est une photo "before", on met à jour le statut
          if (preparation.tasks[taskType].status === 'not_started') {
            preparation.tasks[taskType].status = 'in_progress';
            preparation.tasks[taskType].startedAt = new Date();
          }
        } else if (position === 'after') {
          preparation.tasks[taskType].photos.after = {
            url: url,
            timestamp: new Date()
          };
          // Si c'est une photo "after", on met à jour le statut
          if (preparation.tasks[taskType].status === 'in_progress') {
            preparation.tasks[taskType].status = 'completed';
            preparation.tasks[taskType].completedAt = new Date();
          }
        } else if (position === 'additional') {
          preparation.tasks[taskType].photos.additional.push({
            url: url,
            timestamp: new Date(),
            description: ''
          });
        }
      }
      
      // Mise à jour du statut général de la préparation
      if (preparation.status === 'pending') {
        preparation.status = 'in-progress';
        preparation.startTime = new Date();
      }
    } else {
      // Gestion des photos générales (sans type de tâche spécifié)
      return res.status(400).json({ message: 'Type de tâche requis pour batch-s3' });
    }
    
    await preparation.save();
    
    res.json({ 
      message: `${photoUrls.length} photos ajoutées avec succès via S3`, 
      photosUploaded: photoUrls.length,
      preparation
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload batch S3 des photos:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'upload des photos' });
  }
});

module.exports = router;