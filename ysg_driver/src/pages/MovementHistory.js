import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import movementService from '../services/movementService';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import '../styles/MovementHistory.css';

const MovementHistory = () => {
  const { currentUser } = useAuth();
  const [allMovements, setAllMovements] = useState([]);
  const [filteredMovements, setFilteredMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Charger les mouvements
  const loadMovements = async () => {
    try {
      setLoading(true);
      
      // Charger un plus grand nombre de mouvements en une seule requête
      const response = await movementService.getMovements(1, 100, null);
      
      setAllMovements(response.movements);
      setTotalPages(response.totalPages);
      
      // Appliquer les filtres côté client
      applyFilters(response.movements);
      
      setLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement des mouvements:', err);
      setError('Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  // Fonction de filtrage côté client
  const applyFilters = (movements) => {
    let result = [...movements];
    
    // Filtrer par rôle: les chauffeurs ne voient que leurs mouvements
    if (currentUser && currentUser.role === 'driver') {
      result = result.filter(movement => 
        movement.userId && movement.userId._id === currentUser._id
      );
    }
    
    // Filtrer par statut si nécessaire
    if (statusFilter) {
      result = result.filter(movement => movement.status === statusFilter);
    }

    // Filtrer par date si nécessaire
    if (dateFilter) {
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));
      
      switch(dateFilter) {
        case 'today':
          result = result.filter(movement => {
            const createdAt = new Date(movement.createdAt);
            return createdAt >= todayStart && createdAt <= todayEnd;
          });
          break;
        case 'week':
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);
          result = result.filter(movement => {
            const createdAt = new Date(movement.createdAt);
            return createdAt >= weekStart;
          });
          break;
        case 'month':
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - 1);
          result = result.filter(movement => {
            const createdAt = new Date(movement.createdAt);
            return createdAt >= monthStart;
          });
          break;
      }
    }
    
    // Filtrer par recherche si nécessaire
    if (isSearching && searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(movement => 
        movement.licensePlate.toLowerCase().includes(query) ||
        (movement.vehicleModel && movement.vehicleModel.toLowerCase().includes(query))
      );
    }
    
    // Trier du plus récent au plus ancien par défaut
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination côté client
    const startIndex = (page - 1) * 10;
    const paginatedMovements = result.slice(startIndex, startIndex + 10);
    
    setFilteredMovements(paginatedMovements);
  };

  // Charger les mouvements au montage
  useEffect(() => {
    loadMovements();
  }, []);

  // Appliquer les filtres quand les critères changent
  useEffect(() => {
    if (allMovements.length > 0) {
      applyFilters(allMovements);
    }
  }, [page, statusFilter, dateFilter, isSearching, searchQuery, currentUser]);

  // Gestionnaire de changement de filtre de statut
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1); // Réinitialiser à la première page
  };
  
  // Gestionnaire de changement de filtre de date
  const handleDateFilterChange = (e) => {
    setDateFilter(e.target.value);
    setPage(1); // Réinitialiser à la première page
  };

  // Gestionnaire de recherche
  const handleSearch = (e) => {
    e.preventDefault();
    setIsSearching(!!searchQuery);
    setPage(1); // Réinitialiser à la première page
  };

  // Réinitialiser la recherche
  const resetSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setPage(1); // Réinitialiser à la première page
  };

  // Formatter la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <Navigation />
      
      <div className="history-container">
        <h1 className="page-title">
          Historique des trajets
          {currentUser?.role === 'driver' && " - Mes trajets uniquement"}
        </h1>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {/* Section des filtres */}
      <div className="filters-section">
        {/* Barre de recherche */}
        <div className="search-container">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par plaque..."
              className="search-input"
            />
            <button type="submit" className="search-button">Rechercher</button>
          </form>
          {isSearching && (
            <button onClick={resetSearch} className="reset-button">
              Réinitialiser
            </button>
          )}
        </div>
        
        {/* Filtres dropdown */}
        <div className="filters-group">
          <div className="filter-container">
            <label htmlFor="statusFilter" className="filter-label">Statut:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="status-filter"
            >
              <option value="">Tous</option>
              <option value="pending">En attente</option>
              <option value="assigned">Assignés</option>
              <option value="preparing">En préparation</option>
              <option value="in-progress">En cours</option>
              <option value="completed">Terminés</option>
            </select>
          </div>
          
          <div className="filter-container">
            <label htmlFor="dateFilter" className="filter-label">Date:</label>
            <select
              id="dateFilter"
              value={dateFilter}
              onChange={handleDateFilterChange}
              className="date-filter"
            >
              <option value="">Tous</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
            </select>
          </div>
        </div>
      </div>
        
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : filteredMovements.length > 0 ? (
          <div className="movements-list">
            {filteredMovements.map((movement) => (
              <div key={movement._id} className="movement-card">
                <div className="movement-header">
                  <h2 className="movement-plate">{movement.licensePlate}</h2>
                  <span className={`movement-status status-${movement.status}`}>
                    {movement.status === 'pending' && 'En attente'}
                    {movement.status === 'in-progress' && 'En cours'}
                    {movement.status === 'completed' && 'Terminé'}
                  </span>
                </div>
                
                {movement.vehicleModel && (
                  <p className="vehicle-model">{movement.vehicleModel}</p>
                )}
                
                <div className="movement-route">
                  <div className="route-point">
                    <div className="point-icon departure-icon"></div>
                    <div className="point-details">
                      <p className="point-label">Départ:</p>
                      <p className="point-name">{movement.departureLocation.name}</p>
                      <p className="point-time">
                        {movement.departureTime ? formatDate(movement.departureTime) : 'Non démarré'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="route-line"></div>
                  
                  <div className="route-point">
                    <div className="point-icon arrival-icon"></div>
                    <div className="point-details">
                      <p className="point-label">Arrivée:</p>
                      <p className="point-name">{movement.arrivalLocation.name}</p>
                      <p className="point-time">
                        {movement.arrivalTime ? formatDate(movement.arrivalTime) : 'Non terminé'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="movement-footer">
                  <p className="movement-date">
                    Créé le {formatDate(movement.createdAt)}
                  </p>
                  <Link to={`/movement/${movement._id}`} className="view-details-link">
                    Voir les détails
                  </Link>
                </div>
              </div>
            ))}
            
            {!isSearching && (
              <div className="pagination">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="pagination-button"
                >
                  Précédent
                </button>
                <span className="page-info">
                  Page {page} sur {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="pagination-button"
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="no-results">
            <p>Aucun mouvement de véhicule trouvé.</p>
            <Link to="/movement/new" className="btn btn-primary">
              Créer un nouveau trajet
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovementHistory;