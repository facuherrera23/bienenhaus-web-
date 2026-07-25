// ================================================================
// ADMIN PANEL - Funcionalidad completa (solo se importa si se necesita)
// ================================================================
import { supabase } from './supabase.js';
import { uploadMultipleToCloudinary, validateImageFile } from './cloudinary.js';
import { CONFIG } from './config.js';

// ================================================================
// ESTADO ADMIN
// ================================================================
let propEditandoId = null;
let imagenesSubidas = [];

// ================================================================
// PROPIEDADES ADMIN
// ================================================================
export async function cargarPropiedadesAdmin() {
  const container = document.getElementById('listaPropiedadesAdmin');
  if (!container) return;

  const { data, error } = await supabase.from('propiedades').select('*').order('id', { ascending: false });
  if (error) { container.innerHTML = '<p>Error al cargar propiedades.</p>'; return; }
  if (!data || data.length === 0) { container.innerHTML = '<p style="color:var(--gray-500);">No hay propiedades registradas.</p>'; return; }

  container.innerHTML = data.map(p => {
    const monedaInfo = formatearPrecioAdmin(p.precio, p.moneda || 'ARS', p.operacion);
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

function formatearPrecioAdmin(precio, moneda, operacion) {
  const simbolo = moneda === 'USD' ? 'U$S' : '$';
  const label = moneda === 'USD' ? 'Dólares estadounidenses' : 'Pesos argentinos';
  const sufijo = operacion === 'alquiler' ? ' / mes' : '';
  return { simbolo, label: label + sufijo, texto: `${simbolo} ${precio.toLocaleString('es-AR')}${sufijo}` };
}

export function mostrarFormPropiedad() {
  const form = document.getElementById('formPropiedad');
  if (!form) return;
  form.style.display = 'grid';
  document.getElementById('formPropTitulo').textContent = 'Nueva Propiedad';
  propEditandoId = null;

  // Reset campos
  ['propTitulo', 'propPrecio', 'propUbicacion', 'propCaracteristicas', 'propDescripcion', 'propMoneda', 'propOperacion', 'propTipo', 'propHabitaciones', 'propBanos', 'propM2', 'propAntiguedad', 'propDestacado'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'propMoneda' ? 'ARS' : id === 'propOperacion' ? 'venta' : id === 'propTipo' ? 'piso' : id === 'propAntiguedad' ? 'reformado' : id === 'propDestacado' ? 'false' : '';
  });

  document.getElementById('propImagenes').value = '';
  document.getElementById('propImagenesPreview').innerHTML = '';
  imagenesSubidas = [];
}

export function cerrarFormPropiedad() {
  const form = document.getElementById('formPropiedad');
  if (form) form.style.display = 'none';
  propEditandoId = null;
}

export async function guardarPropiedad() {
  const titulo = document.getElementById('propTitulo')?.value?.trim();
  const precio = parseFloat(document.getElementById('propPrecio')?.value);
  const moneda = document.getElementById('propMoneda')?.value || 'ARS';
  const operacion = document.getElementById('propOperacion')?.value || 'venta';
  const ubicacion = document.getElementById('propUbicacion')?.value?.trim();
  const tipo = document.getElementById('propTipo')?.value || 'piso';
  const habitaciones = parseInt(document.getElementById('propHabitaciones')?.value) || 0;
  const banos = parseInt(document.getElementById('propBanos')?.value) || 0;
  const m2 = parseInt(document.getElementById('propM2')?.value) || 0;
  const antiguedad = document.getElementById('propAntiguedad')?.value || 'reformado';
  const destacado = document.getElementById('propDestacado')?.value === 'true';
  const caracteristicas = document.getElementById('propCaracteristicas')?.value?.split(',').map(c => c.trim()).filter(c => c) || [];
  const descripcion = document.getElementById('propDescripcion')?.value?.trim();
  const files = document.getElementById('propImagenes')?.files;

  if (!titulo || !precio || !ubicacion) { alert('⚠️ Completa título, precio y ubicación.'); return; }

  try {
    // Guardar propiedad
    const datos = { titulo, precio, moneda, operacion, ubicacion, tipo, habitaciones, banos, m2, antiguedad, destacado, caracteristicas, descripcion };
    let result;

    if (propEditandoId) {
      result = await supabase.from('propiedades').update(datos).eq('id', propEditandoId);
    } else {
      result = await supabase.from('propiedades').insert([datos]).select();
    }
    if (result.error) throw result.error;

    const propId = propEditandoId || result.data[0].id;

    // Subir imágenes
    if (files && files.length > 0) {
      const imagenesData = [];
      const maxImagenes = Math.min(files.length, 15);

      for (let i = 0; i < maxImagenes; i++) {
        validateImageFile(files[i]);
        const folder = `inmoconecta/propiedades/${propId}`;
        const img = await uploadToCloudinary(files[i], folder, CONFIG.CLOUDINARY_UPLOAD_PRESET_PROPS);
        imagenesData.push({ propiedad_id: propId, url: img.url, cloudinary_public_id: img.public_id, orden: i, es_principal: i === 0 });
      }

      if (imagenesData.length > 0) {
        const { error: imgError } = await supabase.from('imagenes').insert(imagenesData);
        if (imgError) throw imgError;
      }
    }

    alert(`✅ Propiedad ${propEditandoId ? 'actualizada' : 'creada'} correctamente.`);
    cerrarFormPropiedad();
    await cargarPropiedadesAdmin();
    // Refrescar vista pública
    const { obtenerPropiedades, renderizarPropiedades } = await import('./properties.js');
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

    // Preview imágenes existentes
    const { data: imagenes } = await supabase.from('imagenes').select('url').eq('propiedad_id', id).order('orden');
    const preview = document.getElementById('propImagenesPreview');
    if (preview && imagenes) {
      preview.innerHTML = imagenes.map((img, i) => `
        <div style="position:relative;width:60px;height:60px;border-radius:8px;overflow:hidden;border:2px solid var(--gray-200);${i===0?'border-color:var(--accent);':''}">
          <img src="${img.url}" style="width:100%;height:100%;object-fit:cover;">
          ${i===0 ? '<span style="position:absolute;top:2px;right:2px;background:var(--accent);color:white;font-size:0.6rem;padding:1px 4px;border-radius:4px;">Principal</span>' : ''}
        </div>
      `).join('');
    }
  } catch (e) {
    console.error(e);
    alert('❌ Error al cargar propiedad.');
  }
}

export async function eliminarPropiedad(id) {
  if (!confirm('¿Eliminar esta propiedad permanentemente?')) return;
  try {
    const { error } = await supabase.from('propiedades').delete().eq('id', id);
    if (error) throw error;
    alert('✅ Propiedad eliminada.');
    await cargarPropiedadesAdmin();
    const { obtenerPropiedades, renderizarPropiedades } = await import('./properties.js');
    await obtenerPropiedades({});
    renderizarPropiedades();
  } catch (e) {
    console.error(e);
    alert('❌ Error al eliminar.');
  }
}

// ================================================================
// EXPORTS GLOBALES PARA ONCLICK EN HTML
// ================================================================
window.mostrarFormPropiedad = mostrarFormPropiedad;
window.cerrarFormPropiedad = cerrarFormPropiedad;
window.guardarPropiedad = guardarPropiedad;
window.editarPropiedad = editarPropiedad;
window.eliminarPropiedad = eliminarPropiedad;
window.cargarPropiedadesAdmin = cargarPropiedadesAdmin;