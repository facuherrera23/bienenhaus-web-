// ================================================================
// AGENTES - CRUD + RENDER PÚBLICO
// ================================================================
import { supabase } from './supabase.js';
import { uploadToCloudinary, validateImageFile } from './cloudinary.js';
import { CONFIG } from './config.js';

// ================================================================
// RENDER PÚBLICO (landing page)
// ================================================================
export async function obtenerAgentes() {
  try {
    const { data, error } = await supabase
      .from('agentes')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error al obtener agentes:', e);
    return [];
  }
}

export async function obtenerTodosAgentes() {
  try {
    const { data, error } = await supabase
      .from('agentes')
      .select('*')
      .order('orden', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error al obtener agentes:', e);
    return [];
  }
}

function getAvatarEmoji(nombre) {
  const emojis = ['👩', '🧑', '👨', '👩', '🧑', '👩', '🧑', '👨', '👩', '🧑'];
  const hash = nombre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return emojis[hash % emojis.length];
}

export function renderizarAgentes(agentes) {
  const grid = document.getElementById('equipoGrid');
  if (!grid) return;

  if (!agentes || agentes.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;background:white;border-radius:var(--radius);">
        <i class="fas fa-users" style="font-size:2rem;color:var(--gray-300);display:block;margin-bottom:12px;"></i>
        <p style="color:var(--gray-500);">Pronto incorporaremos nuevos agentes.</p>
      </div>`;
    return;
  }

  grid.innerHTML = agentes.map(agente => {
    let avatarHtml = agente.avatar_url
      ? `<img src="${agente.avatar_url}" alt="${agente.nombre} ${agente.apellido}">`
      : `<span style="font-size:2.4rem;">${getAvatarEmoji(agente.nombre)}</span>`;

    let redesHtml = '';
    try {
      const redes = typeof agente.redes_sociales === 'string'
        ? JSON.parse(agente.redes_sociales)
        : agente.redes_sociales || {};

      if (redes.linkedin) redesHtml += `<a href="${redes.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>`;
      if (redes.whatsapp) {
        const wa = redes.whatsapp.replace(/[^0-9]/g, '');
        redesHtml += `<a href="https://wa.me/${wa}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>`;
      }
      if (redes.instagram) {
        const insta = redes.instagram.replace('@', '');
        redesHtml += `<a href="https://instagram.com/${insta}" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fab fa-instagram"></i></a>`;
      }
      if (redes.twitter) redesHtml += `<a href="${redes.twitter}" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><i class="fab fa-twitter"></i></a>`;
    } catch (e) {
      redesHtml = '';
    }

    return `
      <div class="agente" data-id="${agente.id}">
        <div class="avatar">${avatarHtml}</div>
        <h4>${agente.nombre} ${agente.apellido || ''}</h4>
        <p>${agente.descripcion || agente.especialidad}</p>
        <span class="especialidad" style="display:inline-block;background:var(--gray-200);padding:2px 16px;border-radius:40px;font-size:0.7rem;font-weight:600;color:var(--gray-700);margin-top:6px;">${agente.especialidad}</span>
        ${redesHtml ? `<div class="social-icons" style="margin-top:10px;display:flex;justify-content:center;gap:12px;">${redesHtml}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ================================================================
// ADMIN - AGENTES
// ================================================================
let agenteEditandoId = null;

export async function cargarAgentesAdmin() {
  const container = document.getElementById('listaAgentesAdmin');
  if (!container) return;

  const agentes = await obtenerTodosAgentes();
  if (!agentes || agentes.length === 0) {
    container.innerHTML = '<p style="color:var(--gray-500);">No hay agentes registrados.</p>';
    return;
  }

  container.innerHTML = agentes.map(ag => `
    <div class="admin-item">
      <div class="info">
        <div class="thumb">${ag.avatar_url ? `<img src="${ag.avatar_url}">` : '👤'}</div>
        <div>
          <strong>${ag.nombre} ${ag.apellido}</strong>
          <span style="display:block;font-size:0.8rem;color:var(--gray-500);">${ag.especialidad} ${!ag.activo ? '(Inactivo)' : ''}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn-admin btn-admin-primary" onclick="editarAgente(${ag.id})"><i class="fas fa-edit"></i></button>
        <button class="btn-admin btn-admin-danger" onclick="eliminarAgente(${ag.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

export function mostrarFormAgente() {
  const form = document.getElementById('formAgente');
  if (!form) return;
  form.style.display = 'grid';
  document.getElementById('formAgenteTitulo').textContent = 'Nuevo Agente';
  agenteEditandoId = null;

  ['agenteNombre', 'agenteApellido', 'agenteEspecialidad', 'agenteEmail', 'agenteTelefono', 'agenteDescripcion'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('agenteOrden').value = '99';
  document.getElementById('agenteAvatar').value = '';
  const preview = document.getElementById('agenteAvatarPreview');
  if (preview) preview.innerHTML = '<span>👤</span>';
}

export function cerrarFormAgente() {
  const form = document.getElementById('formAgente');
  if (form) form.style.display = 'none';
  agenteEditandoId = null;
}

export async function guardarAgente() {
  const nombre = document.getElementById('agenteNombre')?.value?.trim();
  const apellido = document.getElementById('agenteApellido')?.value?.trim();
  const especialidad = document.getElementById('agenteEspecialidad')?.value?.trim();
  const email = document.getElementById('agenteEmail')?.value?.trim();
  const telefono = document.getElementById('agenteTelefono')?.value?.trim();
  const descripcion = document.getElementById('agenteDescripcion')?.value?.trim();
  const orden = parseInt(document.getElementById('agenteOrden')?.value) || 99;
  const file = document.getElementById('agenteAvatar')?.files[0];

  if (!nombre || !apellido || !especialidad) { alert('⚠️ Completa nombre, apellido y especialidad.'); return; }

  try {
    let avatarUrl = null, avatarPublicId = null;
    if (file) {
      validateImageFile(file);
      const folder = `inmoconecta/agentes/${agenteEditandoId || 'temp'}`;
      const img = await uploadToCloudinary(file, folder, CONFIG.CLOUDINARY_UPLOAD_PRESET_AGENTES);
      avatarUrl = img.url;
      avatarPublicId = img.public_id;
    }

    const datos = {
      nombre, apellido, especialidad,
      email: email || null,
      telefono: telefono || null,
      descripcion: descripcion || null,
      orden,
      activo: true,
      redes_sociales: {}
    };
    if (avatarUrl) { datos.avatar_url = avatarUrl; datos.avatar_public_id = avatarPublicId; }

    let result;
    if (agenteEditandoId) {
      result = await supabase.from('agentes').update(datos).eq('id', agenteEditandoId);
    } else {
      result = await supabase.from('agentes').insert([datos]);
    }
    if (result.error) throw result.error;

    alert(`✅ Agente ${agenteEditandoId ? 'actualizado' : 'creado'} correctamente.`);
    cerrarFormAgente();
    await cargarAgentesAdmin();
    const agentes = await obtenerAgentes();
    renderizarAgentes(agentes);
  } catch (e) {
    console.error(e);
    alert('❌ Error al guardar agente.');
  }
}

export async function editarAgente(id) {
  try {
    const { data, error } = await supabase.from('agentes').select('*').eq('id', id).single();
    if (error) throw error;

    mostrarFormAgente();
    agenteEditandoId = id;
    document.getElementById('formAgenteTitulo').textContent = 'Editar Agente';
    document.getElementById('agenteNombre').value = data.nombre || '';
    document.getElementById('agenteApellido').value = data.apellido || '';
    document.getElementById('agenteEspecialidad').value = data.especialidad || '';
    document.getElementById('agenteEmail').value = data.email || '';
    document.getElementById('agenteTelefono').value = data.telefono || '';
    document.getElementById('agenteDescripcion').value = data.descripcion || '';
    document.getElementById('agenteOrden').value = data.orden || 99;

    const preview = document.getElementById('agenteAvatarPreview');
    if (preview && data.avatar_url) {
      preview.innerHTML = `<img src="${data.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`;
    } else if (preview) {
      preview.innerHTML = '<span>👤</span>';
    }
  } catch (e) {
    console.error(e);
    alert('❌ Error al cargar agente.');
  }
}

export async function eliminarAgente(id) {
  if (!confirm('¿Desactivar este agente?')) return;
  try {
    const { error } = await supabase.from('agentes').update({ activo: false }).eq('id', id);
    if (error) throw error;
    alert('✅ Agente desactivado.');
    await cargarAgentesAdmin();
    const agentes = await obtenerAgentes();
    renderizarAgentes(agentes);
  } catch (e) {
    console.error(e);
    alert('❌ Error al eliminar agente.');
  }
}

// ================================================================
// EXPORTS GLOBALES
// ================================================================
window.mostrarFormAgente = mostrarFormAgente;
window.cerrarFormAgente = cerrarFormAgente;
window.guardarAgente = guardarAgente;
window.editarAgente = editarAgente;
window.eliminarAgente = eliminarAgente;
window.cargarAgentesAdmin = cargarAgentesAdmin;