
// ================================================================
// PROPERTY GRID COMPONENT
// ================================================================

import { h, render } from 'preact';
import './PropertyGrid.css';
import { supabasePromise } from '../../lib/supabase-loader.ts';
import { logWarn, logError } from '../../utils/logger.ts';
import { formatPrice } from '../../utils/format.ts';
import { PropertyCard, PropertyCardSkeleton } from './PropertyCard.tsx';

let gridElement = null;
let currentProperties = [];
let currentPage = 1;
const itemsPerPage = 6;
let loadMode = 'pagination'; // 'pagination' | 'infinite'
let isLoading = false;
let hasMore = true;
let observer = null;

export function initPropertyGrid() {
  gridElement = document.getElementById('gridPropiedades');
  if (!gridElement) {
    logWarn('Property grid element not found', undefined, 'PropertyGrid');
    return;
  }
  
  // Setup view toggle
  setupViewToggle();
  
  // Setup load mode toggle
  setupLoadModeToggle();
  
  // Listen for filter changes
  window.addEventListener('filters-changed', (e) => {
    currentPage = 1;
    currentProperties = [];
    loadProperties();
  });
  
  // Initial load - don't await (Vercel: async-defer-await)
  loadProperties();
}

function setupViewToggle() {
  const viewButtons = document.querySelectorAll('.vista-btn');
  const listView = document.getElementById('vistaLista');
  const mapView = document.getElementById('vistaMapa');
  
  viewButtons.forEach(btn => {
btn.addEventListener('click', () => {
      viewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const view = (btn as HTMLElement).dataset.vista;
      if (view === 'lista') {
        listView.hidden = false;
        mapView.hidden = true;
      } else {
        listView.hidden = true;
        mapView.hidden = false;
        // Initialize map if needed
        if (window.initMapaPropiedades) {
          window.initMapaPropiedades();
        }
      }
    });
  });
}

function setupLoadModeToggle() {
  const modeButtons = document.querySelectorAll('.carga-btn');
  
  modeButtons.forEach(btn => {
btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      loadMode = (btn as HTMLElement).dataset.modo;
      currentPage = 1;
      currentProperties = [];
      
      if (loadMode === 'infinite') {
        setupInfiniteScroll();
        // Hide pagination
        const pagination = document.getElementById('paginacion');
        if (pagination) pagination.style.display = 'none';
      } else {
        cleanupInfiniteScroll();
        const pagination = document.getElementById('paginacion');
        if (pagination) pagination.style.display = 'flex';
      }
      
      loadProperties();
    });
  });
}

async function loadProperties() {
  if (isLoading) return;
  isLoading = true;
  
  showLoading(true);
  
  try {
    // Use cached module promise (Vercel: bundle-dynamic-imports, async-parallel)
    const supabase = await supabasePromise;
    const filters = window.getCurrentFilters ? window.getCurrentFilters() : {};
    
    let query = supabase
      .from('propiedades')
      .select('*, imagenes(url, cloudinary_public_id, orden, es_principal)')
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (filters.operacion && filters.operacion !== 'ambos') {
      query = query.eq('operacion', filters.operacion);
    }
    if (filters.tipo && filters.tipo !== 'todos') {
      query = query.eq('tipo', filters.tipo);
    }
    if (filters.precioMin > 0) {
      query = query.gte('precio', filters.precioMin);
    }
    if (filters.precioMax < 900000) {
      query = query.lte('precio', filters.precioMax);
    }
    if (filters.habitaciones > 0) {
      query = query.gte('habitaciones', filters.habitaciones);
    }
    if (filters.metrosMin > 0) {
      query = query.gte('m2', filters.metrosMin);
    }
    if (filters.banosMin > 0) {
      query = query.gte('banos', filters.banosMin);
    }
    if (filters.antiguedad && filters.antiguedad !== 'todas') {
      query = query.eq('antiguedad', filters.antiguedad);
    }
    
    // Sorting
    const sortMap = {
      'precio_asc': { column: 'precio', ascending: true },
      'precio_desc': { column: 'precio', ascending: false },
      'm2_desc': { column: 'm2', ascending: false },
      'm2_asc': { column: 'm2', ascending: true },
      'nuevas': { column: 'created_at', ascending: false },
      'antiguas': { column: 'created_at', ascending: true },
      'destacado': { column: 'destacado', ascending: false }
    };
    
    const sort = sortMap[filters.ordenar] || sortMap.destacado;
    query = query.order(sort.column, { ascending: sort.ascending });
    
    // Pagination for pagination mode
    if (loadMode === 'pagination') {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    const properties = (data || []).map(p => ({
      ...p,
      imagenes: p.imagenes || [],
      imagen_principal: p.imagenes?.find(i => i.es_principal)?.url || p.imagenes?.[0]?.url || null,
      galeria: p.imagenes?.sort((a, b) => a.orden - b.orden).map(i => i.url) || []
    }));
    
    hasMore = loadMode === 'infinite' && properties.length === itemsPerPage;
    
    if (loadMode === 'infinite' && currentPage > 1) {
      // Append
      currentProperties = [...currentProperties, ...properties];
      renderPropertiesAppend(properties);
    } else {
      // Replace
      currentProperties = properties;
      renderProperties(properties);
    }
    
    updateCounter(data?.length || 0, count);
    updatePagination(count || data?.length || 0);
    
  } catch (error) {
    logError('Error loading properties', error, 'PropertyGrid');
    showError(error.message);
  } finally {
    isLoading = false;
    showLoading(false);
  }
}

function renderProperties(properties) {
  if (!gridElement) return;

  if (properties.length === 0) {
    render(h('div', { style: { gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' } },
      h('i', { class: 'fas fa-home', style: { fontSize: '3rem', color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'block' } }),
      h('h3', { style: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' } }, 'No hay propiedades'),
      h('p', { style: { fontSize: '0.95rem', marginBottom: '1.5rem', color: 'var(--color-text-disabled)' } }, 'No se encontraron propiedades con los filtros actuales'),
      h('button', { class: 'btn btn-secondary', onClick: () => { window.clearFilters?.(); window.applyFilters?.(); } }, 'Limpiar filtros')
    ), gridElement);
    gridElement.removeAttribute('aria-busy');
    return;
  }

  const cards = properties.map((prop, i) =>
    h(PropertyCard, {
      key: prop.id,
      property: prop,
      index: i,
      onDetail: (id) => window.abrirDetalle?.(id),
      onToggleFavorite: (id) => { toggleFavorite(id); },
    })
  );

  render(h('div', { style: { display: 'contents' } }, ...cards), gridElement);
  gridElement.removeAttribute('aria-busy');

  if (loadMode === 'infinite') {
    setupInfiniteScroll();
  }
}

function renderPropertiesAppend(properties) {
  if (!gridElement) return;
  const startIndex = currentProperties.length - properties.length;
  const cards = properties.map((prop, i) =>
    h(PropertyCard, {
      key: prop.id,
      property: prop,
      index: startIndex + i,
      onDetail: (id) => window.abrirDetalle?.(id),
      onToggleFavorite: (id) => toggleFavorite(id),
    })
  );
  render(h('div', { style: { display: 'contents' } }, ...cards), gridElement);
}

function toggleFavorite(propertyId) {
  const favorites = JSON.parse(localStorage.getItem('favoritos') || '[]');
  const idx = favorites.indexOf(propertyId);
  if (idx > -1) {
    favorites.splice(idx, 1);
  } else {
    favorites.push(propertyId);
  }
  localStorage.setItem('favoritos', JSON.stringify(favorites));
  window.dispatchEvent(new CustomEvent('favorite-toggled', { detail: { id: propertyId, isFav: idx === -1 } }));
}

function updateCounter(shown, total) {
  const counter = document.getElementById('contadorPropiedades');
  if (counter) {
    counter.textContent = total !== undefined && total > shown 
      ? `Mostrando ${shown} de ${total} propiedades`
      : `${shown} ${shown === 1 ? 'propiedad' : 'propiedades'} encontradas`;
  }
}

function updatePagination(total) {
  const pagination = document.getElementById('paginacion');
  if (!pagination) return;
  
  const totalPages = Math.ceil(total / itemsPerPage);
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  
  let html = '';
  
  // Previous
  html += `<button class="nav-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}" aria-label="Página anterior"><i class="fas fa-chevron-left"></i></button>`;
  
  // Pages
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  if (startPage > 1) {
    html += `<button data-page="1" aria-label="Página 1">1</button>`;
    if (startPage > 2) html += `<span class="pagination-ellipsis">...</span>`;
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="${i === currentPage ? 'activa' : ''}" data-page="${i}" aria-label="Página ${i}">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="pagination-ellipsis">...</span>`;
    html += `<button data-page="${totalPages}" aria-label="Página ${totalPages}">${totalPages}</button>`;
  }
  
  // Next
  html += `<button class="nav-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}" aria-label="Página siguiente"><i class="fas fa-chevron-right"></i></button>`;
  
  pagination.innerHTML = html;
  
  // Bind pagination clicks
pagination.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt((btn as HTMLElement).dataset.page || '1');
      if (page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        loadProperties();
        window.scrollTo({ top: gridElement.offsetTop - 100, behavior: 'smooth' });
      }
    });
  });
}

function showLoading(show) {
  const grid = gridElement;
  if (!grid) return;

  if (show && currentPage === 1) {
    grid.setAttribute('aria-busy', 'true');
    const skeletons = Array(6).fill(0).map(() => h(PropertyCardSkeleton, {}));
    render(h('div', { style: { display: 'contents' } }, ...skeletons), grid);
  } else if (!show) {
    grid.removeAttribute('aria-busy');
  }
}

function setupInfiniteScroll() {
  cleanupInfiniteScroll();
  
  const sentinel = document.createElement('div');
  sentinel.id = 'infinite-sentinel';
  sentinel.style.cssText = 'height: 1px; margin-top: 2rem;';
  gridElement?.parentNode?.insertBefore(sentinel, gridElement.nextSibling);
  
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore && !isLoading) {
      currentPage++;
      loadProperties();
    }
  }, { rootMargin: '200px', threshold: 0 });
  
  observer.observe(sentinel);
}

function cleanupInfiniteScroll() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  const sentinel = document.getElementById('infinite-sentinel');
  if (sentinel) sentinel.remove();
}

function showError(message) {
  if (!gridElement) return;
  render(h('div', { style: { gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' } },
    h('i', { class: 'fas fa-exclamation-triangle', style: { fontSize: '3rem', color: 'var(--color-warning)', marginBottom: '1rem', display: 'block' } }),
    h('h3', { style: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' } }, 'Error al cargar'),
    h('p', { style: { fontSize: '0.95rem', marginBottom: '1.5rem', color: 'var(--color-text-muted)' } }, message),
    h('button', { class: 'btn btn-primary', onClick: () => loadProperties() }, 'Reintentar')
  ), gridElement);
  gridElement.removeAttribute('aria-busy');
}

// Expose globally
window.loadProperties = loadProperties;
window.currentPage = currentPage;
window.itemsPerPage = itemsPerPage;

export { loadProperties, currentPage, itemsPerPage };
export default { initPropertyGrid, loadProperties };
