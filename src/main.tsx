import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { MultiCompanyProvider } from './context/MultiCompanyContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MultiCompanyProvider>
      <App />
    </MultiCompanyProvider>
  </StrictMode>,
);

