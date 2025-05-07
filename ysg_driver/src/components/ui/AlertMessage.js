// src/components/ui/AlertMessage.js
import React from 'react';

const AlertMessage = ({ 
  type = 'error', 
  message, 
  onDismiss = null,
  icon = null,
  className = ''
}) => {
  if (!message) return null;

  // Set default icons if none provided
  const defaultIcons = {
    error: '⚠️',
    success: '✓',
    info: 'ℹ️',
    warning: '⚠️'
  };

  const iconToShow = icon || defaultIcons[type] || defaultIcons.info;

  return (
    <div className={`alert alert-${type} ${className}`}>
      <div className="alert-icon">{iconToShow}</div>
      <div className="alert-content">{message}</div>
      {onDismiss && (
        <button 
          className="alert-dismiss" 
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default AlertMessage;