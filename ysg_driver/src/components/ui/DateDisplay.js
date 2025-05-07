// src/components/ui/DateDisplay.js
import React from 'react';

const DateDisplay = ({ date, format = 'datetime', fallback = 'Non disponible' }) => {
  if (!date) return fallback;
  
  const dateObj = new Date(date);
  
  switch (format) {
    case 'date':
      return dateObj.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    case 'time':
      return dateObj.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'datetime':
    default:
      return dateObj.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
  }
};

export default DateDisplay;