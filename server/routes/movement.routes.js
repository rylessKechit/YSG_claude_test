const router=require('express').Router(),Movement=require('../models/movement.model'),TimeLog=require('../models/timelog.model'),User=require('../models/user.model'),{verifyToken,canCreateMovement,canAssignMovement}=require('../middleware/auth.middleware'),upload=require('../middleware/upload.middleware'),whatsAppService=require('../services/whatsapp.service');

const checkDriverActiveTimeLog=async id=>await TimeLog.findOne({userId:id,status:'active'});

const sendWhatsAppNotif=async(phone,movement)=>{
  if(!whatsAppService.isClientReady()||!phone)return;
  let msg=`🚗 Nouveau mouvement assigné!\n\nVéhicule: ${movement.licensePlate}\nDépart: ${movement.departureLocation.name}\nArrivée: ${movement.arrivalLocation.name}\n\n`;
  if(movement.deadline){
    const d=new Date(movement.deadline);
    msg+=`⏰ Deadline: ${d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}\n\n`;
  }
  msg+=`Statut: ${movement.status==='assigned'?'Prêt à démarrer':'En attente'}\nPour plus de détails, consultez l'application.`;
  await whatsAppService.sendMessage(phone,msg);
};

// Créer un nouveau mouvement
router.post('/',verifyToken,canCreateMovement,async(req,res)=>{
  try{
    const{userId,licensePlate,vehicleModel,departureLocation,arrivalLocation,deadline,notes}=req.body;
    if(!licensePlate||!departureLocation||!arrivalLocation)
      return res.status(400).json({message:'Plaque d\'immatriculation, lieu de départ et lieu d\'arrivée sont requis'});
    
    let timeLogId=null,driver=null;
    if(userId){
      driver=await User.findById(userId);
      if(!driver)return res.status(404).json({message:'Chauffeur non trouvé'});
      if(driver.role!=='driver')return res.status(400).json({message:'L\'utilisateur sélectionné n\'est pas un chauffeur'});
      const activeTimeLog=await checkDriverActiveTimeLog(userId);
      if(activeTimeLog)timeLogId=activeTimeLog._id;
    }
    
    const movement=new Movement({
      assignedBy:req.user._id,
      licensePlate,vehicleModel,
      departureLocation,arrivalLocation,
      status:userId?'assigned':'pending',
      notes,deadline:deadline||null
    });
    
    if(userId){
      movement.userId=userId;
      movement.timeLogId=timeLogId;
      if(driver.phone)await sendWhatsAppNotif(driver.phone,movement);
    }
    
    await movement.save();
    let message=userId?(timeLogId?'Mouvement créé et assigné au chauffeur en service':'Mouvement créé et assigné au chauffeur (hors service)'):'Mouvement créé sans chauffeur assigné';
    res.status(201).json({message,movement});
  }catch(e){
    console.error('Erreur lors de la création du mouvement:',e);
    res.status(500).json({message:'Erreur serveur'});
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

router.post('/:id/start',verifyToken,async(req,res)=>{
  try{
    const movement=await Movement.findOne({_id:req.params.id,userId:req.user._id});
    if(!movement)return res.status(404).json({message:'Mouvement non trouvé'});
    if(movement.status!=='assigned'&&movement.status!=='preparing')
      return res.status(400).json({message:'Ce mouvement ne peut pas être démarré'});
    
    const activeTimeLog=await TimeLog.findOne({userId:req.user._id,status:'active'});
    if(!activeTimeLog)return res.status(400).json({message:'Vous devez être en service pour démarrer un mouvement'});
    
    movement.status='in-progress';
    movement.departureTime=new Date();
    if(!movement.timeLogId)movement.timeLogId=activeTimeLog._id;
    
    await movement.save();
    res.json({message:'Mouvement démarré avec succès',movement});
  }catch(e){
    console.error('Erreur lors du démarrage du mouvement:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

router.post('/:id/assign',verifyToken,canAssignMovement,async(req,res)=>{
  try{
    const{userId}=req.body;
    if(!userId)return res.status(400).json({message:'ID du chauffeur requis'});
    
    const movement=await Movement.findById(req.params.id);
    if(!movement)return res.status(404).json({message:'Mouvement non trouvé'});
    
    const driver=await User.findById(userId);
    if(!driver)return res.status(404).json({message:'Chauffeur non trouvé'});
    if(driver.role!=='driver')return res.status(400).json({message:'L\'utilisateur sélectionné n\'est pas un chauffeur'});
    
    const activeTimeLog=await checkDriverActiveTimeLog(userId);
    
    movement.userId=userId;
    movement.timeLogId=activeTimeLog?activeTimeLog._id:null;
    movement.status='assigned';
    
    await movement.save();
    
    try{await sendWhatsAppNotif(driver.phone,movement);}
    catch(whatsappError){console.error('Erreur lors de l\'envoi de la notification WhatsApp:',whatsappError);}
    
    res.json({
      message:activeTimeLog?'Chauffeur assigné et prêt pour le mouvement':'Chauffeur assigné mais hors service',
      movement,notificationSent:whatsAppService.isClientReady()
    });
  }catch(e){
    console.error('Erreur lors de l\'assignation du chauffeur:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Récupérer chauffeurs en service
router.get('/drivers-on-duty',verifyToken,canCreateMovement,async(req,res)=>{
  try{
    const activeLogs=await TimeLog.find({status:'active'}).populate('userId','username fullName email phone role');
    const driversOnDuty=activeLogs.filter(l=>l.userId.role==='driver').map(l=>({
      _id:l.userId._id,username:l.userId.username,fullName:l.userId.fullName,
      email:l.userId.email,phone:l.userId.phone,serviceStartTime:l.startTime
    }));
    res.json(driversOnDuty);
  }catch(e){
    console.error('Erreur lors de la récupération des chauffeurs en service:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Terminer un mouvement
router.post('/:id/complete',verifyToken,async(req,res)=>{
  try{
    const movement=await Movement.findOne({_id:req.params.id,userId:req.user._id});
    if(!movement)return res.status(404).json({message:'Mouvement non trouvé'});
    if(movement.status!=='in-progress')
      return res.status(400).json({message:'Ce mouvement ne peut pas être terminé'});
    
    const{notes}=req.body;
    movement.status='completed';
    movement.arrivalTime=new Date();
    if(notes)movement.notes=notes;
    
    await movement.save();
    res.json({message:'Mouvement terminé avec succès',movement});
  }catch(e){
    console.error('Erreur lors de la fin du mouvement:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Supprimer/Annuler mouvement
router.delete('/:id',verifyToken,canAssignMovement,async(req,res)=>{
  try{
    const movement=await Movement.findById(req.params.id);
    if(!movement)return res.status(404).json({message:'Mouvement non trouvé'});
    if(movement.status==='in-progress'||movement.status==='completed')
      return res.status(400).json({message:'Impossible de supprimer un mouvement qui est déjà en cours ou terminé'});
    
    await Movement.findByIdAndDelete(req.params.id);
    res.json({message:'Mouvement supprimé avec succès'});
  }catch(e){
    console.error('Erreur lors de la suppression du mouvement:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

router.post('/:id/cancel',verifyToken,canCreateMovement,async(req,res)=>{
  try{
    const movement=await Movement.findById(req.params.id);
    if(!movement)return res.status(404).json({message:'Mouvement non trouvé'});
    if(movement.status==='completed')
      return res.status(400).json({message:'Un mouvement terminé ne peut pas être annulé'});
    
    movement.status='cancelled';
    await movement.save();
    res.json({message:'Mouvement annulé avec succès',movement});
  }catch(e){
    console.error('Erreur lors de l\'annulation du mouvement:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Upload de photos
router.post('/:id/photos',verifyToken,upload.array('photos',5),async(req,res)=>{
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

// Obtenir tous les mouvements
router.get('/',verifyToken,async(req,res)=>{
  try{
    const{page=1,limit=10,status}=req.query,
          skip=(page-1)*limit,
          query={};
    
    if(req.user.role==='driver')query.userId=req.user._id;
    if(status)query.status=status;
    
    let sortOptions=status==='pending'||status==='assigned'||!status?
                    {'deadline':1,'createdAt':-1}:{'createdAt':-1};
    
    const movements=await Movement.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId','username fullName')
      .populate('assignedBy','username fullName');
    
    const total=await Movement.countDocuments(query);
    
    res.json({
      movements,
      totalPages:Math.ceil(total/limit),
      currentPage:parseInt(page),
      totalItems:total
    });
  }catch(e){
    console.error('Erreur lors de la récupération des mouvements:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Rechercher des mouvements
router.get('/search',verifyToken,async(req,res)=>{
  try{
    const{licensePlate}=req.query;
    if(!licensePlate)return res.status(400).json({message:'Plaque d\'immatriculation requise pour la recherche'});
    
    const query={licensePlate:{$regex:new RegExp(licensePlate,'i')}};
    if(req.user.role==='driver')query.userId=req.user._id;
    
    const movements=await Movement.find(query)
      .sort({createdAt:-1})
      .populate('userId','username fullName')
      .populate('assignedBy','username fullName');
    
    res.json({movements,totalItems:movements.length});
  }catch(e){
    console.error('Erreur lors de la recherche de mouvements:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Obtenir un mouvement spécifique
router.get('/:id',verifyToken,async(req,res)=>{
  try{
    const query={_id:req.params.id};
    if(req.user.role==='driver')query.userId=req.user._id;
    
    const movement=await Movement.findOne(query)
      .populate('userId','username fullName')
      .populate('assignedBy','username fullName');
    
    if(!movement)return res.status(404).json({message:'Mouvement non trouvé'});
    
    res.json(movement);
  }catch(e){
    console.error('Erreur lors de la récupération du mouvement:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

module.exports=router;