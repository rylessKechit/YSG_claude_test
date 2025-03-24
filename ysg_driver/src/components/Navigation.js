import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Configurations des liens par rôle
const roleLinks = {
  common: [
    { name: 'Tableau de bord', path: '/dashboard', visibleFor: ['admin', 'driver', 'preparator', 'team-leader', 'direction'] },
    { name: 'Pointage', path: '/timelog', visibleFor: ['driver', 'preparator', 'team-leader'] },
    { name: 'Profil', path: '/profile', visibleFor: ['admin', 'driver', 'preparator', 'team-leader', 'direction'] }
  ],
  admin: [
    { name: 'Nouveau mouvement', path: '/admin/movements/create' },
    { name: 'Mouvements', path: '/movement/history' },
    { name: 'Préparations', path: '/preparations' },
    { name: 'Performance', path: '/performance/preparators' },
    { name: 'Rapports', path: '/reports' },
    { name: 'Planning préparateurs', path: '/schedules' },
    { name: 'Comparaison pointages', path: '/schedule-comparison' },
    { name: 'Administration', path: '/admin' }
  ],
  'team-leader': [
    { name: 'Nouveau mouvement', path: '/admin/movements/create' },
    { name: 'Mouvements', path: '/movement/history' },
    { name: 'Préparations', path: '/preparations' },
    { name: 'Nouvelle préparation', path: '/preparations/create' }
  ],
  driver: [
    { name: 'Mouvements', path: '/movement/history' },
    { name: 'Nouvelle préparation', path: '/preparations/create' }
  ],
  preparator: [
    { name: 'Préparations', path: '/preparations' },
    { name: 'Nouvelle préparation', path: '/preparations/create' }
  ],
  direction: [
    { name: 'Rapports', path: '/reports' },
    { name: 'Performance', path: '/performance/preparators' },
    { name: 'Planning préparateurs', path: '/schedules' },
    { name: 'Comparaison pointages', path: '/schedule-comparison' }
  ]
};

const Navigation = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Ajuster en fonction du redimensionnement
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      !mobile && setIsMenuOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Navigation et déconnexion
  const goTo = path => {
    setIsMenuOpen(false);
    navigate(path);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };
  
  // Générer les liens de navigation
  const navLinks = useMemo(() => {
    if (!currentUser) return [];
    
    // Filtrer les liens communs
    const links = roleLinks.common.filter(link => 
      link.visibleFor.includes(currentUser.role)
    );
    
    // Ajouter les liens spécifiques au rôle
    if (roleLinks[currentUser.role]) {
      links.push(...roleLinks[currentUser.role]);
    }
    
    return links;
  }, [currentUser]);

  return (
    <header className="header">
      <div className="container">
        <nav className="nav">
          {/* Logo */}
          <div className="nav-logo" onClick={() => goTo('/dashboard')}>YSG</div>
          
          {/* Menu hamburger pour mobile */}
          {isMobile && (
            <button className="hamburger-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <div className={`hamburger-icon ${isMenuOpen ? 'open' : ''}`}>
                <span></span><span></span><span></span>
              </div>
            </button>
          )}
          
          {/* Menu de navigation */}
          <ul className={`nav-links ${isMobile ? (isMenuOpen ? 'mobile open' : 'mobile closed') : 'desktop'}`}>
            {navLinks.map((link, index) => (
              <li key={index} className="nav-item">
                <div className="nav-link" onClick={() => goTo(link.path)}>{link.name}</div>
              </li>
            ))}
            <li className="nav-item">
              <div className="nav-link logout" onClick={handleLogout}>Déconnexion</div>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Overlay pour fermer le menu sur mobile */}
      {isMobile && isMenuOpen && (
        <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}></div>
      )}
    </header>
  );
};

export default Navigation;