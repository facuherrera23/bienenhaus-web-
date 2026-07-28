// @ts-nocheck
// ================================================================
// SEARCH BAR COMPONENT - Main orchestrator with Autocomplete
// ================================================================

import './SearchBar.css';
import { Autocomplete } from './Autocomplete/index.ts';

let searchBarElement = null;
let currentFilters = {
  operacion: 'ambos',
  tipo: 'todos',
  precioMin: 0,
  precioMax: 900000,
  habitaciones: 0,
  metrosMin: 0,
  banosMin: 0,
  antiguedad: 'todas',
  cochera: false,
  balcon: false,
  pileta: false,
  amueblado: false,
  mascotas: false,
  gastosMax: 0,
  ordenar: 'destacado',
  // Geolocation
  lat: null,
  lng: null,
  radio: 10
};
let advancedVisible = false;
let debounceTimer = null;

export function initSearchBar() {
  const existingBar = document.querySelector('.search-bar');
  if (existingBar) {
    searchBarElement = existingBar;
    bindEvents();
    initAutocomplete();
    return;
  }

  searchBarElement = createSearchBar();
  
  // Replace search-bar-placeholder
  const placeholder = document.getElementById('search-bar-placeholder');
  if (placeholder && placeholder.parentNode) {
    placeholder.parentNode.replaceChild(searchBarElement, placeholder);
  } else {
    // Fallback: insert after hero
    const hero = document.getElementById('hero') || document.querySelector('.hero');
    if (hero && hero.parentNode) {
      hero.parentNode.insertBefore(searchBarElement, hero.nextSibling);
    } else {
      document.body.insertBefore(searchBarElement, document.body.firstChild);
    }
  }
  
  // Initialize Autocomplete
  initAutocomplete();
  
  bindEvents();
}

function createSearchBar() {
  const bar = document.createElement('div');
  bar.className = 'search-bar';
  bar.setAttribute('role', 'search');
  bar.innerHTML = `
    <div class="search-main-row">
      <!-- Autocomplete Location -->
      <div class="search-group search-group-main" style="flex: 1; min-width: 280px;">
        <div id="autocomplete-container"></div>
      </div>
      
      <!-- Operación -->
      <div class="search-group">
        <label for="tipoOperacion"><i class="fas fa-tag" aria-hidden="true"></i> Operación</label>
        <select id="tipoOperacion">
          <option value="venta">Venta</option>
          <option value="alquiler">Alquiler</option>
          <option value="ambos" selected>Ambos</option>
        </select>
      </div>
      
      <!-- Tipo -->
      <div class="search-group">
        <label for="tipoPropiedadFiltro"><i class="fas fa-building" aria-hidden="true"></i> Tipo</label>
        <select id="tipoPropiedadFiltro">
          <option value="todos" selected>Todos</option>
          <option value="piso">Piso/Apartamento</option>
          <option value="chalet">Chalet/Casa</option>
          <option value="atico">Ático</option>
          <option value="local">Local/Oficina</option>
          <option value="terreno">Terreno/Solar</option>
        </select>
      </div>
      
      <!-- Precio Min -->
      <div class="search-group">
        <label for="precioMin"><i class="fas fa-dollar-sign" aria-hidden="true"></i> Min</label>
        <input type="number" id="precioMin" placeholder="0" min="0" step="5000" value="0">
      </div>
      
      <!-- Precio Max -->
      <div class="search-group">
        <label for="precioMax"><i class="fas fa-dollar-sign" aria-hidden="true"></i> Max</label>
        <input type="number" id="precioMax" placeholder="900.000" min="0" step="10000" value="900000">
      </div>
      
      <!-- Habitaciones -->
      <div class="search-group">
        <label for="habitaciones"><i class="fas fa-bed" aria-hidden="true"></i> Hab.</label>
        <select id="habitaciones">
          <option value="0">Cualquiera</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4+</option>
        </select>
      </div>
      
      <!-- m² Min -->
      <div class="search-group">
        <label for="metrosMin"><i class="fas fa-arrows-alt" aria-hidden="true"></i> m² min</label>
        <input type="number" id="metrosMin" placeholder="0" min="0" step="10" value="0">
      </div>
    </div>
    
    <!-- Advanced filters toggle + second row -->
    <div class="search-advanced-row">
      <div class="search-group filtro-toggle">
        <button type="button" class="btn-filtros-toggle" id="btnFiltrosAvanzados" aria-expanded="false" aria-controls="filtrosAvanzados">
          <i class="fas fa-sliders-h"></i> Más filtros <i class="fas fa-chevron-down" id="iconoFiltros"></i>
        </button>
      </div>
      
      <!-- Sort -->
      <div class="search-group sort-group">
        <label for="ordenarPor"><i class="fas fa-sort" aria-hidden="true"></i> Ordenar</label>
        <select id="ordenarPor">
          <option value="destacado">Destacados primero</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="m2_desc">Superficie: mayor a menor</option>
          <option value="m2_asc">Superficie: menor a mayor</option>
          <option value="nuevas">Más nuevas</option>
          <option value="antiguas">Más antiguas</option>
          <option value="relevancia">Relevancia</option>
        </select>
      </div>
      
      <!-- Actions -->
      <div class="search-actions">
        <button class="btn-filtrar" id="btnFiltrar"><i class="fas fa-search" aria-hidden="true"></i> Buscar</button>
        <button class="btn-limpiar" id="btnLimpiar"><i class="fas fa-undo" aria-hidden="true"></i> Limpiar</button>
      </div>
    </div>
    
    <!-- Advanced filters panel -->
    <div class="filtros-avanzados" id="filtrosAvanzados" hidden>
      <div class="search-group">
        <label for="banosMin"><i class="fas fa-bath" aria-hidden="true"></i> Baños min</label>
        <select id="banosMin">
          <option value="0">Cualquiera</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3+</option>
        </select>
      </div>
      <div class="search-group">
        <label for="antiguedadFiltro"><i class="fas fa-calendar-alt" aria-hidden="true"></i> Antigüedad</label>
        <select id="antiguedadFiltro">
          <option value="todas">Todas</option>
          <option value="nuevo">Nuevo</option>
          <option value="reformado">Reformado</option>
          <option value="viejo">A reformar</option>
        </select>
      </div>
      <div class="search-group filtro-checkbox">
        <label><input type="checkbox" id="filtroCochera"> <i class="fas fa-car" aria-hidden="true"></i> Cochera</label>
      </div>
      <div class="search-group filtro-checkbox">
        <label><input type="checkbox" id="filtroBalcon"> <i class="fas fa-window-maximize" aria-hidden="true"></i> Balcón</label>
      </div>
      <div class="search-group filtro-checkbox">
        <label><input type="checkbox" id="filtroPileta"> <i class="fas fa-swimming-pool" aria-hidden="true"></i> Pileta</label>
      </div>
      <div class="search-group filtro-checkbox">
        <label><input type="checkbox" id="filtroAmueblado"> <i class="fas fa-couch" aria-hidden="true"></i> Amueblado</label>
      </div>
      <div class="search-group filtro-checkbox">
        <label><input type="checkbox" id="filtroMascotas"> <i class="fas fa-paw" aria-hidden="true"></i> Mascotas</label>
      </div>
      <div class="search-group">
        <label for="gastosComunesMax"><i class="fas fa-receipt" aria-hidden="true"></i> Expensas máx</label>
        <input type="number" id="gastosComunesMax" placeholder="Sin límite" min="0" step="1000" value="0">
      </div>
    </div>
  `;
  return bar;
}

function initAutocomplete() {
  const autocompleteContainer = searchBarElement.querySelector('#autocomplete-container');
  if (autocompleteContainer && window.Autocomplete) {
    window.Autocomplete.init({
      container: autocompleteContainer,
      name: 'ubicacion',
      placeholder: 'Buscar zona, barrio, ciudad...',
      label: 'Ubicación',
      required: false,
      bias: { lat: -31.42, lng: -64.18, radius: 50000 }, // Córdoba bias
      onSelect: handleLocationSelect,
      onChange: handleLocationChange
    });
  }
}

function bindEvents() {
  if (!searchBarElement) return;
  
  // Advanced toggle
  const toggleBtn = searchBarElement.querySelector('#btnFiltrosAvanzados');
  const advancedPanel = searchBarElement.querySelector('#filtrosAvanzados');
  const icon = searchBarElement.querySelector('#iconoFiltros');
  
  if (toggleBtn && advancedPanel) {
    toggleBtn.addEventListener('click', () => {
      advancedVisible = !advancedVisible;
      advancedPanel.hidden = !advancedVisible;
      toggleBtn.setAttribute('aria-expanded', advancedVisible);
      if (icon) icon.style.transform = advancedVisible ? 'rotate(180deg)' : 'rotate(0deg)';
      toggleBtn.classList.toggle('active', advancedVisible);
    });
  }
  
  // Form inputs - debounced filter
  const inputs = searchBarElement.querySelectorAll('select, input');
  inputs.forEach(input => {
    input.addEventListener('change', debounce(applyFilters, 300));
    input.addEventListener('input', debounce(applyFilters, 500));
  });
  
  // Search button
  const searchBtn = searchBarElement.querySelector('#btnFiltrar');
  if (searchBtn) {
    searchBtn.addEventListener('click', applyFilters);
  }
  
  // Clear button
  const clearBtn = searchBarElement.querySelector('#btnLimpiar');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearFilters);
  }
  
  // Load saved filters from URL
  loadFiltersFromURL();
}

function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), delay);
  };
}

function handleLocationSelect(location) {
  // Store geolocation in filters
  currentFilters.lat = location.lat;
  currentFilters.lng = location.lng;
  currentFilters.radio = location.radio || 10;
  
  // Update URL
  updateURLFilters(currentFilters);
  
  // Trigger filter event
  window.dispatchEvent(new CustomEvent('filters-changed', { detail: currentFilters }));
  
  if (window.filterProperties) {
    window.filterProperties(currentFilters);
  }
}

function handleLocationChange(query) {
  // Optional: live filter as user types location
  // Could trigger autocomplete suggestions without full filter
}

function applyFilters() {
  if (!searchBarElement) return;
  
  // Collect all filter values
  currentFilters = {
    operacion: searchBarElement.querySelector('#tipoOperacion').value,
    tipo: searchBarElement.querySelector('#tipoPropiedadFiltro').value,
    precioMin: parseInt(searchBarElement.querySelector('#precioMin').value) || 0,
    precioMax: parseInt(searchBarElement.querySelector('#precioMax').value) || 900000,
    habitaciones: parseInt(searchBarElement.querySelector('#habitaciones').value) || 0,
    metrosMin: parseInt(searchBarElement.querySelector('#metrosMin').value) || 0,
    banosMin: parseInt(searchBarElement.querySelector('#banosMin')?.value) || 0,
    antiguedad: searchBarElement.querySelector('#antiguedadFiltro')?.value || 'todas',
    cochera: searchBarElement.querySelector('#filtroCochera')?.checked || false,
    balcon: searchBarElement.querySelector('#filtroBalcon')?.checked || false,
    pileta: searchBarElement.querySelector('#filtroPileta')?.checked || false,
    amueblado: searchBarElement.querySelector('#filtroAmueblado')?.checked || false,
    mascotas: searchBarElement.querySelector('#filtroMascotas')?.checked || false,
    gastosMax: parseInt(searchBarElement.querySelector('#gastosComunesMax')?.value) || 0,
    ordenar: searchBarElement.querySelector('#ordenarPor')?.value || 'destacado'
  };
  
  // Preserve geolocation if already set
  if (currentFilters.lat && currentFilters.lng) {
    // Keep existing lat/lng/radio
  }
  
  // Update URL
  updateURLFilters(currentFilters);
  
  // Trigger filter event
  window.dispatchEvent(new CustomEvent('filters-changed', { detail: currentFilters }));
  
  // Call existing filter function if available
  if (window.filterProperties) {
    window.filterProperties(currentFilters);
  }
}

function clearFilters() {
  if (!searchBarElement) return;
  
  // Reset form
  searchBarElement.querySelector('#tipoOperacion').value = 'ambos';
  searchBarElement.querySelector('#tipoPropiedadFiltro').value = 'todos';
  searchBarElement.querySelector('#precioMin').value = '0';
  searchBarElement.querySelector('#precioMax').value = '900000';
  searchBarElement.querySelector('#habitaciones').value = '0';
  searchBarElement.querySelector('#metrosMin').value = '0';
  searchBarElement.querySelector('#banosMin').value = '0';
  searchBarElement.querySelector('#antiguedadFiltro').value = 'todas';
  searchBarElement.querySelector('#filtroCochera').checked = false;
  searchBarElement.querySelector('#filtroBalcon').checked = false;
  searchBarElement.querySelector('#filtroPileta').checked = false;
  searchBarElement.querySelector('#filtroAmueblado').checked = false;
  searchBarElement.querySelector('#filtroMascotas').checked = false;
  searchBarElement.querySelector('#gastosComunesMax').value = '0';
  searchBarElement.querySelector('#ordenarPor').value = 'destacado';
  
  // Clear autocomplete
  if (window.Autocomplete && window.Autocomplete.clear) {
    window.Autocomplete.clear();
  }
  
  // Hide advanced
  const advancedPanel = searchBarElement.querySelector('#filtrosAvanzados');
  const toggleBtn = searchBarElement.querySelector('#btnFiltrosAvanzados');
  const icon = searchBarElement.querySelector('#iconoFiltros');
  
  if (advancedPanel && toggleBtn) {
    advancedPanel.hidden = true;
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.classList.remove('active');
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
  
  // Reset filter state
  currentFilters = {
    operacion: 'ambos',
    tipo: 'todos',
    precioMin: 0,
    precioMax: 900000,
    habitaciones: 0,
    metrosMin: 0,
    banosMin: 0,
    antiguedad: 'todas',
    cochera: false,
    balcon: false,
    pileta: false,
    amueblado: false,
    mascotas: false,
    gastosMax: 0,
    ordenar: 'destacado',
    lat: null,
    lng: null,
    radio: 10
  };
  
  // Update URL
  updateURLFilters(currentFilters);
  
  // Trigger filter event
  window.dispatchEvent(new CustomEvent('filters-changed', { detail: currentFilters }));
  
  if (window.filterProperties) {
    window.filterProperties(currentFilters);
  }
}

function updateURLFilters(filters) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== 0 && value !== false && value !== 'todos' && value !== 'ambos' && value !== 'todas' && value !== 'destacado' && value !== null) {
      params.set(key, value);
    }
  });
  
  const newURL = params.toString() ? `#propiedades?${params.toString()}` : '#propiedades';
  history.replaceState(null, '', newURL);
}

function loadFiltersFromURL() {
  const hash = window.location.hash;
  const [, query = ''] = hash.split('?');
  if (!query) return;
  
  const params = new URLSearchParams(query);
  const filterMap = {
    'operacion': 'tipoOperacion',
    'tipo': 'tipoPropiedadFiltro',
    'precioMin': 'precioMin',
    'precioMax': 'precioMax',
    'habitaciones': 'habitaciones',
    'metrosMin': 'metrosMin',
    'banosMin': 'banosMin',
    'antiguedad': 'antiguedadFiltro',
    'cochera': 'filtroCochera',
    'balcon': 'filtroBalcon',
    'pileta': 'filtroPileta',
    'amueblado': 'filtroAmueblado',
    'mascotas': 'filtroMascotas',
    'gastosMax': 'gastosComunesMax',
    'ordenar': 'ordenarPor'
  };
  
  Object.entries(filterMap).forEach(([param, id]) => {
    const value = params.get(param);
    if (value !== null) {
      const element = searchBarElement?.querySelector(`#${id}`);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value === 'true';
        } else {
          element.value = value;
        }
        currentFilters[param] = element.type === 'checkbox' ? value === 'true' : value;
      }
    }
  });
  
  // Show advanced if any advanced filters are set
  const advancedParams = ['banosMin', 'antiguedad', 'cochera', 'balcon', 'pileta', 'amueblado', 'mascotas', 'gastosMax'];
  const hasAdvanced = advancedParams.some(p => params.has(p));
  if (hasAdvanced) {
    const advancedPanel = searchBarElement?.querySelector('#filtrosAvanzados');
    const toggleBtn = searchBarElement?.querySelector('#btnFiltrosAvanzados');
    const icon = searchBarElement?.querySelector('#iconoFiltros');
    if (advancedPanel && toggleBtn) {
      advancedPanel.hidden = false;
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.classList.add('active');
      if (icon) icon.style.transform = 'rotate(180deg)';
    }
  }
}

export function getCurrentFilters() {
  return { ...currentFilters };
}

export function setFilters(filters) {
  currentFilters = { ...currentFilters, ...filters };
  // Update UI
  Object.entries(filters).forEach(([key, value]) => {
    const map = {
      operacion: 'tipoOperacion',
      tipo: 'tipoPropiedadFiltro',
      precioMin: 'precioMin',
      precioMax: 'precioMax',
      habitaciones: 'habitaciones',
      metrosMin: 'metrosMin',
      banosMin: 'banosMin',
      antiguedad: 'antiguedadFiltro',
      cochera: 'filtroCochera',
      balcon: 'filtroBalcon',
      pileta: 'filtroPileta',
      amueblado: 'filtroAmueblado',
      mascotas: 'filtroMascotas',
      gastosMax: 'gastosComunesMax',
      ordenar: 'ordenarPor'
    };
    const id = map[key];
    if (id && searchBarElement) {
      const element = searchBarElement.querySelector(`#${id}`);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    }
  });
  currentFilters = { ...currentFilters, ...filters };
}

export default { initSearchBar, getCurrentFilters, setFilters, clearFilters };