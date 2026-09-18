import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { MultiCompanyProvider } from './context/MultiCompanyContext';
import { FinancialConfigProvider } from './context/FinancialConfigContext';
import './index.css';

// Global handler for Vite dynamic import failures (e.g. stale chunks after deployment)
window.addEventListener('vite:preloadError', (event: Event) => {
  console.warn('[Vite Preload Error] Chunk load failed due to outdated bundle version or network hiccup:', event);
  const RELOAD_KEY = 'vite-preload-error-reloaded';
  const hasReloaded = sessionStorage.getItem(RELOAD_KEY) === 'true';

  if (!hasReloaded) {
    sessionStorage.setItem(RELOAD_KEY, 'true');
    console.info('[Vite Preload Error] Automatically reloading to fetch updated application assets...');
    window.location.reload();
  }
});

// Clear reload token on successful load after slight delay
window.addEventListener('load', () => {
  setTimeout(() => {
    sessionStorage.removeItem('vite-preload-error-reloaded');
  }, 5000);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MultiCompanyProvider>
      <FinancialConfigProvider>
        <App />
      </FinancialConfigProvider>
    </MultiCompanyProvider>
  </StrictMode>,
);

