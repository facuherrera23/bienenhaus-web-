// ================================================================
// ADMIN SHARED UTILITIES
// ================================================================
import { escapeHtml } from '../../utils/sanitize.ts';
import { trapFocus } from '../../utils/focusTrap.ts';
import { logError } from '../../utils/logger.ts';

let activeFocusTrapCleanup: (() => void) | null = null;

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', duration = 4000): void {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const colors = { success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)', info: 'var(--accent)' };

  toast.style.cssText = `
    background: white;
    border-left: 4px solid ${colors[type]};
    padding: 16px 20px;
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    max-width: 400px;
    animation: slideInRight 0.3s ease;
  `;
  toast.innerHTML = `<i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 1.2rem;"></i><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function getInitials(name: string): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function parsePipeArray(value: string, fields: string[]): Record<string, string>[] {
  if (!value) return [];
  return value.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.split('|');
      const obj: Record<string, string> = {};
      fields.forEach((field, i) => { obj[field] = parts[i]?.trim() || ''; });
      return obj;
    });
}

// Modal utilities
let pendingDelete: { type: string | null; id: number | null; name: string | null } = { type: null, id: null, name: null };

export function confirmDelete(type: string, id: number, name: string): void {
  pendingDelete = { type, id, name };
  const messageEl = document.getElementById('deleteConfirmMessage');
  if (messageEl) messageEl.textContent = `¿Eliminar "${name}"? Esta acción no se puede deshacer.`;
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) {
    modal.classList.add('active');
    activeFocusTrapCleanup = trapFocus(modal);
  }
}

export function closeConfirmModal(): void {
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) modal.classList.remove('active');
  if (activeFocusTrapCleanup) { activeFocusTrapCleanup(); activeFocusTrapCleanup = null; }
  pendingDelete = { type: null, id: null, name: null };
}

export async function executeDelete(): Promise<void> {
  const { type, id } = pendingDelete;
  if (!type || !id) return;

  try {
    if (type === 'property') {
      const { data: images } = await import('../../supabase.ts').then(m => m.supabase
        .from('imagenes').select('cloudinary_public_id').eq('propiedad_id', id));
      
      if (images?.length) {
        const publicIds = images
          .filter(img => img.cloudinary_public_id)
          .map(img => img.cloudinary_public_id!);
        
        if (publicIds.length > 0) {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL?.replace(/\.supabase\.co.*/, '')}.supabase.co/functions/v1/cloudinary-delete`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ public_ids: publicIds }),
              });
            
            if (!response.ok) {
              const errorData = await response.json();
              console.warn('Cloudinary delete warning:', errorData);
            }
          } catch (e) {
            console.warn('Cloudinary delete failed (non-blocking):', e);
          }
        }
      }
      
      const { error } = await import('../../supabase.ts').then(m => m.supabase
        .from('propiedades').delete().eq('id', id));
      if (error) throw error;
      // Reload will be handled by caller
    } else if (type === 'agent') {
      const { error } = await import('../../supabase.ts').then(m => m.supabase
        .from('agentes').update({ activo: false }).eq('id', id));
      if (error) throw error;
    }
    showToast('Eliminado correctamente', 'success');
    closeConfirmModal();
  } catch (e) {
    logError('executeDelete error', e, 'admin-shared');
    showToast('Error al eliminar', 'error');
  }
}

// Make available globally for inline onclick
(window as any).confirmDelete = confirmDelete;
(window as any).closeConfirmModal = closeConfirmModal;
(window as any).executeDelete = executeDelete;