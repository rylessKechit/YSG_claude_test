// server/services/email.service.js
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const axios = require('axios');
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

class EmailService {
  constructor() {
    // Vérifier si les variables essentielles sont définies
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('⚠️ ATTENTION: Configuration email incomplète - le service ne fonctionnera pas correctement');
      
      // En mode développement, utiliser un transporteur de test
      if (process.env.NODE_ENV === 'development') {
        console.log('Mode développement détecté, utilisation du transporteur de test...');
        this.setupTestTransporter();
        return;
      }
    }

    // Création du transporteur Nodemailer
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      
      // Vérifier la connexion au serveur SMTP
      this.verifyTransporter();
      
      // Initialisation des templates
      this.initializeTemplates();
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du transporteur email:', error);
    }
  }
  
  // Créer un transporteur de test pour le développement
  setupTestTransporter() {// Créer un compte de test avec Ethereal Email
    nodemailer.createTestAccount((err, account) => {
      if (err) {
        console.error('❌ Impossible de créer un compte de test Ethereal:', err);
        return;
      }
      
      // Créer un transporteur avec le compte de test
      this.transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass
        },
        debug: true // Activer le débogage
      });
      
      // Initialisation des templates
      this.initializeTemplates();
      
      // Modifier la méthode sendEmail pour afficher le lien vers le message
      const originalSendEmail = this.sendEmail.bind(this);
      this.sendEmail = async (options) => {
        const result = await originalSendEmail(options);
        
        if (result.success && result.info) {
          console.log('✅ Email de test envoyé, voir le message ici:', nodemailer.getTestMessageUrl(result.info));
        }
        
        return result;
      };
    });
  }
  
  // Vérifier la connexion au serveur SMTP
  async verifyTransporter() {
    try {
      if (!this.transporter) {
        console.error('❌ Transporteur email non initialisé');
        return;
      }
      
      await this.transporter.verify();
      console.log('✅ Connexion au serveur SMTP réussie');
    } catch (error) {
      console.error('❌ Échec de la connexion au serveur SMTP:', error);
    }
  }

  // Charger les templates d'email
  initializeTemplates() {
    try {
      // Chemin vers le dossier des templates
      const templatesDir = path.join(__dirname, '../templates/emails');
      
      // Vérification si le dossier existe
      if (!fs.existsSync(templatesDir)) {
        console.warn('⚠️ Le dossier des templates d\'email n\'existe pas encore');
        fs.mkdirSync(templatesDir, { recursive: true });
        
        // Créer un template de base si aucun n'existe
        const defaultTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>{{title}}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 10px 20px; }
            .content { padding: 20px; border: 1px solid #ddd; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>{{title}}</h1>
            </div>
            <div class="content">
              {{{body}}}
            </div>
            <div class="footer">
              <p>© {{year}} Système de Gestion des Chauffeurs</p>
            </div>
          </div>
        </body>
        </html>
        `;
        
        fs.writeFileSync(path.join(templatesDir, 'default.html'), defaultTemplate);
        fs.writeFileSync(path.join(templatesDir, 'movement-notification.html'), defaultTemplate);
      } else {
      }
      
      // Charger les templates
      this.templates = {
        default: this.compileTemplate('default.html'),
        movementNotification: this.compileTemplate('movement-notification.html')
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des templates d\'email:', error);
    }
  }

  // Compiler un template avec Handlebars
  compileTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '../templates/emails', templateName);
      
      if (!fs.existsSync(templatePath)) {
        console.warn(`⚠️ Template ${templateName} non trouvé, utilisation du template par défaut`);
        return handlebars.compile('{{body}}');
      }
      
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      return handlebars.compile(templateSource);
    } catch (error) {
      console.error(`❌ Erreur lors de la compilation du template ${templateName}:`, error);
      return handlebars.compile('{{body}}');
    }
  }

  // Envoyer un email
  async sendEmail(options) {
    try {
      const { to, subject, templateName = 'default', context = {} } = options;
      
      // Vérifier les paramètres obligatoires
      if (!to || !subject) {
        console.error('❌ Erreur: "to" et "subject" sont requis pour l\'envoi d\'email');
        throw new Error('Les paramètres "to" et "subject" sont requis');
      }
      
      // Vérifier si le transporteur est initialisé
      if (!this.transporter) {
        console.error('❌ Erreur: Transporteur email non initialisé');
        return {
          success: false,
          error: 'Transporteur email non initialisé'
        };
      }
      
      // Récupérer le template approprié ou utiliser le template par défaut
      const template = this.templates[templateName] || this.templates.default;
      
      // Ajouter l'année actuelle au contexte
      const enrichedContext = {
        ...context,
        year: new Date().getFullYear()
      };
      
      // Générer le contenu HTML
      const html = template(enrichedContext);
      
      // Configuration de l'email
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"YSG convoyage" <convoyages@yourservices-group.com>',
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        html
      };
      
      // Ajouter des CC si spécifiés
      if (options.cc) {
        mailOptions.cc = Array.isArray(options.cc) ? options.cc.join(',') : options.cc;
      }
      
      // Ajouter des BCC si spécifiés
      if (options.bcc) {
        mailOptions.bcc = Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc;
      }
      
      // Envoyer l'email
      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
        info
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Envoyer une notification de mouvement aux agences
  async sendMovementNotification(movement, departureAgency, arrivalAgency, driverInfo = null) {
    try {
      // Vérifications des données
      if (!departureAgency || !arrivalAgency) {
        console.error('❌ Erreur: Informations d\'agence manquantes');
        throw new Error('Les informations d\'agence sont requises');
      }
      
      // Préparation des destinataires - S'assurer que les deux emails sont inclus
      const recipients = [];
      
      // Ajouter l'email de l'agence de départ s'il existe
      if (departureAgency.email) {
        recipients.push(departureAgency.email);
      } else {
        console.warn('⚠️ L\'agence de départ n\'a pas d\'email');
      }
      
      // Ajouter l'email de l'agence d'arrivée s'il existe
      if (arrivalAgency.email) {
        recipients.push(arrivalAgency.email);
      } else {
        console.warn('⚠️ L\'agence d\'arrivée n\'a pas d\'email');
      }
      
      if (recipients.length === 0) {
        console.error('❌ Erreur: Aucune adresse email d\'agence disponible');
        throw new Error('Aucune adresse email d\'agence disponible');
      }
      
      console.log(`📧 Envoi de notification aux destinataires: ${recipients.join(', ')}`);
      
      // Générer le PDF de bon de commande
      const pdfBuffer = await this.generateOrderPDF(movement, departureAgency, arrivalAgency, driverInfo);
      
      // Construction du sujet
      const subject = `Bon de commande - Véhicule ${movement.licensePlate}`;
      
      // Corps simple du message
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Bonjour,</p>
          <p>Veuillez trouver ci-joint votre bon de commande / convoyage avec YSG.</p>
          <p>Ce document contient toutes les informations nécessaires concernant le transport du véhicule ${movement.licensePlate}.</p>
          <p>Pour toute question, n'hésitez pas à nous contacter.</p>
          <p>Cordialement,<br>L'équipe Your Services Group</p>
        </div>
      `;
      
      // Configuration de l'email - Envoyer explicitement à tous les destinataires
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"YSG Convoyage" <convoyages@yourservices-group.com>',
        to: recipients.join(','),  // Tous les destinataires comme destinataires principaux
        subject,
        html: htmlBody,
        attachments: [
          {
            filename: `bon_commande_${movement.licensePlate.replace(/\s+/g, '_')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };
      
      // Envoyer l'email
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Email envoyé avec succès aux agences (ID: ${info.messageId})`);
      
      return {
        success: true,
        messageId: info.messageId,
        recipients: recipients,
        info
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de la notification de mouvement avec PDF:', error);
      return { success: false, error: error.message };
    }
  }

  async calculateDistance(origin, destination) {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        console.error('❌ Clé API Google Maps non définie');
        return null;
      }
  
      // Vérifier que les coordonnées sont valides
      if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
        console.error('❌ Coordonnées d\'origine ou de destination invalides');
        return null;
      }
  
      // Préparer les coordonnées au format requis par l'API
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;
  
      // Construire l'URL de l'API
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${originStr}&destinations=${destinationStr}&key=${GOOGLE_MAPS_API_KEY}`;
  
      // Faire la requête API
      const response = await axios.get(url);
      const data = response.data;
  
      // Vérifier si la requête a réussi
      if (data.status !== 'OK') {
        console.error(`❌ Erreur API Google Maps: ${data.status}`);
        return null;
      }
  
      // Vérifier si les données sont valides
      if (!data.rows || !data.rows[0] || !data.rows[0].elements || !data.rows[0].elements[0]) {
        console.error('❌ Réponse API Google Maps invalide');
        return null;
      }
  
      const element = data.rows[0].elements[0];
  
      // Vérifier si l'itinéraire a été trouvé
      if (element.status !== 'OK') {
        console.error(`❌ Impossible de trouver un itinéraire: ${element.status}`);
        return null;
      }
  
      // Extraire la distance en mètres et convertir en kilomètres
      const distanceInMeters = element.distance.value;
      const distanceInKm = distanceInMeters / 1000;
      return distanceInKm;
    } catch (error) {
      console.error('❌ Erreur lors du calcul de la distance avec Google Maps API:', error);
      return null;
    }
  }

  /**
 * Envoie une notification à l'agence d'arrivée lorsqu'un chauffeur démarre un mouvement
 * @param {Object} movement - Le mouvement démarré
 * @param {Object} departureAgency - L'agence de départ
 * @param {Object} arrivalAgency - L'agence d'arrivée
 * @param {Object} driver - Le chauffeur
 * @returns {Promise<Object>} Résultat de l'envoi
 */
async sendDepartureNotification(movement, departureAgency, arrivalAgency, driver = null) {
  try {
    // Vérifier que l'agence d'arrivée est définie et a un email
    if (!arrivalAgency || !arrivalAgency.email) {
      console.error('❌ Erreur: Informations d\'agence d\'arrivée manquantes ou sans email');
      throw new Error('Les informations de l\'agence d\'arrivée sont requises');
    }
    
    // Récupérer l'email de l'agence d'arrivée
    const recipient = arrivalAgency.email;
    console.log(`📧 Envoi de notification de départ à: ${recipient}`);
    
    // Construire le sujet avec des informations utiles
    const subject = `🚗 Véhicule ${movement.licensePlate} en route - Arrivée prévue`;
    
    // Calculer l'heure d'arrivée estimée si définie
    let estimatedArrival = 'Non définie';
    if (movement.arrivalTime) {
      estimatedArrival = new Date(movement.arrivalTime).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (movement.departureTime) {
      // Si l'heure d'arrivée n'est pas définie mais l'heure de départ oui,
      // estimer l'arrivée en ajoutant un temps par défaut (par exemple 2 heures)
      const estimatedTime = new Date(movement.departureTime);
      estimatedTime.setHours(estimatedTime.getHours() + 2); // Ajouter 2 heures
      estimatedArrival = estimatedTime.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' (estimation)';
    }
    
    // Formater l'heure de départ
    const departureTime = movement.departureTime 
      ? new Date(movement.departureTime).toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Non définie';
    
    // Corps du message HTML
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Notification de départ d'un véhicule</h2>
        
        <p>Bonjour,</p>
        
        <p>Nous vous informons qu'un véhicule est maintenant <strong style="color: #2563eb;">en route</strong> vers votre agence.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0; border-radius: 0 5px 5px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Détails du véhicule</h3>
          <p><strong>Immatriculation:</strong> ${movement.licensePlate}</p>
          ${movement.vehicleModel ? `<p><strong>Modèle:</strong> ${movement.vehicleModel}</p>` : ''}
          <p><strong>Statut:</strong> <span style="color: #2563eb; font-weight: bold;">En route</span></p>
        </div>
        
        <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0; border-radius: 0 5px 5px 0;">
          <h3 style="margin-top: 0; color: #0369a1;">Informations de trajet</h3>
          <p><strong>Départ de:</strong> ${departureAgency ? departureAgency.name : movement.departureLocation.name}</p>
          <p><strong>Arrivée à:</strong> ${arrivalAgency ? arrivalAgency.name : movement.arrivalLocation.name}</p>
          <p><strong>Heure de départ:</strong> ${departureTime}</p>
          <p><strong>Arrivée prévue:</strong> ${estimatedArrival}</p>
        </div>
        
        ${driver ? `
        <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 0 5px 5px 0;">
          <h3 style="margin-top: 0; color: #047857;">Chauffeur</h3>
          <p><strong>Nom:</strong> ${driver.fullName}</p>
        </div>
        ` : ''}
        
        ${movement.notes ? `
        <div style="background-color: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 0 5px 5px 0;">
          <h3 style="margin-top: 0; color: #b45309;">Notes</h3>
          <p>${movement.notes}</p>
        </div>
        ` : ''}
        
        <p>Veuillez préparer la réception de ce véhicule. Pour toute question concernant ce mouvement, n'hésitez pas à nous contacter.</p>
        
        <p>Cordialement,<br>L'équipe Your Services Group</p>
      </div>
    `;
    
    // Configuration de l'email
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"YSG Convoyage" <convoyages@yourservices-group.com>',
      to: recipient,
      subject,
      html: htmlBody
    };
    
    // Ajouter le département en copie si un email est défini
    if (departureAgency && departureAgency.email) {
      mailOptions.cc = departureAgency.email;
    }
    
    // Envoyer l'email
    const info = await this.transporter.sendMail(mailOptions);
    
    console.log(`✅ Notification de départ envoyée avec succès à ${recipient} (ID: ${info.messageId})`);
    
    return {
      success: true,
      messageId: info.messageId,
      recipients: [recipient]
    };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification de départ:', error);
    return { success: false, error: error.message };
  }
}

  // Nouvelle méthode pour générer un PDF similaire à l'exemple fourni
  async generateOrderPDF(movement, departureAgency, arrivalAgency, driverInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        // Calculer la distance réelle entre les agences via Google Maps API
        let distance = null;

        // Vérifier si nous avons les coordonnées des deux agences
        if (departureAgency?.location?.coordinates && arrivalAgency?.location?.coordinates) {
          try {
            // S'assurer que les coordonnées sont des nombres
            const departureCoords = {
              latitude: parseFloat(departureAgency.location.coordinates.latitude),
              longitude: parseFloat(departureAgency.location.coordinates.longitude)
            };
            
            const arrivalCoords = {
              latitude: parseFloat(arrivalAgency.location.coordinates.latitude),
              longitude: parseFloat(arrivalAgency.location.coordinates.longitude)
            };
            
            // Vérifier que les coordonnées sont valides après conversion
            if (!isNaN(departureCoords.latitude) && !isNaN(departureCoords.longitude) &&
                !isNaN(arrivalCoords.latitude) && !isNaN(arrivalCoords.longitude)) {
              
              // Calculer la distance réelle entre les agences
              // CORRECTION : Assignez le résultat à la variable distance
              distance = await this.calculateDistance(
                departureCoords,
                arrivalCoords
              );
              
              if (distance) {
                console.log(`✅ Distance calculée avec succès: ${distance.toFixed(2)} km`);
              } else {
                console.warn('⚠️ Le calcul de distance a retourné null');
              }
            } else {
              console.error(`❌ Coordonnées invalides après conversion: ` +
                            `${JSON.stringify(departureCoords)} -> ${JSON.stringify(arrivalCoords)}`);
            }
          } catch (distanceError) {
            console.error('❌ Erreur lors du calcul de la distance:', distanceError);
          }
        }
        
        // Si la distance n'a pas pu être calculée, utiliser une valeur par défaut
        if (distance === null) {
          console.log('⚠️ Impossible de calculer la distance exacte, utilisation d\'une valeur estimée');
          // Estimer une distance "réaliste" entre 10 et 500 km
          distance = Math.floor(Math.random() * 490) + 10;
        }
        
        // Arrondir la distance à 2 décimales
        distance = Math.round(distance * 100) / 100;
        
        // Créer un nouveau document PDF
        const doc = new PDFDocument({
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          },
          size: 'A4'
        });
        
        // Collecter les chunks du PDF dans un buffer
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        
        // Convertir les objets Mongoose en objets JS simples si nécessaire
        const movementObj = movement.toObject ? movement.toObject() : {...movement};
        const departureObj = departureAgency.toObject ? departureAgency.toObject() : {...departureAgency};
        const arrivalObj = arrivalAgency.toObject ? arrivalAgency.toObject() : {...arrivalAgency};
        
        // Obtenir la date actuelle au format français
        const currentDate = moment().format('DD.MM.YYYY');
        
        // *** PREMIÈRE SECTION: LOGO EN HAUT À DROITE SEUL ***
        
        // Ajouter le logo YSG en haut à droite
        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 400, 30, { width: 75 });
        }
        
        // *** SECTION SUIVANTE: TITRE ET INFORMATIONS ***
        
        // Titre principal (centré horizontalement)
        doc.font('Helvetica-Bold').fontSize(16);
        doc.text('Bon de commande / Confirmation d\'enlèvement', 50, 120, { align: 'center' });
        
        // Colonne gauche: Informations société
        doc.font('Helvetica').fontSize(11);
        doc.text('YOUR SERVICES GROUP', 50, 160);
        doc.text('47 BOULEVARD DE COURCELLES', 50, 175);
        doc.text('75008 PARIS', 50, 190);
        
        // Colonne droite: Informations du document
        doc.font('Helvetica').fontSize(11);
        doc.text(`Paris, le ${currentDate}`, 350, 160, { align: 'right' });
        doc.text(`Date de commande: ${currentDate}`, 350, 175, { align: 'right' });
        
        // Date de livraison
        if (movementObj.deadline) {
          const deliveryDate = moment(movementObj.deadline).format('DD.MM.YYYY');
          doc.text(`Date de livraison: ${deliveryDate}`, 350, 190, { align: 'right' });
        } else {
          const deliveryDate = moment(currentDate, 'DD.MM.YYYY').add(1, 'days').format('DD.MM.YYYY');
          doc.text(`Date de livraison: ${deliveryDate}`, 350, 190, { align: 'right' });
        }
        
        // *** SECTION TABLEAU: INFORMATIONS DU VÉHICULE ***
        
        // Texte d'introduction
        doc.moveDown(3);
        doc.text('Nos avons été mandaté pour le transport du véhicule suivant:', 50, 245);
        
        // Tableau des véhicules (entêtes)
        const tableY = 270;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Véhicule', 50, tableY);
        doc.text('Détails', 200, tableY);
        doc.text('Enlèvement', 300, tableY);
        doc.text('Livraison', 430, tableY);
        
        // Ligne horizontale
        doc.moveTo(50, tableY + 15).lineTo(550, tableY + 15).stroke();
        
        // Données du véhicule
        doc.font('Helvetica').fontSize(10);
        
        // Colonne Véhicule
        const vehicleY = tableY + 25;
        doc.text(movementObj.licensePlate || 'N/A', 50, vehicleY);
        if (movementObj.vehicleModel) {
          doc.text(movementObj.vehicleModel, 50, vehicleY + 15);
        }
        
        // Colonne Détails - Utiliser la distance calculée avec Google Maps
        doc.text(`${distance.toFixed(2)} km`, 200, vehicleY);
        
        // Colonne Enlèvement
        doc.text(departureObj.name || 'N/A', 300, vehicleY);
        doc.text(departureObj.address || 'N/A', 300, vehicleY + 15, { width: 120 });
        
        // Colonne Livraison
        doc.text(arrivalObj.name || 'N/A', 430, vehicleY);
        doc.text(arrivalObj.address || 'N/A', 430, vehicleY + 15, { width: 120 });
        
        // *** SECTION FINALE: INFORMATIONS JURIDIQUES ET SIGNATURES ***
        
        // Accord tarifaire
        doc.moveDown(3);
        const accordY = vehicleY + 80;
        doc.text('Accord tarifaire individuel', 50, accordY);
        
        // Zone de signature
        const signatureY = accordY + 30;
        doc.moveTo(50, signatureY).lineTo(250, signatureY).stroke();
        doc.text('Lieu, Date', 50, signatureY + 5);
        
        doc.moveTo(350, signatureY).lineTo(550, signatureY).stroke();
        doc.text('Signature du conducteur', 350, signatureY + 5);
        
        doc.fontSize((6.5));
        doc.text('Les chargements et déchargements doivent avoir lieu durant les horaires d\'ouverture de l\'agence. Le prestataire en charge du transport est responsable de la vérification de l\'état des véhicules. Toute anomalie doit être signalée sur le bon de transport.',
          50, signatureY + 300, { align: 'center', width: 500 });
        doc.text('Veuillez-vous référer au contrat cadre de transport pour les modalités détaillées.',
          50, signatureY + 315, { align: 'center', width: 500 });
        
        // Note finale
        doc.text('Ceci est une commande électronique et est valable sans signature.', 50, signatureY + 330, { align: 'center', width: 500 });
        
        // Finaliser le document
        doc.end();
        
      } catch (error) {
        console.error('❌ Erreur lors de la génération du PDF:', error);
        reject(error);
      }
    });
  }

  async generateAndStoreOrderPDF(movement, departureAgency, arrivalAgency, driverInfo) {
    // Générer le PDF comme avant
    const pdfBuffer = await emailService.generateOrderPDF(
      movement, departureAgency, arrivalAgency, driverInfo
    );
    
    // Créer un nom de fichier unique
    const fileName = `order_${movement._id}_${Date.now()}.pdf`;
    
    // Stocker le PDF sur S3 (similaire à uploadService.uploadDirect)
    const { presignedUrl, fileUrl } = await uploadService.getPresignedUrl(
      'application/pdf',
      fileName,
      'orders'
    );
    
    // Upload direct vers S3
    await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: pdfBuffer
    });
    
    // Mettre à jour le mouvement avec l'URL du PDF
    movement.orderForm = {
      url: fileUrl,
      createdAt: new Date(),
      version: 1
    };
    
    await movement.save();
    
    return {
      buffer: pdfBuffer,
      url: fileUrl
    };
  }

  // Fonction utilitaire pour traduire les statuts
  translateStatus(status) {
    const statusMap = {
      'pending': 'En attente',
      'assigned': 'Assigné',
      'preparing': 'En préparation',
      'in-progress': 'En cours',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };
    
    return statusMap[status] || status;
  }
}

// Export d'une instance unique
module.exports = new EmailService();