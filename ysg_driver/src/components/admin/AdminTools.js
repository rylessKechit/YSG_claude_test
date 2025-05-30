// src/components/admin/AdminTools.js (updated with SystemMonitoring)
import React from 'react';
import { Link } from 'react-router-dom';

const AdminTools = () => {
  return (
    <div className="admin-section">
      <h2>Outils d'administration</h2>
      <div className="admin-tools">
        <Link to="/admin/whatsapp-setup" className="admin-tool-card">
          <div className="tool-icon">
            <i className="fas fa-comments"></i>
          </div>
          <div className="tool-name">Configuration WhatsApp</div>
        </Link>
        
        {/* Auto-timelog admin tool */}
        <Link to="/admin/auto-timelog" className="admin-tool-card">
          <div className="tool-icon">
            <i className="fas fa-user-clock"></i>
          </div>
          <div className="tool-name">Gestion des pointages automatiques</div>
        </Link>
        
        {/* NOUVEAU: System monitoring tool */}
        <Link to="/admin/system-monitoring" className="admin-tool-card">
          <div className="tool-icon">
            <i className="fas fa-desktop"></i>
          </div>
          <div className="tool-name">Monitoring Système</div>
        </Link>
        
        {/* Autres outils peuvent être ajoutés ici */}
      </div>
    </div>
  );
};

export default AdminTools;