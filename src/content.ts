// ================================================================
// CONTENT LOADER - Carga contenido dinámico desde Supabase
// ================================================================
import { supabase } from './supabase.ts';
import { logError, logWarn, logDebug } from './utils/logger.ts';
import { escapeHtml, sanitizeHtml, sanitizeUrl } from './utils/sanitize.ts';

let siteContent = {};

// Mapeo de claves de BD a funciones de renderizado
const contentRenderers = {
  // Hero
  hero_badge: renderHeroBadge,
  hero_titulo: renderHeroTitulo,
  hero_subtitulo: renderHeroSubtitulo,
  hero_badges: renderHeroBadges,
  hero_cta_primario: renderHeroCtaPrimario,
  hero_cta_secundario: renderHeroCtaSecundario,
  hero_stats: renderHeroStats,
  
  // About
  about_titulo: renderAboutTitulo,
  about_descripcion: renderAboutDescripcion,
  about_valores: renderAboutValores,
  
  // Services
  servicios_titulo: renderServiciosTitulo,
  servicios_subtitulo: renderServiciosSubtitulo,
  servicios_lista: renderServiciosLista,
  
  // Why
  por_que_titulo: renderPorQueTitulo,
  por_que_subtitulo: renderPorQueSubtitulo,
  por_que_razones: renderPorQueRazones,
  
  // Team
  equipo_titulo: renderEquipoTitulo,
  equipo_subtitulo: renderEquipoSubtitulo,
  
  // Offices
  oficinas_titulo: renderOficinasTitulo,
  oficinas_subtitulo: renderOficinasSubtitulo,
  
  // Footer
  footer_marca: renderFooterMarca,
  footer_descripcion: renderFooterDescripcion,
  footer_contacto: renderFooterContacto,
  footer_links: renderFooterLinks,
  footer_servicios: renderFooterServicios,
  footer_copyright: renderFooterCopyright,
  
  // SEO
  seo_titulo: renderSeoTitulo,
  seo_descripcion: renderSeoDescripcion,
  seo_keywords: renderSeoKeywords,
  seo_og_image: renderSeoOgImage,
  seo_twitter_card: renderSeoTwitterCard,
  seo_schema: renderSeoSchema,
  
  // FAQ
  faq_titulo: renderFaqTitulo,
  faq_subtitulo: renderFaqSubtitulo,
  faq_grid: renderFaqGrid,
  
  // Contacto
  contacto_titulo: renderContactoTitulo,
  contacto_subtitulo: renderContactoSubtitulo,
  
  // Site settings
  site_nombre: renderSiteNombre,
  site_eslogan: renderSiteEslogan,
  site_telefono: renderSiteTelefono,
  site_email: renderSiteEmail,
  site_whatsapp: renderSiteWhatsApp,
  site_direccion: renderSiteDireccion,
  site_horario: renderSiteHorario,
  site_cobertura: renderSiteCobertura
};

// ================================================================
// CARGAR CONTENIDO
// ================================================================
export async function cargarContenidoSitio() {
  try {
    const { data, error } = await supabase
      .from('contenido_sitio')
      .select('clave, valor');
    
    if (error) {
      // Silently handle auth/permission errors - fail gracefully
      if (error.status === 401 || error.status === 403 || error.message?.includes('JWT')) {
        logWarn('Supabase auth issue - using default content', { status: error.status }, 'content');
        return {};
      }
      throw error;
    }
    
    siteContent = {};
    (data || []).forEach(item => {
      siteContent[item.clave] = item.valor;
    });
    
    renderAllContent();
    
    return siteContent;
  } catch (e) {
    logWarn('Content load failed - using default HTML content', { error: e }, 'content');
    return {};
  }
}

function renderAllContent() {
  // Parallelize independent renderers using Promise.all
  const renderPromises = Object.entries(contentRenderers).map(([clave, renderer]) => {
    if (siteContent[clave] !== undefined) {
      return Promise.resolve().then(() => {
        try {
          renderer(siteContent[clave]);
        } catch (e) {
          logWarn(`Error renderizando ${clave}:`, { error: e }, 'content');
        }
      });
    }
    return Promise.resolve();
  });
  
  return Promise.all(renderPromises);
}

// ================================================================
// HELPERS DE PARSEO
// ================================================================
function parsePipeArray(value, fields) {
  if (!value) return [];
  return value.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.split('|');
      const obj = {};
      fields.forEach((field, i) => obj[field] = parts[i]?.trim() || '');
      return obj;
    });
}

// ================================================================
// RENDERIZADORES - HERO
// ================================================================
function renderHeroBadge(value) {
  const el = document.getElementById('heroBadgeTop');
  if (el) el.textContent = value;
}

function renderHeroTitulo(value) {
  const el = document.getElementById('heroTitulo');
  if (el) el.innerHTML = sanitizeHtml(value).replace(/\n/g, '<br>');
}

function renderHeroSubtitulo(value) {
  const el = document.getElementById('heroSubtitulo');
  if (el) el.textContent = value;
}

function renderHeroBadges(value) {
  const container = document.getElementById('heroBadges');
  if (!container) return;

  const badges = Array.isArray(value) ? value : value.split('\n').filter(b => b.trim());
  container.innerHTML = badges.map(badge =>
    `<span class="hero-badge"><i class="fas fa-check-circle" aria-hidden="true"></i> ${escapeHtml(String(badge).trim())}</span>`
  ).join('');
}

function renderHeroCtaPrimario(value) {
  const el = document.getElementById('heroCtaPrimario');
  if (el) el.innerHTML = `<i class="fas fa-search"></i> ${escapeHtml(value)}`;
}

function renderHeroCtaSecundario(value) {
  const el = document.getElementById('heroCtaSecundario');
  if (el) el.innerHTML = `<i class="fas fa-comment-dots"></i> ${escapeHtml(value)}`;
}

function renderHeroStats(value) {
  const container = document.getElementById('heroStats');
  if (!container) return;
  
  const stats = Array.isArray(value) ? value : parsePipeArray(value, ['label', 'valor', 'icono']);
  
  container.innerHTML = stats.map(stat => `
    <div class="stat">
      <div class="number" style="font-size: 2.5rem; font-weight: 800; color: var(--primary);">
        ${stat.valor || stat.valor === 0 ? escapeHtml(String(stat.valor)) : '—'}
      </div>
      <div class="label">${escapeHtml(stat.label || '')}</div>
    </div>
  `).join('');
}

// ================================================================
// RENDERIZADORES - ABOUT
// ================================================================
function renderAboutTitulo(value) {
  const el = document.getElementById('aboutTitulo');
  if (el) el.textContent = value;
}

function renderAboutDescripcion(value) {
  const el = document.getElementById('aboutDescripcion');
  if (el) el.innerHTML = escapeHtml(value).replace(/\n/g, '<br>');
}

function renderAboutValores(value) {
  const container = document.getElementById('aboutValores');
  if (!container) return;
  
  const valores = Array.isArray(value) ? value : parsePipeArray(value, ['icono', 'titulo', 'descripcion']);
  
  container.innerHTML = valores.map(v => `
    <div class="valor-item">
      <i class="${escapeHtml(v.icono || 'fas fa-star')}" aria-hidden="true"></i>
      <h4>${escapeHtml(v.titulo || '')}</h4>
      <p>${escapeHtml(v.descripcion || '')}</p>
    </div>
  `).join('');
}

// ================================================================
// RENDERIZADORES - SERVICIOS
// ================================================================
function renderServiciosTitulo(value) {
  const el = document.getElementById('serviciosTitulo');
  if (el) el.textContent = value;
}

function renderServiciosSubtitulo(value) {
  const el = document.getElementById('serviciosSubtitulo');
  if (el) el.textContent = value;
}

function renderServiciosLista(value) {
  const container = document.getElementById('serviciosLista');
  if (!container) return;
  
  const servicios = Array.isArray(value) ? value : parsePipeArray(value, ['icono', 'titulo', 'descripcion']);
  
  container.innerHTML = servicios.map(s => `
    <div class="servicio-item">
      <i class="${escapeHtml(s.icono || 'fas fa-home')}" aria-hidden="true"></i>
      <h4>${escapeHtml(s.titulo || '')}</h4>
      <p>${escapeHtml(s.descripcion || '')}</p>
    </div>
  `).join('');
}

// ================================================================
// RENDERIZADORES - POR QUÉ ELEGIRNOS
// ================================================================
function renderPorQueTitulo(value) {
  const el = document.getElementById('porQueTitulo');
  if (el) el.innerHTML = `<i class="fas fa-star"></i> ${escapeHtml(value)}`;
}

function renderPorQueSubtitulo(value) {
  const el = document.getElementById('porQueSubtitulo');
  if (el) el.textContent = value;
}

function renderPorQueRazones(value) {
  const container = document.getElementById('porQueRazones');
  if (!container) return;
  
  const razones = Array.isArray(value) ? value : parsePipeArray(value, ['emoji', 'titulo', 'descripcion']);
  
  container.innerHTML = razones.map(r => `
    <div class="porque-item">
      <div class="icono" style="font-size:2.5rem;">${escapeHtml(r.emoji || '⭐')}</div>
      <h4>${escapeHtml(r.titulo || '')}</h4>
      <p>${escapeHtml(r.descripcion || '')}</p>
    </div>
  `).join('');
}

// ================================================================
// RENDERIZADORES - EQUIPO
// ================================================================
function renderEquipoTitulo(value) {
  const el = document.getElementById('equipoTitulo');
  if (el) el.innerHTML = `<i class="fas fa-users"></i> ${escapeHtml(value)}`;
}

function renderEquipoSubtitulo(value) {
  const el = document.getElementById('equipoSubtitulo');
  if (el) el.textContent = value;
}

// ================================================================
// RENDERIZADORES - OFICINAS
// ================================================================
function renderOficinasTitulo(value) {
  const el = document.getElementById('oficinasTitulo');
  if (el) el.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${escapeHtml(value)}`;
}

function renderOficinasSubtitulo(value) {
  const el = document.getElementById('oficinasSubtitulo');
  if (el) el.textContent = value;
}

// ================================================================
// RENDERIZADORES - FOOTER
// ================================================================
function renderFooterMarca(value) {
  const el = document.getElementById('footerMarca');
  if (el) el.innerHTML = escapeHtml(value);
}

function renderFooterDescripcion(value) {
  const el = document.getElementById('footerDescripcion');
  if (el) el.textContent = value;
}

function renderFooterContacto(value) {
  const el = document.getElementById('footerContacto');
  if (el) el.innerHTML = escapeHtml(value).replace(/\n/g, '<br>');
}

function renderFooterLinks(value) {
  const container = document.getElementById('footerLinks');
  if (!container) return;
  
  const links = Array.isArray(value) ? value : parsePipeArray(value, ['texto', 'url']);
  
  container.innerHTML = links.map(l => 
    `<li><a href="${sanitizeUrl(l.url || '#')}"><i class="fas fa-chevron-right"></i> ${escapeHtml(l.texto || '')}</a></li>`
  ).join('');
}

function renderFooterServicios(value) {
  const container = document.getElementById('footerServicios');
  if (!container) return;
  
  const servicios = Array.isArray(value) ? value : parsePipeArray(value, ['texto', 'url']);
  
  container.innerHTML = servicios.map(s => 
    `<li><a href="${sanitizeUrl(s.url || '#')}"><i class="fas fa-chevron-right"></i> ${escapeHtml(s.texto || '')}</a></li>`
  ).join('');
}

function renderFooterCopyright(value) {
  const el = document.getElementById('footerCopyright');
  if (el) el.textContent = value;
}

// ================================================================
// RENDERIZADORES - SEO
// ================================================================
function renderSeoTitulo(value) {
  document.title = value;
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', value);
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', value);
}

function renderSeoDescripcion(value) {
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', value);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', value);
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', value);
}

function renderSeoKeywords(value) {
  const meta = document.querySelector('meta[name="keywords"]');
  if (meta) meta.setAttribute('content', value);
}

function renderSeoOgImage(value) {
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) ogImage.setAttribute('content', value);
  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (twitterImage) twitterImage.setAttribute('content', value);
}

function renderSeoTwitterCard(value) {
  const twitterCard = document.querySelector('meta[name="twitter:card"]');
  if (twitterCard) twitterCard.setAttribute('content', value);
}

function renderSeoSchema(value) {
  const schema = document.querySelector('script[type="application/ld+json"]');
  if (schema && value) {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return;
      if (!parsed['@context'] || !parsed['@type']) return;
      schema.textContent = JSON.stringify(parsed);
    } catch (e) {
      logWarn('Schema JSON inválido:', { error: e }, 'content');
    }
  }
}

// ================================================================
// RENDERIZADORES - SITE SETTINGS
// ================================================================
function renderSiteNombre(value) {
  const logoSpan = document.querySelector('.logo span');
  if (logoSpan) logoSpan.textContent = value;
}

function renderSiteEslogan(value) {
  // Se puede usar en hero badge o tagline
  const badge = document.getElementById('heroBadgeTop');
  if (badge) badge.innerHTML = `<i class="fas fa-crown"></i> ${escapeHtml(value)}`;
}

function renderSiteTelefono(value) {
  const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
  phoneLinks.forEach(a => {
    a.href = `tel:${value.replace(/\D/g, '')}`;
    a.textContent = value;
  });
  const phoneText = document.getElementById('sitePhone');
  if (phoneText) phoneText.textContent = value;
}

function renderSiteEmail(value) {
  const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
  emailLinks.forEach(a => {
    a.href = `mailto:${value}`;
    a.textContent = value;
  });
  const emailText = document.getElementById('siteEmail');
  if (emailText) emailText.textContent = value;
}

function renderSiteWhatsApp(value) {
  const waLinks = document.querySelectorAll('a[href^="https://wa.me/"], a[href^="whatsapp://"]');
  waLinks.forEach(a => {
    const clean = value.replace(/\D/g, '');
    a.href = `https://wa.me/${clean}`;
  });
}

function renderSiteDireccion(value) {
  const el = document.getElementById('siteDireccion');
  if (el) el.textContent = value;
}

function renderSiteHorario(value) {
  const el = document.getElementById('siteHorario');
  if (el) el.textContent = value;
}

function renderSiteCobertura(value) {
  const el = document.getElementById('siteCobertura');
  if (el) el.textContent = value;
}

// ================================================================
// RENDERIZADORES - FAQ
// ================================================================
function renderFaqTitulo(value) {
  const el = document.getElementById('faqTitulo');
  if (el) el.innerHTML = `<i class="fas fa-question-circle"></i> ${escapeHtml(value)}`;
}

function renderFaqSubtitulo(value) {
  const el = document.getElementById('faqSubtitulo');
  if (el) el.textContent = value;
}

function renderFaqGrid(value) {
  const container = document.getElementById('faqGrid');
  if (!container) return;
  
  const faqs = Array.isArray(value) ? value : parsePipeArray(value, ['pregunta', 'respuesta']);
  
  container.innerHTML = faqs.map(faq => `
    <div class="faq-item">
      <h4><i class="fas fa-chevron-right"></i> ${escapeHtml(faq.pregunta || '')}</h4>
      <p>${escapeHtml(faq.respuesta || '')}</p>
    </div>
  `).join('');
}

// ================================================================
// RENDERIZADORES - CONTACTO
// ================================================================
function renderContactoTitulo(value) {
  const el = document.getElementById('contactoTitulo');
  if (el) el.innerHTML = `<i class="fas fa-envelope"></i> ${escapeHtml(value)}`;
}

function renderContactoSubtitulo(value) {
  const el = document.getElementById('contactoSubtitulo');
  if (el) el.textContent = value;
}

// ================================================================
// EXPORT PARA USO EN ADMIN (recargar sin recargar página)
// ================================================================
export function recargarContenido() {
  return cargarContenidoSitio();
}