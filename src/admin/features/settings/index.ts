// ================================================================
// ADMIN SETTINGS FEATURE
// ================================================================
import { supabase } from '../../../supabase.js';
import { CONFIG } from '../../../config.js';
import { showToast } from '../../shared/utils.js';

export async function loadSettings(): Promise<void> {
  try {
    const { data } = await supabase.from('ml_credenciales').select('*').order('updated_at', { ascending: false }).limit(1).single();
    updateMercadoLibreUI(data || null);
  } catch (e) { console.warn('Settings load:', e); }
}

function updateMercadoLibreUI(creds: any): void {
  const statusEl = document.getElementById('mlStatus');
  const connectBtn = document.getElementById('btnConnectML');
  const importBtn = document.getElementById('btnImportML');
  const syncBtn = document.getElementById('btnSyncML');
  const pauseBtn = document.getElementById('btnPauseAllML');
  const activateBtn = document.getElementById('btnActivateAllML');

  if (statusEl) {
    if (creds) {
      const exp = creds.expires_at ? new Date(creds.expires_at).toLocaleString('es-AR') : 'desconocido';
      statusEl.innerHTML = `<span class="badge badge-active">Conectado</span> <small>Usuario: ${creds.ml_user_id} · Expira: ${exp}</small>`;
      if (connectBtn) connectBtn.style.display = 'none';
      if (importBtn) importBtn.style.display = 'inline-flex';
      if (syncBtn) syncBtn.style.display = 'inline-flex';
      if (pauseBtn) pauseBtn.style.display = 'inline-flex';
    } else {
      statusEl.innerHTML = `<span class="badge badge-inactive">Desconectado</span>`;
      if (connectBtn) connectBtn.style.display = 'inline-flex';
      if (importBtn) importBtn.style.display = 'none';
      if (syncBtn) syncBtn.style.display = 'none';
      if (pauseBtn) pauseBtn.style.display = 'none';
    }
  }
}

async function connectMercadoLibre(): Promise<void> {
  const btn = document.getElementById('btnConnectML')!;
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
  try {
    const { data, error } = await supabase.functions.invoke('ml-oauth-callback', { body: {} });
    if (error) throw error;
    if (data.authUrl) {
      const state = data.state;
      sessionStorage.setItem('ml_oauth_state', state);
      window.location.href = data.authUrl;
    }
  } catch (e) { console.error('ML Connect error:', e); showToast(`Error: ${e.message}`, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-link"></i> Conectar MercadoLibre'; }
}

async function handleMLCallback(): Promise<void> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const storedState = sessionStorage.getItem('ml_oauth_state');
  if (!code || !state || state !== storedState) { showToast('Error de autenticación: estado inválido', 'error'); return; }
  sessionStorage.removeItem('ml_oauth_state');
  showToast('Completando conexión...', 'info');
  try {
    const { data, error } = await supabase.functions.invoke('ml-oauth-callback', { body: { code, state } });
    if (error) throw error;
    if (data.success) {
      showToast('¡Cuenta de MercadoLibre conectada!', 'success');
      updateMercadoLibreUI({ ml_user_id: data.user_id, expires_at: data.expires_at });
    } else throw new Error(data.error || 'Error desconocido');
  } catch (e) { console.error('ML Callback error:', e); showToast(`Error: ${e.message}`, 'error'); }
}

async function importFromMercadoLibre(): Promise<void> {
  const btn = document.getElementById('btnImportML')!;
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
  try {
    showToast('Importando propiedades de MercadoLibre...', 'info');
    const { data, error } = await supabase.functions.invoke('ml-import', { body: {} });
    if (error) throw error;
    showToast(`Importación completada: ${data.imported} nuevas, ${data.updated} actualizadas, ${data.errors} errores`, 'success');
    await loadProperties(); await loadMLSyncLog();
  } catch (e) { console.error('ML Import error:', e); showToast(`Error: ${e.message}`, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> Importar de ML'; }
}

async function syncPropertyToML(propertyId: number, action = 'publish'): Promise<void> {
  const prop = propertiesCache.find(p => p.id === propertyId);
  if (!prop) return;
  try {
    const { data, error } = await supabase.functions.invoke('ml-publish', { body: { propertyId, action } });
    if (error) throw error;
    showToast(`Propiedad ${action === 'publish' ? 'publicada' : action} en MercadoLibre`, 'success');
    await loadProperties(); await loadMLSyncLog();
  } catch (e) { console.error('ML Sync error:', e); showToast(`Error: ${e.message}`, 'error'); }
}

async function loadMLSyncLog(): Promise<void> {
  const tbody = document.getElementById('mlSyncLogBody')!;
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Cargando historial...</td></tr>';
  try {
    const { data, error } = await supabase.from('ml_sync_log').select('*, propiedades(titulo)').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay historial de sincronización</td></tr>'; return; }
    tbody.innerHTML = data.map(log => `
      <tr>
        <td>${new Date(log.created_at).toLocaleString('es-AR')}</td>
        <td>${log.propiedades?.titulo || 'N/A'}</td>
        <td><span class="badge badge-${log.accion === 'error' ? 'danger' : log.accion === 'import' ? 'info' : 'success'}">${log.accion}</span></td>
        <td>${log.ml_item_id || '—'}</td>
        <td>${log.detalle ? JSON.stringify(log.detalle).substring(0, 100) : '—'}</td>
      </tr>
    `).join('');
  } catch (e) { console.error('Load ML Sync Log error:', e); tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Error cargando historial</td></tr>'; }
}

(window as any).connectMercadoLibre = connectMercadoLibre;
(window as any).importFromMercadoLibre = importFromMercadoLibre;
(window as any).syncPropertyToML = syncPropertyToML;

export { loadSettings as loadMLSettings, connectMercadoLibre, handleMLCallback, importFromMercadoLibre, syncPropertyToML, loadMLSyncLog };