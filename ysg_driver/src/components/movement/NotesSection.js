// src/components/movement/NotesSection.js ou src/components/preparation/NotesSection.js
import React from 'react';
import '../../styles/NotesSection.css'; // Assurez-vous que le chemin est correct

const NotesSection = ({ notes, onChange, readOnly }) => {
  return (
    <div className="notes-section-simple">
      <div className="notes-title">
        <i className="fas fa-sticky-note"></i>
        <span>Notes</span>
      </div>
      
      <div className="notes-content-wrapper">
        {readOnly ? (
          <div className="notes-content">
            {notes || 'Aucune note disponible.'}
          </div>
        ) : (
          <textarea
            value={notes}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ajouter des notes concernant ce mouvement..."
            className="notes-textarea"
          />
        )}
      </div>
    </div>
  );
};

export default NotesSection;