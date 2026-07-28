// ================================================================
// ADMIN AGENTS FEATURE
// ================================================================
 
import { supabase } from '../../../supabase.js';
import { uploadToCloudinary, validateImageFile } from '../../../cloudinary.js';
import { showToast, getInitials } from '../../shared/utils.js';
import { CONFIG } from '../../../config.js';
import { propertiesCache } from '../properties/index.js';

interface Agent {
  id: number;
  nombre: string;
  apellido: string | null;
  especialidad: string;
  email: string | null;
  telefono: string | null;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  avatar_url: string | null;
  avatar_public_id: string | null;
  redes_sociales: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

let agentsCache: Agent[] = [];
export { agentsCache };
let editingAgentId: number | null = null;

async function loadAgents(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('agentes')
      .select('*')
      .order('orden', { ascending: true });
    if (error) throw error;
    agentsCache = data || [];
    updateAgentStats();
    renderAgentsTable();
    updateNavBadges();
  } catch (e) { console.error('Error loading agents:', e); showToast('Error cargando agentes', 'error'); }
}

function updateAgentStats(): void {
  const active = agentsCache.filter(a => a.activo).length;
  document.getElementById('statAgents')!.textContent = String(active);
}

function updateNavBadges(): void {
  document.getElementById('propCountBadge')!.textContent = String(propertiesCache.length);
  document.getElementById('agentCountBadge')!.textContent = String(agentsCache.filter(a => a.activo).length);
}

function renderAgentsTable(filter = ''): void {
  const tbody = document.getElementById('agentsTableBody')!;
  let filtered = agentsCache;
  if (filter) {
    const f = filter.toLowerCase();
    filtered = agentsCache.filter(a =>
      `${a.nombre} ${a.apellido}`.toLowerCase().includes(f) ||
      a.especialidad.toLowerCase().includes(f) ||
      (a.email || '').toLowerCase().includes(f)
    );
  }
  if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay agentes registrados</td></tr>'; return; }
  tbody.innerHTML = filtered.map(a => `
    <tr>
      <td><div style="width:44px;height:44px;border-radius:50%;background:${a.avatar_url ? 'url(' + a.avatar_url + ')' : 'linear-gradient(135deg, var(--primary), var(--accent))'};background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:1.1rem;">${a.avatar_url ? '' : getInitials(a.nombre + ' ' + a.apellido)}</div></td>
      <td><strong>${a.nombre} ${a.apellido}</strong></td>
      <td>${a.especialidad}</td>
      <td>${a.email || '-'}</td>
      <td>${a.telefono || '-'}</td>
      <td><span class="badge badge-${a.activo ? 'active' : 'inactive'}">${a.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td>${a.orden}</td>
      <td><div class="action-btns"><button class="action-btn" onclick="editAgent(${a.id})" title="Editar"><i class="fas fa-edit"></i></button><button class="action-btn delete" onclick="confirmDelete('agent', ${a.id}, '${a.nombre} ${a.apellido}')" title="Eliminar"><i class="fas fa-trash"></i></button></div></td>
    </tr>
  `).join('');
}

function filterAgents(): void {
  const search = (document.getElementById('searchAgents') as HTMLInputElement)?.value.toLowerCase() || '';
  const filtered = agentsCache.filter(a =>
    `${a.nombre} ${a.apellido}`.toLowerCase().includes(search) ||
    a.especialidad.toLowerCase().includes(search) ||
    (a.email || '').toLowerCase().includes(search)
  );
  renderAgentsTableFiltered(filtered);
}

function renderAgentsTableFiltered(filtered: any[]): void {
  const tbody = document.getElementById('agentsTableBody')!;
  if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay agentes</td></tr>'; return; }
  tbody.innerHTML = filtered.map(a => `
    <tr><td><div style="width:44px;height:44px;border-radius:50%;background:${a.avatar_url ? 'url(' + a.avatar_url + ')' : 'linear-gradient(135deg, var(--primary), var(--accent))'};background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:1.1rem;">${a.avatar_url ? '' : getInitials(a.nombre + ' ' + a.apellido)}</div></td>
    <td><strong>${a.nombre} ${a.apellido}</strong></td><td>${a.especialidad}</td><td>${a.email || '-'}</td><td>${a.telefono || '-'}</td>
    <td><span class="badge badge-${a.activo ? 'active' : 'inactive'}">${a.activo ? 'Activo' : 'Inactivo'}</span></td><td>${a.orden}</td>
    <td><div class="action-btns"><button class="action-btn" onclick="editAgent(${a.id})"><i class="fas fa-edit"></i></button><button class="action-btn delete" onclick="confirmDelete('agent', ${a.id}, '${a.nombre} ${a.apellido}')"><i class="fas fa-trash"></i></button></div></td></tr>
  `).join('');
}

function openAgentModal(agent: Agent | null = null): void {
  editingAgentId = agent?.id || null;
  const form = document.getElementById('agentForm') as HTMLFormElement;
  const preview = document.getElementById('agentAvatarPreview')!;
  form.reset();
  preview.innerHTML = '<span>👤</span>';
  preview.style.background = 'var(--gray-200)';
  preview.style.color = 'var(--gray-500)';
  document.getElementById('agentAvatar')!.value = '';

  if (agent) {
    document.getElementById('agentModalTitle')!.textContent = 'Editar Agente';
    document.getElementById('agentId')!.value = String(agent.id);
    document.getElementById('agentName')!.value = agent.nombre || '';
    document.getElementById('agentSurname')!.value = agent.apellido || '';
    document.getElementById('agentSpecialty')!.value = agent.especialidad || '';
    document.getElementById('agentEmail')!.value = agent.email || '';
    document.getElementById('agentPhone')!.value = agent.telefono || '';
    document.getElementById('agentOrder')!.value = String(agent.orden || 99);
    document.getElementById('agentDescription')!.value = agent.descripcion || '';
    document.getElementById('agentActive')!.checked = agent.activo !== false;
    if (agent.avatar_url) { preview.innerHTML = `<img src="${agent.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`; preview.style.background = 'none'; }
  } else {
    document.getElementById('agentModalTitle')!.textContent = 'Nuevo Agente';
    document.getElementById('agentId')!.value = '';
  }
  document.getElementById('agentModal')!.classList.add('active');
}

function closeAgentModal(): void {
  document.getElementById('agentModal')!.classList.remove('active');
  editingAgentId = null;
}

async function saveAgent(e: Event): Promise<void> {
  e.preventDefault();
  const btn = document.getElementById('saveAgentBtn') as HTMLButtonElement;
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const nombre = (document.getElementById('agentName') as HTMLInputElement).value.trim();
    const apellido = (document.getElementById('agentSurname') as HTMLInputElement).value.trim();
    const especialidad = (document.getElementById('agentSpecialty') as HTMLInputElement).value.trim();
    const email = (document.getElementById('agentEmail') as HTMLInputElement).value.trim();
    const telefono = (document.getElementById('agentPhone') as HTMLInputElement).value.trim();
    const orden = parseInt((document.getElementById('agentOrder') as HTMLInputElement).value) || 99;
    const descripcion = (document.getElementById('agentDescription') as HTMLTextAreaElement).value.trim();
    const activo = (document.getElementById('agentActive') as HTMLInputElement).checked;
    const file = (document.getElementById('agentAvatar') as HTMLInputElement).files?.[0];

    if (!nombre || !apellido || !especialidad) { showToast('Completa nombre, apellido y especialidad', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; return; }

    const datos: Omit<Agent, 'id' | 'created_at' | 'updated_at'> = { nombre, apellido, especialidad, email, telefono, orden, descripcion, activo, avatar_url: null, avatar_public_id: null, redes_sociales: null };
    if (file) { validateImageFile(file); const folder = `inmoconecta/agentes/${editingAgentId || 'nuevo'}`; const img = await uploadToCloudinary(file, folder, CONFIG.CLOUDINARY_UPLOAD_PRESET_AGENTES); datos.avatar_url = img.url; datos.avatar_public_id = img.public_id; }

    let result;
    if (editingAgentId) { result = await supabase.from('agentes').update(datos).eq('id', editingAgentId); }
    else { result = await supabase.from('agentes').insert([datos]).select(); }
    if (result.error) throw result.error;
    showToast(`Agente ${editingAgentId ? 'actualizado' : 'creado'} correctamente`, 'success');
    closeAgentModal(); await loadAgents();
  } catch (e: unknown) { console.error('saveAgent error:', e); showToast(`Error: ${e instanceof Error ? e.message : 'Error al guardar agente'}`, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; }
}

(window as any).editAgent = (id: number) => { const agent = agentsCache.find(a => a.id === id); if (agent) openAgentModal(agent); };
(window as any).filterAgents = filterAgents;

export { loadAgents, openAgentModal, closeAgentModal, saveAgent, filterAgents };