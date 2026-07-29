// @ts-nocheck
// ================================================================
// PROPERTY GRID COMPONENT
// ================================================================

import './PropertyGrid.css';
import { supabasePromise } from '../../lib/supabase-loader.ts';
import { logWarn, logError } from '../../utils/logger.ts';

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
      
      const view = btn.dataset.vista;
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
      
      loadMode = btn.dataset.modo;
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
    gridElement.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--color-gray-500);">
        <i class="fas fa-home" style="font-size: 3rem; color: var(--color-gray-300); margin-bottom: 1rem; display: block;"></i>
        <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--color-gray-700); margin-bottom: 0.5rem;">No hay propiedades</h3>
        <p style="font-size: 0.95rem; margin-bottom: 1.5rem;">No se encontraron propiedades con los filtros actuales</p>
        <button class="btn btn-secondary" onclick="window.clearFilters?.(); window.applyFilters?.();">Limpiar filtros</button>
      </div>
    `;
    return;
  }
  
  // Render with staggered animation
  gridElement.innerHTML = '';
  const fragment = document.createDocumentFragment();
  
  properties.forEach((prop, index) => {
    const card = createPropertyCard(prop);
    card.style.animationDelay = `${index * 80}ms`;
    fragment.appendChild(card);
  });
  
  gridElement.appendChild(fragment);
  
  // Setup infinite scroll if needed
  if (loadMode === 'infinite') {
    setupInfiniteScroll();
  }
}

function renderPropertiesAppend(properties) {
  if (!gridElement) return;
  
  const fragment = document.createDocumentFragment();
  const startIndex = currentProperties.length - properties.length;
  
  properties.forEach((prop, index) => {
    const card = createPropertyCard(prop);
    card.style.animationDelay = `${(startIndex + index) * 80}ms`;
    fragment.appendChild(card);
  });
  
  gridElement.appendChild(fragment);
}

function createPropertyCard(property) {
  const card = document.createElement('article');
  card.className = 'property-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('data-id', property.id);
  card.tabIndex = 0;
  
  const badgeClass = property.operacion === 'venta' ? 'badge-venta' : 'badge-alquiler';
  const price = formatPrice(property.precio, property.moneda, property.operacion);
  const features = [];
  
  if (property.habitaciones) features.push(`<span><i class="fas fa-bed" aria-hidden="true"></i> ${property.habitaciones}</span>`);
  if (property.banos) features.push(`<span><i class="fas fa-bath" aria-hidden="true"></i> ${property.banos}</span>`);
  if (property.m2) features.push(`<span><i class="fas fa-arrows-alt" aria-hidden="true"></i> ${property.m2} m²</span>`);
  
  const imageUrl = property.imagen_principal || 'https://via.placeholder.com/400x300?text=Sin+imagen';
  
  card.innerHTML = `
    <button class="property-favorite" aria-label="${property.favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}" data-id="${property.id}" tabindex="0">
      <i class="fas ${property.favorito ? 'fa-heart favorito activo' : 'fa-heart favorito'}" aria-hidden="true"></i>
    </button>
    
    <div class="property-image">
      <img src="${imageUrl}" alt="${property.titulo}" loading="lazy" width="400" height="300">
      <span class="badge ${badgeClass}">${property.operacion === 'venta' ? 'Venta' : 'Alquiler'}</span>
      ${property.destacado ? '<span class="badge badge-destacado">Destacada</span>' : ''}
    </div>
    
    <div class="property-content">
      <div class="property-price">
        <span class="currency">$</span>
        <span class="amount">${price.amount.toLocaleString('es-AR')}</span>
        <span class="period">${price.period || ''}</span>
      </div>
      
      <h3 class="property-title">${property.titulo}</h3>
      
      <div class="property-location">
        <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
        <span>${property.ubicacion}</span>
      </div>
      
      <div class="property-features">
        ${features.join('')}
      </div>
      
      <button class="property-btn" data-id="${property.id}" onclick="window.abrirDetalle?.(${property.id})">
        <i class="fas fa-eye" aria-hidden="true"></i> Ver detalles
      </button>
    </div>
  `;
  
  // Add click handler for favorite
  const favBtn = card.querySelector('.property-favorite');
  if (favBtn) {
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(property.id, favBtn);
    });
  }
  
  // Keyboard support
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.abrirDetalle?.(property.id);
    }
  });
  
  return card;
}

function toggleFavorite(propertyId, button) {
  const isActive = button.querySelector('i').classList.contains('activo');
  const icon = button.querySelector('i');
  
  if (isActive) {
    icon.classList.remove('fa-heart', 'activo');
    icon.classList.add('fa-heart');
    button.setAttribute('aria-label', 'Agregar a favoritos');
  } else {
    icon.classList.add('activo');
    button.setAttribute('aria-label', 'Quitar de favoritos');
  }
  
  // Save to localStorage
  const favorites = JSON.parse(localStorage.getItem('favoritos') || '[]');
  if (isActive) {
    const index = favorites.indexOf(propertyId);
    if (index > -1) favorites.splice(index, 1);
  } else {
    favorites.push(propertyId);
  }
  localStorage.setItem('favoritos', JSON.stringify(favorites));
}

function formatPrice(price, currency = 'ARS', operation = 'venta') {
  const symbol = currency === 'USD' ? 'U$S' : '$';
  const suffix = operation === 'alquiler' ? '/mes' : '';
  return { amount: Number(price).toLocaleString('es-AR'), period: suffix };
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
      const page = parseInt(btn.dataset.page);
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
    grid.innerHTML = `
      <div class="property-skeleton" style="grid-column: 1 / -1;">
        ${Array(6).fill(0).map(() => `
          <div class="property-card skeleton-card">
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width: 60%;"></div>
            <div class="skeleton skeleton-text" style="width: 40%;"></div>
          </div>
        `).join('')}
      </div>
    `;
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
  gridElement.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--color-gray-500);">
      <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--color-warning); margin-bottom: 1rem; display: block;"></i>
      <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--color-gray-700); margin-bottom: 0.5rem;">Error al cargar</h3>
      <p style="font-size: 0.95rem; margin-bottom: 1.5rem;">${message}</p>
      <button class="btn btn-primary" onclick="loadProperties()">Reintentar</button>
    </div>
  `;
}

// Expose globally
window.loadProperties = loadProperties;
window.currentPage = currentPage;
window.itemsPerPage = itemsPerPage;

export { loadProperties, currentPage, itemsPerPage };
export default { initPropertyGrid, loadProperties };