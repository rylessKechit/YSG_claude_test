// src/components/performance/PreparatorSelector.js
import React, { useState, useRef, useEffect } from 'react';

const PreparatorSelector = ({ allPreparators, selectedPreparators, onChange }) => {
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

  // Filtrer les préparateurs en fonction du terme de recherche
  const filteredPreparators = allPreparators.filter(preparator => 
    preparator.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Gérer la sélection/désélection d'un préparateur
  const handlePreparatorToggle = (preparatorId) => {
    if (selectedPreparators.includes(preparatorId)) {
      onChange(selectedPreparators.filter(id => id !== preparatorId));
    } else {
      onChange([...selectedPreparators, preparatorId]);
    }
  };

  // Obtenir les détails d'un préparateur à partir de son ID
  const getPreparatorById = (id) => {
    return allPreparators.find(p => p._id === id) || { fullName: 'Inconnu' };
  };

  // Réinitialiser la sélection
  const resetSelection = () => {
    onChange([]);
    setIsOpen(false);
  };

  // Sélectionner tous les préparateurs
  const selectAll = () => {
    onChange(allPreparators.map(p => p._id));
    setIsOpen(false);
  };

  return (
    <div className="preparator-selector-container">
      <div className="selector-header">
        <h2 className="selector-title">
          <i className="fas fa-users"></i> Préparateurs sélectionnés
        </h2>
        <div className="selection-info">
          {selectedPreparators.length} / {allPreparators.length} préparateurs
        </div>
      </div>
      
      <div className="preparator-selector" ref={dropdownRef}>
        <div className="selected-preparators">
          {selectedPreparators.length > 0 ? (
            <div className="preparator-badges">
              {selectedPreparators.map(id => {
                const preparator = getPreparatorById(id);
                return (
                  <div key={id} className="preparator-badge">
                    <span className="badge-name">{preparator.fullName}</span>
                    <button 
                      className="badge-remove" 
                      onClick={() => handlePreparatorToggle(id)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <button 
                className="clear-selection" 
                onClick={resetSelection}
                title="Effacer la sélection"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          ) : (
            <div className="no-selection">Aucun préparateur sélectionné</div>
          )}
          
          <button 
            className="dropdown-toggle" 
            onClick={() => setIsOpen(!isOpen)}
          >
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
          </button>
        </div>
        
        {isOpen && (
          <div className="preparator-dropdown">
            <div className="dropdown-header">
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input 
                  type="text" 
                  placeholder="Rechercher un préparateur..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="clear-search" 
                    onClick={() => setSearchTerm('')}
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
            
            <div className="preparator-list">
              {filteredPreparators.length > 0 ? (
                filteredPreparators.map(preparator => (
                  <div 
                    key={preparator._id} 
                    className={`preparator-item ${selectedPreparators.includes(preparator._id) ? 'selected' : ''}`}
                    onClick={() => handlePreparatorToggle(preparator._id)}
                  >
                    <div className="checkbox">
                      {selectedPreparators.includes(preparator._id) ? (
                        <i className="fas fa-check-square"></i>
                      ) : (
                        <i className="far fa-square"></i>
                      )}
                    </div>
                    <div className="preparator-info">
                      <div className="preparator-name">{preparator.fullName}</div>
                      <div className="preparator-username">{preparator.username}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-results">Aucun préparateur trouvé</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreparatorSelector;