import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Restore theme preference before render to avoid a flash of the wrong mode.
try {
  const t = localStorage.getItem('fitats:theme');
  if (t === 'light') document.documentElement.dataset.theme = 'light';
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
