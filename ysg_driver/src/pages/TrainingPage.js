import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Formation.css';
 // Importer le fichier CSS pour le style

// Composant principal de la page de formation
const TrainingPage = () => {
  const [activeTab, setActiveTab] = useState('guide');

  const S3_base_url = "https://ysg-driver-preparator.s3.eu-north-1.amazonaws.com"

  const createMovementUrl = `${S3_base_url}/CreateMovement.mp4`;
  const movementGuideUrl = `${S3_base_url}/MovementGuide.mp4`;
  const preparationGuideUrl = `${S3_base_url}/PreparationGuide.mp4`;

  // Données pour les sections de formation
  const trainingData = {
    guide: {
      title: "Guide d'utilisation",
      content: (
        <>
          <h2>Guide d'utilisation YSG Driver</h2>
          
          <div className="training-section">
            <h3>Introduction</h3>
            <p>
              Bienvenue dans le guide de formation de l'application YSG Driver. Cette application a été conçue pour optimiser la gestion des mouvements de véhicules et des préparations. Que vous soyez chauffeur, préparateur ou chef d'équipe, ce guide vous aidera à maîtriser toutes les fonctionnalités disponibles.
            </p>
          </div>
          
          <div className="training-section">
            <h3>Premiers pas avec l'application</h3>
            
            <h4>Connexion</h4>
            <ol>
              <li>Au lancement de l'application, saisissez vos identifiants (nom d'utilisateur et mot de passe) fournis par votre administrateur.</li>
              <li>Si vous rencontrez des difficultés de connexion, utilisez l'option "Mot de passe oublié" ou contactez votre chef d'équipe.</li>
              <li>Pour des raisons de sécurité, ne partagez jamais vos identifiants et déconnectez-vous systématiquement lorsque vous n'utilisez pas l'application.</li>
            </ol>
            
            <h4>Navigation dans l'application</h4>
            <p>
              L'application est organisée autour d'un tableau de bord central qui affiche les informations pertinentes en fonction de votre rôle :
            </p>
            <ul>
              <li><strong>Chauffeurs</strong> : Trajets assignés, trajets en cours et historique récent</li>
              <li><strong>Préparateurs</strong> : Préparations en cours et historique des préparations</li>
              <li><strong>Chefs d'équipe</strong> : Vue d'ensemble des activités et options administratives</li>
            </ul>
            
            <h4>Pointage</h4>
            <p>
              Le pointage est une étape obligatoire avant de pouvoir effectuer des opérations dans l'application :
            </p>
            <ol>
              <li>Accédez à l'onglet "Pointage" depuis le tableau de bord ou le menu principal.</li>
              <li>Cliquez sur "Démarrer le service" pour commencer votre journée de travail.</li>
              <li>L'application utilisera votre localisation GPS pour valider le pointage (assurez-vous que la localisation est activée sur votre appareil).</li>
              <li>À la fin de votre journée, n'oubliez pas de "Terminer le service" dans la même section.</li>
            </ol>
            <div className="alert alert-info">
              <strong>Important</strong> : Vous devez être à proximité d'un site de l'entreprise ou connecté au réseau Wi-Fi de l'entreprise pour que le pointage soit validé.
            </div>
          </div>
          
          <div className="training-section">
            <h3>Guide du Chauffeur</h3>
            
            <h4>Gérer ses mouvements de véhicules</h4>
            <p>
              Depuis votre tableau de bord, vous pouvez visualiser :
            </p>
            <ul>
              <li>Les mouvements qui vous sont assignés</li>
              <li>Les mouvements en cours</li>
              <li>L'historique de vos mouvements récents</li>
            </ul>
            
            <h4>Créer un nouveau mouvement</h4>
            <ol>
              <li>Assurez-vous d'être en service (pointage actif).</li>
              <li>Depuis le tableau de bord, cliquez sur "Créer un nouveau mouvement".</li>
              <li>Remplissez soigneusement le formulaire avec les informations du véhicule et les lieux de départ et d'arrivée.</li>
              <li>Utilisez le bouton "Utiliser ma position actuelle" pour définir automatiquement les coordonnées GPS du lieu de départ ou d'arrivée.</li>
              <li>Prenez des photos du véhicule avant de démarrer le mouvement.</li>
              <li>Cliquez sur "Créer et démarrer le trajet" pour commencer le mouvement.</li>
            </ol>
            
            <h4>Photos des véhicules</h4>
            <p>
              Pour chaque mouvement, vous devez prendre des photos du véhicule au départ et à l'arrivée :
            </p>
            <p><strong>Photos obligatoires</strong> :</p>
            <ul>
              <li>Face avant avec plaque</li>
              <li>Côté passager</li>
              <li>Côté conducteur</li>
              <li>Face arrière</li>
              <li>Pare-brise</li>
              <li>Toit</li>
              <li>Compteur kilométrique</li>
            </ul>
            
            <h4>Terminer un mouvement</h4>
            <ol>
              <li>À l'arrivée, cliquez sur "Terminer" sur la carte du mouvement en cours dans votre tableau de bord.</li>
              <li>Prenez les photos requises du véhicule à l'arrivée (même série que pour le départ).</li>
              <li>Ajoutez des notes si nécessaire (état du véhicule, informations particulières, etc.).</li>
              <li>Cliquez sur "Terminer le trajet" pour finaliser le mouvement.</li>
            </ol>
          </div>
          
          <div className="training-section">
            <h3>Guide du Préparateur</h3>
            
            <h4>Créer une préparation</h4>
            <ol>
              <li>Assurez-vous d'être en service (pointage actif).</li>
              <li>Depuis le tableau de bord, cliquez sur "Créer une nouvelle préparation".</li>
              <li>Renseignez l'agence, la plaque d'immatriculation et le modèle du véhicule.</li>
              <li>Ajoutez des notes si nécessaire.</li>
              <li>Cliquez sur "Créer la préparation" pour commencer.</li>
            </ol>
            
            <h4>Effectuer les tâches de préparation</h4>
            <p>
              Chaque préparation comprend quatre tâches principales :
            </p>
            <ol>
              <li>
                <strong>Lavage extérieur</strong>
                <ul>
                  <li>Commencez la tâche en cliquant sur "Commencer le lavage extérieur".</li>
                  <li>Une fois le lavage terminé, prenez une photo du véhicule propre.</li>
                  <li>Ajoutez des notes si nécessaire et cliquez sur "Terminer le lavage extérieur".</li>
                </ul>
              </li>
              <li>
                <strong>Nettoyage intérieur</strong>
                <ul>
                  <li>Procédez de la même manière : commencez la tâche, effectuez le nettoyage, prenez une photo, terminez la tâche.</li>
                  <li>Soyez particulièrement attentif aux détails (tableau de bord, sièges, tapis, etc.).</li>
                </ul>
              </li>
              <li>
                <strong>Mise de carburant</strong>
                <ul>
                  <li>Lors de la validation de cette tâche, n'oubliez pas d'indiquer la quantité de carburant ajoutée en litres.</li>
                  <li>La photo du compteur de la pompe est fortement recommandée.</li>
                </ul>
              </li>
              <li>
                <strong>Stationnement</strong>
                <ul>
                  <li>Cette tâche se valide en une seule étape.</li>
                  <li>Prenez une photo du véhicule correctement stationné, montrant clairement sa position dans la zone de parking.</li>
                </ul>
              </li>
            </ol>
            
            <h4>Terminer une préparation</h4>
            <p>
              Une fois toutes les tâches complétées (ou au moins une) :
            </p>
            <ol>
              <li>Ajoutez des notes finales si nécessaire dans la section "Notes".</li>
              <li>Cliquez sur "Terminer la préparation" en bas de la page.</li>
              <li>La préparation sera alors marquée comme "Terminée" et apparaîtra dans l'historique des préparations.</li>
            </ol>
          </div>
          
          <div className="training-section">
            <h3>FAQ</h3>
            <div className="faq-item">
              <h4>Que faire si je ne peux pas prendre toutes les photos requises ?</h4>
              <p>Ajoutez une note expliquant pourquoi certaines photos ne peuvent pas être prises (conditions météorologiques, limitations d'accès, etc.) et contactez votre chef d'équipe.</p>
            </div>
            <div className="faq-item">
              <h4>Comment modifier une préparation ou un mouvement déjà terminé ?</h4>
              <p>Les préparations et mouvements terminés ne peuvent pas être modifiés. Contactez votre administrateur si une correction est nécessaire.</p>
            </div>
            <div className="faq-item">
              <h4>Que faire si le véhicule présente des dommages importants ?</h4>
              <p>Prenez des photos détaillées des dommages, ajoutez des notes précises et signalez immédiatement la situation à votre chef d'équipe.</p>
            </div>
            <div className="faq-item">
              <h4>L'application peut-elle fonctionner sans connexion internet ?</h4>
              <p>L'application nécessite une connexion internet pour la plupart des fonctionnalités. Certaines informations peuvent être consultées hors ligne, mais vous ne pourrez pas créer ou terminer des tâches sans connexion.</p>
            </div>
            <div className="faq-item">
              <h4>Comment faire si je ne trouve pas le véhicule à l'emplacement indiqué ?</h4>
              <p>Contactez immédiatement votre chef d'équipe et ajoutez une note dans l'application.</p>
            </div>
          </div>
          
          <div className="training-section">
            <p className="text-center">
              <Link to="/dashboard" className="btn btn-primary">Retour au tableau de bord</Link>
            </p>
          </div>
        </>
      )
    },
    
    tips: {
      title: "Astuces & conseils",
      content: (
        <>
          <h2>Astuces et conseils pratiques</h2>
          
          <div className="training-section">
            <h3><span className="icon-heading"><i className="fas fa-car"></i></span> Trucs et astuces pour les chauffeurs</h3>
            
            <div className="tip-card">
              <h4><i className="fas fa-route"></i> Optimisation des mouvements</h4>
              <ol>
                <li><strong>Planification intelligente des itinéraires</strong>
                  <ul>
                    <li>Consultez les mouvements assignés dès le début de votre service pour organiser votre journée</li>
                    <li>Regroupez les mouvements par zone géographique pour minimiser les distances</li>
                    <li>Pensez aux heures de pointe et planifiez vos déplacements en conséquence</li>
                  </ul>
                </li>
                <li><strong>Gestion efficace des deadlines</strong>
                  <ul>
                    <li>Identifiez les mouvements avec deadline urgente (marqués en orange dans l'application)</li>
                    <li>Priorisez ces mouvements pour éviter les retards</li>
                    <li>Si un retard est inévitable, informez immédiatement votre responsable</li>
                  </ul>
                </li>
                <li><strong>Suivi du carburant</strong>
                  <ul>
                    <li>Surveillez toujours le niveau de carburant avant de démarrer un mouvement</li>
                    <li>L'application vous permet de noter le niveau de carburant dans les notes du mouvement</li>
                    <li>Faites le plein dès que le niveau descend sous 1/4 du réservoir</li>
                  </ul>
                </li>
              </ol>
            </div>
            
            <div className="tip-card">
              <h4><i className="fas fa-camera"></i> Astuces pour les photos</h4>
              <ol>
                <li><strong>Gagner du temps avec les photos</strong>
                  <ul>
                    <li>Positionnez-vous toujours au même endroit pour chaque type de photo (créez votre routine)</li>
                    <li>Faites le tour du véhicule dans le sens des aiguilles d'une montre pour ne rien oublier</li>
                    <li>Prenez une photo supplémentaire en cas de doute sur la qualité</li>
                  </ul>
                </li>
                <li><strong>Photos nocturnes</strong>
                  <ul>
                    <li>Utilisez le flash automatique de votre téléphone</li>
                    <li>Pour de meilleures photos de nuit, activez le mode "Nuit" si disponible sur votre appareil</li>
                    <li>Utilisez les éclairages du parking pour vous aider</li>
                  </ul>
                </li>
                <li><strong>Documentation des dommages</strong>
                  <ul>
                    <li>Utilisez un objet de référence (comme une pièce de monnaie) à côté des petits dommages pour montrer l'échelle</li>
                    <li>Prenez des photos sous plusieurs angles</li>
                    <li>Encadrez d'abord la zone générale, puis faites un zoom sur le dommage spécifique</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
          
          <div className="training-section">
            <h3><span className="icon-heading"><i className="fas fa-tools"></i></span> Trucs et astuces pour les préparateurs</h3>
            
            <div className="tip-card">
              <h4><i className="fas fa-tasks"></i> Préparation efficace</h4>
              <ol>
                <li><strong>Organisation du travail</strong>
                  <ul>
                    <li>Préparez plusieurs véhicules en parallèle pour optimiser votre temps</li>
                    <li>Exemple : pendant qu'un véhicule est en phase de séchage après lavage, commencez le nettoyage intérieur d'un autre</li>
                    <li>Utilisez l'application pour suivre l'avancement de chaque préparation</li>
                  </ul>
                </li>
                <li><strong>Optimisation des tâches</strong>
                  <ul>
                    <li>Pour le lavage extérieur, commencez toujours par le toit et descendez progressivement</li>
                    <li>Pour le nettoyage intérieur, adoptez une routine : d'abord vider, puis aspirer, puis nettoyer les surfaces</li>
                    <li>Pour la mise de carburant, arrondissez toujours à un chiffre rond pour faciliter la comptabilité</li>
                  </ul>
                </li>
                <li><strong>Vérifications supplémentaires</strong>
                  <ul>
                    <li>Profitez du processus de préparation pour vérifier rapidement les niveaux (huile, liquide lave-glace)</li>
                    <li>Contrôlez la pression des pneus pendant la phase de nettoyage</li>
                    <li>Vérifiez l'éclairage (feux, clignotants) une fois le lavage terminé</li>
                  </ul>
                </li>
              </ol>
            </div>
            
            <div className="tip-card">
              <h4><i className="fas fa-clipboard-check"></i> Documentation des préparations</h4>
              <ol>
                <li><strong>Notes détaillées</strong>
                  <ul>
                    <li>Soyez précis dans vos notes pour faciliter le suivi</li>
                    <li>Exemple d'une bonne note : "Taches persistantes sur siège arrière droit, possiblement du café"</li>
                    <li>Utilisez des termes standardisés pour faciliter les recherches ultérieures</li>
                  </ul>
                </li>
                <li><strong>Photos avant/après</strong>
                  <ul>
                    <li>Prenez les photos avant et après exactement du même angle pour montrer clairement la différence</li>
                    <li>Utilisez les mêmes conditions d'éclairage si possible</li>
                    <li>Pour les intérieurs, assurez-vous que les photos montrent bien les détails nettoyés</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
          
          <div className="training-section">
            <h3><span className="icon-heading"><i className="fas fa-lightbulb"></i></span> Astuces générales pour tous les utilisateurs</h3>
            
            <div className="tip-card">
              <h4><i className="fas fa-mobile-alt"></i> Optimisation de l'application</h4>
              <ol>
                <li><strong>Mode économie de batterie</strong>
                  <ul>
                    <li>L'application peut consommer beaucoup de batterie, surtout avec le GPS actif</li>
                    <li>Réduisez la luminosité de votre écran quand possible</li>
                    <li>Fermez les autres applications en arrière-plan</li>
                  </ul>
                </li>
                <li><strong>Utilisation hors ligne</strong>
                  <ul>
                    <li>Si vous travaillez dans une zone à faible couverture réseau, chargez vos tâches à l'avance</li>
                    <li>Prenez les photos même sans connexion, elles seront uploadées automatiquement quand la connexion sera rétablie</li>
                    <li>Notez les informations importantes sur papier en cas de problème</li>
                  </ul>
                </li>
                <li><strong>Raccourcis utiles</strong>
                  <ul>
                    <li>Depuis le tableau de bord, vous pouvez accéder directement à vos tâches récentes</li>
                    <li>Utilisez la fonction de recherche par plaque d'immatriculation pour retrouver rapidement un véhicule</li>
                    <li>Ajoutez l'application à votre écran d'accueil pour un accès plus rapide</li>
                  </ul>
                </li>
              </ol>
            </div>
            
            <div className="tip-card">
              <h4><i className="fas fa-exclamation-triangle"></i> Résolution des problèmes courants</h4>
              <ol>
                <li><strong>Problèmes de connexion</strong>
                  <ul>
                    <li>Si l'application ne se connecte pas, vérifiez votre connexion internet puis redémarrez l'application</li>
                    <li>En cas d'échec persistant, essayez de vous connecter au réseau Wi-Fi de l'entreprise</li>
                    <li>Si le problème persiste, contactez le support technique</li>
                  </ul>
                </li>
                <li><strong>Erreurs lors de l'upload de photos</strong>
                  <ul>
                    <li>Réduisez la résolution de vos photos dans les paramètres de votre appareil photo</li>
                    <li>Essayez d'uploader les photos une par une plutôt qu'en groupe</li>
                    <li>Vérifiez l'espace disponible sur votre téléphone, libérez de l'espace si nécessaire</li>
                  </ul>
                </li>
                <li><strong>Problèmes de géolocalisation</strong>
                  <ul>
                    <li>Assurez-vous que la localisation est activée avec la "haute précision"</li>
                    <li>Redémarrez la localisation en la désactivant puis en la réactivant</li>
                    <li>Sortez à l'extérieur pour obtenir un meilleur signal GPS</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
          
          <div className="training-section">
            <p className="text-center">
              <Link to="/dashboard" className="btn btn-primary">Retour au tableau de bord</Link>
            </p>
          </div>
        </>
      )
    },
    
    videos: {
      title: "Tutoriels vidéo",
      content: (
        <>
          <h2>Tutoriels vidéo</h2>
          
          <div className="training-section">
            <h3>Vidéos explicatives</h3>
            <p>Cette section contient des tutoriels vidéo pour vous aider à maîtriser les fonctionnalités de l'application YSG Driver.</p>
            
            <div className="video-grid">
              <div className="video-card">
                <div className="video-container">
                  <video 
                    controls 
                    preload="metadata"
                    poster="/assets/video-thumbnail.jpg"
                    className="training-video"
                  >
                    <source src={createMovementUrl} type="video/mp4" />
                    Votre navigateur ne supporte pas la lecture de vidéos.
                  </video>
                </div>
                <div className="video-description">
                  <h4>Créer un mouvement</h4>
                  <p>Apprenez à créer un nouveau mouvement de véhicule étape par étape</p>
                  <p><strong>Format:</strong> MP4 (22.3 MB)</p>
                </div>
              </div>
              
              <div className="video-card">
                <div className="video-container">
                  <video 
                    controls 
                    preload="metadata"
                    poster="/assets/video-thumbnail.jpg"
                    className="training-video"
                  >
                    <source src={movementGuideUrl} type="video/mp4" />
                    Votre navigateur ne supporte pas la lecture de vidéos.
                  </video>
                </div>
                <div className="video-description">
                  <h4>Guide des mouvements</h4>
                  <p>Guide complet pour gérer les mouvements de véhicules de A à Z</p>
                  <p><strong>Format:</strong> MP4 (90.2 MB)</p>
                </div>
              </div>
              
              <div className="video-card">
                <div className="video-container">
                  <video 
                    controls 
                    preload="metadata"
                    poster="/assets/video-thumbnail.jpg"
                    className="training-video"
                  >
                    <source src={preparationGuideUrl} type="video/mp4" />
                    Votre navigateur ne supporte pas la lecture de vidéos.
                  </video>
                </div>
                <div className="video-description">
                  <h4>Guide des préparations</h4>
                  <p>Découvrez comment réaliser parfaitement les préparations de véhicules</p>
                  <p><strong>Format:</strong> MP4 (147.3 MB)</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="training-section">
            <p className="text-center">
              <Link to="/dashboard" className="btn btn-primary">Retour au tableau de bord</Link>
            </p>
          </div>
        </>
      )
    },
    
    resources: {
      title: "Ressources",
      content: (
        <>
          <h2>Ressources complémentaires</h2>
          
          <div className="training-section">
            <h3>Documents à télécharger</h3>
            
            <div className="resources-grid">
              <div className="resource-card">
                <div className="resource-icon">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div className="resource-info">
                  <h4>Guide complet de l'application</h4>
                  <p>Guide détaillé de toutes les fonctionnalités de YSG Driver (PDF, 4.2 MB)</p>
                  <button className="btn btn-sm btn-primary">Télécharger</button>
                </div>
              </div>
              
              <div className="resource-card">
                <div className="resource-icon">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div className="resource-info">
                  <h4>Fiche mémo pour les chauffeurs</h4>
                  <p>Résumé des étapes essentielles pour les chauffeurs (PDF, 1.5 MB)</p>
                  <button className="btn btn-sm btn-primary">Télécharger</button>
                </div>
              </div>
              
              <div className="resource-card">
                <div className="resource-icon">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div className="resource-info">
                  <h4>Fiche mémo pour les préparateurs</h4>
                  <p>Résumé des étapes essentielles pour les préparateurs (PDF, 1.8 MB)</p>
                  <button className="btn btn-sm btn-primary">Télécharger</button>
                </div>
              </div>
              
              <div className="resource-card">
                <div className="resource-icon">
                  <i className="fas fa-file-image"></i>
                </div>
                <div className="resource-info">
                  <h4>Exemples de photos</h4>
                  <p>Modèles de photos correctes pour les mouvements et préparations (ZIP, 8.5 MB)</p>
                  <button className="btn btn-sm btn-primary">Télécharger</button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="training-section">
            <h3>Contacts utiles</h3>
            
            <div className="contacts-grid">
              <div className="contact-card">
                <div className="contact-icon">
                  <i className="fas fa-headset"></i>
                </div>
                <div className="contact-info">
                  <h4>Support technique</h4>
                  <p>Pour tout problème technique avec l'application</p>
                  <p><strong>Email:</strong> support@ysgdriver.com</p>
                  <p><strong>Téléphone:</strong> 01 23 45 67 89</p>
                </div>
              </div>
              
              <div className="contact-card">
                <div className="contact-icon">
                  <i className="fas fa-question-circle"></i>
                </div>
                <div className="contact-info">
                  <h4>Questions sur l'utilisation</h4>
                  <p>Pour toute question sur l'utilisation de l'application</p>
                  <p><strong>Email:</strong> formation@ysgdriver.com</p>
                  <p><strong>Téléphone:</strong> 01 23 45 67 90</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="training-section">
            <p className="text-center">
              <Link to="/dashboard" className="btn btn-primary">Retour au tableau de bord</Link>
            </p>
          </div>
        </>
      )
    }
  };

  return (
    <div className="training-page-container">
      <div className="training-header">
        <h1>Formation YSG Driver</h1>
        <p>Apprenez à utiliser efficacement l'application YSG Driver avec nos guides et tutoriels</p>
      </div>
      
      <div className="training-tabs">
        <button 
          className={`tab-button ${activeTab === 'guide' ? 'active' : ''}`} 
          onClick={() => setActiveTab('guide')}
        >
          <i className="fas fa-book"></i> Guide d'utilisation
        </button>
        <button 
          className={`tab-button ${activeTab === 'tips' ? 'active' : ''}`} 
          onClick={() => setActiveTab('tips')}
        >
          <i className="fas fa-lightbulb"></i> Astuces & conseils
        </button>
        <button 
          className={`tab-button ${activeTab === 'videos' ? 'active' : ''}`} 
          onClick={() => setActiveTab('videos')}
        >
          <i className="fas fa-video"></i> Tutoriels vidéo
        </button>
        <button 
          className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`} 
          onClick={() => setActiveTab('resources')}
        >
          <i className="fas fa-download"></i> Ressources
        </button>
      </div>
      
      <div className="training-content">
        {trainingData[activeTab].content}
      </div>
    </div>
  );
};

export default TrainingPage;