import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { setupPwa } from './pwa';

setupPwa((reloadPage) => {
  window.dispatchEvent(new CustomEvent('p85-pwa-update', { detail: reloadPage }));
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
