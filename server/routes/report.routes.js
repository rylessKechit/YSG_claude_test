// server/routes/report.routes.js
const express = require('express');
const router = express.Router();
const Movement = require('../models/movement.model');
const Preparation = require('../models/preparation.model');
const User = require('../models/user.model');
const { verifyToken, canAccessReports } = require('../middleware/auth.middleware');
const ExcelJS = require('exceljs');

// Middleware pour formater la date
const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// Générer un rapport Excel pour les mouvements de véhicules
router.get('/movements', verifyToken, canAccessReports, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    // Construire la requête
    const query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Ajouter un jour à la date de fin pour inclure toute la journée
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        query.createdAt.$lt = endDateTime;
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    // Récupérer les mouvements
    const movements = await Movement.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'username fullName')
      .populate('assignedBy', 'username fullName');
    
    // Créer un nouveau classeur Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système de Gestion des Chauffeurs';
    workbook.created = new Date();
    
    // Ajouter une feuille de calcul
    const worksheet = workbook.addWorksheet('Mouvements de véhicules');
    
    // Définir les colonnes
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 24 },
      { header: 'Plaque', key: 'licensePlate', width: 15 },
      { header: 'Modèle', key: 'vehicleModel', width: 20 },
      { header: 'Chauffeur', key: 'driver', width: 20 },
      { header: 'Assigné par', key: 'assignedBy', width: 20 },
      { header: 'Départ', key: 'departure', width: 25 },
      { header: 'Arrivée', key: 'arrival', width: 25 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Heure de départ', key: 'departureTime', width: 20 },
      { header: 'Heure d\'arrivée', key: 'arrivalTime', width: 20 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Créé le', key: 'createdAt', width: 20 }
    ];
    
    // En-têtes en gras
    worksheet.getRow(1).font = { bold: true };
    
    // Ajouter les données
    movements.forEach(movement => {
      worksheet.addRow({
        id: movement._id.toString(),
        licensePlate: movement.licensePlate,
        vehicleModel: movement.vehicleModel || '',
        driver: movement.userId ? movement.userId.fullName : '',
        assignedBy: movement.assignedBy ? movement.assignedBy.fullName : '',
        departure: movement.departureLocation.name,
        arrival: movement.arrivalLocation.name,
        status: movement.status,
        departureTime: formatDate(movement.departureTime),
        arrivalTime: formatDate(movement.arrivalTime),
        notes: movement.notes || '',
        createdAt: formatDate(movement.createdAt)
      });
    });
    
    // Appliquer des styles aux cellules
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Ignorer l'en-tête
        const statusCell = row.getCell('status');
        
        // Appliquer des couleurs selon le statut
        switch (statusCell.value) {
          case 'pending':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8D7' } // Jaune clair
            };
            break;
          case 'in-progress':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'DBEAFE' } // Bleu clair
            };
            break;
          case 'completed':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'D1FAE5' } // Vert clair
            };
            break;
          case 'cancelled':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FEE2E2' } // Rouge clair
            };
            break;
        }
      }
      
      // Bordures pour toutes les cellules
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // Définir le type de contenu pour la réponse
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=mouvements_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // Écrire directement dans la réponse
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Erreur lors de la génération du rapport de mouvements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Générer un rapport Excel pour les préparations de véhicules
router.get('/preparations', verifyToken, canAccessReports, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    // Construire la requête
    const query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Ajouter un jour à la date de fin pour inclure toute la journée
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        query.createdAt.$lt = endDateTime;
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    // Récupérer les préparations
    const preparations = await Preparation.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'username fullName')
    
    // Créer un nouveau classeur Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système de Gestion des Préparations';
    workbook.created = new Date();
    
    // Ajouter une feuille de calcul
    const worksheet = workbook.addWorksheet('Préparations de véhicules');
    
    // Définir les colonnes
    worksheet.columns = [
      { header: 'Agence', key: 'agency', width: 15 },
      { header: 'Plaque', key: 'licensePlate', width: 15 },
      { header: 'Modèle', key: 'vehicleModel', width: 20 },
      { header: 'Préparateur', key: 'preparator', width: 20 },
      { header: 'Nettoyage ext.', key: 'exteriorWashing', width: 15 },
      { header: 'Nettoyage int.', key: 'interiorCleaning', width: 15 },
      { header: 'Carburant', key: 'refueling', width: 15 },
      { header: 'Litres', key: 'fuelAmount', width: 10 },
      { header: 'Stationnement', key: 'parking', width: 15 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Début', key: 'startTime', width: 20 },
      { header: 'Fin', key: 'endTime', width: 20 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Créé le', key: 'createdAt', width: 20 }
    ];
    
    // En-têtes en gras
    worksheet.getRow(1).font = { bold: true };
    
    // Ajouter les données
    preparations.forEach(prep => {
      worksheet.addRow({
        agency: prep.agency || '',
        licensePlate: prep.licensePlate,
        vehicleModel: prep.vehicleModel || '',
        preparator: prep.userId ? prep.userId.fullName : '',
        exteriorWashing: prep.tasks.exteriorWashing.completed ? 'Oui' : 'Non',
        interiorCleaning: prep.tasks.interiorCleaning.completed ? 'Oui' : 'Non',
        refueling: prep.tasks.refueling.completed ? 'Oui' : 'Non',
        fuelAmount: prep.tasks.refueling.amount || '',
        parking: prep.tasks.parking?.status === 'completed' ? 'Oui' : 'Non',
        status: prep.status,
        startTime: formatDate(prep.startTime),
        endTime: formatDate(prep.endTime),
        notes: prep.notes || '',
        createdAt: formatDate(prep.createdAt)
      });
    });
    
    // Appliquer des styles aux cellules
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Ignorer l'en-tête
        const statusCell = row.getCell('status');
        
        // Appliquer des couleurs selon le statut
        switch (statusCell.value) {
          case 'pending':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8D7' } // Jaune clair
            };
            break;
          case 'in-progress':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'DBEAFE' } // Bleu clair
            };
            break;
          case 'completed':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'D1FAE5' } // Vert clair
            };
            break;
          case 'cancelled':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FEE2E2' } // Rouge clair
            };
            break;
        }
      }
      
      // Bordures pour toutes les cellules
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // Définir le type de contenu pour la réponse
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=preparations_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // Écrire directement dans la réponse
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Erreur lors de la génération du rapport de préparations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;