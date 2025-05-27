// Service pour calculer la distance avec l'API Google Maps
// server/services/mapService.js

const axios = require('axios');
const { GOOGLE_MAPS_API_KEY } = require('../config');

class MapService {
  /**
   * Calcule la distance réelle par route entre deux points à l'aide de l'API Google Maps
   * @param {Object} origin - Coordonnées du point de départ {latitude, longitude}
   * @param {Object} destination - Coordonnées du point d'arrivée {latitude, longitude}
   * @returns {Promise<number>} Distance en kilomètres
   */
  async getRouteDistance(origin, destination) {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        console.error('Clé API Google Maps non définie');
        return null;
      }

      // Vérifier que les coordonnées sont valides
      if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
        console.error('Coordonnées d\'origine ou de destination invalides');
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

      // Vérifier si la requête a réussi et les données sont valides
      if (data.status !== 'OK' || !data.rows || !data.rows[0] || !data.rows[0].elements || !data.rows[0].elements[0]) {
        console.error('Réponse API Google Maps invalide:', data.status);
        return null;
      }

      const element = data.rows[0].elements[0];

      // Vérifier si l'itinéraire a été trouvé
      if (element.status !== 'OK') {
        console.error('Impossible de trouver un itinéraire:', element.status);
        return null;
      }

      // Extraire la distance en mètres et convertir en kilomètres
      const distanceInMeters = element.distance.value;
      const distanceInKm = distanceInMeters / 1000;
      return distanceInKm;
    } catch (error) {
      console.error('Erreur lors du calcul de la distance avec Google Maps API:', error);
      return null;
    }
  }
}

module.exports = new MapService();