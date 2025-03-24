// src/components/performance/DriverSelector.js
import React, { useState, useRef, useEffect } from 'react';
import '../../styles/DriverSelector.css'; // N'oubliez pas d'importer le fichier CSS

const DriverSelector = ({ allDrivers, selectedDrivers, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  
  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtrer les chauffeurs en fonction du terme de recherche
  const filteredDrivers = allDrivers.filter(driver => 
    driver.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Gérer la sélection/désélection d'un chauffeur
  const handleDriverToggle = (driverId) => {
    if (selectedDrivers.includes(driverId)) {
      onChange(selectedDrivers.filter(id => id !== driverId));
    } else {
      onChange([...selectedDrivers, driverId]);
    }
  };

  // Obtenir les détails d'un chauffeur à partir de son ID
  const getDriverById = (id) => {
    return allDrivers.find(d => d._id === id) || { fullName: 'Inconnu' };
  };

  // Réinitialiser la sélection
  const resetSelection = () => {
    onChange([]);
    setIsOpen(false);
  };

  // Sélectionner tous les chauffeurs
  const selectAll = () => {
    onChange(allDrivers.map(d => d._id));
    setIsOpen(false);
  };

  return (
    <div className="driver-selector-container">
      <div className="selector-header">
        <h2 className="selector-title">
          <i className="fas fa-users"></i> Chauffeurs sélectionnés
        </h2>
        <div className="selection-info">
          {selectedDrivers.length} / {allDrivers.length} chauffeurs
        </div>
      </div>
      
      <div className="driver-selector" ref={dropdownRef}>
        <div className="selected-drivers">
          {selectedDrivers.length > 0 ? (
            <div className="driver-badges">
              {selectedDrivers.map(id => {
                const driver = getDriverById(id);
                return (
                  <div key={id} className="driver-badge">
                    <span className="badge-name">{driver.fullName}</span>
                    <button 
                      className="badge-remove" 
                      onClick={() => handleDriverToggle(id)}
                      aria-label={`Supprimer ${driver.fullName}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {selectedDrivers.length > 1 && (
                <button 
                  className="clear-selection" 
                  onClick={resetSelection}
                  title="Effacer la sélection"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          ) : (
            <div className="no-selection">Aucun chauffeur sélectionné</div>
          )}
          
          <button 
            className="dropdown-toggle" 
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label="Ouvrir la liste des chauffeurs"
          >
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
          </button>
        </div>
        
        {isOpen && (
          <div className="driver-dropdown">
            <div className="dropdown-header">
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input 
                  type="text" 
                  placeholder="Rechercher un chauffeur..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Rechercher un chauffeur"
                />
                {searchTerm && (
                  <button 
                    className="clear-search" 
                    onClick={() => setSearchTerm('')}
                    aria-label="Effacer la recherche"
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="selection-actions">
                <button 
                  className="action-btn"
                  onClick={selectAll}
                >
                  Tout sélectionner
                </button>
                <button 
                  className="action-btn"
                  onClick={resetSelection}
                >
                  Tout désélectionner
                </button>
              </div>
            </div>
            
            <div className="driver-list">
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map(driver => (
                  <div 
                    key={driver._id} 
                    className={`driver-item ${selectedDrivers.includes(driver._id) ? 'selected' : ''}`}
                    onClick={() => handleDriverToggle(driver._id)}
                  >
                    <div className="checkbox">
                      {selectedDrivers.includes(driver._id) ? (
                        <i className="fas fa-check-square"></i>
                      ) : (
                        <i className="far fa-square"></i>
                      )}
                    </div>
                    <div className="driver-info">
                      <div className="driver-name">{driver.fullName}</div>
                      <div className="driver-username">{driver.username}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-results">
                  {searchTerm ? 
                    `Aucun chauffeur ne correspond à "${searchTerm}"` : 
                    "Aucun chauffeur disponible"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverSelector;