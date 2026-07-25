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

// Cache en memoria para evitar requests duplicados
const propiedadesCache = new Map();
let currentAbortController = null;

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
  // Re-render solo la página actual, sin resetear paginación
  // Actualiza solo los botones de favorito en las tarjetas visibles
  const grid = document.getElementById('gridPropiedades');
  if (grid) {
    const cards = grid.querySelectorAll('.tarjeta-propiedad');
    cards.forEach(card => {
      const cardId = parseInt(card.dataset.id);
      const btn = card.querySelector('.favorito');
      if (btn) {
        const isFav = getFavoritos().includes(cardId);
        btn.classList.toggle('activo', isFav);
        btn.querySelector('i').className = isFav ? 'fas fa-heart' : 'far fa-heart';
        btn.setAttribute('aria-label', isFav ? 'Quitar favorito' : 'Añadir favorito');
      }
    });
  }
}

// ================================================================
// OBTENER PROPIEDADES (con filtros server-side + cache + abort)
// ================================================================
export async function obtenerPropiedades(filtros = {}) {
  const spinner = document.getElementById('spinnerOverlay');
  
  // Cancelar request anterior si existe
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  
  // Generar clave de cache
  const cacheKey = JSON.stringify(filtros);
  const cached = propiedadesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 min TTL
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
    // Filtros avanzados
    if (filtros.banos_min && filtros.banos_min > 0) query = query.gte('banos', filtros.banos_min);
    if (filtros.antiguedad && filtros.antiguedad !== 'todas') query = query.eq('antiguedad', filtros.antiguedad);
    if (filtros.cochera) query = query.eq('cochera', true);
    if (filtros.balcon) query = query.eq('balcon', true);
    if (filtros.pileta) query = query.eq('pileta', true);
    if (filtros.amueblado) query = query.eq('amueblado', true);
    if (filtros.mascotas) query = query.eq('mascotas', true);
    if (filtros.gastos_comunes_max && filtros.gastos_comunes_max > 0) query = query.lte('expensas', filtros.gastos_comunes_max);

    // Ordenamiento
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

    // Cachear resultado
    propiedadesCache.set(cacheKey, { data: propiedadesData, timestamp: Date.now() });

    // Actualizar contadores en hero y catálogo
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
// RENDERIZAR TARJETAS + PAGINACIÓN
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

  const start = (paginaActual - 1) * itemsPorPagina;
  const end = Math.min(start + itemsPorPagina, total);
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

  grid.innerHTML = items.map(p => {
    const isVenta = p.operacion === 'venta';
    const badgeText = isVenta ? '🔹 VENTA' : '🔸 ALQUILER';
    const badgeClass = isVenta ? 'venta' : 'alquiler';
    const esFav = favs.includes(p.id);
    const monedaInfo = formatearPrecio(p.precio, p.moneda || 'ARS', p.operacion);
    const imgHtml = p.imagen_principal
      ? `<img src="${p.imagen_principal}" alt="${p.titulo}" loading="lazy">`
      : `<span style="font-size:3rem;opacity:0.3;">🏠</span>`;
    const chars = p.caracteristicas?.map(c => `<span style="background:var(--gray-100);padding:2px 10px;border-radius:40px;font-size:0.65rem;color:var(--gray-600);">${c}</span>`).join(' ') || '';
    const videoBadge = p.video_url ? '<span class="badge-video"><i class="fas fa-play-circle"></i> Video tour</span>' : '';

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
        <button class="detalle-link" data-id="${p.id}"><i class="fas fa-play-circle"></i> Ver detalles</button>
      </div>
    `;
  }).join('');

  // Paginación
  let pagHtml = '';
  if (totalPages > 1) {
    pagHtml += `<button class="nav-btn" data-page="${paginaActual > 1 ? paginaActual - 1 : 1}"><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) pagHtml += `<button class="${i === paginaActual ? 'activa' : ''}" data-page="${i}">${i}</button>`;
    pagHtml += `<button class="nav-btn" data-page="${paginaActual < totalPages ? paginaActual + 1 : totalPages}"><i class="fas fa-chevron-right"></i></button>`;
  } else {
    pagHtml = `<button class="activa" data-page="1">1</button>`;
  }
  paginacion.innerHTML = pagHtml;

  // Event listeners
  attachPropertyEvents();
}

function attachPropertyEvents() {
  document.querySelectorAll('.detalle-link').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); abrirDetalle(parseInt(btn.dataset.id)); })
  );
  document.querySelectorAll('.tarjeta-propiedad').forEach(card =>
    card.addEventListener('click', e => {
      if (e.target.closest('.favorito')) return;
      abrirDetalle(parseInt(card.dataset.id));
    })
  );
  document.querySelectorAll('.favorito').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); toggleFavorito(parseInt(btn.dataset.id)); })
  );
  document.querySelectorAll('#paginacion button').forEach(btn =>
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (!isNaN(p) && p !== paginaActual) { paginaActual = p; renderizarPropiedades(); }
    })
  );
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

function renderDetailImage(img, badge, prop, isVenta) {
  const badgeText = isVenta ? 'VENTA' : 'ALQUILER';
  img.innerHTML = prop.imagen_principal ? `<img src="${prop.imagen_principal}" alt="${prop.titulo}">` : '<span style="font-size:4rem;">🏠</span>';
  badge.textContent = badgeText;
  badge.className = 'badge-op-detalle' + (!isVenta ? ' alquiler' : '');
  img.appendChild(badge);
}

function renderDetailContacts(prop, monedaInfo) {
  const msg = buildContactMessage(prop, monedaInfo);
  const waLink = document.getElementById('detalleWhatsApp');
  waLink.href = whatsappLink(msg);
  waLink.target = '_blank';
  document.getElementById('detalleEmail').href = emailLinkHref(prop, msg);
}

function setupDetailFocusTrap() {
  const focusable = document.getElementById('detalleClose');
  focusable?.focus();
}

function openDetailModal() {
  document.getElementById('detalleOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ================================================================
// MODAL DETALLE - MAIN
// ================================================================
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

  renderDetailImage(img, badge, prop, isVenta);

  const galImgs = buildGalleryImages(prop);
  renderGallery(galeria, galImgs, prop, img, badge, badgeText, isAlquiler);

  document.getElementById('detalle-titulo').textContent = prop.titulo;
  document.getElementById('detalleUbicacion').textContent = prop.ubicacion;
  renderPrice(prop, monedaInfo);
  renderCharacteristics(prop);

  renderDetailContacts(prop, monedaInfo);

  openDetailModal();
  setupDetailFocusTrap();
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
    // Filtros avanzados
    banos_min: parseInt(document.getElementById('banosMin')?.value) || 0,
    antiguedad: document.getElementById('antiguedadFiltro')?.value || 'todas',
    cochera: document.getElementById('filtroCochera')?.checked || false,
    balcon: document.getElementById('filtroBalcon')?.checked || false,
    pileta: document.getElementById('filtroPileta')?.checked || false,
    amueblado: document.getElementById('filtroAmueblado')?.checked || false,
    mascotas: document.getElementById('filtroMascotas')?.checked || false,
    gastos_comunes_max: parseInt(document.getElementById('gastosComunesMax')?.value) || 0,
    // Ordenamiento
    ordenar: document.getElementById('ordenarPor')?.value || 'destacado'
  };
  paginaActual = 1; // Reset paginación al cambiar filtros
  await obtenerPropiedades(filtros);
  renderizarPropiedades();
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
  // Colapsar filtros avanzados
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
export { uploadToCloudinary, validateImageFile } from './cloudinary.js';