// src/components/performance/PerformanceNav.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const PerformanceNav = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Définir les liens de navigation
  const navLinks = [
    { 
      path: '/performance/preparators', 
      label: 'Préparateurs', 
      icon: 'fas fa-tools'
    },
    { 
      path: '/performance/drivers', 
      label: 'Chauffeurs', 
      icon: 'fas fa-car'
    },
    { 
      path: '/performance/vehicles', 
      label: 'Véhicules', 
      icon: 'fas fa-car-side'
    },
    { 
      path: '/reports', 
      label: 'Rapports', 
      icon: 'fas fa-file-alt'
    }
  ];

  return (
    <div className="performance-nav">
      <div className="nav-links">
        {navLinks.map((link, index) => (
          <Link 
            key={index}
            to={link.path}
            className={`nav-link ${currentPath === link.path ? 'active' : ''}`}
          >
            <i className={link.icon}></i>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PerformanceNav;