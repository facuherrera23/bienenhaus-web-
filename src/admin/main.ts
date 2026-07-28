// ================================================================
// ADMIN ENTRY POINT - Wires up all feature modules
// ================================================================
import '../styles/admin.css';
import { supabase } from '../supabase.js';
import { CONFIG } from '../config.js';
import { showToast, parsePipeArray, closeConfirmModal, formatDate } from './shared/utils.js';

// Feature modules (import eagerly so they register window functions)
import { loadProperties as loadPropertiesModule, propertiesCache, openPropertyModal as openPropertyModalFn, filterProperties as filterPropertiesFn } from './features/properties/index.js';
import { loadAgents as loadAgentsModule, agentsCache, openAgentModal, filterAgents as filterAgentsFn } from './features/agents/index.js';
import { loadMercadoLibre, connectMercadoLibre, importFromMercadoLibre } from './features/mercadoLibre/index.js';
import { loadSettings } from './features/settings/index.js';

// ================================================================
// AUTH SECURITY CONFIG
// ================================================================
const AUTH_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
  SESSION_TIMEOUT_MS: 30 * 60 * 1000,
  ACTIVITY_CHECK_INTERVAL_MS: 60 * 1000,
};

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
let currentUser: any = null;
let sessionTimer: number | null = null;
let lastActivity = Date.now();

// ================================================================
// CONTENT CACHE (for admin editor)
// ================================================================
let contentCache: Record<string, any> = {};

function getContentCache(): Record<string, any> { return contentCache; }
function setContentCache(cache: Record<string, any>): void { contentCache = cache; }

// ================================================================
// AUTH HELPERS
// ================================================================
function getClientIP(): string { return 'admin-panel'; }

function checkRateLimit(ip: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (!attempt) return { allowed: true };
  if (attempt.lockedUntil > now) return { allowed: false, remainingTime: attempt.lockedUntil - now };
  if (attempt.count >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = now + AUTH_CONFIG.LOCKOUT_DURATION_MS;
    loginAttempts.set(ip, attempt);
    return { allowed: false, remainingTime: AUTH_CONFIG.LOCKOUT_DURATION_MS };
  }
  return { allowed: true };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  attempt.count += 1;
  if (attempt.count >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = now + AUTH_CONFIG.LOCKOUT_DURATION_MS;
    showToast(`Demasiados intentos fallidos. Cuenta bloqueada por ${AUTH_CONFIG.LOCKOUT_DURATION_MS / 60000} minutos.`, 'error');
  }
  loginAttempts.set(ip, attempt);
}

function clearFailedAttempts(ip: string): void { loginAttempts.delete(ip); }

function startSessionTimer(): void {
  if (sessionTimer) clearInterval(sessionTimer);
  lastActivity = Date.now();
  sessionTimer = window.setInterval(() => {
    if (Date.now() - lastActivity >= AUTH_CONFIG.SESSION_TIMEOUT_MS) {
      clearInterval(sessionTimer!); sessionTimer = null;
      showToast('Sesión expirada por inactividad', 'warning');
      logout();
    }
  }, AUTH_CONFIG.ACTIVITY_CHECK_INTERVAL_MS);
}

function resetActivityTimer(): void { lastActivity = Date.now(); }

function setupActivityListeners(): void {
  ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
    document.addEventListener(event, resetActivityTimer, { passive: true });
  });
}

function removeActivityListeners(): void {
  ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
    document.removeEventListener(event, resetActivityTimer);
  });
}

// ================================================================
// AUTHENTICATION
// ================================================================
async function checkAuth(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user.email === CONFIG.ADMIN_EMAIL) {
    currentUser = session.user;
    showDashboard();
    return true;
  }
  showLogin();
  return false;
}

async function handleLogin(email: string, password: string): Promise<void> {
  const btn = document.getElementById('btnLogin') as HTMLButtonElement;
  const errorDiv = document.getElementById('loginError')!;
  const ip = getClientIP();
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    const mins = Math.ceil((rateLimit.remainingTime || 0) / 60000);
    errorDiv.textContent = `Demasiados intentos. Intenta en ${mins} minutos.`;
    errorDiv.classList.add('visible');
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, rateLimit.remainingTime || AUTH_CONFIG.LOCKOUT_DURATION_MS);
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
  errorDiv.classList.remove('visible');
  errorDiv.textContent = '';
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user.email !== CONFIG.ADMIN_EMAIL) {
      await supabase.auth.signOut();
      throw new Error('Acceso denegado: credenciales no autorizadas');
    }
    currentUser = data.user;
    clearFailedAttempts(ip);
    showDashboard();
  } catch (e: unknown) {
    recordFailedAttempt(ip);
    errorDiv.textContent = e instanceof Error ? e.message : 'Error desconocido';
    errorDiv.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Iniciar Sesión</span>';
  }
}

async function logout(): Promise<void> {
  await supabase.auth.signOut();
  currentUser = null;
  if (sessionTimer) { clearInterval(sessionTimer); sessionTimer = null; }
  removeActivityListeners();
  showLogin();
}

function showLogin(): void {
  document.getElementById('loginView')!.classList.remove('d-none');
  document.getElementById('dashboardView')!.classList.add('d-none');
  document.body.className = 'login-page';
  if (sessionTimer) { clearInterval(sessionTimer); sessionTimer = null; }
  removeActivityListeners();
}

function showDashboard(): void {
  document.getElementById('loginView')!.classList.add('d-none');
  document.getElementById('dashboardView')!.classList.remove('d-none');
  document.body.className = 'dashboard-page';
  if (currentUser) {
    document.getElementById('userName')!.textContent = currentUser.email.split('@')[0];
    document.getElementById('userAvatar')!.textContent = currentUser.email.split('@')[0].charAt(0).toUpperCase();
  }
  setupActivityListeners();
  startSessionTimer();
  loadAllData();
  navigate(window.location.hash.slice(1) || 'dashboard');
}

// ================================================================
// NAVIGATION
// ================================================================
function navigate(section: string): void {
  if (!section) section = 'dashboard';
  window.location.hash = section;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', (item as HTMLElement).dataset.section === section);
  });

  document.querySelectorAll('.settings-panel[id^="section-"]').forEach(panel => {
    panel.classList.toggle('active', panel.id === `section-${section}`);
  });

  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    properties: 'Propiedades',
    agents: 'Agentes',
    'settings-content': 'Textos del Sitio',
    settings: 'Configuración',
    mercadoLibre: 'MercadoLibre'
  };
  const title = titles[section] || 'Dashboard';
  const pageTitle = document.getElementById('pageTitle');
  const breadcrumb = document.getElementById('breadcrumbCurrent');
  if (pageTitle) pageTitle.textContent = title;
  if (breadcrumb) breadcrumb.textContent = title;

  switch (section) {
    case 'dashboard': loadDashboard(); break;
    case 'properties': loadPropertiesModule(); break;
    case 'agents': loadAgentsModule(); break;
    case 'settings-content': loadContentEditor(); break;
    case 'settings': loadSettings(); break;
    case 'mercadoLibre': loadMercadoLibre(); break;
  }
}

// ================================================================
// DATA LOADING
// ================================================================
async function loadAllData(): Promise<void> {
  await Promise.all([
    loadPropertiesModule(),
    loadAgentsModule(),
    loadContent()
  ]);
  updateNavBadges();
  loadDashboard();
}

function updateNavBadges(): void {
  const propBadge = document.getElementById('propCountBadge');
  const agentBadge = document.getElementById('agentCountBadge');
  if (propBadge) propBadge.textContent = String(propertiesCache.length);
  if (agentBadge) agentBadge.textContent = String(agentsCache.filter((a: any) => a.activo).length);
}

function loadDashboard(): void {
  const statProps = document.getElementById('statProperties');
  const statAgents = document.getElementById('statAgents');
  if (statProps) statProps.textContent = String(propertiesCache.length);
  if (statAgents) statAgents.textContent = String(agentsCache.filter((a: any) => a.activo).length);

  const recentBody = document.getElementById('recentActivityBody');
  if (recentBody) {
    const recentProps = propertiesCache.slice(0, 5);
    if (recentProps.length === 0) {
      recentBody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay actividad reciente</td></tr>';
    } else {
      recentBody.innerHTML = recentProps.map(p => `
        <tr>
          <td>${p.created_at ? formatDate(p.created_at) : '—'}</td>
          <td><span class="badge badge-${p.operacion === 'venta' ? 'sale' : 'rent'}">${p.operacion === 'venta' ? 'Venta' : 'Alquiler'}</span></td>
          <td>${p.titulo}</td>
          <td><span class="badge badge-active">Publicada</span></td>
        </tr>
      `).join('');
    }
  }
}

// ================================================================
// CONTENT EDITOR
// ================================================================
async function loadContent(): Promise<void> {
  try {
    const { data, error } = await supabase.from('contenido_sitio').select('*');
    if (error) { console.warn('contenido_sitio no accesible:', error.message); return; }
    const newCache: Record<string, any> = {};
    (data || []).forEach((item: any) => { newCache[item.clave] = item.valor; });
    setContentCache(newCache);
    populateContentEditor();
  } catch (e: unknown) { console.warn('Error loading content:', e); }
}

async function loadContentEditor(): Promise<void> {
  await loadContent();
}

function populateContentEditor(): void {
  const cache = getContentCache();
  const setVal = (id: string, val: any) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (el) {
      if (el.tagName === 'SELECT') el.value = val || '';
      else el.value = val || '';
    }
  };
  const setArray = (id: string, arr: any[], joiner = '\n') => {
    const el = document.getElementById(id) as HTMLTextAreaElement;
    if (el) {
      if (Array.isArray(arr)) el.value = arr.join(joiner);
      else if (typeof arr === 'string') el.value = arr;
      else el.value = '';
    }
  };
  const setPipeArray = (id: string, arr: any[], fields: string[]) => {
    const el = document.getElementById(id) as HTMLTextAreaElement;
    if (!el) return;
    if (Array.isArray(arr)) {
      el.value = arr.map((item: any) => fields.map(f => item[f] ?? '').join('|')).join('\n');
    } else if (typeof arr === 'string') {
      el.value = arr;
    } else {
      el.value = '';
    }
  };

  // Hero
  setVal('heroBadge', cache.hero_badge);
  setVal('heroTitle', cache.hero_titulo);
  setVal('heroSubtitle', cache.hero_subtitulo);
  setArray('heroBadges', cache.hero_badges);
  setVal('heroCtaPrimary', cache.hero_cta_primario);
  setVal('heroCtaSecondary', cache.hero_cta_secundario);
  setPipeArray('heroStats', cache.hero_stats, ['label', 'valor', 'icono']);

  // About
  setVal('aboutTitle', cache.about_titulo);
  setVal('aboutDescription', cache.about_descripcion);
  setPipeArray('aboutValues', cache.about_valores, ['icono', 'titulo', 'descripcion']);

  // Services
  setVal('servicesTitle', cache.servicios_titulo);
  setVal('servicesSubtitle', cache.servicios_subtitulo);
  setPipeArray('servicesList', cache.servicios_lista, ['icono', 'titulo', 'descripcion']);

  // Why
  setVal('whyTitle', cache.por_que_titulo);
  setVal('whySubtitle', cache.por_que_subtitulo);
  setPipeArray('whyReasons', cache.por_que_razones, ['emoji', 'titulo', 'descripcion']);

  // Team
  setVal('teamTitle', cache.equipo_titulo);
  setVal('teamSubtitle', cache.equipo_subtitulo);

  // Offices
  setVal('officesTitle', cache.oficinas_titulo);
  setVal('officesSubtitle', cache.oficinas_subtitulo);

  // Footer
  setVal('footerBrand', cache.footer_marca);
  setVal('footerDescription', cache.footer_descripcion);
  setVal('footerContact', cache.footer_contacto);
  setPipeArray('footerLinks', cache.footer_links, ['texto', 'url']);
  setPipeArray('footerServices', cache.footer_servicios, ['texto', 'url']);
  setVal('footerCopyright', cache.footer_copyright);

  // FAQ
  setVal('faqTitle', cache.faq_titulo);
  setVal('faqSubtitle', cache.faq_subtitulo);
  setPipeArray('faqGrid', cache.faq_grid, ['pregunta', 'respuesta']);

  // Contacto
  setVal('contactoTitle', cache.contacto_titulo);
  setVal('contactoSubtitle', cache.contacto_subtitulo);

  // SEO
  setVal('seoTitle', cache.seo_titulo);
  setVal('seoDescription', cache.seo_descripcion);
  setVal('seoKeywords', cache.seo_keywords);
  setVal('seoOgImage', cache.seo_og_image);
  setVal('seoTwitterCard', cache.seo_twitter_card);
  setVal('seoSchema', cache.seo_schema);
}

async function saveAllContent(): Promise<void> {
  const btn = document.getElementById('btnSaveAllContent') as HTMLButtonElement;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement)?.value || '';
    const content: Record<string, any> = {
      hero_badge: getVal('heroBadge'),
      hero_titulo: getVal('heroTitle'),
      hero_subtitulo: getVal('heroSubtitle'),
      hero_badges: getVal('heroBadges').split('\n').filter((b: string) => b.trim()),
      hero_cta_primario: getVal('heroCtaPrimary'),
      hero_cta_secundario: getVal('heroCtaSecondary'),
      hero_stats: parsePipeArray(getVal('heroStats'), ['label', 'valor', 'icono']),
      about_titulo: getVal('aboutTitle'),
      about_descripcion: getVal('aboutDescription'),
      about_valores: parsePipeArray(getVal('aboutValues'), ['icono', 'titulo', 'descripcion']),
      servicios_titulo: getVal('servicesTitle'),
      servicios_subtitulo: getVal('servicesSubtitle'),
      servicios_lista: parsePipeArray(getVal('servicesList'), ['icono', 'titulo', 'descripcion']),
      por_que_titulo: getVal('whyTitle'),
      por_que_subtitulo: getVal('whySubtitle'),
      por_que_razones: parsePipeArray(getVal('whyReasons'), ['emoji', 'titulo', 'descripcion']),
      equipo_titulo: getVal('teamTitle'),
      equipo_subtitulo: getVal('teamSubtitle'),
      oficinas_titulo: getVal('officesTitle'),
      oficinas_subtitulo: getVal('officesSubtitle'),
      footer_marca: getVal('footerBrand'),
      footer_descripcion: getVal('footerDescription'),
      footer_contacto: getVal('footerContact'),
      footer_links: parsePipeArray(getVal('footerLinks'), ['texto', 'url']),
      footer_servicios: parsePipeArray(getVal('footerServices'), ['texto', 'url']),
      footer_copyright: getVal('footerCopyright'),
      faq_titulo: getVal('faqTitle'),
      faq_subtitulo: getVal('faqSubtitle'),
      faq_grid: parsePipeArray(getVal('faqGrid'), ['pregunta', 'respuesta']),
      contacto_titulo: getVal('contactoTitle'),
      contacto_subtitulo: getVal('contactoSubtitle'),
      seo_titulo: getVal('seoTitle'),
      seo_descripcion: getVal('seoDescription'),
      seo_keywords: getVal('seoKeywords'),
      seo_og_image: getVal('seoOgImage'),
      seo_twitter_card: getVal('seoTwitterCard'),
      seo_schema: getVal('seoSchema')
    };

    for (const [clave, valor] of Object.entries(content)) {
      await supabase.from('contenido_sitio').upsert({ clave, valor }, { onConflict: 'clave' });
    }
    showToast('Contenido guardado correctamente', 'success');
    await loadContent();
  } catch (e: unknown) {
    console.error('saveAllContent error:', e);
    showToast(`Error: ${e instanceof Error ? e.message : 'Error al guardar contenido'}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar Todo';
  }
}

// ================================================================
// SETUP EVENT LISTENERS
// ================================================================
function setupEventListeners(): void {
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const email = (document.getElementById('adminEmail') as HTMLInputElement).value;
      const password = (document.getElementById('adminPassword') as HTMLInputElement).value;
      handleLogin(email, password);
    });
  }

  // Logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', logout);

  // Navigation
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const section = (item as HTMLElement).dataset.section;
      if (section) navigate(section);
    });
  });

  // New Property button
  const btnNewProperty = document.getElementById('btnNewProperty');
  if (btnNewProperty) {
    btnNewProperty.addEventListener('click', () => openPropertyModalFn());
  }

  // New Agent button
  const btnNewAgent = document.getElementById('btnNewAgent');
  if (btnNewAgent) {
    btnNewAgent.addEventListener('click', () => openAgentModal());
  }

  // Save Content button
  const btnSaveContent = document.getElementById('btnSaveAllContent');
  if (btnSaveContent) {
    btnSaveContent.addEventListener('click', saveAllContent);
  }

  // Save Settings button
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', saveSettings);
  }

  // Refresh stats
  const btnRefresh = document.getElementById('btnRefreshStats');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => { loadAllData(); showToast('Datos actualizados', 'success'); });
  }

  // Search properties
  const searchProps = document.getElementById('searchProperties');
  if (searchProps) {
    searchProps.addEventListener('input', () => filterPropertiesFn());
  }

  // Search agents
  const searchAgents = document.getElementById('searchAgents');
  if (searchAgents) {
    searchAgents.addEventListener('input', () => filterAgentsFn());
  }

  // Confirm modal buttons
  const btnConfirmYes = document.getElementById('btnConfirmYes');
  if (btnConfirmYes) btnConfirmYes.addEventListener('click', async () => { await executeDelete(); loadAllData(); });

  const btnConfirmNo = document.getElementById('btnConfirmNo');
  if (btnConfirmNo) btnConfirmNo.addEventListener('click', closeConfirmModal);

  const closeConfirm = document.getElementById('closeConfirmModal');
  if (closeConfirm) closeConfirm.addEventListener('click', closeConfirmModal);

  // ML buttons
  const btnConnectML = document.getElementById('btnConnectML');
  if (btnConnectML) btnConnectML.addEventListener('click', connectMercadoLibre);

  const btnImportML = document.getElementById('btnImportML');
  if (btnImportML) btnImportML.addEventListener('click', importFromMercadoLibre);

  // Settings tabs
  document.querySelectorAll('#section-settings .settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#section-settings .settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('#section-settings .settings-panel[id^="panel-"]').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById(`panel-${(tab as HTMLElement).dataset.tab}`);
      if (panel) panel.classList.add('active');
    });
  });

  // Content tabs
  document.querySelectorAll('#section-settings-content .settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#section-settings-content .settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('#section-settings-content .settings-panel[id^="panel-"]').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById(`panel-${(tab as HTMLElement).dataset.tab}`);
      if (panel) panel.classList.add('active');
    });
  });

  // Property modal tabs
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const modal = tab.closest('.modal');
      if (!modal) return;
      modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      modal.querySelectorAll('.modal-tabpanel').forEach(p => { p.classList.remove('active'); (p as HTMLElement).hidden = true; });
      tab.classList.add('active');
      const panel = modal.querySelector(`#panel-${(tab as HTMLElement).dataset.tab}`) as HTMLElement;
      if (panel) { panel.classList.add('active'); panel.hidden = false; }
    });
  });

  // Close modals
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  });

  // Sidebar toggle for mobile
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  // Maintenance test button
  const btnMaintenance = document.getElementById('btnTestMaintenance');
  if (btnMaintenance) {
    btnMaintenance.addEventListener('click', () => window.open('/maintenance.html', '_blank'));
  }

  // Hash-based navigation
  window.addEventListener('hashchange', () => {
    const section = window.location.hash.slice(1) || 'dashboard';
    navigate(section);
  });
}

// ================================================================
// SAVE SETTINGS
// ================================================================
async function saveSettings(): Promise<void> {
  const btn = document.getElementById('btnSaveSettings') as HTMLButtonElement;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  try {
    const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || '';
    const getChecked = (id: string) => (document.getElementById(id) as HTMLInputElement)?.checked || false;

    const settingsData = {
      clave: 'site_settings',
      valor: {
        nombre: getVal('siteName'),
        eslogan: getVal('siteTagline'),
        telefono: getVal('sitePhone'),
        email: getVal('siteEmail'),
        whatsapp: getVal('siteWhatsApp'),
        direccion: getVal('siteAddress'),
        horario: getVal('siteHours'),
        maintenance_mode: getChecked('maintenanceMode'),
        show_prices: getChecked('showPrices'),
        enable_chat: getChecked('enableChat'),
        enable_newsletter: getChecked('enableNewsletter'),
        social: {
          facebook: getVal('socialFacebook'),
          instagram: getVal('socialInstagram'),
          youtube: getVal('socialYouTube'),
          tiktok: getVal('socialTikTok'),
          linkedin: getVal('socialLinkedIn'),
          twitter: getVal('socialTwitter'),
        },
        contact: {
          form_enabled: getChecked('contactFormEnabled'),
          email_to: getVal('contactEmailTo'),
          subject: getVal('contactSubject'),
          success_msg: getVal('contactSuccessMsg'),
          whatsapp_enabled: getChecked('whatsappEnabled'),
          whatsapp_number: getVal('whatsappNumber'),
          whatsapp_message: getVal('whatsappMessage'),
        },
        analytics: {
          ga_id: getVal('gaId'),
          meta_pixel_id: getVal('metaPixelId'),
          custom_head_scripts: getVal('customHeadScripts'),
        }
      }
    };

    await supabase.from('contenido_sitio').upsert(settingsData, { onConflict: 'clave' });
    showToast('Configuración guardada correctamente', 'success');
  } catch (e: unknown) {
    showToast(`Error: ${e instanceof Error ? e.message : 'Error al guardar'}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar Configuración';
  }
}

// ================================================================
// INIT
// ================================================================

// Override confirmDelete to handle both properties and agents
(window as any).confirmDelete = (type: string, id: number, name: string): void => {
  if (confirm(`¿Eliminar ${type === 'property' ? 'propiedad' : 'agente'} "${name}"? Esta acción no se puede deshacer.`)) {
    if (type === 'property') {
      (window as any).bulkDelete();
    } else if (type === 'agent') {
      supabase.from('agentes').update({ activo: false }).eq('id', id).then(({ error }: any) => {
        if (error) { showToast('Error al eliminar agente', 'error'); return; }
        showToast('Agente eliminado correctamente', 'success');
        loadAgentsModule();
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkAuth();
});
