const router=require('express').Router(),
      TimeLog=require('../models/timelog.model'),
      {verifyToken}=require('../middleware/auth.middleware');

// Middleware pour vérifier si chauffeur a déjà un pointage actif
const checkActiveTimeLog=async(req,res,next)=>{
  try{
    req.activeTimeLog=await TimeLog.findOne({userId:req.user._id,status:'active'});
    next();
  }catch(e){
    console.error('Erreur lors de la vérification des pointages actifs:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
};

// Démarrer pointage
router.post('/start',verifyToken,checkActiveTimeLog,async(req,res)=>{
  try{
    if(req.activeTimeLog)
      return res.status(400).json({message:'Vous avez déjà un service actif',timeLog:req.activeTimeLog});
    
    const timeLog=new TimeLog({
      userId:req.user._id,
      status:'active',
      location:{startLocation:req.body.location}
    });
    
    await timeLog.save();
    
    res.status(201).json({message:'Pointage démarré avec succès',timeLog});
  }catch(e){
    console.error('Erreur lors du démarrage du pointage:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Terminer pointage
router.post('/end',verifyToken,checkActiveTimeLog,async(req,res)=>{
  try{
    if(!req.activeTimeLog)
      return res.status(400).json({message:'Aucun service actif à terminer'});
    
    const{location,notes}=req.body;
    
    req.activeTimeLog.endTime=new Date();
    req.activeTimeLog.status='completed';
    req.activeTimeLog.location.endLocation=location;
    if(notes)req.activeTimeLog.notes=notes;
    
    await req.activeTimeLog.save();
    
    res.json({message:'Pointage terminé avec succès',timeLog:req.activeTimeLog});
  }catch(e){
    console.error('Erreur lors de la fin du pointage:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Obtenir pointage actif
router.get('/active',verifyToken,async(req,res)=>{
  try{
    const activeTimeLog=await TimeLog.findOne({userId:req.user._id,status:'active'});
    
    if(!activeTimeLog)
      return res.status(404).json({message:'Aucun service actif'});
    
    res.json(activeTimeLog);
  }catch(e){
    console.error('Erreur lors de la récupération du pointage actif:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

// Obtenir historique des pointages
router.get('/',verifyToken,async(req,res)=>{
  try{
    const{page=1,limit=10,status}=req.query,
          skip=(page-1)*limit,
          query={userId:req.user._id};
    
    if(status)query.status=status;
    
    const[timeLogs,total]=await Promise.all([
      TimeLog.find(query).sort({createdAt:-1}).skip(skip).limit(parseInt(limit)),
      TimeLog.countDocuments(query)
    ]);
    
    res.json({
      timeLogs,
      totalPages:Math.ceil(total/limit),
      currentPage:parseInt(page),
      totalItems:total
    });
  }catch(e){
    console.error('Erreur lors de la récupération des pointages:',e);
    res.status(500).json({message:'Erreur serveur'});
  }
});

module.exports=router;