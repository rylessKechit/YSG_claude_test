// src/components/ui/LoadingSpinner.js
import React from 'react';

const sizeMap = {
  small: 'spinner-sm',
  medium: 'spinner',
  large: 'spinner-lg'
};

const LoadingSpinner = ({ size = 'medium', fullPage = false, text = null }) => {
  const spinnerClass = sizeMap[size] || sizeMap.medium;
  
  if (fullPage) {
    return (
      <div className="loading-container">
        <div className={spinnerClass}></div>
        {text && <div className="loading-text">{text}</div>}
      </div>
    );
  }
  
  return (
    <div className={spinnerClass}></div>
  );
};

export default LoadingSpinner;
