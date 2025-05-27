// src/components/dashboard/GreetingSection.js
import React from 'react';

const GreetingSection = ({ currentUser }) => {
  return (
    <div className="greeting-section">
      <h1 className="greeting-title">Bonjour, {currentUser?.fullName || 'Utilisateur'}</h1>
      <p className="greeting-subtitle">
        {new Date().toLocaleDateString('fr-FR', { 
          weekday: 'long',
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>
    </div>
  );
};

export default GreetingSection;