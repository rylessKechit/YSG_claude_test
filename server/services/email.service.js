// server/services/email.service.js
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    // Création du transporteur Nodemailer
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Initialisation des templates
    this.initializeTemplates();
  }

  // Charger les templates d'email
  initializeTemplates() {
    try {
      // Chemin vers le dossier des templates
      const templatesDir = path.join(__dirname, '../templates/emails');
      
      // Vérification si le dossier existe
      if (!fs.existsSync(templatesDir)) {
        console.warn('Le dossier des templates d\'email n\'existe pas encore');
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
      }
      
      // Charger les templates
      this.templates = {
        default: this.compileTemplate('default.html'),
        movementNotification: this.compileTemplate('movement-notification.html')
      };
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des templates d\'email:', error);
    }
  }

  // Compiler un template avec Handlebars
  compileTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '../templates/emails', templateName);
      
      if (!fs.existsSync(templatePath)) {
        console.warn(`Template ${templateName} non trouvé, utilisation du template par défaut`);
        return handlebars.compile('{{body}}');
      }
      
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      return handlebars.compile(templateSource);
    } catch (error) {
      console.error(`Erreur lors de la compilation du template ${templateName}:`, error);
      return handlebars.compile('{{body}}');
    }
  }

  // Envoyer un email
  async sendEmail(options) {
    try {
      const { to, subject, templateName = 'default', context = {} } = options;
      
      // Vérifier les paramètres obligatoires
      if (!to || !subject) {
        throw new Error('Les paramètres "to" et "subject" sont requis');
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
        from: process.env.EMAIL_FROM || '"Système de Gestion des Chauffeurs" <noreply@example.com>',
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
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Envoyer une notification de mouvement aux agences
  async sendMovementNotification(movement, departureAgency, arrivalAgency, driverInfo = null) {
    try {
      // Si l'environnement est en mode développement, logger les informations
      if (process.env.NODE_ENV === 'development') {
        console.log('Simulation d\'envoi d\'email de notification de mouvement:');
        console.log(`- De: ${departureAgency.name} (${departureAgency.email})`);
        console.log(`- À: ${arrivalAgency.name} (${arrivalAgency.email})`);
        console.log(`- Véhicule: ${movement.licensePlate}`);
        
        return { success: true, devMode: true };
      }
      
      // Préparation des destinataires
      const recipients = [departureAgency.email, arrivalAgency.email].filter(Boolean);
      
      if (recipients.length === 0) {
        throw new Error('Aucune adresse email d\'agence disponible');
      }
      
      // Construction du sujet
      const subject = `Bon de Convoyage - Véhicule ${movement.licensePlate} - ${departureAgency.name} → ${arrivalAgency.name}`;
      
      // Préparation du contexte pour le template
      const context = {
        title: 'Bon de Convoyage',
        movement: {
          ...movement,
          departureTime: movement.departureTime ? new Date(movement.departureTime).toLocaleString('fr-FR') : 'Non défini',
          arrivalTime: movement.arrivalTime ? new Date(movement.arrivalTime).toLocaleString('fr-FR') : 'Non défini',
          deadline: movement.deadline ? new Date(movement.deadline).toLocaleString('fr-FR') : 'Non défini',
          status: this.translateStatus(movement.status)
        },
        departureAgency: departureAgency,
        arrivalAgency: arrivalAgency,
        driver: driverInfo,
        body: `
          <h2>Bon de Convoyage</h2>
          <p><strong>Véhicule:</strong> ${movement.licensePlate} ${movement.vehicleModel ? `(${movement.vehicleModel})` : ''}</p>
          <p><strong>Statut:</strong> ${this.translateStatus(movement.status)}</p>
          
          <h3>Itinéraire</h3>
          <p><strong>Agence de départ:</strong> ${departureAgency.name}<br>
             <strong>Adresse:</strong> ${departureAgency.address}</p>
          
          <p><strong>Agence d'arrivée:</strong> ${arrivalAgency.name}<br>
             <strong>Adresse:</strong> ${arrivalAgency.address}</p>
          
          ${movement.deadline ? `<p><strong>Date limite d'arrivée:</strong> ${new Date(movement.deadline).toLocaleString('fr-FR')}</p>` : ''}
          
          ${driverInfo ? `
          <h3>Chauffeur</h3>
          <p><strong>Nom:</strong> ${driverInfo.fullName}<br>
             ${driverInfo.phone ? `<strong>Téléphone:</strong> ${driverInfo.phone}<br>` : ''}
             ${driverInfo.email ? `<strong>Email:</strong> ${driverInfo.email}` : ''}</p>
          ` : '<p><strong>Chauffeur:</strong> Non assigné</p>'}
          
          ${movement.notes ? `
          <h3>Notes</h3>
          <p>${movement.notes}</p>
          ` : ''}
          
          <p>Ce message est généré automatiquement par le Système de Gestion des Chauffeurs.</p>
        `
      };
      
      // Envoi de l'email
      return await this.sendEmail({
        to: recipients,
        subject,
        templateName: 'movementNotification',
        context
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de mouvement:', error);
      return { success: false, error: error.message };
    }
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