import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { services } from './infrastructure/container';
import { App } from './presentation/app/App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
);
