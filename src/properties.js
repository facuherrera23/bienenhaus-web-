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
  renderizarPropiedades();
}

// ================================================================
// OBTENER PROPIEDADES (con filtros server-side)
// ================================================================
export async function obtenerPropiedades(filtros = {}) {
  const spinner = document.getElementById('spinnerOverlay');
  try {
    spinner?.classList.add('active');
    let query = supabase.from('propiedades').select('*, imagenes(url, cloudinary_public_id, orden, es_principal)');

    if (filtros.operacion && filtros.operacion !== 'ambos') query = query.eq('operacion', filtros.operacion);
    if (filtros.tipo && filtros.tipo !== 'todos') query = query.eq('tipo', filtros.tipo);
    if (filtros.precio_min && filtros.precio_min > 0) query = query.gte('precio', filtros.precio_min);
    if (filtros.precio_max && filtros.precio_max > 0) query = query.lte('precio', filtros.precio_max);
    if (filtros.habitaciones && filtros.habitaciones > 0) query = query.gte('habitaciones', filtros.habitaciones);
    if (filtros.metros_min && filtros.metros_min > 0) query = query.gte('m2', filtros.metros_min);

    query = query.order('destacado', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    propiedadesData = (data || []).map(p => ({
      ...p,
      imagenes: p.imagenes || [],
      imagen_principal: p.imagenes?.find(i => i.es_principal)?.url || null,
      galeria: p.imagenes?.sort((a, b) => a.orden - b.orden).map(i => i.url) || []
    }));

    // Actualizar contadores en hero y catálogo
    const countEl = document.getElementById('statPropiedades');
    const heroCount = document.getElementById('heroCount');
    if (countEl) countEl.textContent = `${propiedadesData.length}+`;
    if (heroCount) heroCount.textContent = propiedadesData.length;

    return propiedadesData;
  } catch (e) {
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

    return `
      <div class="tarjeta-propiedad" data-id="${p.id}">
        <button class="favorito ${esFav ? 'activo' : ''}" data-id="${p.id}" aria-label="${esFav ? 'Quitar' : 'Añadir'} favorito">
          <i class="${esFav ? 'fas' : 'far'} fa-heart"></i>
        </button>
        <div class="tarjeta-img">
          ${imgHtml}
          ${p.destacado ? '<span class="badge-destacado">⭐ Destacado</span>' : ''}
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

// ================================================================
// MODAL DETALLE
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
  const monedaInfo = formatearPrecio(prop.precio, prop.moneda || 'ARS', prop.operacion);

  img.innerHTML = prop.imagen_principal ? `<img src="${prop.imagen_principal}" alt="${prop.titulo}">` : '<span style="font-size:4rem;">🏠</span>';
  badge.textContent = badgeText;
  badge.className = 'badge-op-detalle' + (prop.operacion === 'alquiler' ? ' alquiler' : '');
  img.appendChild(badge);

  const galImgs = prop.galeria && prop.galeria.length > 0 ? prop.galeria : [];
  galeria.innerHTML = galImgs.map((im, i) => `<div class="mini-img ${i === 0 ? 'activa' : ''}" data-img="${im}" role="listitem"><img src="${im}" alt="Imagen ${i+1}" loading="lazy"></div>`).join('');

  galeria.querySelectorAll('.mini-img').forEach(el => el.addEventListener('click', function() {
    galeria.querySelectorAll('.mini-img').forEach(e => e.classList.remove('activa'));
    this.classList.add('activa');
    img.innerHTML = `<img src="${this.dataset.img}" alt="${prop.titulo}">`;
    const b = document.createElement('span');
    b.className = 'badge-op-detalle' + (prop.operacion === 'alquiler' ? ' alquiler' : '');
    b.textContent = badgeText;
    img.appendChild(b);
  }));

  document.getElementById('detalle-titulo').textContent = prop.titulo;
  document.getElementById('detalleUbicacion').textContent = prop.ubicacion;
  document.getElementById('detalleSimbolo').textContent = monedaInfo.simbolo;
  document.getElementById('detallePrecio').textContent = prop.precio.toLocaleString('es-AR');
  document.getElementById('detalleSubMoneda').textContent = monedaInfo.label;

  document.getElementById('detalleCaracteristicas').innerHTML = `
    <div class="caract-item"><i class="fas fa-bed"></i><span>${prop.habitaciones} hab.</span></div>
    <div class="caract-item"><i class="fas fa-bath"></i><span>${prop.banos} baños</span></div>
    <div class="caract-item"><i class="fas fa-arrows-alt"></i><span>${prop.m2} m²</span></div>
    <div class="caract-item"><i class="fas fa-calendar-alt"></i><span>${prop.antiguedad}</span></div>
    <div class="caract-item"><i class="fas fa-building"></i><span>${prop.tipo}</span></div>
  `;
  document.getElementById('detalleTags').innerHTML = prop.caracteristicas?.map(c => `<span class="tag">${c}</span>`).join('') || '';

  // WhatsApp deep link
  const msg = `Hola Bienenhaus! 👋\n\nMe interesa la propiedad: ${prop.titulo}\nUbicación: ${prop.ubicacion}\nPrecio: ${monedaInfo.texto}\n\n¡Gracias!`;
  const waLink = document.getElementById('detalleWhatsApp');
  waLink.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  waLink.target = '_blank';

  // Email link
  document.getElementById('detalleEmail').href = `mailto:bienenhaus.propiedades@gmail.com?subject=Consulta sobre ${prop.titulo}&body=${encodeURIComponent(msg)}`;

  document.getElementById('detalleOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
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
    metros_min: parseInt(document.getElementById('metrosMin').value) || 0
  };
  paginaActual = 1;
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
  aplicarFiltros();
}

// ================================================================
// ADMIN - PROPIEDADES (CRUD completo)
// ================================================================
export async function cargarPropiedadesAdmin() {
  const container = document.getElementById('listaPropiedadesAdmin');
  if (!container) return;

  const { data, error } = await supabase.from('propiedades').select('*').order('id', { ascending: false });
  if (error) { container.innerHTML = '<p>Error al cargar propiedades.</p>'; return; }
  if (!data || data.length === 0) { container.innerHTML = '<p style="color:var(--gray-500);">No hay propiedades registradas.</p>'; return; }

  container.innerHTML = data.map(p => {
    const monedaInfo = formatearPrecio(p.precio, p.moneda || 'ARS', p.operacion);
    return `
      <div class="admin-item">
        <div class="info">
          <div class="thumb">🏠</div>
          <div>
            <strong>${p.titulo}</strong>
            <span style="display:block;font-size:0.8rem;color:var(--gray-500);">${p.ubicacion} · ${monedaInfo.texto} · ${p.operacion}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-admin btn-admin-primary" onclick="editarPropiedad(${p.id})"><i class="fas fa-edit"></i></button>
          <button class="btn-admin btn-admin-danger" onclick="eliminarPropiedad(${p.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

export function mostrarFormPropiedad() {
  const form = document.getElementById('formPropiedad');
  const titulo = document.getElementById('formPropTitulo');
  if (!form || !titulo) return;

  form.style.display = 'grid';
  titulo.textContent = 'Nueva Propiedad';
  propEditandoId = null;

  // Reset campos
  ['propTitulo','propPrecio','propUbicacion','propCaracteristicas','propDescripcion'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('propMoneda').value = 'ARS';
  document.getElementById('propOperacion').value = 'venta';
  document.getElementById('propTipo').value = 'piso';
  document.getElementById('propHabitaciones').value = '';
  document.getElementById('propBanos').value = '';
  document.getElementById('propM2').value = '';
  document.getElementById('propAntiguedad').value = 'reformado';
  document.getElementById('propDestacado').value = 'false';
  document.getElementById('propImagenes').value = '';
  document.getElementById('propImagenesPreview').innerHTML = '';
}

export function cerrarFormPropiedad() {
  const form = document.getElementById('formPropiedad');
  if (form) form.style.display = 'none';
  propEditandoId = null;
}

export async function guardarPropiedad() {
  const titulo = document.getElementById('propTitulo').value.trim();
  const precio = parseFloat(document.getElementById('propPrecio').value);
  const moneda = document.getElementById('propMoneda').value;
  const operacion = document.getElementById('propOperacion').value;
  const ubicacion = document.getElementById('propUbicacion').value.trim();
  const tipo = document.getElementById('propTipo').value;
  const habitaciones = parseInt(document.getElementById('propHabitaciones').value) || 0;
  const banos = parseInt(document.getElementById('propBanos').value) || 0;
  const m2 = parseInt(document.getElementById('propM2').value) || 0;
  const antiguedad = document.getElementById('propAntiguedad').value;
  const destacado = document.getElementById('propDestacado').value === 'true';
  const caracteristicas = document.getElementById('propCaracteristicas').value.split(',').map(c => c.trim()).filter(c => c);
  const descripcion = document.getElementById('propDescripcion').value.trim();
  const files = document.getElementById('propImagenes').files;

  if (!titulo || !precio || !ubicacion) { alert('⚠️ Completa título, precio y ubicación.'); return; }

  try {
    // 1. Guardar propiedad
    const datos = { titulo, precio, moneda, operacion, ubicacion, tipo, habitaciones, banos, m2, antiguedad, destacado, caracteristicas, descripcion };
    let result;

    if (propEditandoId) {
      result = await supabase.from('propiedades').update(datos).eq('id', propEditandoId);
    } else {
      result = await supabase.from('propiedades').insert([datos]).select();
    }
    if (result.error) throw result.error;

    const propId = propEditandoId || result.data[0].id;

    // 2. Subir imágenes si hay nuevas
    if (files && files.length > 0) {
      const imagenesData = [];
      const maxImagenes = Math.min(files.length, 15);

      for (let i = 0; i < maxImagenes; i++) {
        const file = files[i];
        validateImageFile(file);
        const folder = `inmoconecta/propiedades/${propId}`;
        const img = await uploadToCloudinary(file, folder, CONFIG.CLOUDINARY_UPLOAD_PRESET_PROPS);
        imagenesData.push({
          propiedad_id: propId, url: img.url, cloudinary_public_id: img.public_id,
          orden: i, es_principal: i === 0
        });
      }

      if (imagenesData.length > 0) {
        const { error: imgError } = await supabase.from('imagenes').insert(imagenesData);
        if (imgError) throw imgError;
      }
    }

    alert(`✅ Propiedad ${propEditandoId ? 'actualizada' : 'creada'} correctamente.`);
    cerrarFormPropiedad();
    await cargarPropiedadesAdmin();
    await obtenerPropiedades({});
    renderizarPropiedades();
  } catch (e) {
    console.error(e);
    alert('❌ Error al guardar propiedad.');
  }
}

export async function editarPropiedad(id) {
  try {
    const { data, error } = await supabase.from('propiedades').select('*').eq('id', id).single();
    if (error) throw error;

    mostrarFormPropiedad();
    propEditandoId = id;
    document.getElementById('formPropTitulo').textContent = 'Editar Propiedad';
    document.getElementById('propTitulo').value = data.titulo || '';
    document.getElementById('propPrecio').value = data.precio || '';
    document.getElementById('propMoneda').value = data.moneda || 'ARS';
    document.getElementById('propOperacion').value = data.operacion || 'venta';
    document.getElementById('propUbicacion').value = data.ubicacion || '';
    document.getElementById('propTipo').value = data.tipo || 'piso';
    document.getElementById('propHabitaciones').value = data.habitaciones || '';
    document.getElementById('propBanos').value = data.banos || '';
    document.getElementById('propM2').value = data.m2 || '';
    document.getElementById('propAntiguedad').value = data.antiguedad || 'reformado';
    document.getElementById('propDestacado').value = data.destacado ? 'true' : 'false';
    document.getElementById('propCaracteristicas').value = data.caracteristicas?.join(', ') || '';
    document.getElementById('propDescripcion').value = data.descripcion || '';
  } catch (e) { console.error(e); alert('❌ Error al cargar propiedad.'); }
}

export async function eliminarPropiedad(id) {
  if (!confirm('¿Eliminar esta propiedad permanentemente?')) return;
  try {
    const { error } = await supabase.from('propiedades').delete().eq('id', id);
    if (error) throw error;
    alert('✅ Propiedad eliminada.');
    await cargarPropiedadesAdmin();
    await obtenerPropiedades({});
    renderizarPropiedades();
  } catch (e) { console.error(e); alert('❌ Error al eliminar.'); }
}

// Re-export para uso en admin.js
export { uploadToCloudinary } from './cloudinary.js';