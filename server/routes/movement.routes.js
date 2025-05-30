const router=require('express').Router(),Movement=require('../models/movement.model'),TimeLog=require('../models/timelog.model'),User=require('../models/user.model'),{verifyToken,canCreateMovement,canAssignMovement}=require('../middleware/auth.middleware'),uploadMiddleware=require('../middleware/upload.middleware'),whatsAppService=require('../services/whatsapp.service');
const movementService = require('../services/movementService');
const emailService = require('../services/email.service');

const checkDriverActiveTimeLog=async id=>await TimeLog.findOne({userId:id,status:'active'});

const sendWhatsAppNotif = async (phone, movement) => {
  try {
    // Vérifier si le client est prêt
    if (!whatsAppService.isClientReady()) {
      console.log('⚠️ Client WhatsApp non prêt pour l\'envoi de message');
      return { success: false, reason: 'CLIENT_NOT_READY' };
    }
    
    // Vérifier si le numéro de téléphone est valide
    if (!phone || phone.trim() === '') {
      console.log('⚠️ Numéro de téléphone manquant');
      return { success: false, reason: 'PHONE_MISSING' };
    }
    
    // Construire le message
    let msg = `🚗 Nouveau mouvement assigné!\n\nVéhicule: ${movement.licensePlate}\nDépart: ${movement.departureLocation.name}\nArrivée: ${movement.arrivalLocation.name}\n\n`;
    
    if (movement.deadline) {
      const d = new Date(movement.deadline);
      msg += `⏰ Deadline: ${d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}\n\n`;
    }
    
    msg += `Statut: ${movement.status === 'assigned' ? 'Prêt à démarrer' : 'En attente'}\nPour plus de détails, consultez l'application.`;
    
    // Nettoyer le numéro de téléphone
    const cleanedPhone = phone.replace(/\s+/g, '');
    console.log(`📱 Tentative d'envoi WhatsApp au numéro: ${cleanedPhone}`);
    
    // Vérifier si le numéro est valide sur WhatsApp
    const isValidNumber = await whatsAppService.isValidWhatsAppNumber(cleanedPhone);
    if (!isValidNumber) {
      console.log(`⚠️ Le numéro ${cleanedPhone} n'est pas valide sur WhatsApp`);
      return { success: false, reason: 'INVALID_WHATSAPP_NUMBER' };
    }
    
    // Envoyer le message
    const result = await whatsAppService.sendMessage(cleanedPhone, msg);
    console.log(`✅ Message WhatsApp envoyé avec succès au numéro ${cleanedPhone}`);
    return { success: true, result };
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi du message WhatsApp:`, error);
    return { success: false, reason: 'ERROR', error: error.message };
  }
};

router.post('/', verifyToken, canCreateMovement, async (req, res) => {
  try {
    // Extraction de l'ID du chauffeur si présent
    const { userId, ...movementDataWithoutDriver } = req.body;
    const hasDriver = !!userId;
    
    // Créer d'abord le mouvement sans chauffeur
    const movement = await movementService.createMovement(movementDataWithoutDriver, req.user);
    
    // Vérifier si des notifications d'email ont été envoyées
    const emailSent = movement.emailNotifications && movement.emailNotifications.length > 0 && 
                     movement.emailNotifications[0].success;
    
    // Si un chauffeur est spécifié, utiliser la route d'assignation
    let assignmentResult = null;
    if (hasDriver) {
      try {
        console.log(`Chauffeur spécifié (ID: ${userId}), appel de la route d'assignation`);
        
        // Simulation de l'appel à la route d'assignation (utiliser la logique directement)
        const driver = await User.findById(userId);
        if (!driver) {
          throw new Error('Chauffeur non trouvé');
        }
        
        const activeTimeLog = await checkDriverActiveTimeLog(userId);
        
        movement.userId = userId;
        movement.timeLogId = activeTimeLog ? activeTimeLog._id : null;
        movement.status = 'assigned';
        movement.assignedBy = req.user._id;
        
        await movement.save();
        
        // Envoyer notification WhatsApp si possible
        let whatsappSent = false;
        try {
          if (driver.phone) {
            await sendWhatsAppNotif(driver.phone, movement);
            whatsappSent = whatsAppService.isClientReady();
          }
        } catch (whatsappError) {
          console.error('Erreur lors de l\'envoi de la notification WhatsApp:', whatsappError);
        }
        
        assignmentResult = {
          success: true,
          whatsappSent,
          message: activeTimeLog ? 'Chauffeur assigné et prêt pour le mouvement' : 'Chauffeur assigné mais hors service'
        };
      } catch (assignError) {
        console.error('Erreur lors de l\'assignation du chauffeur:', assignError);
        assignmentResult = {
          success: false,
          error: assignError.message
        };
      }
    }
    
    // Message de réponse
    let message = 'Mouvement créé avec succès';
    if (emailSent) {
      message += '. Les agences ont été notifiées par email';
    }
    
    if (assignmentResult && assignmentResult.success) {
      message += '. ' + assignmentResult.message;
    }
    
    // Recharger le mouvement avec toutes les références pour la réponse
    const updatedMovement = await Movement.findById(movement._id)
      .populate('userId', 'username fullName')
      .populate('assignedBy', 'username fullName')
      .populate('departureAgencyId', 'name email')
      .populate('arrivalAgencyId', 'name email');
    
    res.status(201).json({
      message,
      movement: updatedMovement,
      emailSent,
      driverAssigned: hasDriver && assignmentResult && assignmentResult.success,
      assignmentResult
    });
  } catch (error) {
    console.error('Erreur lors de la création du mouvement:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Récupérer tous les chauffeurs
router.get('/all-drivers',verifyToken,canAssignMovement,async(req,res)=>{
  try{
    const drivers=await User.find({role:['driver','team-leader']}).select('_id username fullName email phone'),
          activeLogs=await TimeLog.find({status:'active',userId:{$in:drivers.map(d=>d._id)}}),
          activeDriverIds=new Set(activeLogs.map(l=>l.userId.toString()));
    
    const driversWithStatus=drivers.map(d=>{
      const isOnDuty=activeDriverIds.has(d._id.toString()),
            activeLog=isOnDuty?activeLogs.find(l=>l.userId.toString()===d._id.toString()):null;
      return{
        _id:d._id,username:d.username,fullName:d.fullName,
        email:d.email,phone:d.phone,
        isOnDuty,serviceStartTime:activeLog?activeLog.startTime:null
      };
    });
    
    res.json(driversWithStatus);
  }catch(e){
    console.error('Erreur lors de la récupération des chauffeurs:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Route pour obtenir l'URL du bon de commande
router.get('/:id/orderform', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si l'utilisateur est autorisé à accéder au mouvement
    const query = { _id: id };
    if (req.user.role === 'driver') {
      query.userId = req.user._id;
    }
    
    const movement = await Movement.findOne(query);
    
    if (!movement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }
    
    // Vérifier si le bon de commande existe
    if (!movement.orderForm || !movement.orderForm.url) {
      // Si les agences sont spécifiées, essayer de générer le bon de commande
      if (movement.departureAgencyId && movement.arrivalAgencyId) {
        try {
          const orderFormService = require('../services/orderForm.service');
          const result = await orderFormService.regenerateOrderForm(id);
          
          return res.json({
            success: true,
            orderFormUrl: result.url
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            message: 'Impossible de générer le bon de commande',
            error: error.message
          });
        }
      } else {
        return res.status(404).json({
          success: false,
          message: 'Bon de commande non disponible pour ce mouvement'
        });
      }
    }
    
    // Retourner l'URL du bon de commande
    res.json({
      success: true,
      orderFormUrl: movement.orderForm.url
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du bon de commande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Préparation, démarrage, assignation mouvement
router.post('/:id/prepare',verifyToken,async(req,res)=>{
  try{
    const movement=await Movement.findOne({_id:req.params.id,userId:req.user._id});
    if(!movement)return res.status(404).json({message:'Mouvement non trouvé'});
    if(movement.status!=='assigned')return res.status(400).json({message:'Ce mouvement ne peut pas être préparé'});
    
    const activeTimeLog=await TimeLog.findOne({userId:req.user._id,status:'active'});
    if(!activeTimeLog)return res.status(400).json({message:'Vous devez être en service pour préparer un mouvement'});
    
    movement.status='preparing';
    await movement.save();
    res.json({message:'Préparation du mouvement démarrée',movement});
  }catch(e){
    console.error('Erreur lors du démarrage de la préparation:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

router.post('/:id/start', verifyToken, async (req, res) => {
  try {
    const movement = await Movement.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('departureAgencyId')
      .populate('arrivalAgencyId')
      .populate('userId', 'fullName email phone');
    
    if (!movement) return res.status(404).json({ message: 'Mouvement non trouvé' });
    if (movement.status !== 'assigned' && movement.status !== 'preparing')
      return res.status(400).json({ message: 'Ce mouvement ne peut pas être démarré' });
    
    const activeTimeLog = await TimeLog.findOne({ userId: req.user._id, status: 'active' });
    if (!activeTimeLog) return res.status(400).json({ message: 'Vous devez être en service pour démarrer un mouvement' });
    
    // Utiliser le service pour mettre à jour le statut
    const updatedMovement = await movementService.updateMovementStatus(movement._id, 'in-progress');
    
    // Dans le cas où le service ne définit pas la date de départ, le faire manuellement
    if (!updatedMovement.departureTime) {
      updatedMovement.departureTime = new Date();
      await updatedMovement.save();
    }
    
    // S'assurer que le timeLogId est défini
    if (!updatedMovement.timeLogId) {
      updatedMovement.timeLogId = activeTimeLog._id;
      await updatedMovement.save();
    }
    
    // Envoyer une notification spécifique à l'agence d'arrivée
    let emailResult = { success: false };
    
    if (movement.arrivalAgencyId) {
      try {
        // Utilisez le service email pour envoyer une notification de départ
        emailResult = await emailService.sendDepartureNotification(
          updatedMovement, 
          movement.departureAgencyId,
          movement.arrivalAgencyId,
          movement.userId
        );
        
        // Enregistrer le résultat de l'envoi d'email
        updatedMovement.emailNotifications.push({
          sentAt: new Date(),
          recipients: [movement.arrivalAgencyId.email].filter(Boolean),
          success: emailResult.success,
          error: emailResult.error,
          type: 'departure_notification'
        });
        
        await updatedMovement.save();
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de la notification de départ:', emailError);
      }
    }
    
    res.json({ 
      message: 'Mouvement démarré avec succès', 
      movement: updatedMovement,
      emailSent: emailResult.success
    });
  } catch (e) {
    console.error('Erreur lors du démarrage du mouvement:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/:id/assign', verifyToken, canAssignMovement, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'ID du chauffeur requis' });
    
    const movement = await Movement.findById(req.params.id)
      .populate('departureAgencyId')
      .populate('arrivalAgencyId');
    
    if (!movement) return res.status(404).json({ message: 'Mouvement non trouvé' });
    
    const driver = await User.findById(userId);
    if (!driver) return res.status(404).json({ message: 'Chauffeur non trouvé' });
    if (driver.role !== 'driver') return res.status(400).json({ message: 'L\'utilisateur sélectionné n\'est pas un chauffeur' });
    
    const activeTimeLog = await checkDriverActiveTimeLog(userId);
    
    movement.userId = userId;
    movement.timeLogId = activeTimeLog ? activeTimeLog._id : null;
    movement.status = 'assigned';
    
    await movement.save();
    
    // Si les agences sont définies, envoyer une notification par email
    if (movement.departureAgencyId && movement.arrivalAgencyId) {
      await movementService.resendMovementNotification(movement._id);
    }
    
    // Envoyer une notification WhatsApp et récupérer le résultat
    let whatsappResult = { success: false, reason: 'NOT_ATTEMPTED' };
    
    if (driver.phone) {
      whatsappResult = await sendWhatsAppNotif(driver.phone, movement);
      if (!whatsappResult.success) {
        console.log(`⚠️ Échec de l'envoi WhatsApp: ${whatsappResult.reason}`, whatsappResult.error || '');
      }
    } else {
      console.log('⚠️ Le chauffeur n\'a pas de numéro de téléphone enregistré');
      whatsappResult = { success: false, reason: 'NO_PHONE_NUMBER' };
    }
    
    res.json({
      message: activeTimeLog ? 'Chauffeur assigné et prêt pour le mouvement' : 'Chauffeur assigné mais hors service',
      movement,
      whatsappNotification: {
        attempted: true,
        success: whatsappResult.success,
        reason: whatsappResult.reason || null
      }
    });
  } catch (e) {
    console.error('Erreur lors de l\'assignation du chauffeur:', e);
    res.status(500).json({ message: 'Erreur serveur', error: e.message });
  }
});

// Récupérer chauffeurs en service
router.get('/drivers-on-duty', verifyToken, canCreateMovement, async (req, res) => {
  try {
    const activeLogs = await TimeLog.find({ status: 'active' }).populate('userId', 'username fullName email phone role');
    const driversOnDuty = activeLogs
      .filter(l => l.userId.role === 'driver')
      .map(l => ({
        _id: l.userId._id,
        username: l.userId.username,
        fullName: l.userId.fullName,
        email: l.userId.email,
        phone: l.userId.phone,
        serviceStartTime: l.startTime
      }));
    
    res.json(driversOnDuty);
  } catch (e) {
    console.error('Erreur lors de la récupération des chauffeurs en service:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Terminer un mouvement
router.post('/:id/complete', verifyToken, async (req, res) => {
  try {
    const movement = await Movement.findOne({ _id: req.params.id, userId: req.user._id });
    if (!movement) return res.status(404).json({ message: 'Mouvement non trouvé' });
    if (movement.status !== 'in-progress')
      return res.status(400).json({ message: 'Ce mouvement ne peut pas être terminé' });
    
    const { notes } = req.body;
    
    // Utiliser le service pour mettre à jour le statut avec notification
    const updatedMovement = await movementService.updateMovementStatus(movement._id, 'completed');
    
    // Mettre à jour les notes si fournies
    if (notes) {
      updatedMovement.notes = notes;
      await updatedMovement.save();
    }
    
    res.json({ message: 'Mouvement terminé avec succès', movement: updatedMovement });
  } catch (e) {
    console.error('Erreur lors de la fin du mouvement:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer/Annuler mouvement
router.delete('/:id', verifyToken, canAssignMovement, async (req, res) => {
  try {
    const movement = await Movement.findById(req.params.id);
    if (!movement) return res.status(404).json({ message: 'Mouvement non trouvé' });
    if (movement.status === 'in-progress' || movement.status === 'completed')
      return res.status(400).json({ message: 'Impossible de supprimer un mouvement qui est déjà en cours ou terminé' });
    
    await Movement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Mouvement supprimé avec succès' });
  } catch (e) {
    console.error('Erreur lors de la suppression du mouvement:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/:id/cancel', verifyToken, canCreateMovement, async (req, res) => {
  try {
    const movement = await Movement.findById(req.params.id)
      .populate('departureAgencyId')
      .populate('arrivalAgencyId')
      .populate('userId', 'fullName email phone');
    
    if (!movement) return res.status(404).json({ message: 'Mouvement non trouvé' });
    if (movement.status === 'completed')
      return res.status(400).json({ message: 'Un mouvement terminé ne peut pas être annulé' });
    
    movement.status = 'cancelled';
    await movement.save();
    
    // Si les agences sont définies, envoyer une notification d'annulation
    if (movement.departureAgencyId && movement.arrivalAgencyId) {
      await movementService.resendMovementNotification(movement._id);
    }
    
    res.json({ message: 'Mouvement annulé avec succès', movement });
  } catch (e) {
    console.error('Erreur lors de l\'annulation du mouvement:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Upload de photos
router.post('/:id/photos',verifyToken,uploadMiddleware.array('photos', 5),async(req,res)=>{
  try{
    const movement=await Movement.findById(req.params.id);
    if(!movement)return res.status(404).json({message:'Mouvement non trouvé'});
    
    if(req.user.role!=='admin'&&(!movement.userId||movement.userId.toString()!==req.user._id.toString()))
      return res.status(403).json({message:'Vous n\'êtes pas autorisé à modifier ce mouvement'});
    
    if(movement.status!=='preparing'&&movement.status!=='in-progress')
      return res.status(400).json({message:'Vous ne pouvez ajouter des photos qu\'à un mouvement en préparation ou en cours'});
    
    const allowedTypes=['front','passenger','driver','rear','windshield','roof','meter','departure','arrival','damage','other'];
    const{type='other',photoType='departure'}=req.body;
    
    if(!allowedTypes.includes(type))
      return res.status(400).json({message:'Type de photo non valide'});
    
    if(!req.files||req.files.length===0)
      return res.status(400).json({message:'Aucune photo n\'a été téléchargée'});
    
    const photos=req.files.map(f=>({
      url:f.path,type,photoType,
      timestamp:new Date()
    }));
    
    movement.photos.push(...photos);
    await movement.save();
    
    res.json({message:'Photos ajoutées avec succès',photos:movement.photos});
  }catch(e){
    console.error('Erreur lors de l\'upload des photos:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Réassigner un mouvement
router.post('/:id/reassign',verifyToken,canCreateMovement,async(req,res)=>{
  try{
    const{userId}=req.body;
    if(!userId)return res.status(400).json({message:'ID du chauffeur requis'});
    
    const movement=await Movement.findById(req.params.id);
    if(!movement)return res.status(404).json({message:'Mouvement non trouvé'});
    
    if(movement.status!=='pending'&&movement.status!=='assigned')
      return res.status(400).json({message:'Seuls les mouvements en attente ou assignés peuvent être réassignés'});
    
    const driver=await User.findById(userId);
    if(!driver)return res.status(404).json({message:'Chauffeur non trouvé'});
    if(driver.role!=='driver')
      return res.status(400).json({message:'L\'utilisateur sélectionné n\'est pas un chauffeur'});
    
    const activeTimeLog=await checkDriverActiveTimeLog(userId);
    
    movement.userId=userId;
    movement.assignedBy=req.user._id;
    movement.status=activeTimeLog?'assigned':'pending';
    movement.timeLogId=activeTimeLog?activeTimeLog._id:null;
    
    await movement.save();
    
    res.json({
      message:activeTimeLog?'Mouvement réassigné au chauffeur':'Mouvement réassigné, mais le chauffeur n\'est pas en service',
      movement
    });
  }catch(e){
    console.error('Erreur lors de la réassignation du mouvement:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Enregistrer des photos S3 uploadées directement
router.post('/:id/photos/batch-s3', verifyToken, async (req, res) => {
  try {
    const movement = await Movement.findById(req.params.id);
    if (!movement) return res.status(404).json({ message: 'Mouvement non trouvé' });
    
    if (req.user.role !== 'admin' && (!movement.userId || movement.userId.toString() !== req.user._id.toString()))
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier ce mouvement' });
    
    if (movement.status !== 'preparing' && movement.status !== 'in-progress')
      return res.status(400).json({ message: 'Vous ne pouvez ajouter des photos qu\'à un mouvement en préparation ou en cours' });
    
    const allowedTypes = ['front', 'passenger', 'driver', 'rear', 'windshield', 'roof', 'meter', 'damage', 'other'];
    const { photoType = 'departure' } = req.body;
    
    // Récupérer les URLs et les types
    const photoUrls = Array.isArray(req.body.photoUrls) ? req.body.photoUrls : [req.body.photoUrls];
    const photoTypes = Array.isArray(req.body.photoTypes) ? req.body.photoTypes : [req.body.photoTypes];
    
    if (photoUrls.length === 0) {
      return res.status(400).json({ message: 'Aucune photo n\'a été fournie' });
    }
    
    if (photoTypes.length !== photoUrls.length) {
      return res.status(400).json({ message: 'Le nombre de types ne correspond pas au nombre de photos' });
    }
    
    // Créer un tableau de photos à ajouter au mouvement
    const photos = photoUrls.map((url, index) => {
      const type = photoTypes[index];
      
      if (!allowedTypes.includes(type)) {
        return null; // Filtrer les types non valides
      }
      
      // S'assurer que l'URL est définie
      if (!url) {
        return null;
      }
      
      return {
        url,           // URL S3 du fichier
        type,
        photoType,
        timestamp: new Date()
      };
    }).filter(photo => photo !== null); // Éliminer les entrées nulles
    
    // Vérifier que toutes les photos ont une URL valide
    if (photos.some(photo => !photo.url)) {
      return res.status(400).json({ message: 'Certaines photos ont des URLs invalides' });
    }
    
    // Ajouter les photos
    movement.photos.push(...photos);
    await movement.save();
    
    res.json({ 
      message: `${photos.length} photos ajoutées avec succès via S3`, 
      photosUploaded: photos.length,
      photos: movement.photos 
    });
  } catch (e) {
    console.error('Erreur lors de l\'enregistrement des photos S3:', e);
    res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement des photos' });
  }
});

// Upload batch de photos
router.post('/:id/photos/batch', verifyToken, uploadMiddleware.array('photos'), async (req, res) => {
  try {
    const movement = await Movement.findById(req.params.id);
    if (!movement) return res.status(404).json({ message: 'Mouvement non trouvé' });
    
    if (req.user.role !== 'admin' && (!movement.userId || movement.userId.toString() !== req.user._id.toString()))
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier ce mouvement' });
    
    if (movement.status !== 'preparing' && movement.status !== 'in-progress')
      return res.status(400).json({ message: 'Vous ne pouvez ajouter des photos qu\'à un mouvement en préparation ou en cours' });
    
    const allowedTypes = ['front', 'passenger', 'driver', 'rear', 'windshield', 'roof', 'meter', 'damage', 'other'];
    const { photoType = 'departure' } = req.body;
    
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: 'Aucune photo n\'a été téléchargée' });
    
    // Récupérer les types associés à chaque photo
    const photoTypes = Array.isArray(req.body.photoTypes) ? req.body.photoTypes : [req.body.photoTypes];
    
    if (photoTypes.length !== req.files.length)
      return res.status(400).json({ message: 'Le nombre de types ne correspond pas au nombre de photos' });
    
    // Créer un tableau de photos à ajouter au mouvement
    const photos = req.files.map((file, index) => {
      const type = photoTypes[index];
      
      if (!allowedTypes.includes(type))
        return null; // Filtrer les types non valides
      
      return {
        url: file.path,
        type,
        photoType,
        timestamp: new Date()
      };
    }).filter(photo => photo !== null); // Éliminer les entrées nulles
    
    // Ajouter les photos
    movement.photos.push(...photos);
    await movement.save();
    
    res.json({ 
      message: `${photos.length} photos ajoutées avec succès`, 
      photosUploaded: photos.length,
      photos: movement.photos 
    });
  } catch (e) {
    console.error('Erreur lors de l\'upload batch des photos:', e);
    res.status(500).json({ message: 'Erreur serveur lors de l\'upload des photos' });
  }
});

// Obtenir tous les mouvements
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;
    const query = {};
    
    if (req.user.role === 'driver') query.userId = req.user._id;
    if (status) query.status = status;
    
    let sortOptions = status === 'pending' || status === 'assigned' || !status ?
                      { 'deadline': 1, 'createdAt': -1 } : { 'createdAt': -1 };
    
    const movements = await Movement.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username fullName')
      .populate('assignedBy', 'username fullName')
      .populate('departureAgencyId', 'name email')
      .populate('arrivalAgencyId', 'name email');
    
    const total = await Movement.countDocuments(query);
    
    res.json({
      movements,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalItems: total
    });
  } catch (e) {
    console.error('Erreur lors de la récupération des mouvements:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Rechercher des mouvements
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { licensePlate } = req.query;
    if (!licensePlate) return res.status(400).json({ message: 'Plaque d\'immatriculation requise pour la recherche' });
    
    const query = { licensePlate: { $regex: new RegExp(licensePlate, 'i') } };
    if (req.user.role === 'driver') query.userId = req.user._id;
    
    const movements = await Movement.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'username fullName')
      .populate('assignedBy', 'username fullName')
      .populate('departureAgencyId', 'name email')
      .populate('arrivalAgencyId', 'name email');
    
    res.json({ movements, totalItems: movements.length });
  } catch (e) {
    console.error('Erreur lors de la recherche de mouvements:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir un mouvement spécifique
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === 'driver') query.userId = req.user._id;
    
    const movement = await Movement.findOne(query)
      .populate('userId', 'username fullName email phone')
      .populate('assignedBy', 'username fullName')
      .populate('departureAgencyId')
      .populate('arrivalAgencyId');
    
    if (!movement) return res.status(404).json({ message: 'Mouvement non trouvé' });
    
    res.json(movement);
  } catch (e) {
    console.error('Erreur lors de la récupération du mouvement:', e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Une route spécifique pour uploader individuellement via S3
router.post('/:id/photos/s3', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { photoUrl, type = 'other', photoType = 'departure' } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json({ message: 'URL de photo requise' });
    }
    
    const movement = await Movement.findById(id);
    if (!movement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }
    
    if (req.user.role !== 'admin' && (!movement.userId || movement.userId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier ce mouvement' });
    }
    
    if (movement.status !== 'preparing' && movement.status !== 'in-progress') {
      return res.status(400).json({ message: 'Vous ne pouvez ajouter des photos qu\'à un mouvement en préparation ou en cours' });
    }
    
    const allowedTypes = ['front', 'passenger', 'driver', 'rear', 'windshield', 'roof', 'meter', 'damage', 'other'];
    
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: 'Type de photo non valide' });
    }
    
    // Créer l'objet photo
    const photo = {
      url: photoUrl,
      type,
      photoType,
      timestamp: new Date()
    };
    
    // Ajouter la photo
    movement.photos.push(photo);
    await movement.save();
    
    res.json({
      message: 'Photo ajoutée avec succès via S3',
      photo
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la photo via S3:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports=router;