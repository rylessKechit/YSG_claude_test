import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import App from './App';

// Utilisation de la nouvelle API React 18 pour le rendu
const root = createRoot(document.getElementById('root'));

// Désactiver StrictMode en production pour éviter les doubles rendus
// mais le garder en développement pour les vérifications
if (process.env.NODE_ENV === 'development') {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  root.render(<App />);
}