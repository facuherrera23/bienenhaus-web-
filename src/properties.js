// ================================================================
// PROPIEDADES - CRUD + RENDER
// ================================================================
import { supabase } from './supabase.js';
import { uploadMultipleToCloudinary, validateImageFile } from './cloudinary.js';
import { CONFIG } from './config.js';

// ================================================================
// ESTADO GLOBAL
// ================================================================
export let propiedadesData = [];
export let paginaActual = 1;
export const itemsPorPagina = 6;
export let propiedadActual = null;
let propEditandoId = null;

// Comparador de propiedades (máx 3)
let propiedadesComparar = [];

// Cache en memoria para evitar requests duplicados
const propiedadesCache = new Map();
let currentAbortController = null;

// ================================================================
// VISTA MAPA (Leaflet + MarkerCluster)
// ================================================================
let mapaPropiedades = null;
let markerClusterGroup = null;

export function initVistaToggle() {
  const btnLista = document.querySelector('.vista-btn[data-vista="lista"]');
  const btnMapa = document.querySelector('.vista-btn[data-vista="mapa"]');
  const vistaLista = document.getElementById('vistaLista');
  const vistaMapa = document.getElementById('vistaMapa');

  if (!btnLista || !btnMapa || !vistaLista || !vistaMapa) return;

  function switchVista(vista) {
    const isMapa = vista === 'mapa';
    btnLista.classList.toggle('active', !isMapa);
    btnMapa.classList.toggle('active', isMapa);
    btnLista.setAttribute('aria-pressed', String(!isMapa));
    btnMapa.setAttribute('aria-pressed', String(isMapa));
    vistaLista.hidden = isMapa;
    vistaMapa.hidden = !isMapa;

    if (isMapa && !mapaPropiedades) {
      setTimeout(() => initMapa(), 100);
    } else if (isMapa && mapaPropiedades) {
      mapaPropiedades.invalidateSize();
      fitMapToMarkers();
    }
  }

  btnLista.addEventListener('click', () => switchVista('lista'));
  btnMapa.addEventListener('click', () => switchVista('mapa'));

  // Persistir en URL
  const savedVista = new URLSearchParams(window.location.search).get('vista') || 'lista';
  switchVista(savedVista);

  // Update URL on change
  const originalSwitch = switchVista;
  switchVista = function(vista) {
    originalSwitch(vista);
    const url = new URL(window.location.href);
    url.searchParams.set('vista', vista);
    window.history.replaceState(null, '', url);
  };
}

// ================================================================
// CARGA INFINITA / CARGAR MÁS
// ================================================================
let itemsCargados = 0;
let modoCargaActual = 'paginacion'; // 'paginacion' | 'infinito'

function initCargaToggle() {
  const btnPaginacion = document.querySelector('.carga-btn[data-modo="paginacion"]');
  const btnInfinito = document.querySelector('.carga-btn[data-modo="infinito"]');

  if (!btnPaginacion || !btnInfinito) return;

  function switchModo(modo) {
    const esInfinito = modo === 'infinito';
    btnPaginacion.classList.toggle('active', !esInfinito);
    btnInfinito.classList.toggle('active', esInfinito);
    btnPaginacion.setAttribute('aria-pressed', String(!esInfinito));
    btnInfinito.setAttribute('aria-pressed', String(esInfinito));
    modoCargaActual = modo;
    
    // Reset items cargados al cambiar modo
    itemsCargados = 0;
    paginaActual = 1;
    renderizarPropiedades();
  }

  btnPaginacion.addEventListener('click', () => switchModo('paginacion'));
  btnInfinito.addEventListener('click', () => switchModo('infinito'));

  // Persistir en URL
  const savedModo = new URLSearchParams(window.location.search).get('modo') || 'paginacion';
  switchModo(savedModo);

  // Update URL on change
  const originalSwitch = switchModo;
  switchModo = function(modo) {
    originalSwitch(modo);
    const url = new URL(window.location.href);
    url.searchParams.set('modo', modo);
    window.history.replaceState(null, '', url);
  };
}
 
function cargarMasPropiedades() {
  if (modoCargaActual !== 'infinito') return;
  
  const btnCargarMas = document.getElementById('btnCargarMas');
  if (!btnCargarMas) return;
  
  btnCargarMas.disabled = true;
  btnCargarMas.innerHTML = '<div class="spinner"></div> Cargando...';
  
  // Simular carga asíncrona para UX
  setTimeout(() => {
    itemsCargados += itemsPorPagina;
    paginaActual = Math.ceil(itemsCargados / itemsPorPagina);
    renderizarPropiedades();
  }, 300);
}

// Llamar initCargaToggle desde initVistaToggle
const originalInitVistaToggle = initVistaToggle;
initVistaToggle = function() {
  originalInitVistaToggle();
  initCargaToggle();
};

function initMapa() {
  const mapContainer = document.getElementById('mapaPropiedades');
  if (!mapContainer || mapaPropiedades) return;

  // Coordenadas por defecto: Córdoba, Argentina
  const defaultCenter = [-31.4201, -64.1888];
  const defaultZoom = 12;

  mapaPropiedades = L.map('mapaPropiedades', {
    center: defaultCenter,
    zoom: defaultZoom,
    zoomControl: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    boxZoom: true,
    keyboard: true,
    tap: true,
    touchZoom: true
  });

  // Capa base OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(mapaPropiedades);

  // MarkerClusterGroup
  markerClusterGroup = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    singleMarkerMode: false,
    maxClusterRadius: 50,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      let size = 'small';
      if (count >= 100) size = 'large';
      else if (count >= 10) size = 'medium';
      return L.divIcon({
        html: `<div class="cluster-marker cluster-${size}"><span>${count}</span></div>`,
        className: 'marker-cluster',
        iconSize: size === 'large' ? [50, 50] : size === 'medium' ? [40, 40] : [30, 30]
      });
    }
  });

  mapaPropiedades.addLayer(markerClusterGroup);
  renderMarkers();

  // Ajustar vista a los marcadores después de cargar
  setTimeout(() => fitMapToMarkers(), 200);
}

function renderMarkers() {
  if (!markerClusterGroup || !mapaPropiedades) return;

  markerClusterGroup.clearLayers();

  propiedadesData.forEach(prop => {
    // Necesitamos lat/lng - si no existen, geocodificar o usar ubicación por defecto
    const lat = prop.latitud;
    const lng = prop.longitud;
    
    if (lat === undefined || lng === undefined) return;

    const isVenta = prop.operacion === 'venta';
    const badgeText = isVenta ? 'VENTA' : 'ALQUILER';
    const badgeClass = isVenta ? 'venta' : 'alquiler';
    const monedaInfo = formatearPrecio(prop.precio, prop.moneda || 'ARS', prop.operacion);

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-pin ${badgeClass}">
          <i class="fas fa-home"></i>
          <span class="marker-badge">${badgeText}</span>
        </div>
      `,
      iconSize: [36, 48],
      iconAnchor: [18, 48],
      popupAnchor: [0, -40]
    });

    const marker = L.marker([lat, lng], { icon });

    const popupContent = `
      <div class="map-popup" style="min-width:240px;">
        ${prop.imagen_principal ? `<img src="${prop.imagen_principal}" alt="${prop.titulo}" style="width:100%;height:140px;object-fit:cover;border-radius:8px 8px 0 0;">` : ''}
        <div style="padding:12px;">
          <h4 style="margin:0 0 8px;font-size:1rem;color:var(--primary);">${prop.titulo}</h4>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;color:var(--gray-600);font-size:0.85rem;">
            <i class="fas fa-map-pin" style="color:var(--accent);"></i> ${prop.ubicacion}
          </div>
          <div class="precio" style="font-weight:800;color:var(--primary);font-size:1.1rem;margin-bottom:8px;">${monedaInfo.texto}</div>
          <div style="display:flex;gap:12px;font-size:0.8rem;color:var(--gray-600);margin-bottom:12px;">
            <span><i class="fas fa-bed"></i> ${prop.habitaciones}</span>
            <span><i class="fas fa-bath"></i> ${prop.banos}</span>
            <span><i class="fas fa-arrows-alt"></i> ${prop.m2} m²</span>
          </div>
          <button onclick="window.abrirDetalle(${prop.id})" style="width:100%;background:var(--primary);color:white;border:none;padding:10px;border-radius:8px;font-weight:600;cursor:pointer;transition:var(--transition);" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='var(--primary)'">
            <i class="fas fa-play-circle"></i> Ver detalles
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, {
      maxWidth: 280,
      className: 'custom-popup'
    });

    markerClusterGroup.addLayer(marker);
  });
}

function fitMapToMarkers() {
  if (!markerClusterGroup || !mapaPropiedades) return;
  const bounds = markerClusterGroup.getBounds();
  if (bounds.isValid()) {
    mapaPropiedades.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
}

// Exponer para uso global
window.initVistaToggle = initVistaToggle;
window.renderMarkers = renderMarkers;
window.fitMapToMarkers = fitMapToMarkers;
function parseUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    operacion: params.get('operacion') || 'ambos',
    tipo: params.get('tipo') || 'todos',
    precio_min: parseInt(params.get('precio_min')) || 0,
    precio_max: parseInt(params.get('precio_max')) || 0,
    habitaciones: parseInt(params.get('habitaciones')) || 0,
    metros_min: parseInt(params.get('metros_min')) || 0,
    banos_min: parseInt(params.get('banos_min')) || 0,
    antiguedad: params.get('antiguedad') || 'todas',
    cochera: params.get('cochera') === 'true',
    balcon: params.get('balcon') === 'true',
    pileta: params.get('pileta') === 'true',
    amueblado: params.get('amueblado') === 'true',
    mascotas: params.get('mascotas') === 'true',
    gastos_comunes_max: parseInt(params.get('gastos_comunes_max')) || 0,
    ordenar: params.get('ordenar') || 'destacado',
    page: parseInt(params.get('page')) || 1
  };
}

function applyUrlFiltersToDOM(filtros) {
  document.getElementById('tipoOperacion').value = filtros.operacion;
  document.getElementById('tipoPropiedadFiltro').value = filtros.tipo;
  document.getElementById('precioMin').value = filtros.precio_min || 0;
  document.getElementById('precioMax').value = filtros.precio_max || 0;
  document.getElementById('habitaciones').value = filtros.habitaciones || 0;
  document.getElementById('metrosMin').value = filtros.metros_min || 0;
  document.getElementById('banosMin').value = filtros.banos_min || 0;
  document.getElementById('antiguedadFiltro').value = filtros.antiguedad;
  document.getElementById('filtroCochera').checked = filtros.cochera || false;
  document.getElementById('filtroBalcon').checked = filtros.balcon || false;
  document.getElementById('filtroPileta').checked = filtros.pileta || false;
  document.getElementById('filtroAmueblado').checked = filtros.amueblado || false;
  document.getElementById('filtroMascotas').checked = filtros.mascotas || false;
  document.getElementById('gastosComunesMax').value = filtros.gastos_comunes_max || 0;
  document.getElementById('ordenarPor').value = filtros.ordenar;
}

function buildFilterUrl(filtros, page = 1) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 0 && value !== false && value !== 'todas' && value !== 'ambos' && value !== 'todos') {
      params.set(key, value);
    }
  });
  if (page > 1) params.set('page', page);
  return params.toString() ? `?${params.toString()}` : window.location.pathname;
}

export function initUrlState() {
  const urlFilters = parseUrlFilters();
  applyUrlFiltersToDOM(urlFilters);
  paginaActual = urlFilters.page;
  
  obtenerPropiedades(urlFilters).then(() => {
    renderizarPropiedades();
  });

  window.addEventListener('popstate', () => {
    const urlFilters = parseUrlFilters();
    applyUrlFiltersToDOM(urlFilters);
    paginaActual = urlFilters.page;
    obtenerPropiedades(urlFilters).then(() => renderizarPropiedades());
  });
}

// ================================================================
// UTILIDADES
// ================================================================
export function formatearPrecio(precio, moneda, operacion) {
  const simbolo = moneda === 'USD' ? 'U$S' : '$';
  const label = moneda === 'USD' ? 'Dólares estadounidenses' : 'Pesos argentinos';
  const sufijo = operacion === 'alquiler' ? ' / mes' : '';
  return { simbolo, label: label + sufijo, texto: `${simbolo} ${precio.toLocaleString('es-AR')}${sufijo}` };
}

function getAvatarEmoji(nombre) {
  const emojis = ['👩', '🧑', '👨', '👩', '🧑', '👩', '🧑', '👨', '👩', '🧑'];
  const hash = nombre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return emojis[hash % emojis.length];
}

// ================================================================
// COMPARADOR DE PROPIEDADES
// ================================================================
export function toggleComparar(id) {
  const index = propiedadesComparar.indexOf(id);
  if (index > -1) {
    propiedadesComparar.splice(index, 1);
  } else if (propiedadesComparar.length < 3) {
    propiedadesComparar.push(id);
  } else {
    showToast('Máximo 3 propiedades para comparar', 'warning');
    return;
  }
  renderizarPropiedades();
  actualizarBarraComparador();
}

export function limpiarComparador() {
  propiedadesComparar = [];
  renderizarPropiedades();
  actualizarBarraComparador();
}

export function abrirComparador() {
  if (propiedadesComparar.length < 2) {
    showToast('Selecciona al menos 2 propiedades para comparar', 'warning');
    return;
  }
  const props = propiedadesComparar.map(id => propiedadesData.find(p => p.id === id)).filter(Boolean);
  mostrarModalComparador(props);
}

function actualizarBarraComparador() {
  let barra = document.getElementById('barraComparador');
  if (propiedadesComparar.length === 0) {
    barra?.remove();
    return;
  }
  if (!barra) {
    barra = document.createElement('div');
    barra.id = 'barraComparador';
    barra.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:var(--primary);color:white;padding:12px 24px;border-radius:50px;box-shadow:var(--shadow-lg);z-index:1000;display:flex;align-items:center;gap:16px;font-weight:500;';
    document.body.appendChild(barra);
  }
  barra.innerHTML = `
    <span><i class="fas fa-balance-scale"></i> Comparando ${propiedadesComparar.length} propiedades</span>
    <button onclick="window.abrirComparador()" style="background:white;color:var(--primary);border:none;padding:8px 16px;border-radius:30px;font-weight:600;cursor:pointer;">Ver comparación</button>
    <button onclick="window.limpiarComparador()" style="background:transparent;color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.5);padding:8px 12px;border-radius:30px;cursor:pointer;">Limpiar</button>
  `;
}

function mostrarModalComparador(props) {
  const overlay = document.createElement('div');
  overlay.className = 'detalle-overlay';
  overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div class="detalle-modal" style="max-width:1100px;width:100%;max-height:95vh;overflow:auto;">
      <div class="detalle-header" style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:16px;padding-right:4px;">
        <button class="detalle-close" style="width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;background:var(--gray-100);color:var(--gray-600);font-size:1.5rem;display:flex;align-items:center;justify-content:center;">×</button>
      </div>
      <h2 style="margin-bottom:24px;text-align:center;"><i class="fas fa-balance-scale"></i> Comparador de Propiedades</h2>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;min-width:800px;">
          <thead>
            <tr style="background:var(--gray-50);">
              <th style="padding:16px;border-bottom:2px solid var(--gray-200);text-align:left;">Característica</th>
              ${props.map(p => `
                <th style="padding:16px;border-bottom:2px solid var(--gray-200);text-align:center;">
                  <div style="background:linear-gradient(135deg,#dce6f2,#e8eff9);border-radius:var(--radius);height:120px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;margin-bottom:8px;">
                    ${p.imagen_principal ? `<img src="${p.imagen_principal}" alt="${p.titulo}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:3rem;opacity:0.3;">🏠</span>`}
                    ${p.destacado ? '<span style="position:absolute;top:8px;left:8px;background:var(--warning);color:white;font-size:0.55rem;padding:2px 8px;border-radius:40px;font-weight:700;">⭐ Destacado</span>' : ''}
                    <span style="position:absolute;top:8px;right:8px;background:var(--primary);color:white;font-size:0.55rem;padding:2px 10px;border-radius:40px;font-weight:700;">${p.operacion === 'venta' ? 'VENTA' : 'ALQUILER'}</span>
                  </div>
                  <h3 style="font-size:1rem;font-weight:700;margin-bottom:4px;">${p.titulo}</h3>
                  <div style="font-size:0.85rem;color:var(--gray-600);margin-bottom:8px;"><i class="fas fa-map-pin" style="color:var(--accent);"></i> ${p.ubicacion}</div>
                  <div class="precio" style="font-weight:800;color:var(--primary);font-size:1.2rem;">${formatearPrecio(p.precio, p.moneda || 'ARS', p.operacion).texto}</div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Precio</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${formatearPrecio(p.precio, p.moneda || 'ARS', p.operacion).texto}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Operación</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;"><span class="badge-op ${p.operacion === 'venta' ? 'venta' : 'alquiler'}">${p.operacion === 'venta' ? '🔹 VENTA' : '🔸 ALQUILER'}</span></td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Tipo</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.tipo}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Habitaciones</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.habitaciones}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Baños</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.banos}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Superficie (m²)</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.m2}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Antigüedad</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.antiguedad}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Moneda</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.moneda || 'ARS'}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Cochera</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.cochera ? '<i class="fas fa-check" style="color:var(--success);"></i>' : '<i class="fas fa-times" style="color:var(--danger);"></i>'}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Balcón</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.balcon ? '<i class="fas fa-check" style="color:var(--success);"></i>' : '<i class="fas fa-times" style="color:var(--danger);"></i>'}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Pileta</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.pileta ? '<i class="fas fa-check" style="color:var(--success);"></i>' : '<i class="fas fa-times" style="color:var(--danger);"></i>'}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Amueblado</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.amueblado ? '<i class="fas fa-check" style="color:var(--success);"></i>' : '<i class="fas fa-times" style="color:var(--danger);"></i>'}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Mascotas</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.mascotas ? '<i class="fas fa-check" style="color:var(--success);"></i>' : '<i class="fas fa-times" style="color:var(--danger);"></i>'}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);font-weight:600;">Expensas</td>${props.map(p => `<td style="padding:12px 16px;border-bottom:1px solid var(--gray-100);text-align:center;">${p.expensas ? p.expensas.toLocaleString('es-AR') : '—'}</td>`).join('')}</tr>
            <tr><td style="padding:12px 16px;font-weight:600;">Video Tour</td>${props.map(p => `<td style="padding:12px 16px;text-align:center;">${p.video_url ? '<i class="fas fa-play-circle" style="color:var(--danger);font-size:1.2rem;"></i>' : '—'}</td>`).join('')}</tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  overlay.querySelector('.detalle-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.remove(); });
  overlay.querySelector('.detalle-close')?.focus();
}

function showToast(message, type = 'info') {
  // Simple toast implementation
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;padding:16px 24px;border-radius:var(--radius);color:white;font-weight:500;box-shadow:var(--shadow-lg);animation:slideInRight 0.3s ease;background:${type === 'error' ? 'var(--danger)' : type === 'warning' ? 'var(--warning)' : 'var(--accent)'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideOutRight 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ================================================================
// FAVORITOS (localStorage)
// ================================================================
export function getFavoritos() {
  try { return JSON.parse(localStorage.getItem('favoritosBienenhaus')) || []; } catch { return []; }
}
export function setFavoritos(f) { localStorage.setItem('favoritosBienenhaus', JSON.stringify(f)); }
export function toggleFavorito(id) {
  let favs = getFavoritos();
  const idx = favs.indexOf(id);
  idx > -1 ? favs.splice(idx, 1) : favs.push(id);
  setFavoritos(favs);
  renderizarPropiedades();
}

// ================================================================
// OBTENER PROPIEDADES (con filtros server-side + cache + abort)
// ================================================================
export async function obtenerPropiedades(filtros = {}) {
  const spinner = document.getElementById('spinnerOverlay');
  
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  
  const cacheKey = JSON.stringify(filtros);
  const cached = propiedadesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    propiedadesData = cached.data;
    return propiedadesData;
  }
  
  try {
    spinner?.classList.add('active');
    let query = supabase.from('propiedades').select('*, imagenes(url, cloudinary_public_id, orden, es_principal)');

    if (filtros.operacion && filtros.operacion !== 'ambos') query = query.eq('operacion', filtros.operacion);
    if (filtros.tipo && filtros.tipo !== 'todos') query = query.eq('tipo', filtros.tipo);
    if (filtros.precio_min && filtros.precio_min > 0) query = query.gte('precio', filtros.precio_min);
    if (filtros.precio_max && filtros.precio_max > 0) query = query.lte('precio', filtros.precio_max);
    if (filtros.habitaciones && filtros.habitaciones > 0) query = query.gte('habitaciones', filtros.habitaciones);
    if (filtros.metros_min && filtros.metros_min > 0) query = query.gte('m2', filtros.metros_min);
    if (filtros.banos_min && filtros.banos_min > 0) query = query.gte('banos', filtros.banos_min);
    if (filtros.antiguedad && filtros.antiguedad !== 'todas') query = query.eq('antiguedad', filtros.antiguedad);
    if (filtros.cochera) query = query.eq('cochera', true);
    if (filtros.balcon) query = query.eq('balcon', true);
    if (filtros.pileta) query = query.eq('pileta', true);
    if (filtros.amueblado) query = query.eq('amueblado', true);
    if (filtros.mascotas) query = query.eq('mascotas', true);
    if (filtros.gastos_comunes_max && filtros.gastos_comunes_max > 0) query = query.lte('expensas', filtros.gastos_comunes_max);

    const ordenar = filtros.ordenar || 'destacado';
    switch (ordenar) {
      case 'precio_asc':
        query = query.order('precio', { ascending: true });
        break;
      case 'precio_desc':
        query = query.order('precio', { ascending: false });
        break;
      case 'm2_desc':
        query = query.order('m2', { ascending: false });
        break;
      case 'm2_asc':
        query = query.order('m2', { ascending: true });
        break;
      case 'nuevas':
        query = query.order('created_at', { ascending: false });
        break;
      case 'antiguas':
        query = query.order('created_at', { ascending: true });
        break;
      case 'destacado':
      default:
        query = query.order('destacado', { ascending: false });
        break;
    }

    const { data, error } = await query;
    if (error) throw error;

    propiedadesData = (data || []).map(p => ({
      ...p,
      imagenes: p.imagenes || [],
      imagen_principal: p.imagenes?.find(i => i.es_principal)?.url || null,
      galeria: p.imagenes?.sort((a, b) => a.orden - b.orden).map(i => i.url) || []
    }));

    propiedadesCache.set(cacheKey, { data: propiedadesData, timestamp: Date.now() });

    const countEl = document.getElementById('statPropiedades');
    const heroCount = document.getElementById('heroCount');
    if (countEl) countEl.textContent = `${propiedadesData.length}+`;
    if (heroCount) heroCount.textContent = propiedadesData.length;

    return propiedadesData;
  } catch (e) {
    if (e.name === 'AbortError') {
      console.debug('Request abortado:', e.message);
      return propiedadesData;
    }
    console.error('Error obteniendo propiedades:', e);
    return [];
  } finally {
    spinner?.classList.remove('active');
  }
}

// ================================================================
// RENDERIZAR TARJETAS + PAGINACIÓN / CARGAR MÁS
// ================================================================
export function renderizarPropiedades() {
  const grid = document.getElementById('gridPropiedades');
  const paginacion = document.getElementById('paginacion');
  const contador = document.getElementById('contadorPropiedades');
  if (!grid || !paginacion || !contador) return;

  const favs = getFavoritos();
  const total = propiedadesData.length;
  const totalPages = Math.max(1, Math.ceil(total / itemsPorPagina));

  if (paginaActual > totalPages) paginaActual = totalPages;
  if (paginaActual < 1) paginaActual = 1;

  // En modo infinito, cargamos acumulativamente
  const end = modoCargaActual === 'infinito' 
    ? Math.min(paginaActual * itemsPorPagina, total)
    : Math.min((paginaActual - 1) * itemsPorPagina + itemsPorPagina, total);
  const start = modoCargaActual === 'infinito' ? 0 : (paginaActual - 1) * itemsPorPagina;
  const items = propiedadesData.slice(start, end);

  contador.textContent = `${total} propiedades`;

  if (items.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;background:white;border-radius:var(--radius-lg);">
        <i class="fas fa-search" style="font-size:2.5rem;color:var(--gray-300);display:block;margin-bottom:16px;"></i>
        <p style="font-size:1.1rem;color:var(--gray-600);">No hay propiedades con los filtros actuales.</p>
        <button class="btn-limpiar" style="margin-top:16px;" onclick="document.getElementById('btnLimpiar').click()">Limpiar filtros</button>
      </div>`;
    paginacion.innerHTML = '';
    return;
  }

  // En modo infinito, append en lugar de replace (excepto primera página)
  if (modoCargaActual === 'infinito' && paginaActual > 1) {
    grid.innerHTML += items.map(p => renderPropertyCard(p, favs)).join('');
  } else {
    grid.innerHTML = items.map(p => renderPropertyCard(p, favs)).join('');
  }

  // Renderizar paginación o botón "Cargar más"
  renderPaginacion();

  attachPropertyEvents();
}

// Helper para renderizar una tarjeta (evita duplicar código)
function renderPropertyCard(p, favs) {
  const isVenta = p.operacion === 'venta';
  const badgeText = isVenta ? '🔹 VENTA' : '🔸 ALQUILER';
  const badgeClass = isVenta ? 'venta' : 'alquiler';
  const esFav = favs.includes(p.id);
  const monedaInfo = formatearPrecio(p.precio, p.moneda || 'ARS', p.operacion);
  const imgHtml = p.imagen_principal
    ? `<img src="${p.imagen_principal}" alt="${p.titulo}" loading="lazy">`
    : `<span style="font-size:3rem;opacity:0.3;">🏠</span>`;
  const chars = p.caracteristicas?.map(c => `<span style="background:var(--gray-100);padding:2px 10px;border-radius:40px;font-size:0.65rem;color:var(--gray-600);">${c}</span>`).join(' ') || '';
  const videoBadge = p.video_url ? '<span class="badge-video"><i class="fas fa-play"></i> Video Tour</span>' : '';

  return `
    <div class="tarjeta-propiedad" data-id="${p.id}">
      <button class="favorito ${esFav ? 'activo' : ''}" data-id="${p.id}" aria-label="${esFav ? 'Quitar' : 'Añadir'} favorito">
        <i class="${esFav ? 'fas' : 'far'} fa-heart"></i>
      </button>
      <div class="tarjeta-img">
        ${imgHtml}
        ${p.destacado ? '<span class="badge-destacado">⭐ Destacado</span>' : ''}
        ${videoBadge}
        <span class="badge-op ${badgeClass}">${badgeText}</span>
      </div>
      <h3>${p.titulo}</h3>
      <div class="ubicacion"><i class="fas fa-map-pin" style="color:var(--accent);"></i> ${p.ubicacion}</div>
      <div class="precio">
        <span class="moneda">${monedaInfo.simbolo}</span>
        ${p.precio.toLocaleString('es-AR')}
        ${p.operacion === 'alquiler' ? '/mes' : ''}
        <span style="font-size:0.7rem;font-weight:400;color:var(--gray-500);display:block;">${monedaInfo.label}</span>
      </div>
      <div class="detalles-corto">
        <span><i class="fas fa-bed"></i> ${p.habitaciones}</span>
        <span><i class="fas fa-bath"></i> ${p.banos}</span>
        <span><i class="fas fa-arrows-alt"></i> ${p.m2} m²</span>
        <span><i class="fas fa-calendar-alt"></i> ${p.antiguedad}</span>
      </div>
      ${chars ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">${chars}</div>` : ''}
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid var(--gray-100);">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.8rem;color:var(--gray-600);">
          <input type="checkbox" class="comparar-checkbox" data-id="${p.id}" ${propiedadesComparar.includes(p.id) ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent);">
          <i class="fas fa-balance-scale"></i> Comparar
        </label>
      </div>
      <button class="detalle-link" data-id="${p.id}"><i class="fas fa-play-circle"></i> Ver detalles</button>
    </div>
  `;
}

// Renderizar paginación o botón "Cargar más"
function renderPaginacion() {
  const paginacion = document.getElementById('paginacion');
  if (!paginacion) return;

  const total = propiedadesData.length;
  const totalPages = Math.max(1, Math.ceil(propiedadesData.length / itemsPorPagina));
  const yaCargados = modoCargaActual === 'infinito' ? Math.min(paginaActual * itemsPorPagina, propiedadesData.length) : Math.min(paginaActual * itemsPorPagina, propiedadesData.length);
  const hayMas = yaCargados < propiedadesData.length;

  if (modoCargaActual === 'infinito') {
    // Modo infinito: botón "Cargar más"
    if (hayMas) {
      paginacion.innerHTML = `
        <button class="btn-cargar-mas" id="btnCargarMas" onclick="cargarMasPropiedades()">
          <i class="fas fa-chevron-down"></i> Cargar más (${propiedadesData.length - yaCargados} restantes)
        </button>`;
    } else {
      paginacion.innerHTML = '<p style="text-align:center;color:var(--gray-500);padding:20px;">Todas las propiedades cargadas</p>';
    }
  } else {
    // Modo paginación tradicional
    let pagHtml = '';
    if (totalPages > 1) {
      pagHtml += `<button class="nav-btn" data-page="${paginaActual > 1 ? paginaActual - 1 : 1}"><i class="fas fa-chevron-left"></i></button>`;
      for (let i = 1; i <= totalPages; i++) pagHtml += `<button class="${i === paginaActual ? 'activa' : ''}" data-page="${i}">${i}</button>`;
      pagHtml += `<button class="nav-btn" data-page="${paginaActual < totalPages ? paginaActual + 1 : totalPages}"><i class="fas fa-chevron-right"></i></button>`;
    } else {
      pagHtml = `<button class="activa" data-page="1">1</button>`;
    }
    paginacion.innerHTML = pagHtml;
  }

  // Re-attach pagination events
  document.querySelectorAll('#paginacion button[data-page]').forEach(btn =>
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (!isNaN(p) && p !== paginaActual) { paginaActual = p; renderizarPropiedades(); }
    })
  );
  
  // Attach cargar más event
  const btnCargarMas = document.getElementById('btnCargarMas');
  if (btnCargarMas) {
    btnCargarMas.addEventListener('click', cargarMasPropiedades);
  }
}

function attachPropertyEvents() {
  document.querySelectorAll('.detalle-link').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); abrirDetalle(parseInt(btn.dataset.id)); })
  );
  document.querySelectorAll('.tarjeta-propiedad').forEach(card =>
    card.addEventListener('click', e => {
      if (e.target.closest('.favorito') || e.target.closest('.comparar-checkbox')) return;
      abrirDetalle(parseInt(card.dataset.id));
    })
  );
  document.querySelectorAll('.favorito').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); toggleFavorito(parseInt(btn.dataset.id)); })
  );
  document.querySelectorAll('.comparar-checkbox').forEach(cb =>
    cb.addEventListener('change', e => { e.stopPropagation(); toggleComparar(parseInt(cb.dataset.id)); })
  );
  document.querySelectorAll('#paginacion button').forEach(btn =>
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (!isNaN(p) && p !== paginaActual) { paginaActual = p; renderizarPropiedades(); }
    })
  );
}

// ================================================================
// MODAL DETALLE - HELPERS PUROS
// ================================================================
function buildGalleryImages(prop) {
  const gallery = prop.galeria && prop.galeria.length > 0 ? [...prop.galeria] : [];
  if (prop.imagen_principal && !gallery.includes(prop.imagen_principal)) {
    gallery.unshift(prop.imagen_principal);
  }
  return gallery;
}

function renderGallery(galeriaEl, images, prop, imgEl, badgeEl, badgeText, isAlquiler) {
  galeriaEl.innerHTML = images.map((im, i) => 
    `<div class="mini-img ${i === 0 ? 'activa' : ''}" data-img="${im}" role="listitem"><img src="${im}" alt="Imagen ${i+1}" loading="lazy"></div>`
  ).join('');

  galeriaEl.querySelectorAll('.mini-img').forEach(el => el.addEventListener('click', function() {
    galeriaEl.querySelectorAll('.mini-img').forEach(e => e.classList.remove('activa'));
    this.classList.add('activa');
    imgEl.innerHTML = `<img src="${this.dataset.img}" alt="${prop.titulo}">`;
    const b = document.createElement('span');
    b.className = 'badge-op-detalle' + (isAlquiler ? ' alquiler' : '');
    b.textContent = badgeText;
    imgEl.appendChild(b);
  }));
}

function renderPrice(prop, monedaInfo) {
  document.getElementById('detalleSimbolo').textContent = monedaInfo.simbolo;
  document.getElementById('detallePrecio').textContent = prop.precio.toLocaleString('es-AR');
  document.getElementById('detalleSubMoneda').textContent = monedaInfo.label;
}

function renderCharacteristics(prop) {
  document.getElementById('detalleCaracteristicas').innerHTML = `
    <div class="caract-item"><i class="fas fa-bed"></i><span>${prop.habitaciones} hab.</span></div>
    <div class="caract-item"><i class="fas fa-bath"></i><span>${prop.banos} baños</span></div>
    <div class="caract-item"><i class="fas fa-arrows-alt"></i><span>${prop.m2} m²</span></div>
    <div class="caract-item"><i class="fas fa-calendar-alt"></i><span>${prop.antiguedad}</span></div>
    <div class="caract-item"><i class="fas fa-building"></i><span>${prop.tipo}</span></div>
  `;
  document.getElementById('detalleTags').innerHTML = prop.caracteristicas?.map(c => `<span class="tag">${c}</span>`).join('') || '';
}

function buildContactMessage(prop, monedaInfo) {
  return `Hola Bienenhaus! 👋\n\nMe interesa la propiedad: ${prop.titulo}\nUbicación: ${prop.ubicacion}\nPrecio: ${monedaInfo.texto}\n\n¡Gracias!`;
}

function whatsappLink(msg) {
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function emailLinkHref(prop, msg) {
  return `mailto:bienenhaus.propiedades@gmail.com?subject=${encodeURIComponent('Consulta sobre ' + prop.titulo)}&body=${encodeURIComponent(msg)}`;
}

// ================================================================
// MODAL DETALLE
// ================================================================
let detalleState = {
  currentImageIndex: 0,
  images: [],
  imgEl: null,
  badgeEl: null,
  badgeText: '',
  isAlquiler: false,
  prop: null
};

function setupModalEvents(prop, imgEl, badgeEl, badgeText, isAlquiler, galImgs) {
  const overlay = document.getElementById('detalleOverlay');
  const galeria = document.getElementById('detalleGaleria');
  const modal = document.getElementById('detalleModal');
  const closeBtn = document.getElementById('detalleClose');
  const fullscreenBtn = document.getElementById('detalleFullscreen');

  // Store state
  detalleState = {
    currentImageIndex: 0,
    images: galImgs,
    imgEl,
    badgeEl,
    badgeText,
    isAlquiler,
    prop
  };

  // Keyboard navigation
  const handleKeydown = (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') {
      cerrarDetalle();
    } else if (e.key === 'ArrowLeft') {
      navigateGallery(-1);
    } else if (e.key === 'ArrowRight') {
      navigateGallery(1);
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
  };
  document.addEventListener('keydown', handleKeydown);

  // Touch/swipe support
  let touchStartX = 0;
  let touchEndX = 0;
  imgEl.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  imgEl.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      navigateGallery(diff > 0 ? 1 : -1);
    }
  }

  // Gallery thumbnail click (already in renderGallery, but ensure keyboard focus)
  galeria.querySelectorAll('.mini-img').forEach((thumb, idx) => {
    thumb.setAttribute('tabindex', '0');
    thumb.setAttribute('role', 'button');
    thumb.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        thumb.click();
      }
    });
  });

  // Fullscreen toggle
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }

  // Close button
  closeBtn?.addEventListener('click', cerrarDetalle);

  // Overlay click to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrarDetalle();
  });

  // Cleanup on close
  const originalCerrar = cerrarDetalle;
  window.cerrarDetalle = function() {
    document.removeEventListener('keydown', handleKeydown);
    imgEl.removeEventListener('touchstart', null);
    imgEl.removeEventListener('touchend', null);
    originalCerrar();
  };
}

function navigateGallery(direction) {
  const { images, imgEl, badgeEl, badgeText, isAlquiler } = detalleState;
  if (!images.length) return;
  
  detalleState.currentImageIndex = (detalleState.currentImageIndex + direction + images.length) % images.length;
  const newImg = images[detalleState.currentImageIndex];
  
  imgEl.innerHTML = `<img src="${newImg}" alt="${detalleState.prop.titulo}">`;
  const b = document.createElement('span');
  b.className = 'badge-op-detalle' + (isAlquiler ? ' alquiler' : '');
  b.textContent = badgeText;
  imgEl.appendChild(b);

  // Update thumbnail active state
  const thumbs = document.querySelectorAll('#detalleGaleria .mini-img');
  thumbs.forEach((t, i) => t.classList.toggle('activa', i === detalleState.currentImageIndex));
  thumbs[detalleState.currentImageIndex]?.focus();
}

function toggleFullscreen() {
  const modal = document.getElementById('detalleModal');
  if (!document.fullscreenElement) {
    modal.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

export function abrirDetalle(id) {
  const prop = propiedadesData.find(p => p.id === id);
  if (!prop) return;
  propiedadActual = prop;

  const img = document.getElementById('detalleImagen');
  const badge = document.getElementById('detalleBadge');
  const galeria = document.getElementById('detalleGaleria');
  const isVenta = prop.operacion === 'venta';
  const badgeText = isVenta ? 'VENTA' : 'ALQUILER';
  const isAlquiler = !isVenta;
  const monedaInfo = formatearPrecio(prop.precio, prop.moneda || 'ARS', prop.operacion);

  img.innerHTML = prop.imagen_principal ? `<img src="${prop.imagen_principal}" alt="${prop.titulo}">` : '<span style="font-size:4rem;">🏠</span>';
  badge.textContent = badgeText;
  badge.className = 'badge-op-detalle' + (isAlquiler ? ' alquiler' : '');
  img.appendChild(badge);

  const galImgs = buildGalleryImages(prop);
  renderGallery(galeria, galImgs, prop, img, badge, badgeText, isAlquiler);

  document.getElementById('detalle-titulo').textContent = prop.titulo;
  document.getElementById('detalleUbicacion').textContent = prop.ubicacion;
  renderPrice(prop, monedaInfo);
  renderCharacteristics(prop);

  const msg = buildContactMessage(prop, monedaInfo);
  const waLink = document.getElementById('detalleWhatsApp');
  waLink.href = whatsappLink(msg);
  waLink.target = '_blank';
  document.getElementById('detalleEmail').href = emailLinkHref(prop, msg);

  document.getElementById('detalleOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Setup enhanced events
  setupModalEvents(prop, img, badge, badgeText, isAlquiler, galImgs);
}

export function cerrarDetalle() {
  document.getElementById('detalleOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ================================================================
// FILTROS
// ================================================================
export async function aplicarFiltros() {
  const filtros = {
    operacion: document.getElementById('tipoOperacion').value,
    tipo: document.getElementById('tipoPropiedadFiltro').value,
    precio_min: parseInt(document.getElementById('precioMin').value) || 0,
    precio_max: parseInt(document.getElementById('precioMax').value) || 0,
    habitaciones: parseInt(document.getElementById('habitaciones').value) || 0,
    metros_min: parseInt(document.getElementById('metrosMin').value) || 0,
    banos_min: parseInt(document.getElementById('banosMin')?.value) || 0,
    antiguedad: document.getElementById('antiguedadFiltro')?.value || 'todas',
    cochera: document.getElementById('filtroCochera')?.checked || false,
    balcon: document.getElementById('filtroBalcon')?.checked || false,
    pileta: document.getElementById('filtroPileta')?.checked || false,
    amueblado: document.getElementById('filtroAmueblado')?.checked || false,
    mascotas: document.getElementById('filtroMascotas')?.checked || false,
    gastos_comunes_max: parseInt(document.getElementById('gastosComunesMax')?.value) || 0,
    ordenar: document.getElementById('ordenarPor')?.value || 'destacado'
  };
  paginaActual = 1;
  await obtenerPropiedades(filtros);
  renderizarPropiedades();
  
  // Update URL
  const url = buildFilterUrl(filtros);
  history.pushState(null, '', url);
}

export function limpiarFiltros() {
  document.getElementById('tipoOperacion').value = 'ambos';
  document.getElementById('tipoPropiedadFiltro').value = 'todos';
  document.getElementById('precioMin').value = '0';
  document.getElementById('precioMax').value = '900000';
  document.getElementById('habitaciones').value = '0';
  document.getElementById('metrosMin').value = '0';
  document.getElementById('banosMin').value = '0';
  document.getElementById('antiguedadFiltro').value = 'todas';
  document.getElementById('filtroCochera').checked = false;
  document.getElementById('filtroBalcon').checked = false;
  document.getElementById('filtroPileta').checked = false;
  document.getElementById('filtroAmueblado').checked = false;
  document.getElementById('filtroMascotas').checked = false;
  document.getElementById('gastosComunesMax').value = '0';
  document.getElementById('ordenarPor').value = 'destacado';
  const adv = document.getElementById('filtrosAvanzados');
  const btn = document.getElementById('btnFiltrosAvanzados');
  const icon = document.getElementById('iconoFiltros');
  if (adv && !adv.hidden) {
    adv.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    icon.style.transform = 'rotate(0deg)';
  }
  aplicarFiltros();
}

// Re-export para uso en admin (standalone)
export { uploadMultipleToCloudinary, validateImageFile } from './cloudinary.js';
