// ================================================================
// CONFIRM MODAL - Shared Admin Module
// Reusable confirmation modal for delete actions
// ================================================================

const CONFIRM_MODAL_HTML = `
<div class="modal-overlay" id="confirmModal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle" hidden>
  <div class="modal modal-sm" role="document">
    <header class="modal-header">
      <h3 id="confirmTitle">Confirmar</h3>
    </header>
    <div class="modal-body">
      <p id="confirmMessage">¿Estás seguro?</p>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" id="confirmCancel">Cancelar</button>
      <button type="button" class="btn btn-danger" id="confirmOk">Confirmar</button>
    </div>
  </div>
</div>`;

let confirmModalContainer: HTMLElement | null = null;
let pendingDelete: { type: string | null; id: number | null; name: string | null; onConfirm: (() => void) | null } = { 
  type: null, id: null, name: null, onConfirm: null 
};

export function initConfirmModal(): void {
  if (document.getElementById('confirmModal')) return;
  
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="modal-overlay" id="confirmModal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle" hidden>
      <div class="modal modal-sm" role="document">
        <header class="modal-header">
          <h3 id="confirmTitle">Confirmar</h3>
        </header>
        <div class="modal-body">
          <p id="confirmMessage">¿Estás seguro?</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="confirmCancel">Cancelar</button>
          <button type="button" class="btn btn-danger" id="confirmOk">Confirmar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container.firstElementChild!);
  
  bindConfirmModalEvents();
}

function bindConfirmModalEvents(): void {
  const modal = document.getElementById('confirmModal')!;
  const cancelBtn = document.getElementById('confirmCancel')!;
  const confirmBtn = document.getElementById('confirmOk')!;
  
  const closeModal = () => {
    const modal = document.getElementById('confirmModal');
    modal?.classList.remove('active');
    modal?.setAttribute('hidden', '');
    pendingDelete = { type: null, id: null, name: null, onConfirm: null };
  };
  
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.getElementById('confirmCancel')?.addEventListener('click', closeModal);
  
  const confirmBtn = document.getElementById('confirmOk')!;
  confirmBtn.addEventListener('click', async () => {
    if (pendingDelete.onConfirm) {
      try {
        await pendingDelete.onConfirm();
      } catch (e) {
        console.error('Confirm action failed:', e);
      }
    }
    closeModal();
  });
}

export function showConfirmDialog(
  message: string, 
  onConfirm: () => Promise<void> | void
): void {
  const modal = document.getElementById('confirmModal')!;
  const messageEl = document.getElementById('confirmMessage')!;
  
  messageEl.textContent = message;
  modal.classList.add('active');
  modal.removeAttribute('hidden');
  
  // Store the confirm callback
  (window as any)._pendingConfirmAction = onConfirm;
  
  // Store for the event handler
  (window as any)._pendingConfirmResolve = () => {
    // This will be called by the confirm button
  };
}

export function confirmDelete(
  type: string, 
  id: number, 
  name: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const messageEl = document.getElementById('confirmMessage')!;
    const modal = document.getElementById('confirmModal')!;
    
    const typeLabel = type === 'property' ? 'propiedad' : 
                      type === 'agent' ? 'agente' : type;
    
    messageEl.textContent = `¿Eliminar ${typeLabel} "${name}"? Esta acción no se puede deshacer.`;
    modal.classList.add('active');
    modal.removeAttribute('hidden');
    
    // Store the resolve/reject functions
    (window as any)._pendingConfirmResolve = () => resolve();
    (window as any)._pendingConfirmReject = () => reject(new Error('Cancelled'));
  });
}

export function closeConfirmModal(): void {
  const modal = document.getElementById('confirmModal');
  modal?.classList.remove('active');
  modal?.setAttribute('hidden', '');
}

export function initConfirmModalInDOM(): void {
  if (!document.getElementById('confirmModal')) {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="modal-overlay" id="confirmModal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle" hidden>
        <div class="modal modal-sm" role="document">
          <header class="modal-header">
            <h3 id="confirmTitle">Confirmar</h3>
          </header>
          <div class="modal-body">
            <p id="confirmMessage">¿Estás seguro?</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="confirmCancel">Cancelar</button>
            <button type="button" class="btn btn-danger" id="confirmOk">Confirmar</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container.firstElementChild!);
    
    const modal = document.getElementById('confirmModal')!;
    const cancelBtn = document.getElementById('confirmCancel')!;
    const confirmBtn = document.getElementById('confirmOk')!;
    
    const closeModal = () => {
      modal.classList.remove('active');
      modal.setAttribute('hidden', '');
      (window as any)._pendingConfirmResolve = null;
      (window as any)._pendingConfirmReject = null;
    };
    
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.getElementById('confirmCancel')?.addEventListener('click', closeModal);
    document.getElementById('confirmOk')?.addEventListener('click', () => {
      if ((window as any)._pendingConfirmResolve) {
        (window as any)._pendingConfirmResolve();
      }
      closeModal();
    });
  }

export { closeConfirmModal };