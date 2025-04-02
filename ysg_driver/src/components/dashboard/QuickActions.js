// src/components/dashboard/QuickActions.js
import React from 'react';
import { Link } from 'react-router-dom';

const QuickActions = ({ currentUser }) => {
  // Fonction pour rendre les actions selon le rôle
  const renderActionsByRole = () => {
    const actions = {
      admin: [
        { path: '/admin/movements/create', icon: 'fas fa-plus-circle', title: 'Créer un mouvement' },
        { path: '/movement/history', icon: 'fas fa-history', title: 'Historique des mouvements' },
        { path: '/preparations', icon: 'fas fa-tools', title: 'Historique des préparations' },
        { path: '/performance/preparators', icon: 'fas fa-chart-bar', title: 'Performance préparateurs' },
        { path: '/performance/drivers', icon: 'fas fa-car', title: 'Performance chauffeurs' },
        { path: '/reports', icon: 'fas fa-file-excel', title: 'Rapports' },
        { path: '/schedules', icon: 'fas fa-calendar-week', title: 'Planning préparateurs' },
        { path: '/schedule-comparison', icon: 'fas fa-chart-line', title: 'Comparaison pointages' },
        { path: '/admin', icon: 'fas fa-user-shield', title: 'Administration' },
        { path: '/admin/location', icon: 'fas fa-map-marker-alt', title: 'Gestion des emplacements' },
        { path: '/tracking', icon: 'fas fa-map-marked-alt', title: 'Suivi en temps réel' },
      ],
      'team-leader': [
        { path: '/admin/movements/create', icon: 'fas fa-plus-circle', title: 'Créer un mouvement' },
        { path: '/preparations/create', icon: 'fas fa-tools', title: 'Créer une préparation' },
        { path: '/movement/history', icon: 'fas fa-history', title: 'Historique' },
        { path: '/profile', icon: 'fas fa-user', title: 'Mon profil' },
        { path: '/tracking', icon: 'fas fa-map-marked-alt', title: 'Suivi en temps réel' },
      ],
      preparator: [
        { path: '/preparations/create', icon: 'fas fa-plus-circle', title: 'Créer une préparation' },
        { path: '/preparations', icon: 'fas fa-clipboard-list', title: 'Historique des préparations' },
        { path: '/profile', icon: 'fas fa-user', title: 'Mon profil' }
      ],
      direction: [
        { path: '/reports', icon: 'fas fa-file-excel', title: 'Rapports' },
        { path: '/performance/preparators', icon: 'fas fa-chart-bar', title: 'Performance préparateurs' },
        { path: '/performance/drivers', icon: 'fas fa-car', title: 'Performance chauffeurs' },
        { path: '/schedules', icon: 'fas fa-calendar-week', title: 'Planning préparateurs' },
        { path: '/schedule-comparison', icon: 'fas fa-chart-line', title: 'Comparaison pointages' },
        { path: '/profile', icon: 'fas fa-user', title: 'Mon profil' }
      ],
      driver: [
        { path: '/preparations/create', icon: 'fas fa-plus-circle', title: 'Créer une préparation' },
        { path: '/movement/history', icon: 'fas fa-history', title: 'Historique' },
        { path: '/profile', icon: 'fas fa-user', title: 'Mon profil' }
      ]
    };

    return (actions[currentUser.role] || actions.driver).map((action, index) => (
      <Link key={index} to={action.path} className="action-card">
        <div className="action-icon">
          <i className={action.icon}></i>
        </div>
        <span className="action-title">{action.title}</span>
      </Link>
    ));
  };

  return (
    <div className="quick-actions">
      <h2 className="section-title">
        <i className="fas fa-bolt"></i> Actions rapides
      </h2>
      
      <div className="actions-grid">
        {renderActionsByRole()}
      </div>
    </div>
  );
};

export default QuickActions;