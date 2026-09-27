import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Self-hosted font (no request to Google Fonts = better privacy & speed)
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
