// server/services/orderForm.service.js - Nouveau fichier
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const emailService = require('./email.service');
const uploadService = require('./uploadService');

class OrderFormService {
  /**
   * Génère et stocke le bon de commande pour un mouvement
   * @param {Object} movement - Le mouvement
   * @param {Object} departureAgency - L'agence de départ
   * @param {Object} arrivalAgency - L'agence d'arrivée
   * @param {Object} driverInfo - Information du chauffeur (optionnel)
   * @returns {Promise<Object>} - Le résultat contenant le buffer et l'URL du PDF
   */
  async generateAndStoreOrderForm(movement, departureAgency, arrivalAgency, driverInfo = null) {
    try {
      // 1. Générer le buffer du PDF
      const pdfBuffer = await emailService.generateOrderPDF(
        movement, departureAgency, arrivalAgency, driverInfo
      );
      
      // 2. Vérifier si le service S3 est configuré
      if (!uploadService.isS3Configured()) {
        console.error('❌ S3 n\'est pas configuré, impossible de stocker le bon de commande');
        throw new Error('Service de stockage non configuré');
      }
      
      // 3. Créer un nom de fichier unique
      const fileName = `order_${movement._id}_${Date.now()}.pdf`;
      
      // 4. Obtenir une URL présignée pour le téléchargement vers S3
      const { presignedUrl, fileUrl } = await uploadService.generatePresignedUrl(
        'application/pdf',
        movement.userId || 'system',
        `orders/${movement._id}`
      );
      
      // 5. Uploader le PDF directement vers S3
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf'
        },
        body: pdfBuffer
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de l'upload du PDF: ${response.status} ${response.statusText}`);
      }
      
      // 6. Créer un objet pour le bon de commande
      const orderFormData = {
        url: fileUrl,
        createdAt: new Date(),
        version: 1
      };
      
      // 7. Mettre à jour le mouvement avec les données du bon de commande
      movement.orderForm = orderFormData;
      await movement.save();
      
      return {
        buffer: pdfBuffer,
        url: fileUrl,
        orderForm: orderFormData
      };
    } catch (error) {
      console.error('❌ Erreur lors de la génération et du stockage du bon de commande:', error);
      throw error;
    }
  }
  
  /**
   * Obtient l'URL du bon de commande pour un mouvement
   * @param {string} movementId - ID du mouvement
   * @returns {Promise<string|null>} - URL du bon de commande ou null
   */
  async getOrderFormUrl(movementId) {
    try {
      const Movement = require('../models/movement.model');
      const movement = await Movement.findById(movementId);
      
      if (!movement || !movement.orderForm || !movement.orderForm.url) {
        return null;
      }
      
      return movement.orderForm.url;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'URL du bon de commande:', error);
      return null;
    }
  }
  
  /**
   * Régénère le bon de commande pour un mouvement
   * @param {string} movementId - ID du mouvement
   * @returns {Promise<Object>} - Le résultat contenant le buffer et l'URL du PDF
   */
  async regenerateOrderForm(movementId) {
    try {
      // 1. Charger le mouvement avec les références
      const Movement = require('../models/movement.model');
      const movement = await Movement.findById(movementId)
        .populate('departureAgencyId')
        .populate('arrivalAgencyId')
        .populate('userId', 'fullName email phone');
      
      if (!movement) {
        throw new Error('Mouvement non trouvé');
      }
      
      if (!movement.departureAgencyId || !movement.arrivalAgencyId) {
        throw new Error('Les références aux agences sont manquantes');
      }
      
      // 2. Régénérer et stocker le PDF
      const result = await this.generateAndStoreOrderForm(
        movement,
        movement.departureAgencyId,
        movement.arrivalAgencyId,
        movement.userId
      );
      
      // 3. Mettre à jour la version
      movement.orderForm.version = (movement.orderForm.version || 0) + 1;
      await movement.save();
      
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de la régénération du bon de commande:', error);
      throw error;
    }
  }
}

module.exports = new OrderFormService();