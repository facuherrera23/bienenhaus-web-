// ================================================================
// ADMIN APP - Standalone Dashboard for admin.html
// ================================================================
import { supabase } from './supabase.js';
import { CONFIG } from './config.js';
import { uploadToCloudinary, validateImageFile } from './cloudinary.js';

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
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user.email === CONFIG.ADMIN_EMAIL) {
    currentUser = session.user;
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

async function logout() {
  await supabase.auth.signOut();
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
  
  document.querySelectorAll('.settings-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `section-${section}`);
  });
  
  const titles = {
    dashboard: 'Dashboard',
    properties: 'Propiedades',
    agents: 'Agentes',
    'settings-content': 'Textos del Sitio',
    settings: 'Configuración'
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
    
    if (error) throw error;
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
    showToast('Error cargando propiedades', 'error');
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
  
  // SEO
  document.getElementById('seoTitle').value = contentCache.seo_titulo || '';
  document.getElementById('seoDescription').value = contentCache.seo_descripcion || '';
  document.getElementById('seoKeywords').value = contentCache.seo_keywords || '';
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
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay propiedades</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map(p => `
    <tr>
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
          <button class="action-btn delete" onclick="confirmDelete('property', ${p.id}, '${p.titulo.replace(/'/g, "\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
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

// ================================================================
// AGENTES - TABLA
// ================================================================
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
  }
  
  document.getElementById('propertyModal').classList.add('active');
}

function closePropertyModal() {
  document.getElementById('propertyModal').classList.remove('active');
  editingPropertyId = null;
  uploadedPropertyImages = [];
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
    
    if (!titulo || !precio || !ubicacion) {
      showToast('Completa título, precio y ubicación', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
      return;
    }
    
    const datos = { titulo, precio, moneda, operacion, ubicacion, tipo, habitaciones, banos, m2, antiguedad, destacado, caracteristicas, descripcion };
    
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
}

// ================================================================
// SETTINGS - LOAD / SAVE
// ================================================================
async function loadSettings() {
  // Load settings from contenido_sitio or dedicated settings table
  // For now, populate from contentCache if keys exist
  const settingsMap = {
    siteName: 'site_nombre',
    siteTagline: 'site_eslogan',
    sitePhone: 'site_telefono',
    siteEmail: 'site_email',
    siteWhatsApp: 'site_whatsapp',
    siteAddress: 'site_direccion',
    siteHours: 'site_horario'
  };
  
  for (const [elementId, cacheKey] of Object.entries(settingsMap)) {
    const el = document.getElementById(elementId);
    if (el && contentCache[cacheKey]) el.value = contentCache[cacheKey];
  }
}

async function saveSettings() {
  const btn = document.getElementById('btnSaveSettings');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  
  try {
    const settingsMap = {
      site_nombre: document.getElementById('siteName').value,
      site_eslogan: document.getElementById('siteTagline').value,
      site_telefono: document.getElementById('sitePhone').value,
      site_email: document.getElementById('siteEmail').value,
      site_whatsapp: document.getElementById('siteWhatsApp').value,
      site_direccion: document.getElementById('siteAddress').value,
      site_horario: document.getElementById('siteHours').value,
      maintenance_mode: document.getElementById('maintenanceMode').checked,
      show_prices: document.getElementById('showPrices').checked,
      enable_chat: document.getElementById('enableChat').checked
    };
    
    for (const [clave, valor] of Object.entries(settingsMap)) {
      await supabase.from('contenido_sitio').upsert({ clave, valor }, { onConflict: 'clave' });
    }
    
    showToast('Configuración guardada', 'success');
  } catch (e) {
    console.error(e);
    showToast('Error al guardar configuración', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar Configuración';
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
    div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:var(--radius);overflow:hidden;border:2px solid var(--gray-200);' + (i===0?'border-color:var(--accent);':'');
    div.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;"><span style="position:absolute;top:2px;right:2px;background:var(--gray-900);color:white;font-size:0.6rem;padding:1px 4px;border-radius:4px;">${i+1}</span>`;
    preview.appendChild(div);
  });
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
          if (prefix || suffix) {
            const newText = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
            element.value = newText;
            element.selectionStart = element.selectionEnd = start + prefix.length;
            element.focus();
          }
        });
      });
      
      element.setAttribute('data-md-initialized', 'true');
    });
  }, 100);
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
  
  // Modals
  document.getElementById('btnNewProperty').addEventListener('click', () => openPropertyModal());
  document.getElementById('closePropertyModal').addEventListener('click', closePropertyModal);
  document.getElementById('cancelPropertyModal').addEventListener('click', closePropertyModal);
  document.getElementById('propertyForm').addEventListener('submit', saveProperty);
  
  document.getElementById('btnNewAgent').addEventListener('click', () => openAgentModal());
  document.getElementById('closeAgentModal').addEventListener('click', closeAgentModal);
  document.getElementById('cancelAgentModal').addEventListener('click', closeAgentModal);
  document.getElementById('agentForm').addEventListener('submit', saveAgent);
  
  // Image uploads handled by setupImageUploads()
  
  // Settings tabs
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    });
  });
  
  // Save content
  document.getElementById('btnSaveAllContent').addEventListener('click', saveAllContent);
  
  // Save settings
  document.getElementById('btnSaveSettings')?.addEventListener('click', saveSettings);
  
  // Refresh stats
  document.getElementById('btnRefreshStats')?.addEventListener('click', loadDashboard);
  
  // Search
  document.getElementById('searchProperties').addEventListener('input', debounce(filterProperties, 300));
  document.getElementById('filterPropertyStatus').addEventListener('change', filterProperties);
  document.getElementById('searchAgents').addEventListener('input', debounce(filterAgents, 300));
  
  // Mobile menu toggle
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
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