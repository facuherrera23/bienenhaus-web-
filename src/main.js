// ================================================================
// MAIN.JS - ENTRY POINT
// ================================================================
import './styles.css';
import { CONFIG } from './config.js';
import { supabase } from './supabase.js';
import {
  obtenerPropiedades,
  renderizarPropiedades,
  paginaActual,
  itemsPorPagina,
  aplicarFiltros,
  limpiarFiltros,
  propiedadActual,
  abrirDetalle
} from './properties.js';
import { obtenerAgentes, renderizarAgentes } from './agents.js';
import { initAllUI, cerrarDetalle } from './ui.js';
import { initAdminRouting } from './admin.js';

// ================================================================
// VARIABLES GLOBALES (compatibilidad con código inline en HTML)
// ================================================================
window.propiedadesData = [];
window.paginaActual = 1;
window.itemsPorPagina = 6;
window.propiedadActual = null;

let propEditandoId = null;
let agenteEditandoId = null;
let imagenesSubidas = [];

// ================================================================
// HELPERS: Lazy-load admin/agents modules solo cuando se necesiten
// ================================================================
async function loadAdmin() { return import('./admin.js'); }
async function loadAgents() { return import('./agents.js'); }

// ================================================================
// INICIALIZACIÓN
// ================================================================
async function init() {
  try {
    // 1. Cargar propiedades
    await obtenerPropiedades({});
    renderizarPropiedades();

    // 2. Cargar agentes (público)
    const agentes = await obtenerAgentes();
    renderizarAgentes(agentes);

    // 3. Inicializar toda la UI
    initAllUI();

    // 4. Inicializar routing admin (/admin auto-abre)
    initAdminRouting();

    console.log('✅ Bienenhaus inicializado correctamente');
  } catch (e) {
    console.error('❌ Error en init:', e);
  }
}

// ================================================================
// EXPORTS GLOBALES para onclick en HTML
// ================================================================
// Funciones core (síncronas o ya importadas)
window.obtenerPropiedades = obtenerPropiedades;
window.renderizarPropiedades = renderizarPropiedades;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.abrirDetalle = abrirDetalle;
window.cerrarDetalle = cerrarDetalle;

// Funciones admin - lazy load al hacer click
window.cargarPropiedadesAdmin = async () => { const m = await import('./admin.js'); return m.cargarPropiedadesAdmin(); };
window.cargarAgentesAdmin = async () => { const m = await import('./admin.js'); return m.cargarAgentesAdmin(); };
window.mostrarFormPropiedad = async () => { const m = await import('./admin.js'); return m.mostrarFormPropiedad(); };
window.cerrarFormPropiedad = async () => { const m = await import('./admin.js'); return m.cerrarFormPropiedad(); };
window.guardarPropiedad = async () => { const m = await import('./admin.js'); return m.guardarPropiedad(); };
window.editarPropiedad = async (id) => { const m = await import('./admin.js'); return m.editarPropiedad(id); };
window.eliminarPropiedad = async (id) => { const m = await import('./admin.js'); return m.eliminarPropiedad(id); };

// Funciones agentes - lazy load
window.mostrarFormAgente = async () => { const m = await import('./admin.js'); return m.mostrarFormAgente(); };
window.cerrarFormAgente = async () => { const m = await import('./admin.js'); return m.cerrarFormAgente(); };
window.guardarAgente = async () => { const m = await import('./admin.js'); return m.guardarAgente(); };
window.editarAgente = async (id) => { const m = await import('./admin.js'); return m.editarAgente(id); };
window.eliminarAgente = async (id) => { const m = await import('./admin.js'); return m.eliminarAgente(id); };
window.cargarAgentesAdmin = async () => { const m = await import('./admin.js'); return m.cargarAgentesAdmin(); };

// Admin UI helpers
window.cambiarTabAdmin = (name) => {
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab${name.charAt(0).toUpperCase() + name.slice(1)}`)?.classList.add('active');
  const btn = document.querySelector(`.admin-tab-btn[data-tab="${name}"]`);
  if (btn) { btn.classList.add('active'); btn.style.background = 'var(--primary)'; btn.style.color = 'white'; }
};
window.abrirAdmin = async () => { const m = await import('./admin.js'); return m.abrirAdmin(); };
window.cerrarAdmin = async () => { const m = await import('./admin.js'); return m.cerrarAdmin(); };
window.cambiarTabAdmin = async (tab) => { const m = await import('./admin.js'); return m.cambiarTabAdmin(tab); };

// ================================================================
// EJECUTAR
// ================================================================
init();