import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App, { FirebaseProvider, ErrorBoundary } from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </FirebaseProvider>
  </StrictMode>,
);
