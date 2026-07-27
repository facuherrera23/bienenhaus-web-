// ================================================================
// ADMIN ENTRY POINT - Code-split with lazy loading
// ================================================================
import '../styles/admin.css';
import { supabase } from '../supabase.js';
import { CONFIG } from '../config.js';
import { uploadToCloudinary, validateImageFile } from '../cloudinary.js';
import Cropper from 'cropperjs';
import {
  showToast,
  formatPrice,
  formatDate,
  getInitials,
  debounce,
  parsePipeArray,
} from './shared/utils.ts';
import { propertiesCache } from './features/properties/index.ts';
import { getContentCache, setContentCache } from './features/content/index.ts';
import { agentsCache } from './features/agents/index.ts';
// Cropper CSS imported via admin.css

// ================================================================
// LAZY LOAD FEATURE MODULES
// ================================================================
async function loadPropertiesModule(): Promise<any> {
  return import('./features/properties/index.ts');
}

async function loadAgentsModule(): Promise<any> {
  return import('./features/agents/index.ts');
}

async function loadContentModule(): Promise<any> {
  return import('./features/content/index.ts');
}

async function loadSettingsModule(): Promise<any> {
  return import('./features/settings/index.ts');
}

async function loadSettings(): Promise<void> {
  const settingsModule = await loadSettingsModule();
  await settingsModule.loadSettings();
}

async function loadMercadoLibreModule(): Promise<any> {
  return import('./features/mercadoLibre/index.ts');
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
    showDashboard();
  } catch (e) {
    errorDiv.textContent = e.message;
    errorDiv.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Iniciar Sesión</span>';
  }
}

async function logout(): Promise<void> {
  await supabase.auth.signOut();
  currentUser = null;
  showLogin();
}

function showLogin(): void {
  document.getElementById('loginView')!.classList.remove('d-none');
  document.getElementById('dashboardView')!.classList.add('d-none');
  document.body.className = 'login-page';
}

function showDashboard(): void {
  document.getElementById('loginView')!.classList.add('d-none');
  document.getElementById('dashboardView')!.classList.remove('d-none');
  document.body.className = 'dashboard-page';

  if (currentUser) {
    document.getElementById('userName')!.textContent = currentUser.email.split('@')[0];
    document.getElementById('userAvatar')!.textContent = currentUser.email.split('@')[0].charAt(0).toUpperCase();
  }

  loadDashboard();
  loadAllData();
}

// ================================================================
// NAVIGATION
// ================================================================
function navigate(section: string): void {
  window.location.hash = section;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
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

  currentSection = section;

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
    propertiesCache = (data || []).map(p => ({
      ...p,
      imagenes: p.imagenes || [],
      imagen_principal: p.imagenes?.find(i => i.es_principal)?.url || null,
      galeria: p.imagenes?.sort((a, b) => a.orden - b.orden).map(i => i.url) || []
    }));

    updatePropertyStats();
    renderPropertiesTable();
    updateNavBadges();
  } catch (e) {
    console.error('Error loading properties:', e);
    const msg = e.message?.includes('RLS') || e.message?.includes('42501')
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
  } catch (e) {
    console.error('Error loading agents:', e);
    showToast('Error cargando agentes', 'error');
  }
}

async function loadContent(): Promise<void> {
  try {
    const { data, error } = await supabase.from('contenido_sitio').select('*');
    if (error) { console.warn('contenido_sitio no accesible:', error.message); return; }
    const newCache: Record<string, any> = {};
    (data || []).forEach(item => { newCache[item.clave] = item.valor; });
    setContentCache(newCache);
    populateContentEditor();
  } catch (e) { console.warn('Error loading content:', e); }
}

async function loadContentEditor(): Promise<void> {
  await loadContent();
}

function populateContentEditor(): void {
  const cache = getContentCache();
  // Hero
  (document.getElementById('heroBadge') as HTMLInputElement).value = getContentCache().hero_badge || '';
  (document.getElementById('heroTitle') as HTMLTextAreaElement).value = getContentCache().hero_titulo || '';
  (document.getElementById('heroSubtitle') as HTMLTextAreaElement).value = getContentCache().hero_subtitulo || '';
  (document.getElementById('heroBadges') as HTMLTextAreaElement).value = (getContentCache().hero_badges || []).join('\n');
  (document.getElementById('heroCtaPrimary') as HTMLInputElement).value = getContentCache().hero_cta_primario || '';
  (document.getElementById('heroCtaSecondary') as HTMLInputElement).value = getContentCache().hero_cta_secundario || '';
  (document.getElementById('heroStats') as HTMLTextAreaElement).value = (getContentCache().hero_stats || []).map(s => `${s.label}|${s.valor}|${s.icono}`).join('\n');

  // About
  (document.getElementById('aboutTitle') as HTMLInputElement).value = getContentCache().about_titulo || '';
  (document.getElementById('aboutDescription') as HTMLTextAreaElement).value = getContentCache().about_descripcion || '';
  (document.getElementById('aboutValues') as HTMLTextAreaElement).value = (getContentCache().about_valores || []).map(v => `${v.icono}|${v.titulo}|${v.descripcion}`).join('\n');

  // Services
  (document.getElementById('servicesTitle') as HTMLInputElement).value = getContentCache().servicios_titulo || '';
  (document.getElementById('servicesSubtitle') as HTMLInputElement).value = getContentCache().servicios_subtitulo || '';
  (document.getElementById('servicesList') as HTMLTextAreaElement).value = (getContentCache().servicios_lista || []).map(s => `${s.icono}|${s.titulo}|${s.descripcion}`).join('\n');

  // Why
  (document.getElementById('whyTitle') as HTMLInputElement).value = getContentCache().por_que_titulo || '';
  (document.getElementById('whySubtitle') as HTMLInputElement).value = getContentCache().por_que_subtitulo || '';
  (document.getElementById('whyReasons') as HTMLTextAreaElement).value = (getContentCache().por_que_razones || []).map(r => `${r.emoji}|${r.titulo}|${r.descripcion}`).join('\n');

  // Team
  (document.getElementById('teamTitle') as HTMLInputElement).value = getContentCache().equipo_titulo || '';
  (document.getElementById('teamSubtitle') as HTMLInputElement).value = getContentCache().equipo_subtitulo || '';

  // Offices
  (document.getElementById('officesTitle') as HTMLInputElement).value = getContentCache().oficinas_titulo || '';
  (document.getElementById('officesSubtitle') as HTMLInputElement).value = getContentCache().oficinas_subtitulo || '';

  // Footer
  (document.getElementById('footerBrand') as HTMLInputElement).value = getContentCache().footer_marca || '';
  (document.getElementById('footerDescription') as HTMLTextAreaElement).value = getContentCache().footer_descripcion || '';
  (document.getElementById('footerContact') as HTMLInputElement).value = getContentCache().footer_contacto || '';
  (document.getElementById('footerLinks') as HTMLTextAreaElement).value = (getContentCache().footer_links || []).map(l => `${l.texto}|${l.url}`).join('\n');
  (document.getElementById('footerServices') as HTMLTextAreaElement).value = (getContentCache().footer_servicios || []).map(s => `${s.texto}|${s.url}`).join('\n');
  (document.getElementById('footerCopyright') as HTMLInputElement).value = getContentCache().footer_copyright || '';

  // FAQ
  (document.getElementById('faqTitle') as HTMLInputElement).value = getContentCache().faq_titulo || '';
  (document.getElementById('faqSubtitle') as HTMLInputElement).value = getContentCache().faq_subtitulo || '';
  (document.getElementById('faqGrid') as HTMLTextAreaElement).value = (getContentCache().faq_grid || []).map(f => `${f.pregunta}|${f.respuesta}`).join('\n');

  // Contacto
  (document.getElementById('contactoTitle') as HTMLInputElement).value = getContentCache().contacto_titulo || '';
  (document.getElementById('contactoSubtitle') as HTMLInputElement).value = getContentCache().contacto_subtitulo || '';

  // SEO
  (document.getElementById('seoTitle') as HTMLInputElement).value = getContentCache().seo_titulo || '';
  (document.getElementById('seoDescription') as HTMLTextAreaElement).value = getContentCache().seo_descripcion || '';
  (document.getElementById('seoKeywords') as HTMLInputElement).value = getContentCache().seo_keywords || '';
  (document.getElementById('seoOgImage') as HTMLInputElement).value = getContentCache().seo_og_image || '';
  (document.getElementById('seoTwitterCard') as HTMLInputElement).value = getContentCache().seo_twitter_card || '';
  (document.getElementById('seoSchema') as HTMLTextAreaElement).value = getContentCache().seo_schema || '';
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
  } catch (e) {
    console.error('saveAllContent error:', e);
    showToast(`Error: ${e.message || 'Error al guardar contenido'}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar Todo';
  }
}

let columnWidths: Record<number, number> = {};

function loadColumnWidths(): void {
  const saved = localStorage.getItem('admin_column_widths');
  if (saved) { try { columnWidths = JSON.parse(saved); } catch (e) { columnWidths = {}; } }
}

function saveColumnWidths(): void {
  localStorage.setItem('admin_column_widths', JSON.stringify(columnWidths));
}

function renderTableHeader(): void {
  const thead = document.querySelector('#section-properties table thead');
  if (!thead) return;

  thead.innerHTML = `
    <tr>
      <th data-col-index="0" style="width: 48px;">
        <input type="checkbox" id="selectAllProperties" aria-label="Seleccionar todas las propiedades">
        <div class="resize-handle" data-col-index="0"></div>
      </th>
      <th data-col-index="1">Imagen <div class="resize-handle" data-col-index="1"></div></th>
      <th data-col-index="2">Título <div class="resize-handle" data-col-index="2"></div></th>
      <th data-col-index="3">Ubicación <div class="resize-handle" data-col-index="3"></div></th>
      <th data-col-index="4">Operación <div class="resize-handle" data-col-index="4"></div></th>
      <th data-col-index="5">Precio <div class="resize-handle" data-col-index="5"></div></th>
      <th data-col-index="6">Estado <div class="resize-handle" data-col-index="6"></div></th>
      <th data-col-index="7" style="width: 120px;">Acciones <div class="resize-handle" data-col-index="7"></div></th>
    </tr>
  `;

  const selectAll = document.getElementById('selectAllProperties');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      document.querySelectorAll('.row-checkbox').forEach(cb => {
        (cb as HTMLInputElement).checked = (e.target as HTMLInputElement).checked;
        const id = parseInt((cb as HTMLInputElement).value);
        if ((e.target as HTMLInputElement).checked) { selectedPropertyIds.add(id); } else { selectedPropertyIds.delete(id); }
      });
      updateBulkActionsBar();
    });
  }
}

function initColumnResizing(): void {
  const ths = document.querySelectorAll('#section-properties table thead th');
  ths.forEach((th, index) => {
    const handle = th.querySelector('.resize-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const startX = e.clientX; const startWidth = th.offsetWidth;

      function onMouseMove(e: MouseEvent) {
        const newWidth = startWidth + (e.clientX - startX);
        if (newWidth >= 40) {
          th.style.width = newWidth + 'px';
          th.style.minWidth = newWidth + 'px';
          th.style.maxWidth = newWidth + 'px';
          columnWidths[Array.from(th.parentElement!.children).indexOf(th)] = newWidth;

          const colIndex = Array.from(th.parentElement!.children).indexOf(th);
          document.querySelectorAll(`#propertiesTableBody tr td:nth-child(${colIndex + 1})`).forEach(td => {
            (td as HTMLElement).style.width = newWidth + 'px';
            (td as HTMLElement).style.minWidth = newWidth + 'px';
            (td as HTMLElement).style.maxWidth = newWidth + 'px';
          });
        }
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = ''; document.body.style.userSelect = '';
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    });
  });
}

function initTableEnhancements(): void {
  loadColumnWidths();
}

export function init(): void {
  // This will be called from admin.html
}

// Export all for global access
(window as any).editProperty = (id: number) => { /* will be set by properties module */ };
(window as any).cloneProperty = (id: number) => { /* will be set by properties module */ };
(window as any).confirmDelete = (type: string, id: number, name: string) => { /* will be set by properties module */ };
(window as any).filterProperties = () => { /* will be set by properties module */ };
(window as any).filterAgents = () => { /* will be set by agents module */ };
(window as any).bulkActionProperties = () => { /* will be set by properties module */ };
(window as any).clearBulkSelection = () => { /* will be set by properties module */ };

export { loadContent, loadContentEditor, saveAllContent, populateContentEditor };
