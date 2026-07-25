// ================================================================
// MAIN.JS - ENTRY POINT (Landing Page only)
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
import { cargarContenidoSitio } from './content.js';

// ================================================================
// VARIABLES GLOBALES (compatibilidad con código inline en HTML)
// ================================================================
window.propiedadesData = [];
window.paginaActual = 1;
window.itemsPorPagina = 6;
window.propiedadActual = null;

// ================================================================
// INICIALIZACIÓN
// ================================================================
async function init() {
  try {
    // 1. Cargar contenido dinámico del sitio (SEO, textos, etc.)
    await cargarContenidoSitio();

    // 2. Cargar propiedades
    await obtenerPropiedades({});
    renderizarPropiedades();

    // 3. Cargar agentes (público)
    const agentes = await obtenerAgentes();
    renderizarAgentes(agentes);

    // 4. Inicializar toda la UI
    initAllUI();

    console.log('✅ Bienenhaus inicializado correctamente');
  } catch (e) {
    console.error('❌ Error en init:', e);
  }
}

// ================================================================
// EXPORTS GLOBALES para onclick en HTML (solo landing page)
// ================================================================
window.obtenerPropiedades = obtenerPropiedades;
window.renderizarPropiedades = renderizarPropiedades;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.abrirDetalle = abrirDetalle;
window.cerrarDetalle = cerrarDetalle;

// ================================================================
// EJECUTAR
// ================================================================
init();