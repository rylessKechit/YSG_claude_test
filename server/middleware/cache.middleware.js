// server/middleware/cache.middleware.js

/**
 * Middleware de mise en cache mémoire simple pour réduire la charge sur la base de données
 * pour les requêtes d'analytique intensives et fréquentes
 */
class CacheService {
    constructor() {
      this.cache = new Map();
      this.defaultTTL = 60 * 15; // 15 minutes par défaut (en secondes)
    }
  
    /**
     * Génère une clé de cache basée sur le chemin de la requête et les paramètres
     * @param {Object} req - Request Express
     * @returns {String} - Clé de cache unique
     */
    generateCacheKey(req) {
      const path = req.originalUrl || req.url;
      const query = JSON.stringify(req.query);
      const params = JSON.stringify(req.params);
      return `${path}:${query}:${params}`;
    }
  
    /**
     * Vérifie si une clé existe dans le cache et n'est pas expirée
     * @param {String} key - Clé de cache
     * @returns {Boolean} - Vrai si la clé existe et est valide
     */
    has(key) {
      if (!this.cache.has(key)) return false;
      
      const { expiresAt } = this.cache.get(key);
      if (Date.now() > expiresAt) {
        this.cache.delete(key); // Nettoyer les entrées expirées
        return false;
      }
      
      return true;
    }
  
    /**
     * Récupère une valeur du cache
     * @param {String} key - Clé de cache
     * @returns {*} - Valeur mise en cache ou null
     */
    get(key) {
      if (!this.has(key)) return null;
      return this.cache.get(key).value;
    }
  
    /**
     * Met une valeur en cache
     * @param {String} key - Clé de cache
     * @param {*} value - Valeur à mettre en cache
     * @param {Number} ttl - Durée de vie en secondes
     */
    set(key, value, ttl = this.defaultTTL) {
      const expiresAt = Date.now() + (ttl * 1000);
      this.cache.set(key, { value, expiresAt });
    }
  
    /**
     * Supprime une entrée du cache
     * @param {String} key - Clé de cache
     */
    delete(key) {
      this.cache.delete(key);
    }
  
    /**
     * Vide tout le cache
     */
    clear() {
      this.cache.clear();
    }
  
    /**
     * Supprime toutes les entrées expirées
     */
    cleanup() {
      const now = Date.now();
      for (const [key, { expiresAt }] of this.cache.entries()) {
        if (now > expiresAt) {
          this.cache.delete(key);
        }
      }
    }
  }
  
  // Instance unique du service de cache
  const cacheService = new CacheService();
  
  // Exécuter le nettoyage périodique du cache
  setInterval(() => cacheService.cleanup(), 60 * 60 * 1000); // Toutes les heures
  
  /**
   * Middleware de mise en cache pour Express
   * @param {Number} ttl - Durée de vie en secondes (facultatif)
   * @returns {Function} - Middleware Express
   */
  const cacheMiddleware = (ttl) => (req, res, next) => {
    // Ignorer le cache pour les requêtes non GET
    if (req.method !== 'GET') return next();
    
    // Ignorer le cache si demandé explicitement
    if (req.query.nocache === 'true' || req.query.refresh === 'true') return next();
    
    const key = cacheService.generateCacheKey(req);
    
    if (cacheService.has(key)) {
      const cachedData = cacheService.get(key);
      return res.json(cachedData);
    }
    
    // Intercepter la méthode res.json pour mettre en cache la réponse
    const originalJson = res.json;
    res.json = function(data) {
      // Ne mettre en cache que les réponses réussies
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(key, data, ttl);
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
  
  module.exports = {
    cacheMiddleware,
    cacheService
  };