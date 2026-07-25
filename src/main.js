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
import { obtenerAgentes, renderizarAgentes, cargarAgentesAdmin } from './agents.js';
import { initAllUI, cerrarDetalle } from './ui.js';

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
    // propiedadesData se actualiza internamente en properties.js
    renderizarPropiedades();

    // 2. Cargar agentes (público)
    const agentes = await obtenerAgentes();
    renderizarAgentes(agentes);

    // 3. Inicializar toda la UI
    initAllUI();

    // 4. Cargar admin si está visible
    const btnAdmin = document.getElementById('btnAdmin');
    if (btnAdmin && btnAdmin.style.display === 'block') {
      const { cargarPropiedadesAdmin } = await loadAdmin();
      await cargarPropiedadesAdmin();
      await cargarAgentesAdmin();
    }

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
window.cargarPropiedadesAdmin = cargarPropiedadesAdmin;
window.cargarAgentesAdmin = cargarAgentesAdmin;

// Funciones admin - lazy load al hacer click
window.mostrarFormPropiedad = async () => { const m = await loadAdmin(); return m.mostrarFormPropiedad(); };
window.cerrarFormPropiedad = async () => { const m = await loadAdmin(); return m.cerrarFormPropiedad(); };
window.guardarPropiedad = async () => { const m = await loadAdmin(); return m.guardarPropiedad(); };
window.editarPropiedad = async (id) => { const m = await loadAdmin(); return m.editarPropiedad(id); };
window.eliminarPropiedad = async (id) => { const m = await loadAdmin(); return m.eliminarPropiedad(id); };

// Funciones agentes - lazy load
window.mostrarFormAgente = async () => { const m = await loadAgents(); return m.mostrarFormAgente(); };
window.cerrarFormAgente = async () => { const m = await loadAgents(); return m.cerrarFormAgente(); };
window.guardarAgente = async () => { const m = await loadAgents(); return m.guardarAgente(); };
window.editarAgente = async (id) => { const m = await loadAgents(); return m.editarAgente(id); };
window.eliminarAgente = async (id) => { const m = await loadAgents(); return m.eliminarAgente(id); };

// Admin UI helpers
window.cambiarTabAdmin = (name) => {
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab${name.charAt(0).toUpperCase() + name.slice(1)}`)?.classList.add('active');
  document.querySelector(`.admin-tabs button[onclick*="${name}"]`)?.classList.add('active');
};
window.abrirAdmin = () => {
  document.getElementById('adminPanel')?.classList.add('active');
  document.body.style.overflow = 'hidden';
};
window.cerrarAdmin = () => {
  document.getElementById('adminPanel')?.classList.remove('active');
  document.body.style.overflow = '';
};

// ================================================================
// EJECUTAR
// ================================================================
init();