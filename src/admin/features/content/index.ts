// ================================================================
// ADMIN CONTENT FEATURE - Gestión de textos del sitio
// ================================================================
import { supabase } from '../../../supabase.js';
import { showToast } from '../shared/utils.js';

let contentCache: Record<string, any> = {};

function parsePipeArray(value: string, fields: string[]): Record<string, string>[] {
  if (!value) return [];
  return value.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const parts = line.split('|');
      const obj: Record<string, string> = {};
      fields.forEach((field, i) => { obj[field] = parts[i]?.trim() || ''; });
      return obj;
    });
}

// ================================================================
// CARGAR CONTENIDO
// ================================================================
export async function loadContent(): Promise<void> {
  try {
    const { data, error } = await supabase.from('contenido_sitio').select('clave, valor');
    if (error) throw error;
    contentCache = {};
    (data || []).forEach(item => { contentCache[item.clave] = item.valor; });
    renderAllContent();
    return contentCache;
  } catch (e) {
    console.error('Error cargando contenido:', e);
    return {};
  }
}

function renderAllContent(): void {
  Object.entries(contentCache).forEach(([clave, valor]) => {
    try { contentRenderers[clave]?.(valor); } catch (e) { console.warn(`Error renderizando ${clave}:`, e); }
  });
}

// ================================================================
// HELPERS DE PARSEO
// ================================================================

// ================================================================
// RENDERIZADORES - HERO
// ================================================================
function renderHeroBadge(value: any) { const el = document.getElementById('heroBadgeTop'); if (el) el.textContent = value; }
function renderHeroTitulo(value: any) { const el = document.getElementById('heroTitulo'); if (el) el.innerHTML = value.replace(/\n/g, '<br>'); }
function renderHeroSubtitulo(value: any) { const el = document.getElementById('heroSubtitulo'); if (el) el.textContent = value; }
function renderHeroBadges(value: any) { const container = document.getElementById('heroBadges'); if (!container) return; const badges = Array.isArray(value) ? value : value.split('\n').filter(b => b.trim()); container.innerHTML = badges.map(badge => `<span class="hero-badge"><i class="fas fa-check-circle"></i> ${badge.trim()}</span>`).join(''); }
function renderHeroCtaPrimario(value: any) { const el = document.getElementById('heroCtaPrimario'); if (el) el.innerHTML = `<i class="fas fa-search"></i> ${value}`; }
function renderHeroCtaSecundario(value: any) { const el = document.getElementById('heroCtaSecundario'); if (el) el.innerHTML = `<i class="fas fa-comment-dots"></i> ${value}`; }
function renderHeroStats(value: any) {
  const container = document.getElementById('heroStats'); if (!container) return;
  const stats = Array.isArray(value) ? value : parsePipeArray(value, ['label', 'valor', 'icono']);
  container.innerHTML = stats.map(stat => `
    <div class="stat"><div class="number" style="font-size: 2.5rem; font-weight: 800; color: var(--primary);">${stat.valor || stat.valor === 0 ? stat.valor : '—'}</div><div class="label">${stat.label || ''}</div></div>
  `).join('');
}

// ================================================================
// RENDERIZADORES - ABOUT
// ================================================================
function renderAboutTitulo(value: any) { const el = document.getElementById('aboutTitulo'); if (el) el.textContent = value; }
function renderAboutDescripcion(value: any) { const el = document.getElementById('aboutDescripcion'); if (el) el.innerHTML = value.replace(/\n/g, '<br>'); }
function renderAboutValores(value: any) {
  const container = document.getElementById('aboutValores'); if (!container) return;
  const valores = Array.isArray(value) ? value : parsePipeArray(value, ['icono', 'titulo', 'descripcion']);
  container.innerHTML = valores.map(v => `
    <div class="valor-item"><i class="${v.icono || 'fas fa-star'}" aria-hidden="true"></i><h4>${v.titulo || ''}</h4><p>${v.descripcion || ''}</p></div>
  `).join('');
}

// ================================================================
// RENDERIZADORES - SERVICIOS
// ================================================================
function renderServiciosTitulo(value: any) { const el = document.getElementById('serviciosTitulo'); if (el) el.textContent = value; }
function renderServiciosSubtitulo(value: any) { const el = document.getElementById('serviciosSubtitulo'); if (el) el.textContent = value; }
function renderServiciosLista(value: any) {
  const container = document.getElementById('serviciosLista'); if (!container) return;
  const servicios = Array.isArray(value) ? value : parsePipeArray(value, ['icono', 'titulo', 'descripcion']);
  container.innerHTML = servicios.map(s => `
    <div class="servicio-item"><i class="${s.icono || 'fas fa-home'}" aria-hidden="true"></i><h4>${s.titulo || ''}</h4><p>${s.descripcion || ''}</p></div>
  `).join('');
}

// ================================================================
// RENDERIZADORES - POR QUÉ ELEGIRNOS
// ================================================================
function renderPorQueTitulo(value: any) { const el = document.getElementById('porQueTitulo'); if (el) el.innerHTML = `<i class="fas fa-star"></i> ${value}`; }
function renderPorQueSubtitulo(value: any) { const el = document.getElementById('porQueSubtitulo'); if (el) el.textContent = value; }
function renderPorQueRazones(value: any) {
  const container = document.getElementById('porQueRazones'); if (!container) return;
  const razones = Array.isArray(value) ? value : parsePipeArray(value, ['emoji', 'titulo', 'descripcion']);
  container.innerHTML = razones.map(r => `
    <div class="porque-item"><div class="icono" style="font-size:2.5rem;">${r.emoji || '⭐'}</div><h4>${r.titulo || ''}</h4><p>${r.descripcion || ''}</p></div>
  `).join('');
}

// ================================================================
// RENDERIZADORES - EQUIPO
// ================================================================
function renderEquipoTitulo(value: any) { const el = document.getElementById('equipoTitulo'); if (el) el.innerHTML = `<i class="fas fa-users"></i> ${value}`; }
function renderEquipoSubtitulo(value: any) { const el = document.getElementById('equipoSubtitulo'); if (el) el.textContent = value; }

// ================================================================
// RENDERIZADORES - OFICINAS
// ================================================================
function renderOficinasTitulo(value: any) { const el = document.getElementById('oficinasTitulo'); if (el) el.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${value}`; }
function renderOficinasSubtitulo(value: any) { const el = document.getElementById('oficinasSubtitulo'); if (el) el.textContent = value; }

// ================================================================
// RENDERIZADORES - FOOTER
// ================================================================
function renderFooterMarca(value: any) { const el = document.getElementById('footerMarca'); if (el) el.innerHTML = value; }
function renderFooterDescripcion(value: any) { const el = document.getElementById('footerDescripcion'); if (el) el.textContent = value; }
function renderFooterContacto(value: any) { const el = document.getElementById('footerContacto'); if (el) el.innerHTML = value.replace(/\n/g, '<br>'); }
function renderFooterLinks(value: any) {
  const container = document.getElementById('footerLinks'); if (!container) return;
  const links = Array.isArray(value) ? value : parsePipeArray(value, ['texto', 'url']);
  container.innerHTML = links.map(l => `<li><a href="${l.url || '#'}"><i class="fas fa-chevron-right"></i> ${l.texto || ''}</a></li>`).join('');
}
function renderFooterServicios(value: any) {
  const container = document.getElementById('footerServicios'); if (!container) return;
  const servicios = Array.isArray(value) ? value : parsePipeArray(value, ['texto', 'url']);
  container.innerHTML = servicios.map(s => `<li><a href="${s.url || '#'}"><i class="fas fa-chevron-right"></i> ${s.texto || ''}</a></li>`).join('');
}
function renderFooterCopyright(value: any) { const el = document.getElementById('footerCopyright'); if (el) el.textContent = value; }

// ================================================================
// RENDERIZADORES - SEO
// ================================================================
function renderSeoTitulo(value: any) {
  document.title = value;
  const ogTitle = document.querySelector('meta[property="og:title"]'); if (ogTitle) ogTitle.setAttribute('content', value);
  const twitterTitle = document.querySelector('meta[name="twitter:title"]'); if (twitterTitle) twitterTitle.setAttribute('content', value);
}
function renderSeoDescripcion(value: any) {
  const metaDesc = document.querySelector('meta[name="description"]'); if (metaDesc) metaDesc.setAttribute('content', value);
  const ogDesc = document.querySelector('meta[property="og:description"]'); if (ogDesc) ogDesc.setAttribute('content', value);
  const twitterDesc = document.querySelector('meta[name="twitter:description"]'); if (twitterDesc) twitterDesc.setAttribute('content', value);
}
function renderSeoKeywords(value: any) { const meta = document.querySelector('meta[name="keywords"]'); if (meta) meta.setAttribute('content', value); }
function renderSeoOgImage(value: any) { const ogImage = document.querySelector('meta[property="og:image"]'); if (ogImage) ogImage.setAttribute('content', value); const twitterImage = document.querySelector('meta[name="twitter:image"]'); if (twitterImage) twitterImage.setAttribute('content', value); }
function renderSeoTwitterCard(value: any) { const twitterCard = document.querySelector('meta[name="twitter:card"]'); if (twitterCard) twitterCard.setAttribute('content', value); }
function renderSeoSchema(value: any) { const schema = document.querySelector('script[type="application/ld+json"]'); if (schema && value) { try { schema.textContent = value; } catch (e) { console.warn('Schema JSON inválido:', e); } } }

// ================================================================
// RENDERIZADORES - SITE SETTINGS
// ================================================================
function renderSiteNombre(value: any) { const logoSpan = document.querySelector('.logo span'); if (logoSpan) logoSpan.textContent = value; }
function renderSiteEslogan(value: any) { const badge = document.getElementById('heroBadgeTop'); if (badge) badge.innerHTML = `<i class="fas fa-crown"></i> ${value}`; }
function renderSiteTelefono(value: any) {
  const phoneLinks = document.querySelectorAll('a[href^="tel:"]'); phoneLinks.forEach(a => { a.href = `tel:${value.replace(/\D/g, '')}`; a.textContent = value; });
  const phoneText = document.getElementById('sitePhone'); if (phoneText) phoneText.textContent = value;
}
function renderSiteEmail(value: any) { const emailLinks = document.querySelectorAll('a[href^="mailto:"]'); emailLinks.forEach(a => { a.href = `mailto:${value}`; a.textContent = value; }); const emailText = document.getElementById('siteEmail'); if (emailText) emailText.textContent = value; }
function renderSiteWhatsApp(value: any) { const waLinks = document.querySelectorAll('a[href^="https://wa.me/"], a[href^="whatsapp://"]'); waLinks.forEach(a => { const clean = value.replace(/\D/g, ''); a.href = `https://wa.me/${clean}`; }); }
function renderSiteDireccion(value: any) { const el = document.getElementById('siteDireccion'); if (el) el.textContent = value; }
function renderSiteHorario(value: any) { const el = document.getElementById('siteHorario'); if (el) el.textContent = value; }
function renderSiteCobertura(value: any) { const el = document.getElementById('siteCobertura'); if (el) el.textContent = value; }

// ================================================================
// RENDERIZADORES - FAQ
// ================================================================
function renderFaqTitulo(value: any) { const el = document.getElementById('faqTitulo'); if (el) el.innerHTML = `<i class="fas fa-question-circle"></i> ${value}`; }
function renderFaqSubtitulo(value: any) { const el = document.getElementById('faqSubtitulo'); if (el) el.textContent = value; }
function renderFaqGrid(value: any) {
  const container = document.getElementById('faqGrid'); if (!container) return;
  const faqs = Array.isArray(value) ? value : parsePipeArray(value, ['pregunta', 'respuesta']);
  container.innerHTML = faqs.map(faq => `<div class="faq-item"><h4><i class="fas fa-chevron-right"></i> ${faq.pregunta || ''}</h4><p>${faq.respuesta || ''}</p></div>`).join('');
}

// ================================================================
// RENDERIZADORES - CONTACTO
// ================================================================
function renderContactoTitulo(value: any) { const el = document.getElementById('contactoTitulo'); if (el) el.innerHTML = `<i class="fas fa-envelope"></i> ${value}`; }
function renderContactoSubtitulo(value: any) { const el = document.getElementById('contactoSubtitulo'); if (el) el.textContent = value; }

// ================================================================
// MAPEO DE RENDERIZADORES
// ================================================================
const contentRenderers: Record<string, (value: any) => void> = {
  hero_badge: renderHeroBadge,
  hero_titulo: renderHeroTitulo,
  hero_subtitulo: renderHeroSubtitulo,
  hero_badges: renderHeroBadges,
  hero_cta_primario: renderHeroCtaPrimario,
  hero_cta_secundario: renderHeroCtaSecundario,
  hero_stats: renderHeroStats,
  about_titulo: renderAboutTitulo,
  about_descripcion: renderAboutDescripcion,
  about_valores: renderAboutValores,
  servicios_titulo: renderServiciosTitulo,
  servicios_subtitulo: renderServiciosSubtitulo,
  servicios_lista: renderServiciosLista,
  por_que_titulo: renderPorQueTitulo,
  por_que_subtitulo: renderPorQueSubtitulo,
  por_que_razones: renderPorQueRazones,
  equipo_titulo: renderEquipoTitulo,
  equipo_subtitulo: renderEquipoSubtitulo,
  oficinas_titulo: renderOficinasTitulo,
  oficinas_subtitulo: renderOficinasSubtitulo,
  footer_marca: renderFooterMarca,
  footer_descripcion: renderFooterDescripcion,
  footer_contacto: renderFooterContacto,
  footer_links: renderFooterLinks,
  footer_servicios: renderFooterServicios,
  footer_copyright: renderFooterCopyright,
  seo_titulo: renderSeoTitulo,
  seo_descripcion: renderSeoDescripcion,
  seo_keywords: renderSeoKeywords,
  seo_og_image: renderSeoOgImage,
  seo_twitter_card: renderSeoTwitterCard,
  seo_schema: renderSeoSchema,
  site_nombre: renderSiteNombre,
  site_eslogan: renderSiteEslogan,
  site_telefono: renderSiteTelefono,
  site_email: renderSiteEmail,
  site_whatsapp: renderSiteWhatsApp,
  site_direccion: renderSiteDireccion,
  site_horario: renderSiteHorario,
  site_cobertura: renderSiteCobertura,
  faq_titulo: renderFaqTitulo,
  faq_subtitulo: renderFaqSubtitulo,
  faq_grid: renderFaqGrid,
  contacto_titulo: renderContactoTitulo,
  contacto_subtitulo: renderContactoSubtitulo,
};

// ================================================================
// CARGAR Y RENDERIZAR
// ================================================================
async function cargarContenidoSitio(): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase.from('contenido_sitio').select('clave, valor');
    if (error) throw error;
    contentCache = {};
    (data || []).forEach(item => { contentCache[item.clave] = item.valor; });
    renderAllContent();
    return contentCache;
  } catch (e) { console.error('Error cargando contenido:', e); return {}; }
}

// Para uso en admin (recargar sin recargar página)
function recargarContenido(): Promise<Record<string, any>> { return cargarContenidoSitio(); }

export { cargarContenidoSitio, recargarContenido };