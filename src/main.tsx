// ================================================================
// MAIN.TS - Landing Page Entry Point (Simplified - No Router)
// ================================================================

// These MUST run before app initialization (replaces inline scripts in index.html)
import './scripts/maintenance.ts';
import './scripts/redirect.ts';

// Design System - Nocturne
import './styles/tokens.css';
import './styles/critical.css';
import './styles/design-system.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/header.css';
import './styles/footer.css';
import './styles/searchbar.css';
import './styles/property-card.css';
import './styles/property-grid.css';
import './styles/property-detail.css';
import './styles/map.css';
import './styles/conversion-ux.css';
import './styles/ml-auth.css';
import './components/Agents/Agents.css';

import { logInfo, logError, logDebug } from './utils/logger.ts';
import { initSearchBar } from './components/SearchBar/SearchBar.ts';
import { initPropertyGrid, loadProperties } from './components/PropertyGrid/PropertyGrid.ts';
import { initFooter } from './components/Layout/Footer.ts';
import { initAgents } from './components/Agents/Agents.tsx';
import { cargarContenidoSitio } from './content.ts';
import { initAnalytics, trackPageView } from './utils/analytics.ts';
import { auditAndLog, autoFixAccessibility } from './utils/a11yAudit.ts';
import { escapeHtml } from './utils/sanitize.ts';
import { preloadHero3D, setupHero3DPreload } from './components/Hero3D/Hero3D.lazy.tsx';
import { render } from 'preact';

// Admin button handler (replaces inline onclick in index.html)
function setupAdminButton(): void {
  const btnAdmin = document.getElementById('btnAdmin');
  if (btnAdmin) {
    btnAdmin.addEventListener('click', () => {
      logInfo('Admin button clicked', undefined, 'main');
      window.location.href = '/admin.html';
    });
  }
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      .then(registration => {
        logDebug('SW registered', { scope: registration.scope }, 'main');
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                logDebug('New SW available, reload to update', undefined, 'main');
                showToast('Nueva versión disponible. Recarga para actualizar.', 'info', 0, true);
              }
            });
          }
        });
      })
      .catch(error => logError('SW registration failed', error, 'main'));
  });
}

// Setup admin button handler (replaces inline onclick)
setupAdminButton();

// Global state for compatibility
window.propiedadesData = [];
window.paginaActual = 1;
window.itemsPorPagina = 6;
window.propiedadActual = null;

// Toast notification system
let toastId = 0;
export function showToast(message: string, type = 'success', duration = 4000, persistent = false): number {
  const container = getOrCreateToastContainer();
  const id = ++toastId;
  
  const icons: Record<string, string> = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.dataset.toastId = String(id);
  toast.innerHTML = `
    <i class="fas ${icons[type] || 'fa-info-circle'} toast-icon"></i>
    <span>${escapeHtml(message)}</span>
    ${!persistent ? `<button class="toast-close" aria-label="Cerrar"><i class="fas fa-times"></i></button>` : ''}
  `;
  
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => toast.classList.add('show'));
  
  // Close button
  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => removeToast(id));
  }
  
  // Auto remove
  if (!persistent && duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
  
  return id;
}

function removeToast(id: number): void {
  const toast = document.querySelector(`[data-toast-id="${id}"]`);
  if (toast) {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }
}

function getOrCreateToastContainer(): HTMLDivElement {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container as HTMLDivElement;
}

// Make globally available
window.showToast = showToast;

// Initialize application
async function init(): Promise<void> {
  try {
    // 1. Load site content (SEO, texts, etc.)
    await cargarContenidoSitio();
    
    // 2. Initialize layout components
    initFooter();
    
    // 3. Initialize page components (hero, search, property grid)
    // Lazy-load Hero3D lazily with preload on hover
    const { Hero3DLazy } = await import('./components/Hero3D/Hero3D.lazy.tsx');
    render(<Hero3DLazy />, document.getElementById('hero-placeholder')!);
    setupHero3DPreload();
    
    initSearchBar();
    initPropertyGrid();
    initAgents();
    
    // 4. Initialize analytics
    initAnalytics();
    trackPageView(window.location.pathname, document.title);
    
    // 5. Run accessibility audit in development
    if (import.meta.env.DEV) {
      setTimeout(() => {
        const audit = auditAndLog();
        autoFixAccessibility();
        logDebug('[A11y Audit] Errors:', { errors: audit.errors.length, warnings: audit.warnings.length }, 'main');
      }, 1000);
    }
    
    logInfo('Bienenhaus Landing Page inicializada correctamente', undefined, 'main');
  } catch (error) {
    logError('Error en init', error, 'main');
    showToast('Error al cargar la aplicación', 'error');
  }
}

// Global exports for backward compatibility
window.loadProperties = loadProperties;
window.cargarContenidoSitio = cargarContenidoSitio;

// Run init
init();
