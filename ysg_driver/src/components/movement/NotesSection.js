// src/components/movement/NotesSection.js
import React from 'react';

const NotesSection = ({ notes, onChange, readOnly }) => {
  return (
    <div className="notes-section">
      <h2>
        <i className="fas fa-sticky-note"></i> Notes
      </h2>
      
      <span className="notes-badge">Commentaires</span>
      
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
  );
};

export default NotesSection;