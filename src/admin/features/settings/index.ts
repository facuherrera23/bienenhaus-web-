// ================================================================
// ADMIN SETTINGS FEATURE
// ================================================================
 
import { supabase } from '../../../supabase.js';
import { showToast } from '../../shared/utils.js';
import { loadProperties, propertiesCache } from '../properties/index.js';

async function loadGeneralSettings(): Promise<void> {
  try {
    const { data } = await supabase.from('contenido_sitio').select('clave, valor');
    const map: Record<string, any> = {};
    (data || []).forEach((d: any) => { map[d.clave] = d.valor; });

    // General
    (document.getElementById('siteName') as HTMLInputElement).value = map.site_nombre || '';
    (document.getElementById('siteTagline') as HTMLInputElement).value = map.site_eslogan || '';
    (document.getElementById('sitePhone') as HTMLInputElement).value = map.site_telefono || '';
    (document.getElementById('siteEmail') as HTMLInputElement).value = map.site_email || '';
    (document.getElementById('siteWhatsApp') as HTMLInputElement).value = map.site_whatsapp || '';
    (document.getElementById('siteAddress') as HTMLInputElement).value = map.site_direccion || '';
    (document.getElementById('siteHours') as HTMLInputElement).value = map.site_horario || '';
    // Flags
    (document.getElementById('maintenanceMode') as HTMLInputElement).checked = map.maintenance_mode_enabled === true;
    (document.getElementById('showPrices') as HTMLInputElement).checked = map.show_prices !== false;
    (document.getElementById('enableChat') as HTMLInputElement).checked = map.enable_chat !== false;
    (document.getElementById('enableNewsletter') as HTMLInputElement).checked = map.enable_newsletter !== false;
    // Contacto
    (document.getElementById('contactFormEnabled') as HTMLInputElement).checked = map.contact_form_enabled !== false;
    (document.getElementById('contactEmailTo') as HTMLInputElement).value = map.contact_email_to || '';
    (document.getElementById('contactSubject') as HTMLInputElement).value = map.contact_subject || '';
    (document.getElementById('contactSuccessMsg') as HTMLTextAreaElement).value = map.contact_success_msg || '';
    (document.getElementById('whatsappEnabled') as HTMLInputElement).checked = map.whatsapp_enabled !== false;
    (document.getElementById('whatsappNumber') as HTMLInputElement).value = map.whatsapp_number || '';
    (document.getElementById('whatsappMessage') as HTMLInputElement).value = map.whatsapp_message || '';
    // Social
    (document.getElementById('socialFacebook') as HTMLInputElement).value = map.social_facebook || '';
    (document.getElementById('socialInstagram') as HTMLInputElement).value = map.social_instagram || '';
    (document.getElementById('socialYouTube') as HTMLInputElement).value = map.social_youtube || '';
    (document.getElementById('socialTikTok') as HTMLInputElement).value = map.social_tiktok || '';
    (document.getElementById('socialLinkedIn') as HTMLInputElement).value = map.social_linkedin || '';
    (document.getElementById('socialTwitter') as HTMLInputElement).value = map.social_twitter || '';
    // Analytics
    (document.getElementById('gaId') as HTMLInputElement).value = map.ga_id || '';
    (document.getElementById('metaPixelId') as HTMLInputElement).value = map.meta_pixel_id || '';
    (document.getElementById('customHeadScripts') as HTMLTextAreaElement).value = map.custom_head_scripts || '';
  } catch (e) { console.warn('Load general settings:', e); }
}

async function loadMaintenanceState(): Promise<void> {
  const toggle = document.getElementById('maintenanceMode') as HTMLInputElement;
  if (!toggle) return;
  try {
    const { data } = await supabase.from('contenido_sitio').select('valor').eq('clave', 'maintenance_mode').single();
    if (data?.valor?.enabled === true) toggle.checked = true;
  } catch (e) { console.warn('Load maintenance state:', e); }
}

function initMaintenanceToggle(): void {
  const toggle = document.getElementById('maintenanceMode') as HTMLInputElement;
  if (!toggle) return;
  toggle.addEventListener('change', async (e: Event) => {
    const enabled = (e.target as HTMLInputElement).checked;
    if (enabled) {
      const confirmed = confirm('¿Confirmás activar el modo mantenimiento? El sitio público mostrará la página "Volvemos pronto".');
      if (!confirmed) { (e.target as HTMLInputElement).checked = false; return; }
    }
    const { error } = await supabase.from('contenido_sitio').upsert({
      clave: 'maintenance_mode',
      valor: { enabled, message: 'Volvemos pronto' },
      updated_at: new Date().toISOString()
    }, { onConflict: 'clave' });
    if (error) {
      showToast('Error al actualizar modo mantenimiento', 'error');
      (e.target as HTMLInputElement).checked = !enabled;
      return;
    }
    showToast(
      enabled ? '🔧 Modo mantenimiento activado' : '✅ Sitio restaurado',
      enabled ? 'warning' : 'success'
    );
  });

  document.getElementById('btnTestMaintenance')?.addEventListener('click', () => {
    window.open('/maintenance.html', '_blank');
  });
}

// ===== SAVE SETTINGS COMPLETO =====
export async function saveSettings(): Promise<void> {
  const btn = document.getElementById('btnSaveSettings') as HTMLButtonElement;
  if (!btn) return;
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const settings: Record<string, any> = {
      // General
      site_nombre: (document.getElementById('siteName') as HTMLInputElement)?.value || '',
      site_eslogan: (document.getElementById('siteTagline') as HTMLInputElement)?.value || '',
      site_telefono: (document.getElementById('sitePhone') as HTMLInputElement)?.value || '',
      site_email: (document.getElementById('siteEmail') as HTMLInputElement)?.value || '',
      site_whatsapp: (document.getElementById('siteWhatsApp') as HTMLInputElement)?.value || '',
      site_direccion: (document.getElementById('siteAddress') as HTMLInputElement)?.value || '',
      site_horario: (document.getElementById('siteHours') as HTMLInputElement)?.value || '',
      // Site flags
      maintenance_mode_enabled: (document.getElementById('maintenanceMode') as HTMLInputElement)?.checked || false,
      show_prices: (document.getElementById('showPrices') as HTMLInputElement)?.checked || false,
      enable_chat: (document.getElementById('enableChat') as HTMLInputElement)?.checked || false,
      enable_newsletter: (document.getElementById('enableNewsletter') as HTMLInputElement)?.checked || false,
      // Contacto
      contact_form_enabled: (document.getElementById('contactFormEnabled') as HTMLInputElement)?.checked || false,
      contact_email_to: (document.getElementById('contactEmailTo') as HTMLInputElement)?.value || '',
      contact_subject: (document.getElementById('contactSubject') as HTMLInputElement)?.value || '',
      contact_success_msg: (document.getElementById('contactSuccessMsg') as HTMLTextAreaElement)?.value || '',
      whatsapp_enabled: (document.getElementById('whatsappEnabled') as HTMLInputElement)?.checked || false,
      whatsapp_number: (document.getElementById('whatsappNumber') as HTMLInputElement)?.value || '',
      whatsapp_message: (document.getElementById('whatsappMessage') as HTMLInputElement)?.value || '',
      // Social
      social_facebook: (document.getElementById('socialFacebook') as HTMLInputElement)?.value || '',
      social_instagram: (document.getElementById('socialInstagram') as HTMLInputElement)?.value || '',
      social_youtube: (document.getElementById('socialYouTube') as HTMLInputElement)?.value || '',
      social_tiktok: (document.getElementById('socialTikTok') as HTMLInputElement)?.value || '',
      social_linkedin: (document.getElementById('socialLinkedIn') as HTMLInputElement)?.value || '',
      social_twitter: (document.getElementById('socialTwitter') as HTMLInputElement)?.value || '',
      // Analytics
      ga_id: (document.getElementById('gaId') as HTMLInputElement)?.value || '',
      meta_pixel_id: (document.getElementById('metaPixelId') as HTMLInputElement)?.value || '',
      custom_head_scripts: (document.getElementById('customHeadScripts') as HTMLTextAreaElement)?.value || ''
    };
    for (const [clave, valor] of Object.entries(settings)) {
      await supabase.from('contenido_sitio').upsert({ clave, valor }, { onConflict: 'clave' });
    }
    showToast('Configuración guardada correctamente', 'success');
  } catch (e) { console.error('saveSettings error:', e); showToast(`Error: ${e instanceof Error ? e.message : 'Error'}`, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar Configuración'; }
}

export async function loadSettings(): Promise<void> {
  try {
    const { data } = await supabase.from('ml_credenciales').select('*').order('updated_at', { ascending: false }).limit(1).single();
    updateMercadoLibreUI(data || null);
  } catch (e) { console.warn('Settings load:', e); }

  await loadGeneralSettings();
  await loadMaintenanceState();
  initMaintenanceToggle();
}

function updateMercadoLibreUI(creds: { ml_user_id: string; expires_at?: string } | null): void {
  const statusEl = document.getElementById('mlStatus');
  const connectBtn = document.getElementById('btnConnectML');
  const importBtn = document.getElementById('btnImportML');
  const syncBtn = document.getElementById('btnSyncML');
  const pauseBtn = document.getElementById('btnPauseAllML');

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
  } catch (e) { console.error('ML Connect error:', e); showToast(`Error: ${e instanceof Error ? e.message : 'Error'}`, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-link"></i> Conectar MercadoLibre'; }
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
  } catch (e) { console.error('ML Callback error:', e); showToast(`Error: ${e instanceof Error ? e.message : 'Error'}`, 'error'); }
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
  } catch (e) { console.error('ML Import error:', e); showToast(`Error: ${e instanceof Error ? e.message : 'Error'}`, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> Importar de ML'; }
}

async function syncPropertyToML(propertyId: number, action = 'publish'): Promise<void> {
  const prop = propertiesCache.find(p => p.id === propertyId);
  if (!prop) return;
  try {
    const { error } = await supabase.functions.invoke('ml-publish', { body: { propertyId, action } });
    if (error) throw error;
    showToast(`Propiedad ${action === 'publish' ? 'publicada' : action} en MercadoLibre`, 'success');
    await loadProperties(); await loadMLSyncLog();
  } catch (e) { console.error('ML Sync error:', e); showToast(`Error: ${e instanceof Error ? e.message : 'Error'}`, 'error'); }
}

async function loadMLSyncLog(): Promise<void> {
  const tbody = document.getElementById('mlSyncLogBody')!;
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Cargando historial...</td></tr>';
  try {
    const { data, error } = await supabase.from('ml_sync_log').select('*, propiedades(titulo)').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay historial de sincronización</td></tr>'; return; }
    tbody.innerHTML = data.map((log: any) => `
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
(window as any).handleMLCallback = handleMLCallback;