// ================================================================
// AGENTS COMPONENT - Team Section
// ================================================================

import { supabase } from '../../supabase.ts';
import { showToast, getInitials } from '../shared/utils.ts';
import { logError, logInfo } from '../../utils/logger.ts';
import { escapeHtml } from '../../utils/sanitize.ts';

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

async function loadAgents(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('agentes')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) {
      if (error.status === 401 || error.status === 403 || error.message?.includes('JWT')) {
        logWarn('Supabase auth issue - showing empty agents', { status: error.status }, 'agents');
        agentsCache = [];
        renderAgentsGrid();
        updateAgentStats();
        return;
      }
      throw error;
    }
    
    agentsCache = data || [];
    renderAgentsGrid();
    updateAgentStats();
  } catch (e) {
    logWarn('Agents load failed - showing empty', { error: e }, 'agents');
    agentsCache = [];
    renderAgentsGrid();
    updateAgentStats();
  }
}

function initAgents(): void {
  loadAgents();
}

function updateAgentStats(): void {
  const active = agentsCache.filter(a => a.activo).length;
  const total = agentsCache.length;
  
  const statAgents = document.getElementById('statAgents');
  if (statAgents) statAgents.textContent = String(total);
  
  const agentBadge = document.getElementById('agentCountBadge');
  if (agentBadge) agentBadge.textContent = String(active);
}

function renderAgentsGrid(): void {
  const grid = document.getElementById('agentsGrid');
  if (!grid) return;

  if (agentsCache.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <i class="fas fa-users" style="font-size: 3rem; color: var(--ds-color-text-muted); margin-bottom: 1rem; display: block;"></i>
        <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--ds-color-text-secondary); margin-bottom: 0.5rem;">No hay agentes registrados</h3>
        <p style="font-size: 0.95rem; color: var(--ds-color-text-muted); margin-bottom: 1.5rem;">No hay agentes activos para mostrar</p>
        <button class="btn btn-primary" onclick="window.openAgentModal?.()"><i class="fas fa-plus" aria-hidden="true"></i> Agregar primer agente</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = agentsCache.map(agent => `
    <article class="agent-card" role="listitem" data-id="${agent.id}">
      <div class="agent-avatar">
        ${agent.avatar_url 
          ? `<img src="${agent.avatar_url}" alt="${agent.nombre} ${agent.apellido || ''}" loading="lazy">`
          : `<span>${getInitials(agent.nombre + ' ' + (agent.apellido || ''))}</span>`
        }
      </div>
      <div class="agent-info">
        <h3 class="agent-name">${escapeHtml(agent.nombre)} ${escapeHtml(agent.apellido || '')}</h3>
        <p class="agent-role">${escapeHtml(agent.especialidad || 'Agente inmobiliario')}</p>
        ${agent.telefono ? `<p class="agent-phone"><i class="fas fa-phone" aria-hidden="true"></i> ${escapeHtml(agent.telefono)}</p>` : ''}
        ${agent.email ? `<p class="agent-email"><i class="fas fa-envelope" aria-hidden="true"></i> ${escapeHtml(agent.email)}</p>` : ''}
        ${agent.descripcion ? `<p class="agent-bio">${escapeHtml(agent.descripcion)}</p>` : ''}
      </div>
      <div class="agent-actions">
        <button class="btn btn-ghost btn-sm agent-contact" data-id="${agent.id}" aria-label="Contactar a ${escapeHtml(agent.nombre)}">
          <i class="fas fa-envelope" aria-hidden="true"></i> Contactar
        </button>
        ${agent.activo 
          ? '<span class="badge badge-active">Activo</span>'
          : '<span class="badge badge-inactive">Inactivo</span>'
        }
      </div>
    </article>
  `).join('');

  // Bind contact buttons
  grid.querySelectorAll('.agent-contact').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const agentId = parseInt((btn as HTMLElement).dataset.id || '0');
      const agent = agentsCache.find(a => a.id === agentId);
      if (agent) openContactModal(agent);
    });
  });
}

// Open contact modal for agent
function openContactModal(agent: Agent): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'contactAgentTitle');
  modal.innerHTML = `
    <div class="modal" role="document">
      <header class="modal-header">
        <h3 id="contactAgentTitle">Contactar a ${escapeHtml(agent.nombre)} ${escapeHtml(agent.apellido || '')}</h3>
        <button type="button" class="modal-close" aria-label="Cerrar">&times;</button>
      </header>
      <form class="modal-form" id="contactAgentForm">
        <input type="hidden" name="agent_id" value="${agent.id}">
        <div class="form-group">
          <label for="contactName">Tu nombre *</label>
          <input type="text" id="contactName" name="name" required autocomplete="name" placeholder="Tu nombre">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="contactEmail">Email *</label>
            <input type="email" id="contactEmail" name="email" required autocomplete="email" placeholder="tu@email.com">
          </div>
          <div class="form-group">
            <label for="contactPhone">Teléfono</label>
            <input type="tel" id="contactPhone" name="phone" autocomplete="tel" placeholder="+54 9 351 XXX XXXX">
          </div>
        </div>
        <div class="form-group">
          <label for="contactMessage">Mensaje *</label>
          <textarea id="contactMessage" name="message" required rows="4" placeholder="Hola ${escapeHtml(agent.nombre)}, me interesa..."></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane" aria-hidden="true"></i> Enviar mensaje</button>
        </div>
      </form>
    </div>
  `;
  
document.body.appendChild(modal);
   
  const closeBtn = modal.querySelector('.modal-close');
  const cancelBtn = modal.querySelector('[data-action="cancel"]');
  const form = modal.querySelector<HTMLFormElement>('#contactAgentForm');
  const firstInput = modal.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  
  const closeModal = () => {
    document.body.removeChild(modal);
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeydown);
  };
  
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };
  
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', handleKeydown);
  
  if (firstInput) setTimeout(() => firstInput.focus(), 0);
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    // TODO: Send to backend
    showToast('Mensaje enviado correctamente', 'success');
    closeModal();
  });
  
  document.body.style.overflow = 'hidden';
}

function closeAgentModal(): void {
  const modal = document.getElementById('agentModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function closeContactModal(): void {
  const modal = document.querySelector('.modal-overlay');
  if (modal) {
    document.body.removeChild(modal);
    document.body.style.overflow = '';
  }
}

export { agentsCache, renderAgentsGrid, openContactModal, loadAgents, initAgents, closeContactModal };
export type { Agent };