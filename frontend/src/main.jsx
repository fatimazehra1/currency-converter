import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Bootstrap's CSS is imported here, once, so it applies to the whole app.
// We import the npm package rather than linking a CDN so the production build
// is self-contained and works offline.
// We do NOT import Bootstrap's JavaScript: every component used here (cards,
// forms, button groups, alerts, spinners) is CSS-only.
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find the application root element.');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
