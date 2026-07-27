// ================================================================
// MAIN.JS - Landing Page Entry Point (New Architecture)
// ================================================================

import './styles/critical.css';
import './styles/global.css';
import { CONFIG } from './config.js';
import { supabase } from './supabase.js';
import { initSentry } from './sentry.client.config.js';
import { router, lazyLoad } from './router.js';
import { initHero } from './components/Hero/Hero.js';
import { initSearchBar } from './components/SearchBar/SearchBar.js';
import { initPropertyGrid, loadProperties } from './components/PropertyGrid/PropertyGrid.js';
import { initFooter } from './components/Layout/Footer.js';
import { initHeader } from './components/Layout/Header.js';
import { cargarContenidoSitio } from './content.js';
import { initAnalytics, trackPageView } from './utils/analytics.js';
import { auditAndLog, autoFixAccessibility } from './utils/a11yAudit.js';
import { MLAuth } from './components/MLAuth/index.js';

// Initialize Sentry early
initSentry();

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration.scope);
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New SW available, reload to update');
              showToast('Nueva versión disponible. Recarga para actualizar.', 'info', 0, true);
            }
          });
        });
      })
      .catch(error => console.log('SW registration failed:', error));
  });
}

// Global state for compatibility
window.propiedadesData = [];
window.paginaActual = 1;
window.itemsPorPagina = 6;
window.propiedadActual = null;

// Toast notification system
let toastId = 0;
export function showToast(message, type = 'success', duration = 4000, persistent = false) {
  const container = getOrCreateToastContainer();
  const id = ++toastId;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.dataset.toastId = id;
  toast.innerHTML = `
    <i class="fas ${icons[type]} toast-icon"></i>
    <span>${message}</span>
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

function removeToast(id) {
  const toast = document.querySelector(`[data-toast-id="${id}"]`);
  if (toast) {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }
}

function getOrCreateToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

// Make globally available
window.showToast = showToast;

// Define routes
function defineRoutes() {
  const routes = [
    {
      path: '/',
      component: () => ({
        render() {
          const div = document.createElement('div');
          div.innerHTML = `
            <div class="hero" style="text-align:center;padding:4rem 2rem;">
              <h1 style="font-size:3rem;font-weight:800;color:var(--color-primary);margin-bottom:1rem;">Bienenhaus Propiedades</h1>
              <p style="font-size:1.25rem;color:var(--color-gray-600);margin-bottom:2rem;">Landing page en construcción. Componentes en desarrollo.</p>
              <a href="#propiedades" class="btn btn-primary">Ver propiedades</a>
            </div>
            <section id="catalogo" class="catalogo" style="margin-top:3rem;">
              <h2 style="font-size:2rem;font-weight:800;margin-bottom:1.5rem;">Propiedades destacadas</h2>
              <div id="gridPropiedades" class="property-grid"></div>
            </section>
          `;
          return div;
        }
      }),
      meta: { title: 'Bienenhaus · Propiedades en Córdoba', scrollToTop: true }
    },
    {
      path: '/propiedades',
      component: () => ({
        render() {
          const div = document.createElement('div');
          div.innerHTML = `
            <section class="catalogo" id="catalogo">
              <h2 style="font-size:2rem;font-weight:800;margin-bottom:1.5rem;">Catálogo de Propiedades</h2>
              <div id="gridPropiedades" class="property-grid"></div>
            </section>
          `;
          return div;
        }
      }),
      meta: { title: 'Catálogo de Propiedades · Bienenhaus', scrollToTop: true }
    },
    {
      path: '/propiedad/:id',
      component: () => ({
        render() {
          const div = document.createElement('div');
          div.innerHTML = `
            <div class="detalle-overlay active" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
              <div class="detalle-modal" style="background:white;border-radius:var(--radius-xl);max-width:900px;width:100%;max-height:95vh;overflow-y:auto;padding:40px;">
                <h2>Detalle de propiedad - En desarrollo</h2>
                <p>Componente en desarrollo</p>
                <a href="#propiedades" class="btn btn-secondary">Volver</a>
              </div>
            </div>
          `;
          return div;
        }
      }),
      meta: { title: 'Detalle de Propiedad · Bienenhaus', scrollToTop: true }
    }
  ];
  
  routes.forEach(({ path, component, meta }) => {
    router.add(path, { component, meta });
  });
}

// Initialize application
async function init() {
  try {
    // 1. Load site content (SEO, texts, etc.)
    await cargarContenidoSitio();
    
    // 2. Initialize layout components
    initHeader();
    initFooter();
    // initFloatingButtons();
    // initWhatsAppModal();
    // initCookieBanner();
    // initScrollToTop();
    
    // 3. Define routes
    defineRoutes();
    
    // 4. Start router
    router.start();
    
    // 5. Initialize page-specific components after router
    router.on('route-changed', (route) => {
      initPageComponents(route);
    });
    
    // Initial load
const initialRoute = router.getCurrentRoute();
    if (initialRoute) {
      initPageComponents(initialRoute);
    }

    // Initialize analytics
    initAnalytics();
    trackPageView(window.location.pathname, document.title);

    // Run accessibility audit in development
    if (import.meta.env.DEV) {
      setTimeout(() => {
        const audit = auditAndLog();
        autoFixAccessibility();
        console.log('[A11y Audit] Errors:', audit.errors.length, 'Warnings:', audit.warnings.length);
      }, 1000);
    }

    // Initialize MercadoLibre Auth
    MLAuth.init();

    console.log('✅ Bienenhaus Landing Page inicializada correctamente');
  } catch (error) {
    console.error('❌ Error en init:', error);
    showToast('Error al cargar la aplicación', 'error');
  }
}

function initPageComponents(route) {
  const path = route.path;
  
  // Initialize components based on current route
  if (path === '/' || path === '/propiedades') {
    initHero();
    initSearchBar();
    initPropertyGrid();
    // initMap();
  }
  
  if (path.startsWith('/propiedad/')) {
    // initPropertyDetail(route.params.id);
  }
  
  // Initialize sections for pages that have them
  // if (['/', '/nosotros', '/servicios', '/contacto', '/faq', '/oficinas'].includes(path)) {
  //   initSections();
  // }
  
  // Update document title
  if (route.meta?.title) {
    document.title = route.meta.title;
  }
  
  // Scroll to top if needed
  if (route.meta?.scrollToTop) {
    window.scrollTo(0, 0);
  }
}

// Global exports for backward compatibility
window.loadProperties = loadProperties;
window.cargarContenidoSitio = cargarContenidoSitio;
window.showToast = showToast;

// Run init
init();