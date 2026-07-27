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
    const avatarHtml = agente.avatar_url
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

// Re-export para uso en admin (standalone)
export { uploadToCloudinary, validateImageFile } from './cloudinary.js';