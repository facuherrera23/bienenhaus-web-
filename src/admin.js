// ================================================================
// ADMIN PANEL - Módulo completo autocontenido con Auth
// ================================================================
import { supabase } from './supabase.js';
import { uploadToCloudinary, validateImageFile } from './cloudinary.js';
import { CONFIG } from './config.js';

// ================================================================
// CREDENCIALES ADMIN (configurar en Supabase Auth)
// Email: admin@bienenhaus.com.ar
// Password: bienenhaus2026
// ================================================================
const ADMIN_EMAIL = 'admin@bienenhaus.com.ar';
const ADMIN_PASSWORD = 'bienenhaus2026';

// ================================================================
// ESTADO ADMIN
// ================================================================
let propEditandoId = null;
let imagenesSubidas = [];
let panelCreado = false;
let adminAutenticado = false;

// ================================================================
// AUTENTICACIÓN ADMIN
// ================================================================
async function verificarSesionAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  
  // Verificar si es el admin autorizado
  const isAdmin = session.user.email === ADMIN_EMAIL;
  
  if (isAdmin) {
    adminAutenticado = true;
    return true;
  }
  
  // No es admin, cerrar sesión
  await supabase.auth.signOut();
  return false;
}

async function loginAdmin(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Verificar que sea el admin correcto
    if (data.user.email !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      throw new Error('Acceso denegado: credenciales no autorizadas');
    }
    
    adminAutenticado = true;
    return true;
  } catch (e) {
    console.error('Login error:', e);
    throw e;
  }
}

async function logoutAdmin() {
  await supabase.auth.signOut();
  adminAutenticado = false;
  cerrarAdmin();
}

// ================================================================
// CREAR USUARIO ADMIN SI NO EXISTE (ejecutar una vez)
// ================================================================
export async function crearUsuarioAdmin() {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'admin', nombre: 'Administrador Bienenhaus' }
    });
    if (error) throw error;
    console.log('✅ Usuario admin creado:', data.user.email);
    return data.user;
  } catch (e) {
    if (e.message?.includes('already registered') || e.message?.includes('User already registered')) {
      console.log('ℹ️ Usuario admin ya existe');
      return null;
    }
    console.error('Error creando admin:', e);
    throw e;
  }
}

// ================================================================
// FORMATEO PRECIO
// ================================================================
function formatearPrecioAdmin(precio, moneda, operacion) {
  const simbolo = moneda === 'USD' ? 'U$S' : '$';
  const label = moneda === 'USD' ? 'Dólares estadounidenses' : 'Pesos argentinos';
  const sufijo = operacion === 'alquiler' ? ' / mes' : '';
  return { simbolo, label: label + sufijo, texto: `${simbolo} ${precio.toLocaleString('es-AR')}${sufijo}` };
}

// ================================================================
// CREAR PANEL ADMIN DINÁMICAMENTE (con login)
// ================================================================
function crearPanelAdmin() {
  if (panelCreado) return document.getElementById('adminPanel');

  const panel = document.createElement('div');
  panel.id = 'adminPanel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.style.cssText = `
    display: none;
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(8px);
    padding: 20px;
    overflow-y: auto;
    font-family: inherit;
  `;

  // Login view
  const loginHTML = `
    <div id="adminLoginView" style="display:flex; align-items:center; justify-content:center; min-height:100vh;">
      <div style="background:white; padding:40px; border-radius:var(--radius-xl); max-width:400px; width:100%; box-shadow:var(--shadow-xl);">
        <div style="text-align:center; margin-bottom:24px;">
          <div style="font-size:3rem; margin-bottom:8px;">🛠️</div>
          <h2 style="font-size:1.5rem; font-weight:800; color:var(--primary);">Bienenhaus Admin</h2>
          <p style="color:var(--gray-600); margin-top:8px;">Panel de Administración</p>
        </div>
        
        <div id="loginError" style="display:none; background:#fef2f2; border:1px solid #fecaca; color:#dc2626; padding:12px; border-radius:var(--radius); margin-bottom:16px; font-size:0.9rem;"></div>
        
        <form id="adminLoginForm">
          <div style="margin-bottom:16px;">
            <label style="display:block; font-weight:600; margin-bottom:6px; color:var(--gray-700);">Email</label>
            <input type="email" id="adminEmail" required style="width:100%; padding:12px 16px; border:1px solid var(--gray-200); border-radius:60px; font-size:1rem; font-family:inherit;" placeholder="admin@bienenhaus.com.ar">
          </div>
          <div style="margin-bottom:20px;">
            <label style="display:block; font-weight:600; margin-bottom:6px; color:var(--gray-700);">Contraseña</label>
            <input type="password" id="adminPassword" required style="width:100%; padding:12px 16px; border:1px solid var(--gray-200); border-radius:60px; font-size:1rem; font-family:inherit;" placeholder="••••••••">
          </div>
          <button type="submit" class="btn-admin btn-admin-primary" style="width:100%; padding:14px; border:none; border-radius:60px; font-weight:700; font-size:1rem; cursor:pointer; background:var(--primary); color:white; transition:var(--transition);">
            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
          </button>
        </form>
        
        <p style="text-align:center; margin-top:16px; color:var(--gray-500); font-size:0.85rem;">
          Solo accesos autorizados
        </p>
      </div>
    </div>
  `;

  // Dashboard view
  const dashboardHTML = `
    <div id="adminDashboardView" style="display:none;">
      <div class="admin-container" style="
        max-width: 1000px;
        margin: 0 auto;
        background: white;
        border-radius: var(--radius-xl);
        padding: 40px;
        position: relative;
        z-index: 10001;
        pointer-events: auto;
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:2rem; font-weight:800; color:var(--primary); margin-bottom:4px;">🛠️ Panel de Administración</h2>
            <p style="color:var(--gray-600);">Gestiona propiedades y agentes</p>
          </div>
          <div style="display:flex; gap:12px; align-items:center;">
            <span style="color:var(--gray-600); font-size:0.9rem;" id="adminUserEmail"></span>
            <button id="btnLogoutAdmin" class="btn-admin" style="background:var(--gray-200); color:var(--gray-700); padding:8px 16px; border-radius:40px; font-weight:600;">Cerrar Sesión</button>
          </div>
        </div>

        <div class="admin-tabs" style="display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap;">
          <button class="admin-tab-btn active" data-tab="propiedades" style="padding:10px 24px; border:1px solid var(--gray-200); border-radius:60px; background:var(--primary); color:white; cursor:pointer; font-weight:600; transition:var(--transition);">Propiedades</button>
          <button class="admin-tab-btn" data-tab="agentes" style="padding:10px 24px; border:1px solid var(--gray-200); border-radius:60px; background:var(--gray-50); cursor:pointer; font-weight:600; transition:var(--transition);">Agentes</button>
        </div>

        <div class="admin-tab-content active" id="tabPropiedades">
          <button class="btn-admin btn-admin-success" id="btnNuevaPropiedad" style="margin-bottom:16px; padding:8px 16px; border:none; border-radius:40px; font-weight:600; cursor:pointer; font-size:0.8rem; transition:var(--transition); background:var(--success); color:white;">
            <i class="fas fa-plus"></i> Nueva Propiedad
          </button>

          <div id="formPropiedad" style="display:none;" class="admin-form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:16px; background:var(--gray-50); padding:24px; border-radius:var(--radius); margin-bottom:24px; border:1px solid var(--gray-200);">
            <h3 style="grid-column:1/-1; margin-bottom:8px;" id="formPropTitulo">Nueva Propiedad</h3>
            <div><label>Título *</label><input type="text" id="propTitulo" placeholder="Ej: Ático dúplex con terraza"></div>
            <div><label>Precio *</label><input type="number" id="propPrecio" placeholder="425000"></div>
            <div><label>Moneda</label><select id="propMoneda"><option value="ARS">ARS (Pesos)</option><option value="USD">USD (Dólares)</option></select></div>
            <div><label>Operación *</label><select id="propOperacion"><option value="venta">Venta</option><option value="alquiler">Alquiler</option></select></div>
            <div><label>Ubicación *</label><input type="text" id="propUbicacion" placeholder="Córdoba"></div>
            <div><label>Tipo *</label><select id="propTipo"><option value="piso">Piso/Apartamento</option><option value="chalet">Chalet/Casa</option><option value="atico">Ático</option><option value="local">Local/Oficina</option><option value="terreno">Terreno/Solar</option></select></div>
            <div><label>Habitaciones</label><input type="number" id="propHabitaciones" placeholder="3"></div>
            <div><label>Baños</label><input type="number" id="propBanos" placeholder="2"></div>
            <div><label>m²</label><input type="number" id="propM2" placeholder="95"></div>
            <div><label>Antigüedad</label><select id="propAntiguedad"><option value="nuevo">Nuevo</option><option value="reformado">Reformado</option><option value="viejo">Viejo</option></select></div>
            <div><label>Destacado</label><select id="propDestacado"><option value="false">No</option><option value="true">Sí</option></select></div>
            <div class="full" style="grid-column:1/-1;"><label>Características (separadas por coma)</label><input type="text" id="propCaracteristicas" placeholder="ascensor, terraza, garaje"></div>
            <div class="full" style="grid-column:1/-1;"><label>Descripción</label><textarea id="propDescripcion" placeholder="Descripción detallada de la propiedad..."></textarea></div>
            <div class="full" style="grid-column:1/-1;"><label>Imágenes (máximo 15)</label><input type="file" id="propImagenes" accept="image/*" multiple><div id="propImagenesPreview" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;"></div></div>
            <div class="full" style="grid-column:1/-1; display:flex; gap:12px;">
              <button class="btn-admin btn-admin-success" id="btnGuardarPropiedad"><i class="fas fa-save"></i> Guardar</button>
              <button class="btn-admin" id="btnCancelarPropiedad" style="background:var(--gray-200);color:var(--gray-700);">Cancelar</button>
            </div>
          </div>

          <div id="listaPropiedadesAdmin">
            <p style="text-align:center; padding:40px; color:var(--gray-500);">Cargando propiedades...</p>
          </div>
        </div>

        <div class="admin-tab-content" id="tabAgentes" style="display:none;">
          <button class="btn-admin btn-admin-success" id="btnNuevoAgente" style="margin-bottom:16px; padding:8px 16px; border:none; border-radius:40px; font-weight:600; cursor:pointer; font-size:0.8rem; transition:var(--transition); background:var(--success); color:white;">
            <i class="fas fa-plus"></i> Nuevo Agente
          </button>

          <div id="formAgente" style="display:none;" class="admin-form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:16px; background:var(--gray-50); padding:24px; border-radius:var(--radius); margin-bottom:24px; border:1px solid var(--gray-200);">
            <h3 style="grid-column:1/-1; margin-bottom:8px;" id="formAgenteTitulo">Nuevo Agente</h3>
            <div><label>Nombre *</label><input type="text" id="agenteNombre" placeholder="Laura"></div>
            <div><label>Apellido *</label><input type="text" id="agenteApellido" placeholder="Gómez"></div>
            <div><label>Especialidad *</label><input type="text" id="agenteEspecialidad" placeholder="Venta · Lujo"></div>
            <div><label>Email</label><input type="email" id="agenteEmail" placeholder="laura@bienenhaus.com"></div>
            <div><label>Teléfono</label><input type="text" id="agenteTelefono" placeholder="+54 9 351 123-4567"></div>
            <div><label>Orden</label><input type="number" id="agenteOrden" placeholder="1" value="99"></div>
            <div class="full" style="grid-column:1/-1;"><label>Descripción</label><textarea id="agenteDescripcion" placeholder="Descripción del agente..."></textarea></div>
            <div class="full" style="grid-column:1/-1;"><label>Avatar (imagen)</label><input type="file" id="agenteAvatar" accept="image/*"><div id="agenteAvatarPreview" style="width:60px;height:60px;border-radius:50%;background:var(--gray-200);display:flex;align-items:center;justify-content:center;font-size:2rem;margin-top:8px;overflow:hidden;"><span>👤</span></div></div>
            <div class="full" style="grid-column:1/-1; display:flex; gap:12px;">
              <button class="btn-admin btn-admin-success" id="btnGuardarAgente"><i class="fas fa-save"></i> Guardar</button>
              <button class="btn-admin" id="btnCancelarAgente" style="background:var(--gray-200);color:var(--gray-700);">Cancelar</button>
            </div>
          </div>

          <div id="listaAgentesAdmin">
            <p style="text-align:center; padding:40px; color:var(--gray-500);">Cargando agentes...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  panel.innerHTML = loginHTML + dashboardHTML;
  document.body.appendChild(panel);
  panelCreado = true;

  // Event listeners
  panel.addEventListener('click', (e) => {
    if (e.target === panel) {
      if (adminAutenticado) return; // En dashboard no cerrar por backdrop
      cerrarAdmin();
    }

    // Login form - click en botón submit
    const loginForm = e.target.closest('#adminLoginForm');
    if (loginForm) {
      e.preventDefault();
      handleLogin(loginForm);
    }

    // Logout
    if (e.target.closest('#btnLogoutAdmin')) {
      logoutAdmin();
    }

    // Tabs
    const tabBtn = e.target.closest('.admin-tab-btn');
    if (tabBtn) cambiarTabAdmin(tabBtn.dataset.tab);

    // Botones propiedades
    if (e.target.closest('#btnNuevaPropiedad')) mostrarFormPropiedad();
    if (e.target.closest('#btnCancelarPropiedad')) cerrarFormPropiedad();
    if (e.target.closest('#btnGuardarPropiedad')) guardarPropiedad();

    // Botones agentes
    if (e.target.closest('#btnNuevoAgente')) mostrarFormAgente();
    if (e.target.closest('#btnCancelarAgente')) cerrarFormAgente();
    if (e.target.closest('#btnGuardarAgente')) guardarAgente();

    // Editar/Eliminar propiedades
    const editBtn = e.target.closest('[data-edit-prop]');
    if (editBtn) editarPropiedad(Number(editBtn.dataset.editProp));

    const delBtn = e.target.closest('[data-del-prop]');
    if (delBtn) eliminarPropiedad(Number(delBtn.dataset.delProp));

    // Editar/Eliminar agentes
    const editAgBtn = e.target.closest('[data-edit-agente]');
    if (editAgBtn) editarAgente(Number(editAgBtn.dataset.editAgente));

    const delAgBtn = e.target.closest('[data-del-agente]');
    if (delAgBtn) eliminarAgente(Number(delAgBtn.dataset.delAgente));

    // Preview imágenes
    if (e.target.id === 'propImagenes') previewPropImagenes(e.target.files);
    if (e.target.id === 'agenteAvatar') previewAgenteAvatar(e.target.files[0]);
  });

  // Login form submit
  panel.querySelector('#adminLoginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin(e.target);
  });

  // Tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const panel = document.getElementById('adminPanel');
      if (panel && panel.classList.contains('active')) {
        if (adminAutenticado) return; // En dashboard, Escape no cierra
        cerrarAdmin();
      }
    }
  });

  return panel;
}

// ================================================================
// LOGIN HANDLER
// ================================================================
async function handleLogin(form) {
  const email = form.querySelector('#adminEmail').value.trim();
  const password = form.querySelector('#adminPassword').value;
  const errorDiv = document.getElementById('loginError');
  const btn = form.querySelector('button[type="submit"]');

  errorDiv.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

  try {
    await loginAdmin(email, password);
    
    // Login exitoso - mostrar dashboard
    document.getElementById('adminLoginView').style.display = 'none';
    document.getElementById('adminDashboardView').style.display = 'block';
    
    // Cargar email del usuario
    const { data: { session } } = await supabase.auth.getSession();
    document.getElementById('adminUserEmail').textContent = session?.user?.email || '';
    
    // Cargar datos
    cargarPropiedadesAdmin();
    cargarAgentesAdmin();
    
    // URL routing
    if (!window.location.pathname.includes('/admin')) {
      history.pushState({ admin: true }, '', '/admin');
    }
    
  } catch (e) {
    errorDiv.textContent = e.message || 'Error al iniciar sesión';
    errorDiv.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
  }
}

// ================================================================
// ABRIR / CERRAR PANEL
// ================================================================
export async function abrirAdmin() {
  const panel = crearPanelAdmin();
  
  // Verificar si ya hay sesión
  const autenticado = await verificarSesionAdmin();
  
  if (autenticado) {
    // Mostrar dashboard directamente
    document.getElementById('adminLoginView').style.display = 'none';
    document.getElementById('adminDashboardView').style.display = 'block';
    const { data: { session } } = await supabase.auth.getSession();
    document.getElementById('adminUserEmail').textContent = session?.user?.email || '';
    cargarPropiedadesAdmin();
    cargarAgentesAdmin();
  } else {
    // Mostrar login
    document.getElementById('adminLoginView').style.display = 'flex';
    document.getElementById('adminDashboardView').style.display = 'none';
  }

  panel.classList.add('active');
  panel.style.display = 'block';
  document.body.style.overflow = 'hidden';

  // URL routing
  if (!window.location.pathname.includes('/admin')) {
    history.pushState({ admin: true }, '', '/admin');
  }
}

export function cerrarAdmin() {
  const panel = document.getElementById('adminPanel');
  if (panel) {
    panel.classList.remove('active');
    panel.style.display = 'none';
  }
  document.body.style.overflow = '';

  // Reset a login view
  document.getElementById('adminLoginView').style.display = 'flex';
  document.getElementById('adminDashboardView').style.display = 'none';
  document.getElementById('adminLoginForm')?.reset();
  document.getElementById('loginError').style.display = 'none';

  // Limpiar formularios
  cerrarFormPropiedad();
  cerrarFormAgente();

  // URL routing
  if (window.location.pathname.includes('/admin')) {
    history.pushState({}, '', '/');
  }
}

// ================================================================
// TABS
// ================================================================
function cambiarTabAdmin(tab) {
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.admin-tab-btn').forEach(b => {
    b.classList.remove('active');
    b.style.background = 'var(--gray-50)';
    b.style.color = 'var(--gray-700)';
  });

  document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)?.classList.add('active');
  const btnActivo = document.querySelector(`.admin-tab-btn[data-tab="${tab}"]`);
  if (btnActivo) {
    btnActivo.classList.add('active');
    btnActivo.style.background = 'var(--primary)';
    btnActivo.style.color = 'white';
  }
}

window.cambiarTabAdmin = (tab) => cambiarTabAdmin(tab);

// ================================================================
// PROPIEDADES ADMIN
// ================================================================
export async function cargarPropiedadesAdmin() {
  const container = document.getElementById('listaPropiedadesAdmin');
  if (!container) return;

  const { data, error } = await supabase.from('propiedades').select('*').order('id', { ascending: false });
  if (error) { container.innerHTML = '<p style="color:var(--danger);">Error al cargar propiedades.</p>'; return; }
  if (!data || data.length === 0) { container.innerHTML = '<p style="color:var(--gray-500); text-align:center; padding:40px;">No hay propiedades registradas.</p>'; return; }

  container.innerHTML = data.map(p => {
    const monedaInfo = formatearPrecioAdmin(p.precio, p.moneda || 'ARS', p.operacion);
    return `
      <div class="admin-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--gray-50); border-radius:var(--radius); margin-bottom:8px; border:1px solid var(--gray-200);">
        <div class="info" style="display:flex; align-items:center; gap:12px;">
          <div class="thumb" style="width:40px; height:40px; border-radius:50%; background:var(--gray-300); display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:1.2rem;">🏠</div>
          <div>
            <strong>${p.titulo}</strong>
            <span style="display:block;font-size:0.8rem;color:var(--gray-500);">${p.ubicacion} · ${monedaInfo.texto} · ${p.operacion}</span>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-admin btn-admin-primary" data-edit-prop="${p.id}" style="padding:8px 16px; border:none; border-radius:40px; font-weight:600; cursor:pointer; font-size:0.8rem; transition:var(--transition); background:var(--accent); color:white;"><i class="fas fa-edit"></i></button>
          <button class="btn-admin btn-admin-danger" data-del-prop="${p.id}" style="padding:8px 16px; border:none; border-radius:40px; font-weight:600; cursor:pointer; font-size:0.8rem; transition:var(--transition); background:var(--danger); color:white;"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

function mostrarFormPropiedad() {
  const form = document.getElementById('formPropiedad');
  if (!form) return;
  form.style.display = 'grid';
  document.getElementById('formPropTitulo').textContent = 'Nueva Propiedad';
  window.propEditandoId = null;

  ['propTitulo', 'propPrecio', 'propUbicacion', 'propCaracteristicas', 'propDescripcion', 'propMoneda', 'propOperacion', 'propTipo', 'propHabitaciones', 'propBanos', 'propM2', 'propAntiguedad', 'propDestacado'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'propMoneda' ? 'ARS' : id === 'propOperacion' ? 'venta' : id === 'propTipo' ? 'piso' : id === 'propAntiguedad' ? 'reformado' : id === 'propDestacado' ? 'false' : '';
  });

  document.getElementById('propImagenes').value = '';
  document.getElementById('propImagenesPreview').innerHTML = '';
  window.imagenesSubidas = [];
}

function cerrarFormPropiedad() {
  const form = document.getElementById('formPropiedad');
  if (form) form.style.display = 'none';
  window.propEditandoId = null;
}

function previewPropImagenes(files) {
  const preview = document.getElementById('propImagenesPreview');
  if (!preview) return;
  preview.innerHTML = '';
  Array.from(files).slice(0, 15).forEach((file, i) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const div = document.createElement('div');
    div.style.cssText = 'position:relative;width:60px;height:60px;border-radius:8px;overflow:hidden;border:2px solid var(--gray-200);' + (i===0?'border-color:var(--accent);':'');
    div.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">${i===0?'<span style="position:absolute;top:2px;right:2px;background:var(--accent);color:white;font-size:0.6rem;padding:1px 4px;border-radius:4px;">Principal</span>':''}`;
    preview.appendChild(div);
  });
}

export async function guardarPropiedad() {
  const titulo = document.getElementById('propTitulo')?.value?.trim();
  const precio = parseFloat(document.getElementById('propPrecio')?.value);
  const moneda = document.getElementById('propMoneda')?.value || 'ARS';
  const operacion = document.getElementById('propOperacion')?.value || 'venta';
  const ubicacion = document.getElementById('propUbicacion')?.value?.trim();
  const tipo = document.getElementById('propTipo')?.value || 'piso';
  const habitaciones = parseInt(document.getElementById('propHabitaciones')?.value) || 0;
  const banos = parseInt(document.getElementById('propBanos')?.value) || 0;
  const m2 = parseInt(document.getElementById('propM2')?.value) || 0;
  const antiguedad = document.getElementById('propAntiguedad')?.value || 'reformado';
  const destacado = document.getElementById('propDestacado')?.value === 'true';
  const caracteristicas = document.getElementById('propCaracteristicas')?.value?.split(',').map(c => c.trim()).filter(c => c) || [];
  const descripcion = document.getElementById('propDescripcion')?.value?.trim();
  const files = document.getElementById('propImagenes')?.files;

  if (!titulo || !precio || !ubicacion) { alert('⚠️ Completa título, precio y ubicación.'); return; }

  try {
    const datos = { titulo, precio, moneda, operacion, ubicacion, tipo, habitaciones, banos, m2, antiguedad, destacado, caracteristicas, descripcion };
    let result;

    if (window.propEditandoId) {
      result = await supabase.from('propiedades').update(datos).eq('id', window.propEditandoId);
    } else {
      result = await supabase.from('propiedades').insert([datos]).select();
    }
    if (result.error) throw result.error;

    const propId = window.propEditandoId || result.data[0].id;

    // Subir imágenes
    if (files && files.length > 0) {
      const imagenesData = [];
      const maxImagenes = Math.min(files.length, 15);

      for (let i = 0; i < maxImagenes; i++) {
        const { uploadToCloudinary } = await import('./cloudinary.js');
        validateImageFile(files[i]);
        const folder = `inmoconecta/propiedades/${propId}`;
        const img = await uploadToCloudinary(files[i], folder, CONFIG.CLOUDINARY_UPLOAD_PRESET_PROPS);
        imagenesData.push({ propiedad_id: propId, url: img.url, cloudinary_public_id: img.public_id, orden: i, es_principal: i === 0 });
      }

      if (imagenesData.length > 0) {
        const { error: imgError } = await supabase.from('imagenes').insert(imagenesData);
        if (imgError) throw imgError;
      }
    }

    alert(`✅ Propiedad ${window.propEditandoId ? 'actualizada' : 'creada'} correctamente.`);
    cerrarFormPropiedad();
    await cargarPropiedadesAdmin();

    // Refrescar vista pública
    const { obtenerPropiedades, renderizarPropiedades } = await import('./properties.js');
    await obtenerPropiedades({});
    renderizarPropiedades();
  } catch (e) {
    console.error(e);
    alert('❌ Error al guardar propiedad.');
  }
}

async function editarPropiedad(id) {
  try {
    const { data, error } = await supabase.from('propiedades').select('*').eq('id', id).single();
    if (error) throw error;

    const form = document.getElementById('formPropiedad');
    form.style.display = 'grid';
    document.getElementById('formPropTitulo').textContent = 'Editar Propiedad';
    window.propEditandoId = id;

    document.getElementById('propTitulo').value = data.titulo || '';
    document.getElementById('propPrecio').value = data.precio || '';
    document.getElementById('propMoneda').value = data.moneda || 'ARS';
    document.getElementById('propOperacion').value = data.operacion || 'venta';
    document.getElementById('propUbicacion').value = data.ubicacion || '';
    document.getElementById('propTipo').value = data.tipo || 'piso';
    document.getElementById('propHabitaciones').value = data.habitaciones || '';
    document.getElementById('propBanos').value = data.banos || '';
    document.getElementById('propM2').value = data.m2 || '';
    document.getElementById('propAntiguedad').value = data.antiguedad || 'reformado';
    document.getElementById('propDestacado').value = data.destacado ? 'true' : 'false';
    document.getElementById('propCaracteristicas').value = data.caracteristicas?.join(', ') || '';
    document.getElementById('propDescripcion').value = data.descripcion || '';

    // Preview imágenes existentes
    const { data: imagenes } = await supabase.from('imagenes').select('url').eq('propiedad_id', id).order('orden');
    const preview = document.getElementById('propImagenesPreview');
    if (preview && imagenes) {
      preview.innerHTML = imagenes.map((img, i) => `
        <div style="position:relative;width:60px;height:60px;border-radius:8px;overflow:hidden;border:2px solid var(--gray-200);${i===0?'border-color:var(--accent);':''}">
          <img src="${img.url}" style="width:100%;height:100%;object-fit:cover;">
          ${i===0?'<span style="position:absolute;top:2px;right:2px;background:var(--accent);color:white;font-size:0.6rem;padding:1px 4px;border-radius:4px;">Principal</span>':''}
        </div>
      `).join('');
    }
  } catch (e) {
    console.error(e);
    alert('❌ Error al cargar propiedad.');
  }
}

export async function eliminarPropiedad(id) {
  if (!confirm('¿Eliminar esta propiedad permanentemente?')) return;
  try {
    const { error } = await supabase.from('propiedades').delete().eq('id', id);
    if (error) throw error;
    alert('✅ Propiedad eliminada.');
    await cargarPropiedadesAdmin();
    const { obtenerPropiedades, renderizarPropiedades } = await import('./properties.js');
    await obtenerPropiedades({});
    renderizarPropiedades();
  } catch (e) {
    console.error(e);
    alert('❌ Error al eliminar.');
  }
}

// ================================================================
// AGENTES ADMIN
// ================================================================
export async function cargarAgentesAdmin() {
  const container = document.getElementById('listaAgentesAdmin');
  if (!container) return;

  const { data, error } = await supabase.from('agentes').select('*').order('orden', { ascending: true });
  if (error) { container.innerHTML = '<p style="color:var(--danger);">Error al cargar agentes.</p>'; return; }
  if (!data || data.length === 0) { container.innerHTML = '<p style="color:var(--gray-500); text-align:center; padding:40px;">No hay agentes registrados.</p>'; return; }

  container.innerHTML = data.map(ag => `
    <div class="admin-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--gray-50); border-radius:var(--radius); margin-bottom:8px; border:1px solid var(--gray-200);">
      <div class="info" style="display:flex; align-items:center; gap:12px;">
        <div class="thumb" style="width:40px; height:40px; border-radius:50%; background:var(--gray-300); display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:1.2rem;">${ag.avatar_url ? `<img src="${ag.avatar_url}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}</div>
        <div>
          <strong>${ag.nombre} ${ag.apellido}</strong>
          <span style="display:block;font-size:0.8rem;color:var(--gray-500);">${ag.especialidad} ${!ag.activo ? '(Inactivo)' : ''}</span>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn-admin btn-admin-primary" data-edit-agente="${ag.id}" style="padding:8px 16px; border:none; border-radius:40px; font-weight:600; cursor:pointer; font-size:0.8rem; transition:var(--transition); background:var(--accent); color:white;"><i class="fas fa-edit"></i></button>
        <button class="btn-admin btn-admin-danger" data-del-agente="${ag.id}" style="padding:8px 16px; border:none; border-radius:40px; font-weight:600; cursor:pointer; font-size:0.8rem; transition:var(--transition); background:var(--danger); color:white;"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function mostrarFormAgente() {
  const form = document.getElementById('formAgente');
  if (!form) return;
  form.style.display = 'grid';
  document.getElementById('formAgenteTitulo').textContent = 'Nuevo Agente';
  window.agenteEditandoId = null;

  ['agenteNombre', 'agenteApellido', 'agenteEspecialidad', 'agenteEmail', 'agenteTelefono', 'agenteDescripcion', 'agenteOrden'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'agenteOrden' ? '99' : '';
  });

  document.getElementById('agenteAvatar').value = '';
  document.getElementById('agenteAvatarPreview').innerHTML = '<span>👤</span>';
}

function cerrarFormAgente() {
  const form = document.getElementById('formAgente');
  if (form) form.style.display = 'none';
  window.agenteEditandoId = null;
}

function previewAgenteAvatar(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const preview = document.getElementById('agenteAvatarPreview');
  if (preview) preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
}

export async function guardarAgente() {
  const nombre = document.getElementById('agenteNombre')?.value?.trim();
  const apellido = document.getElementById('agenteApellido')?.value?.trim();
  const especialidad = document.getElementById('agenteEspecialidad')?.value?.trim();
  const email = document.getElementById('agenteEmail')?.value?.trim();
  const telefono = document.getElementById('agenteTelefono')?.value?.trim();
  const descripcion = document.getElementById('agenteDescripcion')?.value?.trim();
  const orden = parseInt(document.getElementById('agenteOrden')?.value) || 99;
  const file = document.getElementById('agenteAvatar')?.files[0];

  if (!nombre || !apellido || !especialidad) { alert('⚠️ Completa nombre, apellido y especialidad.'); return; }

  try {
    let avatarUrl = null, avatarPublicId = null;
    if (file) {
      const { uploadToCloudinary } = await import('./cloudinary.js');
      validateImageFile(file);
      const folder = `inmoconecta/agentes/${window.agenteEditandoId || 'temp'}`;
      const img = await uploadToCloudinary(file, folder, CONFIG.CLOUDINARY_UPLOAD_PRESET_AGENTES);
      avatarUrl = img.url;
      avatarPublicId = img.public_id;
    }

    const datos = { nombre, apellido, especialidad, email: email || null, telefono: telefono || null, descripcion: descripcion || null, orden, activo: true };
    if (avatarUrl) { datos.avatar_url = avatarUrl; datos.avatar_public_id = avatarPublicId; }

    let result;
    if (window.agenteEditandoId) {
      result = await supabase.from('agentes').update(datos).eq('id', window.agenteEditandoId);
    } else {
      result = await supabase.from('agentes').insert([datos]).select();
    }
    if (result.error) throw result.error;

    alert(`✅ Agente ${window.agenteEditandoId ? 'actualizado' : 'creado'} correctamente.`);
    cerrarFormAgente();
    await cargarAgentesAdmin();

    // Refrescar vista pública
    const { obtenerAgentes, renderizarAgentes } = await import('./agents.js');
    const agentes = await obtenerAgentes();
    renderizarAgentes(agentes);
  } catch (e) {
    console.error(e);
    alert('❌ Error al guardar agente.');
  }
}

async function editarAgente(id) {
  try {
    const { data, error } = await supabase.from('agentes').select('*').eq('id', id).single();
    if (error) throw error;

    const form = document.getElementById('formAgente');
    form.style.display = 'grid';
    document.getElementById('formAgenteTitulo').textContent = 'Editar Agente';
    window.agenteEditandoId = id;

    document.getElementById('agenteNombre').value = data.nombre || '';
    document.getElementById('agenteApellido').value = data.apellido || '';
    document.getElementById('agenteEspecialidad').value = data.especialidad || '';
    document.getElementById('agenteEmail').value = data.email || '';
    document.getElementById('agenteTelefono').value = data.telefono || '';
    document.getElementById('agenteDescripcion').value = data.descripcion || '';
    document.getElementById('agenteOrden').value = data.orden || 99;

    const preview = document.getElementById('agenteAvatarPreview');
    if (preview && data.avatar_url) {
      preview.innerHTML = `<img src="${data.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else if (preview) {
      preview.innerHTML = '<span>👤</span>';
    }
  } catch (e) {
    console.error(e);
    alert('❌ Error al cargar agente.');
  }
}

export async function eliminarAgente(id) {
  if (!confirm('¿Desactivar este agente?')) return;
  try {
    const { error } = await supabase.from('agentes').update({ activo: false }).eq('id', id);
    if (error) throw error;
    alert('✅ Agente desactivado.');
    await cargarAgentesAdmin();
    const { obtenerAgentes, renderizarAgentes } = await import('./agents.js');
    const agentes = await obtenerAgentes();
    renderizarAgentes(agentes);
  } catch (e) {
    console.error(e);
    alert('❌ Error al eliminar agente.');
  }
}

// ================================================================
// URL ROUTING: /admin auto-abre panel
// ================================================================
export function initAdminRouting() {
  // Abrir si URL tiene /admin
  if (window.location.pathname.includes('/admin')) {
    setTimeout(() => abrirAdmin(), 100);
  }

  // Manejar popstate (back/forward)
  window.addEventListener('popstate', (e) => {
    if (e.state?.admin) {
      abrirAdmin();
    } else {
      cerrarAdmin();
    }
  });

  // Atajo teclado Ctrl+Shift+A
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      const panel = document.getElementById('adminPanel');
      if (panel && panel.classList.contains('active')) cerrarAdmin();
      else abrirAdmin();
    }
  });
}

// ================================================================
// EXPORTS GLOBALES PARA ONCLICK INLINE (compatibilidad)
// ================================================================
window.abrirAdmin = abrirAdmin;
window.cerrarAdmin = cerrarAdmin;
window.cambiarTabAdmin = (tab) => cambiarTabAdmin(tab);

window.mostrarFormPropiedad = () => {
  const form = document.getElementById('formPropiedad');
  if (!form) return;
  form.style.display = 'grid';
  document.getElementById('formPropTitulo').textContent = 'Nueva Propiedad';
  window.propEditandoId = null;
  ['propTitulo', 'propPrecio', 'propUbicacion', 'propCaracteristicas', 'propDescripcion', 'propMoneda', 'propOperacion', 'propTipo', 'propHabitaciones', 'propBanos', 'propM2', 'propAntiguedad', 'propDestacado'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'propMoneda' ? 'ARS' : id === 'propOperacion' ? 'venta' : id === 'propTipo' ? 'piso' : id === 'propAntiguedad' ? 'reformado' : id === 'propDestacado' ? 'false' : '';
  });
  document.getElementById('propImagenes').value = '';
  document.getElementById('propImagenesPreview').innerHTML = '';
  window.imagenesSubidas = [];
};

window.cerrarFormPropiedad = () => {
  const form = document.getElementById('formPropiedad');
  if (form) form.style.display = 'none';
  window.propEditandoId = null;
};

window.guardarPropiedad = guardarPropiedad;
window.editarPropiedad = editarPropiedad;
window.eliminarPropiedad = eliminarPropiedad;
window.cargarPropiedadesAdmin = cargarPropiedadesAdmin;

window.mostrarFormAgente = () => {
  const form = document.getElementById('formAgente');
  if (!form) return;
  form.style.display = 'grid';
  document.getElementById('formAgenteTitulo').textContent = 'Nuevo Agente';
  window.agenteEditandoId = null;
  ['agenteNombre', 'agenteApellido', 'agenteEspecialidad', 'agenteEmail', 'agenteTelefono', 'agenteDescripcion', 'agenteOrden'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'agenteOrden' ? '99' : '';
  });
  document.getElementById('agenteAvatar').value = '';
  document.getElementById('agenteAvatarPreview').innerHTML = '<span>👤</span>';
};

window.cerrarFormAgente = cerrarFormAgente;
window.guardarAgente = guardarAgente;
window.editarAgente = editarAgente;
window.eliminarAgente = eliminarAgente;
window.cargarAgentesAdmin = cargarAgentesAdmin;

window.abrirAdmin = abrirAdmin;
window.cerrarAdmin = cerrarAdmin;
window.cambiarTabAdmin = (tab) => cambiarTabAdmin(tab);