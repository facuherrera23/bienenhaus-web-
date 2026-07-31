// ================================================================
// AGENT MODAL - Admin Feature Module
// Dynamic creation/management of agent modal
// ================================================================

const AGENT_MODAL_HTML = `
<div class="modal-overlay" id="agentModal" role="dialog" aria-modal="true" aria-labelledby="agentModalTitle" hidden>
  <div class="modal" role="document">
    <header class="modal-header">
      <h3 id="agentModalTitle">Nuevo Agente</h3>
      <button type="button" class="modal-close" aria-label="Cerrar">&times;</button>
    </header>
    <form class="modal-form" id="agentForm">
      <input type="hidden" name="id" id="agentId">
      <div class="form-row">
        <div class="form-group">
          <label for="agentName">Nombre *</label>
          <input type="text" id="agentName" name="nombre" required>
        </div>
        <div class="form-group">
          <label for="agentEmail">Email *</label>
          <input type="email" id="agentEmail" name="email" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="agentPhone">Teléfono</label>
          <input type="tel" id="agentPhone" name="telefono">
        </div>
        <div class="form-group">
          <label for="agentSpecialty">Especialidad</label>
          <input type="text" id="agentSpecialty" name="especialidad" placeholder="Ej: Zona Norte, Venta, Alquiler">
        </div>
      </div>
      <div class="form-group">
        <label for="agentAvatar">Avatar</label>
        <div class="avatar-upload" id="agentAvatarUpload">
          <input type="file" id="agentAvatarFile" name="avatar" accept="image/*" hidden>
          <div class="avatar-preview" id="agentAvatarPreview">
            <i class="fas fa-user"></i>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="agentAvatarBtn">Seleccionar imagen</button>
        </div>
      </div>
      <div class="checkbox-group">
        <label><input type="checkbox" name="activo" value="1" checked> Activo</label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-action="cancel-agent">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Agente</button>
      </div>
    </form>
  </div>
</div>`;

let agentModalContainer: HTMLElement | null = null;

export function initAgentModal(): void {
  if (document.getElementById('agentModal')) return;
  
  const container = document.createElement('div');
  container.innerHTML = AGENT_MODAL_HTML;
  document.body.appendChild(container.firstElementChild!);
  
  bindAgentModalEvents();
}

function bindAgentModalEvents(): void {
  const modal = document.getElementById('agentModal')!;
  const form = document.getElementById('agentForm') as HTMLFormElement;
  const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('[data-action="cancel-agent"]') as HTMLButtonElement;
  const avatarBtn = document.getElementById('agentAvatarBtn') as HTMLButtonElement;
  const avatarInput = document.getElementById('agentAvatarFile') as HTMLInputElement;
  const avatarPreview = document.getElementById('agentAvatarPreview')!;
  
  const closeModal = () => {
    const modal = document.getElementById('agentModal');
    modal?.classList.remove('active');
    modal?.setAttribute('hidden', '');
    document.getElementById('agentForm')?.reset();
    const preview = document.getElementById('agentAvatarPreview')!;
    preview.innerHTML = '<i class="fas fa-user"></i>';
    preview.style.background = 'var(--admin-color-surface-hover)';
    preview.style.color = 'var(--admin-color-text-muted)';
  };
  
  const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;
  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  
  const cancelBtn = modal.querySelector('[data-action="cancel-agent"]') as HTMLButtonElement;
  cancelBtn?.addEventListener('click', closeModal);
  
  // Avatar upload
  const avatarBtn = document.getElementById('agentAvatarBtn') as HTMLButtonElement;
  const avatarInput = document.getElementById('agentAvatarFile') as HTMLInputElement;
  const preview = document.getElementById('agentAvatarPreview')!;
  
  avatarBtn?.addEventListener('click', () => {
    const input = document.getElementById('agentAvatarFile') as HTMLInputElement;
    input?.click();
  });
  
  const fileInput = document.getElementById('agentAvatarFile') as HTMLInputElement;
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const preview = document.getElementById('agentAvatarPreview')!;
      preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
      preview.style.background = 'none';
      preview.style.color = 'transparent';
    }
  });
  
  // Form submission - handled by agents feature module
  form?.addEventListener('submit', handleAgentFormSubmit);
  
  function handleAgentFormSubmit(e: Event) {
    // Will be overridden by agents module
  }
}

export function openAgentModal(agent: any = null): void {
  const modal = document.getElementById('agentModal')!;
  const form = document.getElementById('agentForm') as HTMLFormElement;
  const title = document.getElementById('agentModalTitle')!;
  
  form?.reset();
  const preview = document.getElementById('agentAvatarPreview')!;
  preview.innerHTML = '<i class="fas fa-user"></i>';
  preview.style.background = 'var(--admin-color-surface-hover)';
  preview.style.color = 'var(--admin-color-text-muted)';
  
  if (agent) {
    document.getElementById('agentModalTitle')!.textContent = 'Editar Agente';
    (document.getElementById('agentId') as HTMLInputElement).value = String(agent.id);
    (document.getElementById('agentName') as HTMLInputElement).value = agent.nombre || '';
    (document.getElementById('agentSurname') as HTMLInputElement).value = agent.apellido || '';
    (document.getElementById('agentEmail') as HTMLInputElement).value = agent.email || '';
    (document.getElementById('agentPhone') as HTMLInputElement).value = agent.telefono || '';
    (document.getElementById('agentSpecialty') as HTMLInputElement).value = agent.especialidad || '';
    (document.getElementById('agentDescription') as HTMLTextAreaElement).value = agent.descripcion || '';
    (document.getElementById('agentOrder') as HTMLInputElement).value = String(agent.orden || 99);
    (document.getElementById('agentActive') as HTMLInputElement).checked = agent.activo !== false;
    if (agent.avatar_url) {
      const preview = document.getElementById('agentAvatarPreview')!;
      preview.innerHTML = `<img src="${agent.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`;
      preview.style.background = 'none';
      preview.style.color = 'transparent';
    }
  } else {
    document.getElementById('agentModalTitle')!.textContent = 'Nuevo Agente';
    (document.getElementById('agentId') as HTMLInputElement).value = '';
    (document.getElementById('agentActive') as HTMLInputElement).checked = true;
  }
  
  const modal = document.getElementById('agentModal')!;
  modal.classList.add('active');
  modal.removeAttribute('hidden');
}

export function closeAgentModal(): void {
  const modal = document.getElementById('agentModal');
  modal?.classList.remove('active');
  modal?.setAttribute('hidden', '');
  document.getElementById('agentForm')?.reset();
  const preview = document.getElementById('agentAvatarPreview')!;
  preview.innerHTML = '<i class="fas fa-user"></i>';
  preview.style.background = 'var(--admin-color-surface-hover)';
  preview.style.color = 'var(--admin-color-text-muted)';
}

export function initAgentModalInDOM(): void {
  if (!document.getElementById('agentModal')) {
    initAgentModal();
  }
}

export { openAgentModal, closeAgentModal };