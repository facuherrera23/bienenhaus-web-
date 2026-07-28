// ================================================================
// ADMIN APP - Standalone Dashboard for admin.html
// ================================================================
/* eslint-disable @typescript-eslint/no-unused-vars */
import { supabase } from './supabase.js';
import { CONFIG } from './config.js';
import { uploadToCloudinary, validateImageFile } from './cloudinary.js';
import Cropper from 'cropperjs';
// Cropper CSS imported via admin.html

// ================================================================
// GLOBAL STATE
// ================================================================
let currentSection = 'dashboard';
let currentUser = null;
let propertiesCache = [];
let agentsCache = [];
let contentCache = {};
let editingPropertyId = null;
let editingAgentId = null;
let uploadedPropertyImages = [];
let uploadedAgentAvatar = null;

// MercadoLibre State
let mlConnected = false;
let mlUserId = null;
let mlTokenExpiresAt = null;

// ================================================================
// UTILITIES
// ================================================================
function showToast(message, type = 'success', duration = 4000) {
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
  toast.innerHTML = `<i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 1.2rem;"></i><span>${message}</span>`;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function formatPrice(price, currency = 'ARS', operation = 'sale') {
  const symbol = currency === 'USD' ? 'U$S' : '$';
  const suffix = operation === 'rent' ? '/mes' : '';
  return `${symbol} ${Number(price).toLocaleString('es-AR')}${suffix}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function parsePipeArray(value, fields) {
  if (!value) return [];
  return value.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.split('|');
      const obj = {};
      fields.forEach((field, i) => { obj[field] = parts[i]?.trim() || ''; });
      return obj;
    });
}

// ================================================================
// AUTHENTICATION
// ================================================================
// Demo credentials for testing (works without Supabase user)
const DEMO_EMAIL = 'admin@bienenhaus.com.ar';
const DEMO_PASSWORD = 'demo123456';

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user.email === CONFIG.ADMIN_EMAIL) {
    currentUser = session.user;
    showDashboard();
    return true;
  }
  // Check for demo session
  const demoSession = sessionStorage.getItem('demoAdminSession');
  if (demoSession === 'true') {
    currentUser = { email: DEMO_EMAIL };
    showDashboard();
    return true;
  }
  showLogin();
  return false;
}

async function handleLogin(email, password) {
  const btn = document.getElementById('btnLogin');
  const errorDiv = document.getElementById('loginError');
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
  errorDiv.classList.remove('visible');
  errorDiv.textContent = '';

  try {
    // First try Supabase auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user.email === CONFIG.ADMIN_EMAIL) {
      currentUser = data.user;
      showDashboard();
      return;
    }
    if (error) throw error;
    
    // If wrong email in Supabase
    if (data.user.email !== CONFIG.ADMIN_EMAIL) {
      await supabase.auth.signOut();
      throw new Error('Acceso denegado: credenciales no autorizadas');
    }
    
    currentUser = data.user;
    showDashboard();
  } catch (e) {
    // Fallback: Demo mode
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      sessionStorage.setItem('demoAdminSession', 'true');
      currentUser = { email: DEMO_EMAIL };
      showDashboard();
      return;
    }
    errorDiv.textContent = e.message;
    errorDiv.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Iniciar Sesión</span>';
  }
}

async function logout() {
  await supabase.auth.signOut();
  sessionStorage.removeItem('demoAdminSession');
  currentUser = null;
  showLogin();
}

function showLogin() {
  document.getElementById('loginView').classList.remove('d-none');
  document.getElementById('dashboardView').classList.add('d-none');
  document.body.className = 'login-page';
}

function showDashboard() {
  document.getElementById('loginView').classList.add('d-none');
  document.getElementById('dashboardView').classList.remove('d-none');
  document.body.className = 'dashboard-page';
  
  if (currentUser) {
    document.getElementById('userName').textContent = currentUser.email.split('@')[0];
    document.getElementById('userAvatar').textContent = getInitials(currentUser.email);
  }
  
  loadDashboard();
  loadAllData();
}

// ================================================================
// NAVIGATION
// ================================================================
function navigate(section) {
  window.location.hash = section;
  
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
  });
  
  // Only toggle top-level section panels (id starts with "section-")
  document.querySelectorAll('.settings-panel[id^="section-"]').forEach(panel => {
    panel.classList.toggle('active', panel.id === `section-${section}`);
  });
  
  const titles = {
    dashboard: 'Dashboard',
    properties: 'Propiedades',
    agents: 'Agentes',
    'settings-content': 'Textos del Sitio',
    settings: 'Configuración',
    mercadoLibre: 'MercadoLibre'
  };
  document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';
  document.getElementById('breadcrumbCurrent').textContent = titles[section] || 'Dashboard';
  
  currentSection = section;
  
  switch(section) {
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
async function loadAllData() {
  await Promise.all([
    loadProperties(),
    loadAgents(),
    loadContent()
  ]);
}

async function loadProperties() {
  try {
    const { data, error } = await supabase
      .from('propiedades')
      .select('*, imagenes(url, cloudinary_public_id, orden, es_principal)')
      .order('created_at', { ascending: false });
    
    if (error) {
      // RLS error detection
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        throw new Error('Error de permisos (RLS): Verifica que la service_role key esté configurada en Edge Functions');
      }
      throw error;
    }
    propertiesCache = (data || []).map(p => ({
      ...p,
      imagenes: p.imagenes || [],
      imagen_principal: p.imagenes?.find(i => i.es_principal)?.url || null,
      galeria: p.imagenes?.sort((a,b) => a.orden - b.orden).map(i => i.url) || []
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

async function loadAgents() {
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

async function loadContent() {
  try {
    const { data, error } = await supabase
      .from('contenido_sitio')
      .select('*');
    
    if (error) {
      // Tabla puede no existir o RLS bloquear - no romper el admin
      console.warn('contenido_sitio no accesible:', error.message);
      return;
    }
    contentCache = {};
    (data || []).forEach(item => {
      contentCache[item.clave] = item.valor;
    });
    
    populateContentEditor();
  } catch (e) {
    console.warn('Error loading content:', e);
  }
}

async function loadContentEditor() {
  await loadContent();
}

function populateContentEditor() {
  // Hero
  document.getElementById('heroBadge').value = contentCache.hero_badge || '';
  document.getElementById('heroTitle').value = contentCache.hero_titulo || '';
  document.getElementById('heroSubtitle').value = contentCache.hero_subtitulo || '';
  document.getElementById('heroBadges').value = (contentCache.hero_badges || []).join('\n');
  document.getElementById('heroCtaPrimary').value = contentCache.hero_cta_primario || '';
  document.getElementById('heroCtaSecondary').value = contentCache.hero_cta_secundario || '';
  document.getElementById('heroStats').value = (contentCache.hero_stats || []).map(s => `${s.label}|${s.valor}|${s.icono}`).join('\n');
  
  // About
  document.getElementById('aboutTitle').value = contentCache.about_titulo || '';
  document.getElementById('aboutDescription').value = contentCache.about_descripcion || '';
  document.getElementById('aboutValues').value = (contentCache.about_valores || []).map(v => `${v.icono}|${v.titulo}|${v.descripcion}`).join('\n');
  
  // Services
  document.getElementById('servicesTitle').value = contentCache.servicios_titulo || '';
  document.getElementById('servicesSubtitle').value = contentCache.servicios_subtitulo || '';
  document.getElementById('servicesList').value = (contentCache.servicios_lista || []).map(s => `${s.icono}|${s.titulo}|${s.descripcion}`).join('\n');
  
  // Why
  document.getElementById('whyTitle').value = contentCache.por_que_titulo || '';
  document.getElementById('whySubtitle').value = contentCache.por_que_subtitulo || '';
  document.getElementById('whyReasons').value = (contentCache.por_que_razones || []).map(r => `${r.emoji}|${r.titulo}|${r.descripcion}`).join('\n');
  
  // Team
  document.getElementById('teamTitle').value = contentCache.equipo_titulo || '';
  document.getElementById('teamSubtitle').value = contentCache.equipo_subtitulo || '';
  
  // Offices
  document.getElementById('officesTitle').value = contentCache.oficinas_titulo || '';
  document.getElementById('officesSubtitle').value = contentCache.oficinas_subtitulo || '';
  
  // Footer
  document.getElementById('footerBrand').value = contentCache.footer_marca || '';
  document.getElementById('footerDescription').value = contentCache.footer_descripcion || '';
  document.getElementById('footerContact').value = contentCache.footer_contacto || '';
  document.getElementById('footerLinks').value = (contentCache.footer_links || []).map(l => `${l.texto}|${l.url}`).join('\n');
  document.getElementById('footerServices').value = (contentCache.footer_servicios || []).map(s => `${s.texto}|${s.url}`).join('\n');
  document.getElementById('footerCopyright').value = contentCache.footer_copyright || '';
  
  // FAQ
  document.getElementById('faqTitle').value = contentCache.faq_titulo || '';
  document.getElementById('faqSubtitle').value = contentCache.faq_subtitulo || '';
  document.getElementById('faqGrid').value = (contentCache.faq_grid || []).map(f => `${f.pregunta}|${f.respuesta}`).join('\n');
  
  // Contacto
  document.getElementById('contactoTitle').value = contentCache.contacto_titulo || '';
  document.getElementById('contactoSubtitle').value = contentCache.contacto_subtitulo || '';
  
  // SEO
  document.getElementById('seoTitle').value = contentCache.seo_titulo || '';
  document.getElementById('seoDescription').value = contentCache.seo_descripcion || '';
  document.getElementById('seoKeywords').value = contentCache.seo_keywords || '';
  document.getElementById('seoOgImage').value = contentCache.seo_og_image || '';
  document.getElementById('seoTwitterCard').value = contentCache.seo_twitter_card || '';
  document.getElementById('seoSchema').value = contentCache.seo_schema || '';
}

// ================================================================
// DASHBOARD
// ================================================================
async function loadDashboard() {
  updatePropertyStats();
  updateAgentStats();
  await loadRecentActivity();
}

function updatePropertyStats() {
  const total = propertiesCache.length;
  const featured = propertiesCache.filter(p => p.destacado).length;
  const forSale = propertiesCache.filter(p => p.operacion === 'venta').length;
  const forRent = propertiesCache.filter(p => p.operacion === 'alquiler').length;
  
  document.getElementById('statProperties').textContent = total;
  document.getElementById('statAgents').textContent = agentsCache.filter(a => a.activo).length;
  document.getElementById('statLeads').textContent = '—'; // Requiere tabla de leads real
  document.getElementById('statVisits').textContent = '—'; // Requiere analytics real
  
  document.getElementById('propTrend').innerHTML = '<i class="fas fa-arrow-up"></i> —';
  document.getElementById('propTrend').className = 'stat-trend';
}

function updateAgentStats() {
  const active = agentsCache.filter(a => a.activo).length;
  document.getElementById('statAgents').textContent = active;
}

function updateNavBadges() {
  document.getElementById('propCountBadge').textContent = propertiesCache.length;
  document.getElementById('agentCountBadge').textContent = agentsCache.filter(a => a.activo).length;
}

async function loadRecentActivity() {
  // TODO: Conectar a tabla de auditoría real
  const tbody = document.getElementById('recentActivityBody');
  tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Conectar tabla de auditoría para ver actividad real</td></tr>';
}

// ================================================================
// PROPIEDADES - TABLA
// ================================================================
const selectedPropertyIds = new Set();

function renderPropertiesTable(filter = '') {
  const tbody = document.getElementById('propertiesTableBody');
  let filtered = propertiesCache;
  
  if (filter) {
    const f = filter.toLowerCase();
    filtered = propertiesCache.filter(p => 
      p.titulo.toLowerCase().includes(f) || 
      p.ubicacion.toLowerCase().includes(f)
    );
  }
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No hay propiedades</td></tr>';
    return;
  }
  
  // Render header with resizable columns
  renderTableHeader();
  
  tbody.innerHTML = filtered.map(p => `
    <tr data-id="${p.id}">
      <td>
        <input type="checkbox" class="row-checkbox" value="${p.id}" ${selectedPropertyIds.has(p.id) ? 'checked' : ''}>
      </td>
      <td>
        <img src="${p.imagen_principal || 'https://via.placeholder.com/80x60?text=Sin+imagen'}" 
             alt="${p.titulo}" style="width: 60px; height: 45px; object-fit: cover; border-radius: var(--radius);">
      </td>
      <td><strong>${p.titulo}</strong></td>
      <td>${p.ubicacion}</td>
      <td><span class="badge badge-${p.operacion === 'venta' ? 'sale' : 'rent'}">${p.operacion === 'venta' ? 'Venta' : 'Alquiler'}</span></td>
      <td>${formatPrice(p.precio, p.moneda || 'ARS', p.operacion)}</td>
      <td><span class="badge badge-${p.destacado ? 'featured' : 'active'}">${p.destacado ? 'Destacada' : 'Normal'}</span></td>
      <td>
        <div class="action-btns">
          <button class="action-btn" onclick="editProperty(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="action-btn" onclick="cloneProperty(${p.id})" title="Clonar"><i class="fas fa-copy"></i></button>
          <button class="action-btn delete" onclick="confirmDelete('property', ${p.id}, '${p.titulo.replace(/'/g, "\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
  
  // Re-attach checkbox listeners
  attachRowCheckboxListeners();
  
  // Initialize column resizing
  initColumnResizing();
}

function filterProperties() {
  const search = document.getElementById('searchProperties').value;
  const status = document.getElementById('filterPropertyStatus').value;
  
  let filtered = propertiesCache;
  if (search) {
    const f = search.toLowerCase();
    filtered = filtered.filter(p => p.titulo.toLowerCase().includes(f) || p.ubicacion.toLowerCase().includes(f));
  }
  if (status) {
    filtered = filtered.filter(p => status === 'featured' ? p.destacado : !p.destacado);
  }
  renderPropertiesTable(filtered);
}

// Column resizing functionality
function initColumnResizing() {
  const ths = document.querySelectorAll('#section-properties table thead th');
  ths.forEach((th, index) => {
    const handle = th.querySelector('.resize-handle');
    if (!handle) return;
    
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const startX = e.clientX;
      const startWidth = th.offsetWidth;
      const table = document.querySelector('#section-properties table');
      
      function onMouseMove(e) {
        const newWidth = startWidth + (e.clientX - startX);
        if (newWidth >= 40) { // Minimum width
          th.style.width = newWidth + 'px';
          th.style.minWidth = newWidth + 'px';
          th.style.maxWidth = newWidth + 'px';
          columnWidths[Array.from(th.parentElement.children).indexOf(th)] = newWidth;
          
          // Update corresponding body cells
          const colIndex = Array.from(th.parentElement.children).indexOf(th);
          document.querySelectorAll(`#propertiesTableBody tr td:nth-child(${colIndex + 1})`).forEach(td => {
            td.style.width = newWidth + 'px';
            td.style.minWidth = newWidth + 'px';
            td.style.maxWidth = newWidth + 'px';
          });
        }
      }
      
      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    
    handle.addEventListener('mousedown', onMouseDown);
  });
}

// Inline editing functionality
let editingCell = null;
let originalValue = '';

function initInlineEdit() {
  document.querySelectorAll('.editable-cell').forEach(cell => {
    cell.addEventListener('dblclick', startInlineEdit);
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveInlineEdit(cell);
      } else if (e.key === 'Escape') {
        cancelInlineEdit(cell);
      }
    });
  });
}

function startInlineEdit(cell) {
  if (editingCell) saveInlineEdit(editingCell);
  
  editingCell = cell;
  originalValue = cell.textContent.trim();
  
  const field = cell.dataset.field;
  const type = cell.dataset.type || 'text';
  const id = cell.dataset.id;
  
  cell.classList.add('editing');
  cell.dataset.originalValue = cell.textContent.trim();
  
  let input;
  if (cell.dataset.type === 'boolean') {
    input = document.createElement('select');
    input.innerHTML = `<option value="true">Sí</option><option value="false">No</option>`;
    input.value = cell.textContent.trim().includes('Destacada') ? 'true' : 'false';
  } else if (cell.dataset.type === 'number') {
    input = document.createElement('input');
    input.type = 'number';
    input.step = '1000';
    input.value = cell.textContent.replace(/[^\d]/g, '');
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.value = cell.textContent.trim();
  }
  
  input.className = 'inline-edit-input';
  input.style.cssText = 'width: 100%; padding: 4px 8px; border: 1px solid var(--accent); border-radius: 4px; font: inherit;';
  
  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();
  
  input.addEventListener('blur', () => saveInlineEdit(cell));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveInlineEdit(cell);
    if (e.key === 'Escape') cancelInlineEdit(cell);
  });
}

function saveInlineEdit(cell) {
  if (!cell.classList.contains('editing')) return;
  
  const input = cell.querySelector('input, select');
  if (!input) return;
  
  const newValue = input.value;
  const field = cell.dataset.field;
  const id = cell.dataset.id;
  
  // Validate
  if (cell.dataset.type === 'number' && isNaN(parseFloat(newValue))) {
    showToast('El valor debe ser un número', 'error');
    return;
  }
  
  // Update UI
  const displayValue = formatDisplayValue(cell.dataset.field, newValue);
  cell.textContent = displayValue;
  cell.classList.remove('editing');
  
  // Save to server
  updatePropertyField(cell.dataset.id, cell.dataset.field, newValue);
  
  editingCell = null;
}

function cancelInlineEdit(cell) {
  if (!cell.classList.contains('editing')) return;
  cell.textContent = cell.dataset.originalValue || originalValue;
  cell.classList.remove('editing');
  editingCell = null;
}

function formatDisplayValue(field, value) {
  switch (field) {
    case 'precio':
      return formatPrice(parseFloat(value), 'ARS', 'venta'); // default
    case 'destacado':
      return value === 'true' || value === 'true' ? '<span class="badge badge-featured">Destacada</span>' : '<span class="badge badge-active">Normal</span>';
    default:
      return value;
  }
}

async function updatePropertyField(id, field, value) {
  try {
    let updateValue = value;
    if (field === 'precio') updateValue = parseFloat(value);
    else if (field === 'destacado') updateValue = value === 'true';
    
    const { error } = await supabase
      .from('propiedades')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
    
    showToast('Cambio guardado', 'success');
    
    // Update local cache
    const prop = propertiesCache.find(p => p.id === id);
    if (prop) prop[field] = value;
  } catch (e) {
    console.error('Update error:', e);
    showToast('Error al guardar: ' + e.message, 'error');
  }
}

// Sticky header for table
function initStickyTableHeader() {
  const tableContainer = document.querySelector('.table-container');
  if (!tableContainer) return;
  
  const thead = document.querySelector('#section-properties table thead');
  if (!thead) return;
  
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) {
        thead.classList.add('sticky-header');
      } else {
        thead.classList.remove('sticky-header');
      }
    }, {
      root: document.querySelector('.table-container'),
      threshold: 0
    });
    
    observer.observe(document.querySelector('.table-container'));
  }

function initTableEnhancements() {
  initStickyTableHeader();
  // Column resizing is initialized per render
}

export { initTableEnhancements };

// Bulk Actions Bar
function updateBulkActionsBar() {
  const bar = document.getElementById('bulkActionsBar');
  const count = selectedPropertyIds.size;
  
  if (count === 0) {
    if (bar) bar.style.display = 'none';
    return;
  }
  
  if (!bar) {
    createBulkActionsBar();
  } else {
    bar.style.display = 'flex';
    bar.querySelector('.bulk-count').textContent = `${selectedPropertyIds.size} seleccionad${selectedPropertyIds.size === 1 ? 'a' : 'os'}`;
  }
}

function createBulkActionsBar() {
  const section = document.getElementById('section-properties');
  if (!section) return;
  
  const tableContainer = section.querySelector('.table-container');
  if (!tableContainer) return;
  
  const bar = document.createElement('div');
  bar.id = 'bulkActionsBar';
  bar.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 20px;
    background: var(--primary);
    color: white;
    border-radius: var(--radius) var(--radius) 0 0;
    margin-bottom: -1px;
    z-index: 10;
    box-shadow: var(--shadow-md);
  `;
  
  bar.innerHTML = `
    <span class="bulk-count">0 seleccionados</span>
    <div class="bulk-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
      <button class="bulk-btn" onclick="bulkPublish()" title="Publicar">
        <i class="fas fa-globe"></i> Publicar
      </button>
      <button class="bulk-btn" onclick="bulkUnpublish()" title="Despublicar">
        <i class="fas fa-eye-slash"></i> Despublicar
      </button>
      <button class="bulk-btn" onclick="bulkFeature()" title="Marcar como destacada">
        <i class="fas fa-star"></i> Destacar
      </button>
      <button class="bulk-btn" onclick="bulkUnfeature()" title="Quitar destacado">
        <i class="fas fa-star-half-alt"></i> Quitar destacado
      </button>
      <button class="bulk-btn" onclick="bulkChangeOperation('venta')" title="Cambiar a Venta">
        <i class="fas fa-tag"></i> Cambiar a Venta
      </button>
      <button class="bulk-btn" onclick="bulkChangeOperation('alquiler')" title="Cambiar a Alquiler">
        <i class="fas fa-home"></i> Cambiar a Alquiler
      </button>
      <button class="bulk-btn bulk-btn-danger" onclick="bulkDelete()" title="Eliminar">
        <i class="fas fa-trash"></i> Eliminar
      </button>
      <button class="bulk-btn bulk-btn-secondary" onclick="clearSelection()" title="Limpiar selección">
        <i class="fas fa-times"></i> Limpiar
      </button>
    </div>
  `;
  
  // Insert before table container
  const tableContainer2 = document.querySelector('#section-properties .table-container');
  if (tableContainer2) {
    tableContainer2.parentNode.insertBefore(bar, tableContainer2);
  }
  
  // Add styles for bulk buttons
  if (!document.getElementById('bulk-actions-styles')) {
    const style = document.createElement('style');
    style.id = 'bulk-actions-styles';
    style.textContent = `
      .bulk-btn {
        padding: 8px 16px;
        border: none;
        border-radius: var(--radius);
        font-weight: 600;
        font-size: 0.8rem;
        cursor: pointer;
        transition: var(--transition);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }
      .bulk-btn:not(.bulk-btn-secondary) {
        background: white;
        color: var(--primary);
      }
      .bulk-btn:not(.bulk-btn-secondary):hover {
        background: var(--gray-100);
      }
      .bulk-btn.bulk-btn-danger {
        background: var(--danger);
        color: white;
      }
      .bulk-btn.bulk-btn-danger:hover {
        background: #b91c1c;
      }
      .bulk-btn.bulk-btn-secondary {
        background: rgba(255,255,255,0.2);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
      }
      .bulk-btn.bulk-btn-secondary:hover {
        background: rgba(255,255,255,0.3);
      }
      @media (max-width: 768px) {
        #bulkActionsBar {
          flex-direction: column;
          align-items: stretch;
        }
        .bulk-actions {
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Bulk Action Functions
async function bulkAction(action, data = {}) {
  const ids = Array.from(selectedPropertyIds);
  if (ids.length === 0) return;
  
  try {
    const { error } = await supabase
      .from('propiedades')
      .update({ ...data, updated_at: new Date().toISOString() })
      .in('id', ids);
    
    if (error) throw error;
    
    showToast(`${ids.length} propiedad${ids.length === 1 ? '' : 'es'} ${getActionPastTense(action)}`, 'success');
    clearSelection();
    await loadProperties();
  } catch (e) {
    console.error(`Bulk ${action} error:`, e);
    showToast(`Error al ${getActionInfinitive(action)}: ${e.message}`, 'error');
  }
}

function getActionPastTense(action) {
  const tenses = {
    publish: 'publicada',
    unpublish: 'despublicada',
    feature: 'destacada',
    unfeature: 'no destacada',
    changeOperation: 'cambiada de operación',
    delete: 'eliminada'
  };
  return tenses[action] || 'actualizada';
}

function getActionInfinitive(action) {
  const infinitives = {
    publish: 'publicar',
    unpublish: 'despublicar',
    feature: 'destacar',
    unfeature: 'quitar destacado',
    changeOperation: 'cambiar operación',
    delete: 'eliminar'
  };
  return infinitives[action] || 'realizar acción';
}

async function bulkPublish() {
  await bulkAction('publish', { ml_status: 'published', ml_last_sync: new Date().toISOString() });
}

async function bulkUnpublish() {
  await bulkAction('unpublish', { ml_status: 'draft', ml_last_sync: new Date().toISOString() });
}

async function bulkFeature() {
  await bulkAction('feature', { destacado: true });
}

async function bulkUnfeature() {
  await bulkAction('unfeature', { destacado: false });
}

async function bulkChangeOperation(operacion) {
  await bulkAction('changeOperation', { operacion });
}

async function bulkDelete() {
  if (!confirm(`¿Eliminar ${selectedPropertyIds.size} propiedad${selectedPropertyIds.size === 1 ? '' : 'es'}? Esta acción no se puede deshacer.`)) {
    return;
  }
  
  const ids = Array.from(selectedPropertyIds);
  try {
    // Delete images first
    const { data: images } = await supabase
      .from('imagenes')
      .select('cloudinary_public_id')
      .in('propiedad_id', ids);
    
    if (images?.length) {
      for (const img of images) {
        if (img.cloudinary_public_id) {
          // TODO: Delete from Cloudinary via signed request
        }
      }
    }
    
    const { error } = await supabase
      .from('propiedades')
      .delete()
      .in('id', ids);
    
    if (error) throw error;
    
    showToast(`${ids.length} propiedad${ids.length === 1 ? '' : 'es'} eliminada${ids.length === 1 ? '' : 's'}`, 'success');
    clearSelection();
    await loadProperties();
  } catch (e) {
    console.error('Bulk delete error:', e);
    showToast(`Error al eliminar: ${e.message}`, 'error');
  }
}

function clearSelection() {
  selectedPropertyIds.clear();
  document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
  const selectAll = document.getElementById('selectAllProperties');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
  }
  updateBulkActionsBar();
  // Re-render to uncheck visual checkboxes
  renderPropertiesTable();
}
function renderAgentsTable() {
  const tbody = document.getElementById('agentsTableBody');
  
  if (agentsCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay agentes registrados</td></tr>';
    return;
  }
  
  tbody.innerHTML = agentsCache.map(a => `
    <tr>
      <td>
        <div style="width: 44px; height: 44px; border-radius: 50%; background: ${a.avatar_url ? 'url(' + a.avatar_url + ')' : 'linear-gradient(135deg, var(--primary), var(--accent))'}; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.1rem;">
          ${a.avatar_url ? '' : getInitials(a.nombre + ' ' + a.apellido)}
        </div>
      </td>
      <td><strong>${a.nombre} ${a.apellido}</strong></td>
      <td>${a.especialidad}</td>
      <td>${a.email || '-'}</td>
      <td>${a.telefono || '-'}</td>
      <td><span class="badge badge-${a.activo ? 'active' : 'inactive'}">${a.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td>${a.orden}</td>
      <td>
        <div class="action-btns">
          <button class="action-btn" onclick="editAgent(${a.id})" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="action-btn delete" onclick="confirmDelete('agent', ${a.id}, '${a.nombre} ${a.apellido}')" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterAgents() {
  const search = document.getElementById('searchAgents').value.toLowerCase();
  const filtered = agentsCache.filter(a => 
    `${a.nombre} ${a.apellido}`.toLowerCase().includes(search) ||
    a.especialidad.toLowerCase().includes(search) ||
    (a.email || '').toLowerCase().includes(search)
  );
  renderAgentsTableFiltered(filtered);
}

function renderAgentsTableFiltered(filtered) {
  const tbody = document.getElementById('agentsTableBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay agentes</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(a => `
    <tr>
      <td><div style="width: 44px; height: 44px; border-radius: 50%; background: ${a.avatar_url ? 'url(' + a.avatar_url + ')' : 'linear-gradient(135deg, var(--primary), var(--accent))'}; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.1rem;">${a.avatar_url ? '' : getInitials(a.nombre + ' ' + a.apellido)}</div></td>
      <td><strong>${a.nombre} ${a.apellido}</strong></td>
      <td>${a.especialidad}</td>
      <td>${a.email || '-'}</td>
      <td>${a.telefono || '-'}</td>
      <td><span class="badge badge-${a.activo ? 'active' : 'inactive'}">${a.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td>${a.orden}</td>
      <td><div class="action-btns"><button class="action-btn" onclick="editAgent(${a.id})"><i class="fas fa-edit"></i></button><button class="action-btn delete" onclick="confirmDelete('agent', ${a.id}, '${a.nombre} ${a.apellido}')"><i class="fas fa-trash"></i></button></div></td>
    </tr>
  `).join('');
}

// ================================================================
// MODALS - PROPIEDADES
// ================================================================
function openPropertyModal(property = null) {
  editingPropertyId = property?.id || null;
  uploadedPropertyImages = [];
  
  const modal = document.getElementById('propertyModal');
  const title = document.getElementById('propertyModalTitle');
  const form = document.getElementById('propertyForm');
  
  form.reset();
  document.getElementById('propImagesPreview').innerHTML = '';
  
  // Reset tabs to first one
  modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  modal.querySelectorAll('.modal-tabpanel').forEach(p => p.classList.remove('active'));
  modal.querySelector('.modal-tab[data-tab="basic"]').classList.add('active');
  modal.querySelector('#panel-basic').classList.add('active');
  
  if (property) {
    title.textContent = 'Editar Propiedad';
    document.getElementById('propTitle').value = property.titulo || '';
    document.getElementById('propPrice').value = property.precio || '';
    document.getElementById('propCurrency').value = property.moneda || 'ARS';
    document.getElementById('propOperation').value = property.operacion || 'venta';
    document.getElementById('propLocation').value = property.ubicacion || '';
    document.getElementById('propType').value = property.tipo || 'piso';
    document.getElementById('propRooms').value = property.habitaciones || '';
    document.getElementById('propBaths').value = property.banos || '';
    document.getElementById('propM2').value = property.m2 || '';
    document.getElementById('propAge').value = property.antiguedad || 'reformado';
    document.getElementById('propFeatured').checked = property.destacado || false;
    document.getElementById('propFeatures').value = (property.caracteristicas || []).join(', ');
    document.getElementById('propDescription').value = property.descripcion || '';
    
    // SEO fields
    document.getElementById('propSeoTitle').value = property.seo_titulo || '';
    document.getElementById('propSeoDesc').value = property.seo_descripcion || '';
    document.getElementById('propSeoKeywords').value = property.seo_keywords || '';
    document.getElementById('propSeoOgImage').value = property.seo_og_image || '';
    document.getElementById('propSeoSchema').value = property.seo_schema || '';
    
    // MercadoLibre fields
    document.getElementById('propMlEnabled').checked = property.ml_enabled || false;
    document.getElementById('propMlItemId').value = property.ml_item_id || '';
    document.getElementById('propMlStatus').value = property.ml_status || 'draft';
    document.getElementById('propMlLastSync').value = property.ml_last_sync ? new Date(property.ml_last_sync).toLocaleString('es-AR') : 'Nunca sincronizada';
    
    // Show/hide ML buttons based on connection
    const mlConnected = document.getElementById('btnConnectML')?.style.display !== 'none';
    document.getElementById('btnSyncPropertyML').style.display = mlConnected && property.ml_item_id ? 'inline-flex' : 'none';
    document.getElementById('btnPublishPropertyML').style.display = mlConnected && !property.ml_item_id ? 'inline-flex' : 'none';
    
    if (property.imagenes?.length) {
      const preview = document.getElementById('propImagesPreview');
      property.imagenes.sort((a,b) => a.orden - b.orden).forEach((img, i) => {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:var(--radius);overflow:hidden;border:2px solid var(--gray-200);' + (i===0?'border-color:var(--accent);':'');
        div.innerHTML = `<img src="${img.url}" style="width:100%;height:100%;object-fit:cover;"><span style="position:absolute;top:2px;right:2px;background:var(--gray-900);color:white;font-size:0.6rem;padding:1px 4px;border-radius:4px;">${i+1}</span>`;
        preview.appendChild(div);
      });
    }
  } else {
    title.textContent = 'Nueva Propiedad';
    // Hide ML buttons for new properties
    document.getElementById('btnSyncPropertyML').style.display = 'none';
    document.getElementById('btnPublishPropertyML').style.display = 'none';
  }
  
  document.getElementById('propertyModal').classList.add('active');

  // Load history if editing existing property
  if (editingPropertyId) {
    loadPropertyHistory(editingPropertyId);
  }
}

function closePropertyModal() {
  document.getElementById('propertyModal').classList.remove('active');
  editingPropertyId = null;
  uploadedPropertyImages = [];
  // Limpiar preview y file input
  const preview = document.getElementById('propImagesPreview');
  const fileInput = document.getElementById('propImages');
  if (preview) preview.innerHTML = '';
  if (fileInput) fileInput.value = '';
}

// Load property history from audit log
async function loadPropertyHistory(propertyId) {
  const container = document.getElementById('propertyHistoryLog');
  if (!container) return;
  
  container.innerHTML = '<div class="empty-state" style="padding:20px;"><i class="fas fa-spinner fa-spin"></i> Cargando historial...</div>';
  
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('table_name', 'propiedades')
      .eq('record_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><i class="fas fa-history"></i><h4>No hay historial</h4><p>Los cambios se registrarán aquí después de guardar la propiedad.</p></div>';
      return;
    }
    
    container.innerHTML = data.map(log => `
      <div style="border-bottom:1px solid var(--gray-100);padding:16px 0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <span class="badge badge-${log.action === 'INSERT' ? 'success' : log.action === 'UPDATE' ? 'warning' : 'danger'}">${log.action}</span>
          <span style="font-size:0.8rem;color:var(--gray-500);">${new Date(log.created_at).toLocaleString('es-AR')}</span>
        </div>
        <div style="font-size:0.85rem;color:var(--gray-600);margin-bottom:8px;">${log.user_email || 'Sistema'}</div>
        ${log.old_data || log.new_data ? `
          <div style="background:var(--gray-50);border-radius:var(--radius);padding:12px;font-size:0.8rem;overflow-x:auto;">
            ${log.old_data ? `<div style="color:var(--danger);"><strong>Antes:</strong> ${JSON.stringify(log.old_data, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}</div>` : ''}
            ${log.new_data ? `<div style="margin-top:8px;color:var(--success);"><strong>Después:</strong> ${JSON.stringify(log.new_data, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `).join('');
    
  } catch (e) {
    console.error('Error loading property history:', e);
    container.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><i class="fas fa-exclamation-triangle"></i><h4>Error cargando historial</h4></div>';
  }
}

async function saveProperty(e) {
  e.preventDefault();
  
  const btn = document.getElementById('savePropertyBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  
  try {
    const titulo = document.getElementById('propTitle').value.trim();
    const precio = parseFloat(document.getElementById('propPrice').value);
    const moneda = document.getElementById('propCurrency').value;
    const operacion = document.getElementById('propOperation').value;
    const ubicacion = document.getElementById('propLocation').value.trim();
    const tipo = document.getElementById('propType').value;
    const habitaciones = parseInt(document.getElementById('propRooms').value) || 0;
    const banos = parseInt(document.getElementById('propBaths').value) || 0;
    const m2 = parseInt(document.getElementById('propM2').value) || 0;
    const antiguedad = document.getElementById('propAge').value;
    const destacado = document.getElementById('propFeatured').checked;
    const caracteristicas = document.getElementById('propFeatures').value.split(',').map(c => c.trim()).filter(c => c);
    const descripcion = document.getElementById('propDescription').value.trim();
    const files = document.getElementById('propImages').files;
    
    // SEO fields
    const seoTitle = document.getElementById('propSeoTitle')?.value.trim() || '';
    const seoDescription = document.getElementById('propSeoDesc')?.value.trim() || '';
    const seoKeywords = document.getElementById('propSeoKeywords')?.value.trim() || '';
    const seoOgImage = document.getElementById('propSeoOgImage')?.value.trim() || '';
    let seoSchema = null;
    try {
      const schemaVal = document.getElementById('propSeoSchema')?.value.trim();
      if (schemaVal) seoSchema = JSON.parse(schemaVal);
    } catch {}
    
    // MercadoLibre fields
    const mlEnabled = document.getElementById('propMlEnabled')?.checked || false;
    const mlItemId = document.getElementById('propMlItemId')?.value.trim() || null;
    const mlStatus = document.getElementById('propMlStatus')?.value || 'draft';
    
    // Validación client-side completa
    const errors = [];
    if (!titulo) errors.push('Título es requerido');
    if (!precio || precio <= 0) errors.push('Precio debe ser un número mayor a 0');
    if (!ubicacion) errors.push('Ubicación es requerida');
    if (!['ARS', 'USD'].includes(moneda)) errors.push('Moneda inválida');
    if (!['venta', 'alquiler'].includes(operacion)) errors.push('Operación inválida');
    if (!['piso', 'chalet', 'atico', 'local', 'terreno'].includes(tipo)) errors.push('Tipo de propiedad inválido');
    if (habitaciones < 0 || habitaciones > 20) errors.push('Habitaciones debe estar entre 0 y 20');
    if (banos < 0 || banos > 20) errors.push('Baños debe estar entre 0 y 20');
    if (m2 < 0 || m2 > 10000) errors.push('Metros cuadrados debe estar entre 0 y 10000');
    if (!['nuevo', 'reformado', 'viejo'].includes(antiguedad)) errors.push('Antigüedad inválida');
    if (files.length > 15) errors.push('Máximo 15 imágenes permitidas');
    
    // Validar archivos de imagen
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/)) {
        errors.push(`Archivo ${file.name}: solo JPG, PNG, WebP permitidos`);
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`Archivo ${file.name}: máximo 10MB`);
      }
    }
    
    if (errors.length > 0) {
      showToast(errors.join('\n'), 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
      return;
    }
    
    const datos = { 
      titulo, precio, moneda, operacion, ubicacion, tipo, habitaciones, banos, m2, antiguedad, destacado, caracteristicas, descripcion,
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_keywords: seoKeywords,
      seo_og_image: seoOgImage,
      seo_schema: seoSchema,
      ml_enabled: mlEnabled,
      ml_item_id: mlItemId,
      ml_status: mlStatus
    };
    
    let result;
    if (editingPropertyId) {
      const { error } = await supabase.from('propiedades').update(datos).eq('id', editingPropertyId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('propiedades').insert([datos]).select();
      if (error) throw error;
      editingPropertyId = data[0].id;
    }
    
    // Upload images
    if (files.length > 0) {
      const imagenesData = [];
      const maxImagenes = Math.min(files.length, 15);
      for (let i = 0; i < maxImagenes; i++) {
        validateImageFile(files[i]);
        const folder = `inmoconecta/propiedades/${editingPropertyId}`;
        const img = await uploadToCloudinary(files[i], folder, CONFIG.CLOUDINARY_UPLOAD_PRESET_PROPS);
        imagenesData.push({
          propiedad_id: editingPropertyId,
          url: img.url,
          cloudinary_public_id: img.public_id,
          orden: i,
          es_principal: i === 0
        });
      }
      if (imagenesData.length > 0) {
        const { error: imgError } = await supabase.from('imagenes').insert(imagenesData);
        if (imgError) throw imgError;
      }
    }
    
    showToast(`Propiedad ${editingPropertyId ? 'actualizada' : 'creada'} correctamente`, 'success');
    closePropertyModal();
    await loadProperties();
  } catch (e) {
    console.error('saveProperty error:', e);
    showToast(`Error: ${e.message || 'Error al guardar propiedad'}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
  }
}

// ================================================================
// MODALS - AGENTES
// ================================================================
function openAgentModal(agent = null) {
  editingAgentId = agent?.id || null;
  uploadedAgentAvatar = null;
  
  const form = document.getElementById('agentForm');
  const title = document.getElementById('agentModalTitle');
  const preview = document.getElementById('agentAvatarPreview');
  
  form.reset();
  preview.innerHTML = '<span>👤</span>';
  preview.style.background = 'var(--gray-200)';
  preview.style.color = 'var(--gray-500)';
  document.getElementById('agentAvatar').value = '';
  
  if (agent) {
    document.getElementById('agentModalTitle').textContent = 'Editar Agente';
    document.getElementById('agentId').value = agent.id;
    document.getElementById('agentName').value = agent.nombre || '';
    document.getElementById('agentSurname').value = agent.apellido || '';
    document.getElementById('agentSpecialty').value = agent.especialidad || '';
    document.getElementById('agentEmail').value = agent.email || '';
    document.getElementById('agentPhone').value = agent.telefono || '';
    document.getElementById('agentOrder').value = agent.orden || 99;
    document.getElementById('agentDescription').value = agent.descripcion || '';
    document.getElementById('agentActive').checked = agent.activo !== false;
    
    if (agent.avatar_url) {
      preview.innerHTML = `<img src="${agent.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`;
      preview.style.background = 'none';
    }
  } else {
    document.getElementById('agentModalTitle').textContent = 'Nuevo Agente';
    document.getElementById('agentId').value = '';
  }
  
  document.getElementById('agentModal').classList.add('active');
}

function closeAgentModal() {
  document.getElementById('agentModal').classList.remove('active');
  editingAgentId = null;
  uploadedAgentAvatar = null;
}

async function saveAgent(e) {
  e.preventDefault();
  
  const btn = document.getElementById('saveAgentBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  
  try {
    const nombre = document.getElementById('agentName').value.trim();
    const apellido = document.getElementById('agentSurname').value.trim();
    const especialidad = document.getElementById('agentSpecialty').value.trim();
    const email = document.getElementById('agentEmail').value.trim();
    const telefono = document.getElementById('agentPhone').value.trim();
    const orden = parseInt(document.getElementById('agentOrder').value) || 99;
    const descripcion = document.getElementById('agentDescription').value.trim();
    const activo = document.getElementById('agentActive').checked;
    const file = document.getElementById('agentAvatar').files[0];
    
    if (!nombre || !apellido || !especialidad) {
      showToast('Completa nombre, apellido y especialidad', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
      return;
    }
    
    const datos = { nombre, apellido, especialidad, email, telefono, orden, descripcion, activo };
    
    let avatarUrl = null;
    if (file) {
      validateImageFile(file);
      const folder = `inmoconecta/agentes/${editingAgentId || 'nuevo'}`;
      const img = await uploadToCloudinary(file, folder, CONFIG.CLOUDINARY_UPLOAD_PRESET_AGENTES);
      avatarUrl = img.url;
      datos.avatar_url = avatarUrl;
      datos.avatar_public_id = img.public_id;
    }
    
    let result;
    if (editingAgentId) {
      result = await supabase.from('agentes').update(datos).eq('id', editingAgentId);
    } else {
      result = await supabase.from('agentes').insert([datos]).select();
    }
    if (result.error) throw result.error;
    
    showToast(`Agente ${editingAgentId ? 'actualizado' : 'creado'} correctamente`, 'success');
    closeAgentModal();
    await loadAgents();
  } catch (e) {
    console.error('saveAgent error:', e);
    showToast(`Error: ${e.message || 'Error al guardar agente'}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
  }
}

// ================================================================
// DELETE CONFIRMATION (no global callback race condition)
// ================================================================
let pendingDelete = { type: null, id: null, name: null };

function confirmDelete(type, id, name) {
  pendingDelete = { type, id, name };
  document.getElementById('confirmMessage').textContent = `¿Eliminar "${name}"? Esta acción no se puede deshacer.`;
  document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
  document.getElementById('confirmModal').classList.remove('active');
  pendingDelete = { type: null, id: null, name: null };
}

async function executeDelete() {
  const { type, id } = pendingDelete;
  if (!type || !id) return;
  
  try {
    if (type === 'property') {
      const { data: images } = await supabase.from('imagenes').select('cloudinary_public_id').eq('propiedad_id', id);
      if (images?.length) {
        // TODO: Cloudinary delete via signed request or admin API
      }
      const { error } = await supabase.from('propiedades').delete().eq('id', id);
      if (error) throw error;
      await loadProperties();
    } else if (type === 'agent') {
      const { error } = await supabase.from('agentes').update({ activo: false }).eq('id', id);
      if (error) throw error;
      await loadAgents();
    }
    showToast('Eliminado correctamente', 'success');
    closeConfirmModal();
  } catch (e) {
    console.error(e);
    showToast('Error al eliminar', 'error');
  }
}

// ================================================================
// IMPORT/EXPORT PROPERTIES
// ================================================================

let importData = null;
let importErrors = [];

function openImportExportModal(tab = 'import') {
  const modal = document.getElementById('importExportModal');
  modal.querySelectorAll('.import-export-tab').forEach(t => t.classList.remove('active'));
  modal.querySelectorAll('.import-export-panel').forEach(p => p.classList.remove('active'));
  modal.querySelector(`.import-export-tab[data-tab="${tab}"]`).classList.add('active');
  modal.querySelector(`#panel-${tab}`).classList.add('active');
  
  if (tab === 'export') {
    populateExportFields();
  } else {
    resetImportModal();
  }
  
  modal.classList.add('active');
}

function closeImportExportModal() {
  document.getElementById('importExportModal').classList.remove('active');
  resetImportModal();
}

function resetImportModal() {
  importData = null;
  importErrors = [];
  document.getElementById('importFile').value = '';
  document.getElementById('importPreview').style.display = 'none';
  document.getElementById('importErrors').style.display = 'none';
  document.getElementById('btnConfirmImport').disabled = true;
  document.getElementById('fileUploadArea').classList.remove('has-file');
  document.querySelector('#fileUploadArea p').innerHTML = 'Arrastra tu archivo aquí o <button type="button" class="btn-link" id="btnSelectFile">selecciona un archivo</button>';
  document.getElementById('btnSelectFile').addEventListener('click', () => document.getElementById('importFile').click());
}

function handleImportFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
    showToast('Formato no válido. Use CSV, XLSX o XLS', 'error');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) {
    showToast('Archivo muy grande. Máximo 10MB', 'error');
    return;
  }
  
  showToast('Procesando archivo...', 'info');
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      let data;
      if (file.name.endsWith('.csv')) {
        const text = event.target.result;
        data = parseCSV(text);
      } else {
        const arrayBuffer = event.target.result;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      }
      
      if (!data.length) {
        showToast('El archivo está vacío', 'error');
        return;
      }
      
      importData = data;
      validateImportData(data);
      renderImportPreview(data);
      
      document.querySelector('#fileUploadArea p').innerHTML = `<i class="fas fa-check-circle" style="color:var(--success);"></i> ${file.name} (${data.length} filas)`;
      document.getElementById('fileUploadArea').classList.add('has-file');
      document.getElementById('btnConfirmImport').disabled = importErrors.length > 0 && !document.getElementById('importSkipErrors').checked;
      
    } catch (err) {
      console.error('Import parse error:', err);
      showToast('Error al leer el archivo: ' + err.message, 'error');
    }
  };
  
  if (file.name.endsWith('.csv')) {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
}

async function handleImportFile(files) {
  const file = files[0];
  if (!file) return;
  
  if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
    showToast('Formato no válido. Use CSV, XLSX o XLS', 'error');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) {
    showToast('Archivo muy grande. Máximo 10MB', 'error');
    return;
  }
  
  showToast('Procesando archivo...', 'info');
  
  try {
    let data;
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      data = parseCSV(text);
    } else {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    
    if (!data.length) {
      showToast('El archivo está vacío', 'error');
      return;
    }
    
    importData = data;
    validateImportData(data);
    renderImportPreview(data);
    
    document.querySelector('#fileUploadArea p').innerHTML = `<i class="fas fa-check-circle" style="color:var(--success);"></i> ${file.name} (${data.length} filas)`;
    document.getElementById('fileUploadArea').classList.add('has-file');
    document.getElementById('btnConfirmImport').disabled = importErrors.length > 0 && !document.getElementById('importSkipErrors').checked;
    
  } catch (e) {
    console.error('Import parse error:', e);
    showToast('Error al leer el archivo: ' + e.message, 'error');
  }
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i-1] !== '\\\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  });
}

function validateImportData(data) {
  importErrors = [];
  const requiredFields = ['titulo', 'precio', 'ubicacion', 'operacion', 'tipo'];
  const validOperations = ['venta', 'alquiler'];
  const validTypes = ['piso', 'chalet', 'atico', 'local', 'terreno'];
  const validCurrencies = ['ARS', 'USD'];
  
  data.forEach((row, idx) => {
    const rowErrors = [];
    requiredFields.forEach(field => {
      if (!row[field] || !String(row[field]).trim()) {
        rowErrors.push(`Falta campo requerido: ${field}`);
      }
    });
    if (row.precio && isNaN(parseFloat(row.precio))) rowErrors.push('Precio debe ser numérico');
    if (row.operacion && !validOperations.includes(row.operacion)) rowErrors.push('Operación inválida (venta/alquiler)');
    if (row.tipo && !validTypes.includes(row.tipo)) rowErrors.push('Tipo inválido');
    if (row.moneda && !validCurrencies.includes(row.moneda)) rowErrors.push('Moneda inválida (ARS/USD)');
    if (row.habitaciones && (isNaN(parseInt(row.habitaciones)) || parseInt(row.habitaciones) < 0 || parseInt(row.habitaciones) > 20)) rowErrors.push('Habitaciones inválida');
    if (row.banos && (isNaN(parseInt(row.banos)) || parseInt(row.banos) < 0 || parseInt(row.banos) > 20)) rowErrors.push('Baños inválido');
    if (row.m2 && (isNaN(parseInt(row.m2)) || parseInt(row.m2) < 0 || parseInt(row.m2) > 10000)) rowErrors.push('m² inválido');
    if (row.antiguedad && !['nuevo', 'reformado', 'viejo'].includes(row.antiguedad)) rowErrors.push('Antigüedad inválida');
    if (row.destacado && !['true', 'false', '1', '0', 'si', 'no'].includes(String(row.destacado).toLowerCase())) rowErrors.push('Destacado debe ser true/false');
    
    if (rowErrors.length) {
      importErrors.push({ row: idx + 2, errors: rowErrors, data: row });
    }
  });
}

function renderImportPreview(data) {
  const headers = Object.keys(data[0] || {});
  document.getElementById('importPreviewHeaders').innerHTML = headers.map(h => `<th>${h}</th>`).join('');
  
  const previewRows = data.slice(0, 50).map((row, idx) => {
    const hasError = importErrors.some(e => e.row === idx + 2);
    return `<tr class="${hasError ? 'has-error' : ''}">${headers.map(h => `<td>${escapeHtml(row[h] || '')}</td>`).join('')}</tr>`;
  }).join('');
  document.getElementById('importPreviewBody').innerHTML = previewRows;
  
  document.getElementById('importTotalRows').textContent = data.length;
  document.getElementById('importValidRows').textContent = data.length - importErrors.length;
  document.getElementById('importErrorRows').textContent = importErrors.length;
  
  if (importErrors.length) {
    document.getElementById('importErrors').style.display = 'block';
    document.getElementById('importErrorsList').innerHTML = importErrors.map(e => `<li>Fila ${e.row}: ${e.errors.join(', ')}</li>`).join('');
  } else {
    document.getElementById('importErrors').style.display = 'none';
  }
  
  document.getElementById('importPreview').style.display = 'block';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function confirmImport() {
  const skipErrors = document.getElementById('importSkipErrors').checked;
  const updateExisting = document.getElementById('importUpdateExisting').checked;
  const downloadImages = document.getElementById('importDownloadImages').checked;
  
  if (!importData || !importData.length) return;
  
  const btn = document.getElementById('btnConfirmImport');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
  
  let imported = 0, updated = 0, errors = 0;
  
  try {
    for (const row of importData) {
      const rowErrors = importErrors.filter(e => e.data === row);
      if (rowErrors.length && !skipErrors) continue;
      
      const datos = {
        titulo: row.titulo,
        precio: parseFloat(row.precio),
        moneda: row.moneda || 'ARS',
        operacion: row.operacion,
        ubicacion: row.ubicacion,
        tipo: row.tipo,
        habitaciones: parseInt(row.habitaciones) || 0,
        banos: parseInt(row.banos) || 0,
        m2: parseInt(row.m2) || 0,
        antiguedad: row.antiguedad || 'reformado',
        destacado: ['true', '1', 'si'].includes(String(row.destacado).toLowerCase()),
        caracteristicas: row.caracteristicas ? row.caracteristicas.split(',').map(c => c.trim()).filter(c => c) : [],
        descripcion: row.descripcion || ''
      };
      
      let propertyId = null;
      
      if (updateExisting) {
        const existing = propertiesCache.find(p => 
          p.titulo.toLowerCase() === datos.titulo.toLowerCase() && 
          p.ubicacion.toLowerCase() === datos.ubicacion.toLowerCase()
        );
        if (existing) {
          propertyId = existing.id;
        }
      }
      
      if (propertyId) {
        const { error } = await supabase.from('propiedades').update(datos).eq('id', propertyId);
        if (error) throw error;
        updated++;
      } else {
        const { data, error } = await supabase.from('propiedades').insert([datos]).select();
        if (error) throw error;
        propertyId = data[0].id;
        imported++;
      }
      
      // Handle images if URL provided
      if (downloadImages && propertyId && row.imagenes) {
        const urls = row.imagenes.split(',').map(u => u.trim()).filter(u => u);
        for (let i = 0; i < Math.min(urls.length, 15); i++) {
          try {
            const response = await fetch(urls[i]);
            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], `image_${i}.jpg`, { type: 'image/jpeg' });
              validateImageFile(file);
              const folder = `inmoconecta/propiedades/${propertyId}`;
              const img = await uploadToCloudinary(file, folder, CONFIG.CLOUDINARY_UPLOAD_PRESET_PROPS);
              await supabase.from('imagenes').insert({
                propiedad_id: propertyId,
                url: img.url,
                cloudinary_public_id: img.public_id,
                orden: i,
                es_principal: i === 0
              });
            }
          } catch (imgErr) {
            console.warn('Failed to import image:', urls[i], imgErr);
          }
        }
      }
    }
    
    showToast(`Importación completada: ${imported} nuevas, ${updated} actualizadas, ${errors} errores`, 'success');
    closeImportExportModal();
    await loadProperties();
    
  } catch (e) {
    console.error('Import error:', e);
    showToast('Error en importación: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-download"></i> Importar';
  }
}

function populateExportFields() {
  const container = document.getElementById('exportFields');
  const fields = [
    { key: 'titulo', label: 'Título', required: true },
    { key: 'precio', label: 'Precio', required: true },
    { key: 'moneda', label: 'Moneda' },
    { key: 'operacion', label: 'Operación', required: true },
    { key: 'ubicacion', label: 'Ubicación', required: true },
    { key: 'tipo', label: 'Tipo', required: true },
    { key: 'habitaciones', label: 'Habitaciones' },
    { key: 'banos', label: 'Baños' },
    { key: 'm2', label: 'm²' },
    { key: 'antiguedad', label: 'Antigüedad' },
    { key: 'destacado', label: 'Destacado' },
    { key: 'caracteristicas', label: 'Características' },
    { key: 'descripcion', label: 'Descripción' }
  ];
  
  container.innerHTML = fields.map(f => `
    <label class="checkbox-option">
      <input type="checkbox" name="exportField" value="${f.key}" ${f.required ? 'checked disabled' : 'checked'} ${f.required ? 'title="Campo obligatorio"' : ''}>
      <span>${f.label} ${f.required ? '*' : ''}</span>
    </label>
  `).join('');
}

async function confirmExport() {
  const selectedFields = Array.from(document.querySelectorAll('input[name="exportField"]:checked')).map(cb => cb.value);
  const applyFilters = document.getElementById('exportApplyFilters').checked;
  const includeImages = document.getElementById('exportIncludeImages').checked;
  
  if (!selectedFields.length) {
    showToast('Selecciona al menos un campo', 'error');
    return;
  }
  
  let data = propertiesCache;
  if (applyFilters) {
    const search = document.getElementById('searchProperties').value;
    const status = document.getElementById('filterPropertyStatus').value;
    if (search) {
      const f = search.toLowerCase();
      data = data.filter(p => p.titulo.toLowerCase().includes(f) || p.ubicacion.toLowerCase().includes(f));
    }
    if (status) {
      data = data.filter(p => status === 'featured' ? p.destacado : !p.destacado);
    }
  }
  
  const rows = data.map(p => {
    const row = {};
    selectedFields.forEach(field => {
      let val = p[field];
      if (field === 'caracteristicas' && Array.isArray(val)) val = val.join(', ');
      if (field === 'destacado') val = val ? 'Sí' : 'No';
      if (field === 'precio') val = formatPrice(val, p.moneda, p.operacion);
      row[field] = val || '';
    });
    if (includeImages && p.imagenes?.length) {
      row.imagenes = p.imagenes.map(i => i.url).join(', ');
    }
    return row;
  });
  
  const csv = [selectedFields.join(','), ...rows.map(r => selectedFields.map(f => `"${String(r[f] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
  
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `propiedades_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast(`Exportadas ${rows.length} propiedades`, 'success');
}

// ================================================================
// CONTENT EDITOR - SAVE ALL
// ================================================================
async function saveAllContent() {
  const btn = document.getElementById('btnSaveAllContent');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  
  try {
const content = {
      // Hero
      hero_badge: document.getElementById('heroBadge').value,
      hero_titulo: document.getElementById('heroTitle').value,
      hero_subtitulo: document.getElementById('heroSubtitle').value,
      hero_badges: document.getElementById('heroBadges').value.split('\n').filter(b => b.trim()),
      hero_cta_primario: document.getElementById('heroCtaPrimary').value,
      hero_cta_secundario: document.getElementById('heroCtaSecondary').value,
      hero_stats: parsePipeArray(document.getElementById('heroStats').value, ['label', 'valor', 'icono']),
      
      // About
      about_titulo: document.getElementById('aboutTitle').value,
      about_descripcion: document.getElementById('aboutDescription').value,
      about_valores: parsePipeArray(document.getElementById('aboutValues').value, ['icono', 'titulo', 'descripcion']),
      
      // Services
      servicios_titulo: document.getElementById('servicesTitle').value,
      servicios_subtitulo: document.getElementById('servicesSubtitle').value,
      servicios_lista: parsePipeArray(document.getElementById('servicesList').value, ['icono', 'titulo', 'descripcion']),
      
      // Why
      por_que_titulo: document.getElementById('whyTitle').value,
      por_que_subtitulo: document.getElementById('whySubtitle').value,
      por_que_razones: parsePipeArray(document.getElementById('whyReasons').value, ['emoji', 'titulo', 'descripcion']),
      
      // Team
      equipo_titulo: document.getElementById('teamTitle').value,
      equipo_subtitulo: document.getElementById('teamSubtitle').value,
      
      // Offices
      oficinas_titulo: document.getElementById('officesTitle').value,
      oficinas_subtitulo: document.getElementById('officesSubtitle').value,
      
      // Footer
      footer_marca: document.getElementById('footerBrand').value,
      footer_descripcion: document.getElementById('footerDescription').value,
      footer_contacto: document.getElementById('footerContact').value,
      footer_links: parsePipeArray(document.getElementById('footerLinks').value, ['texto', 'url']),
      footer_servicios: parsePipeArray(document.getElementById('footerServices').value, ['texto', 'url']),
      footer_copyright: document.getElementById('footerCopyright').value,
      
      // FAQ
      faq_titulo: document.getElementById('faqTitle').value,
      faq_subtitulo: document.getElementById('faqSubtitle').value,
      faq_grid: parsePipeArray(document.getElementById('faqGrid').value, ['pregunta', 'respuesta']),
      
      // Contacto
      contacto_titulo: document.getElementById('contactoTitle').value,
      contacto_subtitulo: document.getElementById('contactoSubtitle').value,
      
      // SEO
      seo_titulo: document.getElementById('seoTitle').value,
      seo_descripcion: document.getElementById('seoDescription').value,
      seo_keywords: document.getElementById('seoKeywords').value,
      seo_og_image: document.getElementById('seoOgImage').value,
      seo_twitter_card: document.getElementById('seoTwitterCard').value,
      seo_schema: document.getElementById('seoSchema').value
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

let columnWidths = {};

// Cargar anchos de columnas guardados
function loadColumnWidths() {
  const saved = localStorage.getItem('admin_column_widths');
  if (saved) {
    try {
      columnWidths = JSON.parse(saved);
    } catch (e) {
      columnWidths = {};
    }
  }
}

function saveColumnWidths() {
  localStorage.setItem('admin_column_widths', JSON.stringify(columnWidths));
}

// Renderizar encabezados con handles de redimensionamiento
function renderTableHeader() {
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
  
  // Re-inicializar select all
  const selectAll = document.getElementById('selectAllProperties');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.checked = e.target.checked;
        const id = parseInt(cb.value);
        if (e.target.checked) {
          selectedPropertyIds.add(id);
} else {
selectedPropertyIds.delete(id);
        }
      });
    });
  }
}

// ================================================================
// MERCADOLIBRE INTEGRATION
// ================================================================

// Load MercadoLibre connection status
async function loadMercadoLibre() {
  updateMercadoLibreUI();
  
  // Check connection status via Edge Function (avoids RLS issues)
  try {
    const { data, error } = await supabase.functions.invoke('ml-status')
    
    if (!error && data?.connected) {
      mlConnected = true;
      mlUserId = data.user_id;
      mlTokenExpiresAt = data.expires_at;
      updateMercadoLibreUI();
    } else {
      mlConnected = false;
      updateMercadoLibreUI();
    }
  } catch (e) {
    console.warn('ML status check:', e);
    mlConnected = false;
    updateMercadoLibreUI();
  }
  
  // Load sync log
  loadMLSyncLog();
}

function updateMercadoLibreUI() {
  const statusEl = document.getElementById('mlStatus');
  const connectBtn = document.getElementById('btnConnectML');
  const importBtn = document.getElementById('btnImportML');
  const syncBtn = document.getElementById('btnSyncML');
  
  if (statusEl) {
    if (mlConnected) {
      const exp = mlTokenExpiresAt ? new Date(mlTokenExpiresAt).toLocaleString('es-AR') : 'desconocido';
      statusEl.innerHTML = `<span class="badge badge-active">Conectado</span> <small>Usuario: ${mlUserId} · Expira: ${exp}</small>`;
      if (connectBtn) connectBtn.style.display = 'none';
      if (importBtn) importBtn.style.display = 'inline-flex';
      if (syncBtn) syncBtn.style.display = 'inline-flex';
    } else {
      statusEl.innerHTML = `<span class="badge badge-inactive">Desconectado</span>`;
      if (connectBtn) connectBtn.style.display = 'inline-flex';
      if (importBtn) importBtn.style.display = 'none';
      if (syncBtn) syncBtn.style.display = 'none';
    }
  }
}

// Connect to MercadoLibre (OAuth)
async function connectMercadoLibre() {
  const btn = document.getElementById('btnConnectML');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
  }
  
  try {
    // Call Edge Function to get auth URL
    const { data, error } = await supabase.functions.invoke('ml-oauth-callback', {
      body: {}
    });
    
    if (error) throw error;
    
    if (data.authUrl) {
      // Store state for CSRF validation
      const state = data.state;
      sessionStorage.setItem('ml_oauth_state', state);
      
      // Redirect to ML OAuth
      window.location.href = data.authUrl;
    }
  } catch (e) {
    console.error('ML Connect error:', e);
    showToast(`Error: ${e.message}`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-link"></i> Conectar MercadoLibre';
    }
  }
}

// Handle OAuth callback (called from redirect)
async function handleMLCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const storedState = sessionStorage.getItem('ml_oauth_state');
  
  if (!code || !state || state !== storedState) {
    showToast('Error de autenticación: estado inválido', 'error');
    return;
  }
  
  sessionStorage.removeItem('ml_oauth_state');
  
  try {
    showToast('Completando conexión...', 'info');
    
    const { data, error } = await supabase.functions.invoke('ml-oauth-callback', {
      body: { code, state }
    });
    
    if (error) throw error;
    
    if (data.success) {
      showToast('¡Cuenta de MercadoLibre conectada!', 'success');
      mlConnected = true;
      mlUserId = data.user_id;
      mlTokenExpiresAt = data.expires_at;
      updateMercadoLibreUI();
    } else {
      throw new Error(data.error || 'Error desconocido');
    }
  } catch (e) {
    console.error('ML Callback error:', e);
    showToast(`Error: ${e.message}`, 'error');
  }
}

// Import properties from MercadoLibre
async function importFromMercadoLibre() {
  const btn = document.getElementById('btnImportML');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
  }
  
  try {
    showToast('Importando propiedades de MercadoLibre...', 'info');
    
    const { data, error } = await supabase.functions.invoke('ml-import', {
      body: {}
    });
    
    if (error) throw error;
    
    showToast(`Importación completada: ${data.imported} nuevas, ${data.updated} actualizadas, ${data.errors} errores`, 'success');
    
    // Reload properties
    await loadProperties();
    await loadMLSyncLog();
    
  } catch (e) {
    console.error('ML Import error:', e);
    showToast(`Error: ${e.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-download"></i> Importar de ML';
    }
  }
}

// Sync property to MercadoLibre
async function syncPropertyToML(propertyId, action = 'publish') {
  const prop = propertiesCache.find(p => p.id === propertyId);
  if (!prop) return;
  
  try {
    const { data, error } = await supabase.functions.invoke('ml-publish', {
      body: { propertyId, action }
    });
    
    if (error) throw error;
    
    showToast(`Propiedad ${action === 'publish' ? 'publicada' : action} en MercadoLibre`, 'success');
    
    // Reload properties to get updated ML data
    await loadProperties();
    await loadMLSyncLog();
    
  } catch (e) {
    console.error('ML Sync error:', e);
    showToast(`Error: ${e.message}`, 'error');
  }
}

// Load ML Sync Log
async function loadMLSyncLog() {
  const tbody = document.getElementById('mlSyncLogBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Cargando historial...</td></tr>';
  
  try {
    const { data, error } = await supabase
      .from('ml_sync_log')
      .select('*, propiedades(titulo)')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay historial de sincronización</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(log => `
      <tr>
        <td>${new Date(log.created_at).toLocaleString('es-AR')}</td>
        <td>${log.propiedades?.titulo || 'N/A'}</td>
        <td><span class="badge badge-${log.accion === 'error' ? 'danger' : log.accion === 'import' ? 'info' : 'success'}">${log.accion}</span></td>
        <td>${log.ml_item_id || '—'}</td>
        <td>${log.detalle ? JSON.stringify(log.detalle).substring(0, 100) : '—'}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Load ML Sync Log error:', e);
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Error cargando historial</td></tr>';
  }
}

// ================================================================
// IMAGE UPLOAD PREVIEWS
// ================================================================
function setupImageUploads() {
  // Property images
  const propUpload = document.getElementById('propImageUpload');
  const propInput = document.getElementById('propImages');
  const propPreview = document.getElementById('propImagesPreview');
  
  if (propUpload && propInput) {
    // Make file input cover the upload area for native click handling
    propInput.style.cssText = 'position:absolute;inset:0;opacity:0;cursor:pointer;z-index:10;';
    propUpload.style.position = 'relative';
    
    propUpload.addEventListener('dragover', e => { e.preventDefault(); propUpload.classList.add('dragover'); });
    propUpload.addEventListener('dragleave', () => propUpload.classList.remove('dragover'));
    propUpload.addEventListener('drop', e => {
      e.preventDefault();
      propUpload.classList.remove('dragover');
      handleFiles(e.dataTransfer.files, 'property');
    });
    propInput.addEventListener('change', e => handleFiles(e.target.files, 'property'));
  }
  
  // Agent avatar
  const agentUpload = document.getElementById('agentAvatarUpload');
  const agentInput = document.getElementById('agentAvatar');
  
  if (agentUpload && agentInput) {
    agentInput.style.cssText = 'position:absolute;inset:0;opacity:0;cursor:pointer;z-index:10;';
    agentUpload.style.position = 'relative';
    
    agentUpload.addEventListener('dragover', e => { e.preventDefault(); agentUpload.classList.add('dragover'); });
    agentUpload.addEventListener('dragleave', () => agentUpload.classList.remove('dragover'));
    agentUpload.addEventListener('drop', e => {
      e.preventDefault();
      agentUpload.classList.remove('dragover');
      handleFiles(e.dataTransfer.files, 'agent');
    });
    agentInput.addEventListener('change', e => handleFiles(e.target.files, 'agent'));
  }
}

function handleFiles(files, type) {
  const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (validFiles.length === 0) return;
  
  if (type === 'property') {
    const remaining = 15 - uploadedPropertyImages.length;
    const toAdd = validFiles.slice(0, remaining);
    uploadedPropertyImages.push(...toAdd);
    renderPropertyImagePreviews();
  } else if (type === 'agent') {
    const file = validFiles[0];
    uploadedAgentAvatar = file;
    const preview = document.getElementById('agentAvatarPreview');
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`;
    preview.style.background = 'none';
  }
}

function renderPropertyImagePreviews() {
  const preview = document.getElementById('propImagesPreview');
  if (!preview) return;
  preview.innerHTML = '';
  uploadedPropertyImages.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    const div = document.createElement('div');
    div.draggable = true;
    div.dataset.index = i;
    div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:var(--radius);overflow:hidden;border:2px solid var(--gray-200);cursor:grab;' + (i===0?'border-color:var(--accent);':'');
    div.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" data-index="${i}"><span style="position:absolute;top:2px;right:2px;background:var(--gray-900);color:white;font-size:0.6rem;padding:1px 4px;border-radius:4px;">${i+1}</span><button type="button" class="remove-img" data-index="${i}" style="position:absolute;bottom:2px;right:2px;background:rgba(220,38,38,0.9);color:white;border:none;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.7rem;">×</button><button type="button" class="edit-img" data-index="${i}" style="position:absolute;bottom:2px;left:2px;background:rgba(31,110,212,0.9);color:white;border:none;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.7rem;" title="Editar"><i class="fas fa-crop"></i></button>`;
    preview.appendChild(div);
  });
  
  // Drag & drop reorder
  let draggedIndex = -1;
  preview.querySelectorAll('[draggable]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      draggedIndex = parseInt(e.target.dataset.index);
      e.target.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', (e) => {
      e.target.style.opacity = '1';
    });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetIndex = parseInt(e.target.closest('[draggable]')?.dataset.index || '-1');
      if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
        const [removed] = uploadedPropertyImages.splice(draggedIndex, 1);
        uploadedPropertyImages.splice(targetIndex, 0, removed);
        renderPropertyImagePreviews();
      }
    });
    // Remove button
    el.querySelector('.remove-img')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.target.dataset.index);
      uploadedPropertyImages.splice(idx, 1);
      renderPropertyImagePreviews();
    });
    // Edit button (crop/rotate)
    el.querySelector('.edit-img')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.target.dataset.index);
      openImageEditor(idx);
    });
    // Click image to edit
    el.querySelector('img')?.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index);
      openImageEditor(idx);
    });
  });
}

let cropperInstance = null;

function openImageEditor(index) {
  const file = uploadedPropertyImages[index];
  if (!file) return;
  
  const url = URL.createObjectURL(file);
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'display:flex;z-index:2000;';
  modal.innerHTML = `
    <div class="modal" style="max-width:90vw;max-height:90vh;width:800px;">
      <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid var(--gray-200);">
        <h3 class="modal-title" style="margin:0;">Editar Imagen</h3>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn-secondary" id="cropRotateLeft"><i class="fas fa-undo"></i> Rotar izq</button>
          <button type="button" class="btn-secondary" id="cropRotateRight"><i class="fas fa-redo"></i> Rotar der</button>
          <button type="button" class="btn-secondary" id="cropFlipH"><i class="fas fa-arrows-alt-h"></i> Voltear H</button>
          <button type="button" class="btn-secondary" id="cropFlipV"><i class="fas fa-arrows-alt-v"></i> Voltear V</button>
          <button type="button" class="btn-secondary" id="cropReset"><i class="fas fa-history"></i> Reset</button>
          <button type="button" class="modal-close" style="margin-left:8px;">&times;</button>
        </div>
      </div>
      <div class="modal-body" style="padding:24px;max-height:60vh;overflow:auto;text-align:center;">
        <div style="max-width:100%;max-height:50vh;margin:0 auto;">
          <img id="cropperImage" src="${url}" alt="Editor de imagen" style="max-width:100%;max-height:50vh;">
        </div>
      </div>
      <div class="modal-footer" style="padding:16px 24px;border-top:1px solid var(--gray-200);display:flex;justify-content:flex-end;gap:12px;">
        <button type="button" class="btn-secondary" id="cropCancel">Cancelar</button>
        <button type="button" class="btn-primary" id="cropApply"><i class="fas fa-check"></i> Aplicar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Initialize Cropper
  const image = modal.querySelector('#cropperImage');
  cropperInstance = new Cropper(image, {
    aspectRatio: NaN,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 1,
    responsive: true,
    restore: true,
    guides: true,
    center: true,
    highlight: true,
    cropBoxMovable: true,
    cropBoxResizable: true,
    toggleDragModeOnDblclick: true,
  });
  
  // Event handlers
  modal.querySelector('#cropRotateLeft')?.addEventListener('click', () => cropperInstance?.rotate(-90));
  modal.querySelector('#cropRotateRight')?.addEventListener('click', () => cropperInstance?.rotate(90));
  modal.querySelector('#cropFlipH')?.addEventListener('click', () => {
    const data = cropperInstance.getData();
    cropperInstance.scaleX(-data.scaleX);
  });
  modal.querySelector('#cropFlipV')?.addEventListener('click', () => {
    const data = cropperInstance.getData();
    cropperInstance.scaleY(-data.scaleY);
  });
  modal.querySelector('#cropReset')?.addEventListener('click', () => cropperInstance?.reset());
  
  const closeModal = () => {
    cropperInstance?.destroy();
    cropperInstance = null;
    modal.remove();
  };
  
  modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#cropCancel')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  modal.querySelector('#cropApply')?.addEventListener('click', async () => {
    if (!cropperInstance) return;
    
    const canvas = cropperInstance.getCroppedCanvas({
      maxWidth: 1920,
      maxHeight: 1080,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      // Compress if too large
      let finalBlob = blob;
      if (blob.size > 1024 * 1024) { // > 1MB
        canvas.toBlob((compressed) => {
          finalBlob = compressed || blob;
          replaceImage(index, finalBlob);
        }, 'image/jpeg', 0.85);
      } else {
        replaceImage(index, blob);
      }
      
      closeModal();
    }, 'image/jpeg', 0.92);
  });
}

function replaceImage(index, blob) {
  // Create new file from blob
  const newFile = new File([blob], `edited_${Date.now()}.jpg`, { type: 'image/jpeg' });
  uploadedPropertyImages[index] = newFile;
  renderPropertyImagePreviews();
}

// ================================================================
// MARKDOWN EDITOR (simple toolbar for textareas)
// ================================================================
const RICH_TEXT_FIELDS = [
  { id: 'heroSubtitle', placeholder: 'Escribe el subtítulo del hero...' },
  { id: 'aboutDescription', placeholder: 'Descripción de quiénes somos...' },
  { id: 'servicesSubtitle', placeholder: 'Subtítulo de servicios...' },
  { id: 'whySubtitle', placeholder: 'Subtítulo de por qué elegirnos...' },
  { id: 'teamSubtitle', placeholder: 'Subtítulo del equipo...' },
  { id: 'officesSubtitle', placeholder: 'Subtítulo de oficinas...' },
  { id: 'footerDescription', placeholder: 'Descripción del footer...' },
  { id: 'seoDescription', placeholder: 'Meta description (máx 160 chars)...' },
];

function setupMarkdownTextareas() {
  setTimeout(() => {
    RICH_TEXT_FIELDS.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (!element || element.getAttribute('data-md-initialized') === 'true') return;
      
      const wrapper = document.createElement('div');
      wrapper.className = 'markdown-wrapper';
      wrapper.innerHTML = `
        <div class="markdown-toolbar">
          <button type="button" data-action="bold" title="Negrita (Ctrl+B)"><i class="fas fa-bold"></i></button>
          <button type="button" data-action="italic" title="Cursiva (Ctrl+I)"><i class="fas fa-italic"></i></button>
          <button type="button" data-action="link" title="Enlace (Ctrl+K)"><i class="fas fa-link"></i></button>
          <button type="button" data-action="h2" title="Título H2"><i class="fas fa-heading"></i> H2</button>
          <button type="button" data-action="h3" title="Título H3"><i class="fas fa-heading"></i> H3</button>
          <button type="button" data-action="ul" title="Lista"><i class="fas fa-list-ul"></i></button>
          <button type="button" data-action="ol" title="Lista numerada"><i class="fas fa-list-ol"></i></button>
          <button type="button" data-action="quote" title="Cita"><i class="fas fa-quote-left"></i></button>
          <button type="button" data-action="code" title="Código"><i class="fas fa-code"></i></button>
          <span class="toolbar-divider"></span>
          <button type="button" data-action="preview" title="Vista previa"><i class="fas fa-eye"></i></button>
        </div>
      `;
      
      element.parentNode.insertBefore(wrapper, element);
      wrapper.appendChild(element);
      
      let isPreview = false;
      const previewDiv = document.createElement('div');
      previewDiv.className = 'markdown-preview d-none';
      element.parentNode.insertBefore(previewDiv, element.nextSibling);
      
      wrapper.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          const textarea = element;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const text = textarea.value;
          
          let prefix = '', suffix = '';
          switch (action) {
            case 'bold': prefix = suffix = '**'; break;
            case 'italic': prefix = suffix = '*'; break;
            case 'link': prefix = '['; suffix = '](url)'; break;
            case 'h2': prefix = '\n## '; suffix = '\n'; break;
            case 'h3': prefix = '\n### '; suffix = '\n'; break;
            case 'ul': prefix = '\n- '; suffix = ''; break;
            case 'ol': prefix = '\n1. '; suffix = ''; break;
            case 'quote': prefix = '\n> '; suffix = ''; break;
            case 'code': prefix = '`'; suffix = '`'; break;
            case 'preview':
              isPreview = !isPreview;
              if (isPreview) {
                element.classList.add('d-none');
                previewDiv.classList.remove('d-none');
                previewDiv.innerHTML = markedParse(element.value);
                btn.innerHTML = '<i class="fas fa-edit"></i>';
              } else {
                element.classList.remove('d-none');
                previewDiv.classList.add('d-none');
                btn.innerHTML = '<i class="fas fa-eye"></i>';
              }
              return;
          }
        });
        
        if (prefix || suffix) {
            const newText = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
            element.value = newText;
            element.selectionStart = element.selectionEnd = start + prefix.length;
            element.focus();
          }
        });
        
        element.setAttribute('data-md-initialized', 'true');
      });
}, 100);
  }
}

function markedParse(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/gim, '<em>$1</em>')
    .replace(/`(.+?)`/gim, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gim, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/^(?!<[h|u|o|l|b])(.+)$/gim, '<p>$1</p>')
    .replace(/<p><li>/gim, '<ul><li>')
    .replace(/<\/li><\/p>/gim, '</li></ul>')
    .replace(/<p><h/gim, '<h')
    .replace(/<\/h([1-6])><\/p>/gim, '</h$1>');
}

// ================================================================
// GLOBAL EXPORTS FOR INLINE ONCLICK
// ================================================================
window.editProperty = (id) => {
  const prop = propertiesCache.find(p => p.id === id);
  if (prop) openPropertyModal(prop);
};

window.cloneProperty = (id) => {
  const prop = propertiesCache.find(p => p.id === id);
  if (prop) {
    // Create a copy without id, created_at, updated_at, ml fields
    const { id: _, created_at, updated_at, ml_item_id, ml_status, ml_last_sync, ml_enabled, imagenes, ...cloneData } = prop;
    cloneData.titulo = `${cloneData.titulo} (Copia)`;
    openPropertyModal(cloneData);
  }
};

window.editAgent = (id) => {
  const agent = agentsCache.find(a => a.id === id);
  if (agent) openAgentModal(agent);
};

window.confirmDelete = (type, id, name) => confirmDelete(type, id, name);

window.filterProperties = filterProperties;
window.filterAgents = filterAgents;

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Setup image uploads
  setupImageUploads();
  setupMarkdownTextareas();
  
  // Login form
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    handleLogin(email, password);
  });
  
  // Logout
  document.getElementById('btnLogout').addEventListener('click', logout);
  
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigate(item.dataset.section);
    });
  });
  
  // Hash change
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    navigate(hash);
  });
  
// Initial route
  const initialHash = window.location.hash.slice(1) || 'dashboard';
  navigate(initialHash);

  // Handle MercadoLibre OAuth callback (check for code/state in URL)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  if (code && state) {
    await handleMLCallback();
    // Clean URL after handling
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
  }

  // Modals
  document.getElementById('btnNewProperty').addEventListener('click', () => openPropertyModal());
  document.getElementById('btnImportExport')?.addEventListener('click', () => {
    document.getElementById('importExportModal').classList.add('active');
  });
  document.getElementById('closePropertyModal').addEventListener('click', closePropertyModal);
  document.getElementById('cancelPropertyModal').addEventListener('click', closePropertyModal);
  document.getElementById('propertyForm').addEventListener('submit', saveProperty);
  document.getElementById('btnSyncPropertyML')?.addEventListener('click', () => {
    if (editingPropertyId) syncPropertyToML(editingPropertyId, 'publish');
  });
  document.getElementById('btnPublishPropertyML')?.addEventListener('click', () => {
    if (editingPropertyId) syncPropertyToML(editingPropertyId, 'publish');
  });
  
  document.getElementById('btnNewAgent').addEventListener('click', () => openAgentModal());
  document.getElementById('closeAgentModal').addEventListener('click', closeAgentModal);
  document.getElementById('cancelAgentModal').addEventListener('click', closeAgentModal);
  document.getElementById('agentForm').addEventListener('submit', saveAgent);
  
  // Image uploads handled by setupImageUploads()
  
// Settings tabs - scoped to each tab group
  document.querySelectorAll('.settings-tabs').forEach(tabGroup => {
    tabGroup.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // Only affect panels within this tab group's parent section
        const section = tab.closest('.settings-panel[id^="section-"]') || tab.closest('section');
        section.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        section.querySelectorAll('.settings-panel[role="tabpanel"]').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
      });
    });
  });

  // Property Modal tabs
  document.querySelectorAll('#propertyModal .modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const modal = document.getElementById('propertyModal');
      modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      modal.querySelectorAll('.modal-tabpanel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Import/Export Modal tabs
  document.querySelectorAll('.import-export-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const modal = document.getElementById('importExportModal');
      modal.querySelectorAll('.import-export-tab').forEach(t => t.classList.remove('active'));
      modal.querySelectorAll('.import-export-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Import/Export Modal handlers
  document.getElementById('btnSelectFile')?.addEventListener('click', () => {
    document.getElementById('importFile')?.click();
  });

  document.getElementById('importFile')?.addEventListener('change', handleImportFileSelect);

  document.getElementById('fileUploadArea')?.addEventListener('dragover', e => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  });

  document.getElementById('fileUploadArea')?.addEventListener('dragleave', e => {
    e.currentTarget.classList.remove('dragover');
  });

  document.getElementById('fileUploadArea')?.addEventListener('drop', e => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleImportFileSelect({ target: { files: e.dataTransfer.files } });
    }
  });

  document.getElementById('btnCancelImport')?.addEventListener('click', closeImportExportModal);
  document.getElementById('btnCancelExport')?.addEventListener('click', closeImportExportModal);
  document.getElementById('closeImportExportModal')?.addEventListener('click', closeImportExportModal);
  document.getElementById('btnConfirmImport')?.addEventListener('click', confirmImport);
  document.getElementById('btnConfirmExport')?.addEventListener('click', confirmExport);

  // Restore saved widths
  
  // Save content
  document.getElementById('btnSaveAllContent').addEventListener('click', saveAllContent);
  
  // Save settings
  document.getElementById('btnSaveSettings')?.addEventListener('click', saveSettings);
  
  // Refresh stats
  document.getElementById('btnRefreshStats')?.addEventListener('click', loadDashboard);
  
  // Search
  document.getElementById('searchProperties').addEventListener('input', debounce(filterProperties, 300));
  document.getElementById('filterPropertyStatus').addEventListener('change', filterProperties);
  document.getElementById('searchAgents').addEventListener('input', debounce(() => (window as any).filterAgents(), 300));
  
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  
  // MercadoLibre connect button
  document.getElementById('btnConnectML')?.addEventListener('click', connectMercadoLibre);
  
  // MercadoLibre panel buttons
  document.getElementById('btnImportML')?.addEventListener('click', importFromMercadoLibre);
  document.getElementById('btnSyncML')?.addEventListener('click', () => {
    // Sync all properties - could implement batch sync
    showToast('Sincronización masiva no implementada aún', 'info');
  });
  document.getElementById('btnPublishAllML')?.addEventListener('click', () => {
    showToast('Publicación masiva no implementada aún', 'info');
  });
  document.getElementById('btnPauseAllML')?.addEventListener('click', () => {
    showToast('Pausa masiva no implementada aún', 'info');
  });
  document.getElementById('btnActivateAllML')?.addEventListener('click', () => {
    showToast('Activación masiva no implementada aún', 'info');
  });
  
  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
  
  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      document.getElementById('sidebar')?.classList.remove('open');
    }
  });
  
  // Confirm delete
  document.getElementById('confirmDelete').addEventListener('click', executeDelete);
  document.getElementById('cancelConfirm').addEventListener('click', closeConfirmModal);
  document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
  
  // Check auth
  await checkAuth();
});
