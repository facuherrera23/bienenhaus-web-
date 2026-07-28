// ================================================================
// ADMIN ENTRY POINT - Code-split with lazy loading
// ================================================================
import '../styles/admin.css';
import { supabase } from '../supabase.js';
import { CONFIG } from '../config.js';
import { showToast, parsePipeArray } from './shared/utils.ts';

// ================================================================
// LAZY LOAD FEATURE MODULES
// ================================================================
async function loadSettings(): Promise<void> {
  const settingsModule = await import('./features/settings/index.ts');
  await settingsModule.loadSettings();
}

// ================================================================
// AUTH SECURITY CONFIG
// ================================================================
const AUTH_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  ACTIVITY_CHECK_INTERVAL_MS: 60 * 1000, // Check every minute
};

// In-memory login attempt tracking (persists during session)
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

// ================================================================
// GLOBAL STATE
// ================================================================
let currentUser: any = null;
let propertiesCache: any[] = [];
let agentsCache: any[] = [];
const selectedPropertyIds = new Set<number>();
let sessionTimer: number | null = null;
let lastActivity = Date.now();

// ================================================================
// AUTH HELPERS: Rate limiting & Session management
// ================================================================
function getClientIP(): string {
  // In production, get from Supabase Edge Function headers or Cloudflare
  return 'admin-panel'; // Fallback for client-side
}

function checkRateLimit(ip: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  
  if (!attempt) return { allowed: true };
  
  if (attempt.lockedUntil > now) {
    return { allowed: false, remainingTime: attempt.lockedUntil - now };
  }
  
  // Reset count if lockout expired
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

function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

// Session timeout management
function startSessionTimer(): void {
  if (sessionTimer) clearInterval(sessionTimer);
  
  lastActivity = Date.now();
  
  sessionTimer = window.setInterval(() => {
    const inactiveTime = Date.now() - lastActivity;
    if (inactiveTime >= AUTH_CONFIG.SESSION_TIMEOUT_MS) {
      clearInterval(sessionTimer!);
      sessionTimer = null;
      showToast('Sesión expirada por inactividad', 'warning');
      logout();
    }
  }, AUTH_CONFIG.ACTIVITY_CHECK_INTERVAL_MS);
}

function resetActivityTimer(): void {
  lastActivity = Date.now();
}

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
// AUTHENTICATION (with rate limiting & session timeout)
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

  // Check rate limit
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
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
  removeActivityListeners();
  showLogin();
}

function showLogin(): void {
  document.getElementById('loginView')!.classList.remove('d-none');
  document.getElementById('dashboardView')!.classList.add('d-none');
  document.body.className = 'login-page';
  // Clear any existing session timer
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
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
  
  loadDashboard();
  loadAllData();
}

// ================================================================
// NAVIGATION
// ================================================================
function navigate(section: string): void {
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
  document.getElementById('pageTitle')!.textContent = titles[section] || 'Dashboard';
  document.getElementById('breadcrumbCurrent')!.textContent = titles[section] || 'Dashboard';

  switch (section) {
    case 'dashboard': loadDashboard(); break;
    case 'properties': loadProperties(); break;
    case 'agents': loadAgents(); break;
    case 'settings-content': loadContentEditor(); break;
    case 'settings': loadSettings(); break;
    case 'mercadoLibre': loadMercadoLibre(); break;
  }
}

// ================================================================
// DATA LOADING
// ================================================================
async function loadAllData(): Promise<void> {
  await Promise.all([loadProperties(), loadAgents(), loadContent()]);
}

async function loadProperties(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('propiedades')
      .select('*, imagenes(url, cloudinary_public_id, orden, es_principal)')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        throw new Error('Error de permisos (RLS): Verifica que la service_role key esté configurada en Edge Functions');
      }
      throw error;
    }
    propertiesCache = (data || []).map((p: any) => ({
      ...p,
      imagenes: p.imagenes || [],
      imagen_principal: p.imagenes?.find((i: any) => i.es_principal)?.url || null,
      galeria: p.imagenes?.sort((a: any, b: any) => a.orden - b.orden).map((i: any) => i.url) || []
    }));

    updatePropertyStats();
    renderPropertiesTable();
    updateNavBadges();
  } catch (e: unknown) {
    console.error('Error loading properties:', e);
    const msg = e instanceof Error && (e.message.includes('RLS') || e.message.includes('42501'))
      ? 'Error de permisos (RLS): Configura service_role key en Edge Functions'
      : 'Error cargando propiedades';
    showToast(msg, 'error');
  }
}

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
  } catch (e: unknown) {
    console.error('Error loading agents:', e);
    showToast('Error cargando agentes', 'error');
  }
}

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

// Import content cache functions
let contentCache: Record<string, any> = {};

function getContentCache(): Record<string, any> {
  return contentCache;
}

function setContentCache(cache: Record<string, any>): void {
  contentCache = cache;
}

// ================================================================
// CONTENT EDITOR
// ================================================================
function populateContentEditor(): void {
  const cache = getContentCache();
  // Hero
  (document.getElementById('heroBadge') as HTMLInputElement).value = cache.hero_badge || '';
  (document.getElementById('heroTitle') as HTMLTextAreaElement).value = cache.hero_titulo || '';
  (document.getElementById('heroSubtitle') as HTMLTextAreaElement).value = cache.hero_subtitulo || '';
  (document.getElementById('heroBadges') as HTMLTextAreaElement).value = (cache.hero_badges || []).join('\n');
  (document.getElementById('heroCtaPrimary') as HTMLInputElement).value = cache.hero_cta_primario || '';
  (document.getElementById('heroCtaSecondary') as HTMLInputElement).value = cache.hero_cta_secundario || '';
  (document.getElementById('heroStats') as HTMLTextAreaElement).value = (cache.hero_stats || []).map((s: any) => `${s.label}|${s.valor}|${s.icono}`).join('\n');

  // About
  (document.getElementById('aboutTitle') as HTMLInputElement).value = cache.about_titulo || '';
  (document.getElementById('aboutDescription') as HTMLTextAreaElement).value = cache.about_descripcion || '';
  (document.getElementById('aboutValues') as HTMLTextAreaElement).value = (cache.about_valores || []).map((v: any) => `${v.icono}|${v.titulo}|${v.descripcion}`).join('\n');

  // Services
  (document.getElementById('servicesTitle') as HTMLInputElement).value = cache.servicios_titulo || '';
  (document.getElementById('servicesSubtitle') as HTMLInputElement).value = cache.servicios_subtitulo || '';
  (document.getElementById('servicesList') as HTMLTextAreaElement).value = (cache.servicios_lista || []).map((s: any) => `${s.icono}|${s.titulo}|${s.descripcion}`).join('\n');

  // Why
  (document.getElementById('whyTitle') as HTMLInputElement).value = cache.por_que_titulo || '';
  (document.getElementById('whySubtitle') as HTMLInputElement).value = cache.por_que_subtitulo || '';
  (document.getElementById('whyReasons') as HTMLTextAreaElement).value = (cache.por_que_razones || []).map((r: any) => `${r.emoji}|${r.titulo}|${r.descripcion}`).join('\n');

  // Team
  (document.getElementById('teamTitle') as HTMLInputElement).value = cache.equipo_titulo || '';
  (document.getElementById('teamSubtitle') as HTMLInputElement).value = cache.equipo_subtitulo || '';

  // Offices
  (document.getElementById('officesTitle') as HTMLInputElement).value = cache.oficinas_titulo || '';
  (document.getElementById('officesSubtitle') as HTMLInputElement).value = cache.oficinas_subtitulo || '';

  // Footer
  (document.getElementById('footerBrand') as HTMLInputElement).value = cache.footer_marca || '';
  (document.getElementById('footerDescription') as HTMLTextAreaElement).value = cache.footer_descripcion || '';
  (document.getElementById('footerContact') as HTMLInputElement).value = cache.footer_contacto || '';
  (document.getElementById('footerLinks') as HTMLTextAreaElement).value = (cache.footer_links || []).map((l: any) => `${l.texto}|${l.url}`).join('\n');
  (document.getElementById('footerServices') as HTMLTextAreaElement).value = (cache.footer_servicios || []).map((s: any) => `${s.texto}|${s.url}`).join('\n');
  (document.getElementById('footerCopyright') as HTMLInputElement).value = cache.footer_copyright || '';

  // FAQ
  (document.getElementById('faqTitle') as HTMLInputElement).value = cache.faq_titulo || '';
  (document.getElementById('faqSubtitle') as HTMLInputElement).value = cache.faq_subtitulo || '';
  (document.getElementById('faqGrid') as HTMLTextAreaElement).value = (cache.faq_grid || []).map((f: any) => `${f.pregunta}|${f.respuesta}`).join('\n');

  // Contacto
  (document.getElementById('contactoTitle') as HTMLInputElement).value = cache.contacto_titulo || '';
  (document.getElementById('contactoSubtitle') as HTMLInputElement).value = cache.contacto_subtitulo || '';

  // SEO
  (document.getElementById('seoTitle') as HTMLInputElement).value = cache.seo_titulo || '';
  (document.getElementById('seoDescription') as HTMLTextAreaElement).value = cache.seo_descripcion || '';
  (document.getElementById('seoKeywords') as HTMLInputElement).value = cache.seo_keywords || '';
  (document.getElementById('seoOgImage') as HTMLInputElement).value = cache.seo_og_image || '';
  (document.getElementById('seoTwitterCard') as HTMLInputElement).value = cache.seo_twitter_card || '';
  (document.getElementById('seoSchema') as HTMLTextAreaElement).value = cache.seo_schema || '';
}

async function saveAllContent(): Promise<void> {
  const btn = document.getElementById('btnSaveAllContent') as HTMLButtonElement;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

  try {
    const content: Record<string, any> = {
      hero_badge: (document.getElementById('heroBadge') as HTMLInputElement).value,
      hero_titulo: (document.getElementById('heroTitle') as HTMLTextAreaElement).value,
      hero_subtitulo: (document.getElementById('heroSubtitle') as HTMLTextAreaElement).value,
      hero_badges: (document.getElementById('heroBadges') as HTMLTextAreaElement).value.split('\n').filter(b => b.trim()),
      hero_cta_primario: (document.getElementById('heroCtaPrimary') as HTMLInputElement).value,
      hero_cta_secundario: (document.getElementById('heroCtaSecondary') as HTMLInputElement).value,
      hero_stats: parsePipeArray((document.getElementById('heroStats') as HTMLTextAreaElement).value, ['label', 'valor', 'icono']),
      about_titulo: (document.getElementById('aboutTitle') as HTMLInputElement).value,
      about_descripcion: (document.getElementById('aboutDescription') as HTMLTextAreaElement).value,
      about_valores: parsePipeArray((document.getElementById('aboutValues') as HTMLTextAreaElement).value, ['icono', 'titulo', 'descripcion']),
      servicios_titulo: (document.getElementById('servicesTitle') as HTMLInputElement).value,
      servicios_subtitulo: (document.getElementById('servicesSubtitle') as HTMLInputElement).value,
      servicios_lista: parsePipeArray((document.getElementById('servicesList') as HTMLTextAreaElement).value, ['icono', 'titulo', 'descripcion']),
      por_que_titulo: (document.getElementById('whyTitle') as HTMLInputElement).value,
      por_que_subtitulo: (document.getElementById('whySubtitle') as HTMLInputElement).value,
      por_que_razones: parsePipeArray((document.getElementById('whyReasons') as HTMLTextAreaElement).value, ['emoji', 'titulo', 'descripcion']),
      equipo_titulo: (document.getElementById('teamTitle') as HTMLInputElement).value,
      equipo_subtitulo: (document.getElementById('teamSubtitle') as HTMLInputElement).value,
      oficinas_titulo: (document.getElementById('officesTitle') as HTMLInputElement).value,
      oficinas_subtitulo: (document.getElementById('officesSubtitle') as HTMLInputElement).value,
      footer_marca: (document.getElementById('footerBrand') as HTMLInputElement).value,
      footer_descripcion: (document.getElementById('footerDescription') as HTMLTextAreaElement).value,
      footer_contacto: (document.getElementById('footerContact') as HTMLInputElement).value,
      footer_links: parsePipeArray((document.getElementById('footerLinks') as HTMLTextAreaElement).value, ['texto', 'url']),
      footer_servicios: parsePipeArray((document.getElementById('footerServices') as HTMLTextAreaElement).value, ['texto', 'url']),
      footer_copyright: (document.getElementById('footerCopyright') as HTMLInputElement).value,
      faq_titulo: (document.getElementById('faqTitle') as HTMLInputElement).value,
      faq_subtitulo: (document.getElementById('faqSubtitle') as HTMLInputElement).value,
      faq_grid: parsePipeArray((document.getElementById('faqGrid') as HTMLTextAreaElement).value, ['pregunta', 'respuesta']),
      contacto_titulo: (document.getElementById('contactoTitle') as HTMLInputElement).value,
      contacto_subtitulo: (document.getElementById('contactoSubtitle') as HTMLInputElement).value,
      seo_titulo: (document.getElementById('seoTitle') as HTMLInputElement).value,
      seo_descripcion: (document.getElementById('seoDescription') as HTMLTextAreaElement).value,
      seo_keywords: (document.getElementById('seoKeywords') as HTMLInputElement).value,
      seo_og_image: (document.getElementById('seoOgImage') as HTMLInputElement).value,
      seo_twitter_card: (document.getElementById('seoTwitterCard') as HTMLInputElement).value,
      seo_schema: (document.getElementById('seoSchema') as HTMLTextAreaElement).value
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

// Stubs that will be replaced by feature modules
function renderPropertiesTable(): void { /* Will be overridden by properties module */ }
function updatePropertyStats(): void { /* Will be overridden by properties module */ }
function updateAgentStats(): void { /* Will be overridden by agents module */ }
function renderAgentsTable(): void { /* Will be overridden by agents module */ }
function updateNavBadges(): void { /* Will be overridden by modules */ }
function loadDashboard(): void { /* Will be overridden by dashboard module */ }
function loadMercadoLibre(): void { /* Will be overridden by mercadoLibre module */ }

// Export all for global access
(window as any).editProperty = (_id: number) => { /* will be set by properties module */ };
(window as any).cloneProperty = (_id: number) => { /* will be set by properties module */ };
(window as any).confirmDelete = (_type: string, _id: number, _name: string) => { /* will be set by properties module */ };
(window as any).filterProperties = () => { /* will be set by properties module */ };
(window as any).filterAgents = () => { /* will be set by agents module */ };
(window as any).bulkActionProperties = () => { /* will be set by properties module */ };
(window as any).clearBulkSelection = () => { /* will be set by properties module */ };

export { 
  loadContent, loadContentEditor, saveAllContent, populateContentEditor,
  getContentCache, setContentCache,
  checkAuth, handleLogin, logout, navigate,
  loadProperties, loadAgents, loadAllData,
  propertiesCache, agentsCache, selectedPropertyIds
};