// ================================================================
// HERO COMPONENT
// ================================================================

import './Hero.css';

let heroElement = null;

export function initHero() {
  const existingHero = document.getElementById('hero') || document.querySelector('.hero');
  if (existingHero) {
    heroElement = existingHero;
    bindEvents();
    populateFromContent();
    return;
  }

  heroElement = createHero();

  // Replace hero placeholder
  const placeholder = document.getElementById('hero-placeholder');
  if (placeholder && placeholder.parentNode) {
    placeholder.parentNode.replaceChild(heroElement, placeholder);
  } else {
    // Fallback: insert after header
    const header = document.querySelector('header') || document.querySelector('.header');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(heroElement, header.nextSibling);
    } else {
      document.body.insertBefore(heroElement, document.body.firstChild);
    }
  }

  bindEvents();
  populateFromContent();
}

function createHero() {
  const hero = document.createElement('section');
  hero.className = 'hero';
  hero.id = 'hero';
  hero.setAttribute('role', 'banner');
  hero.innerHTML = `
    <div class="hero-content container">
      <div class="hero-badge" id="heroBadgeTop">
        <i class="fas fa-crown" aria-hidden="true"></i> CPI. 1834 · Córdoba · Argentina
      </div>
      <h1 id="heroTitulo">
        Encuentra tu <span class="highlight">hogar</span> o la<br>
        inversión que <span class="highlight">buscas</span>
      </h1>
      <p id="heroSubtitulo">Más de <span id="heroCount">300</span> propiedades en venta y alquiler. Asesoría profesional, tasación sin compromiso y video tours 360°.</p>

      <div class="hero-badges" id="heroBadges">
        <span class="hero-badge"><i class="fas fa-check-circle" aria-hidden="true"></i> Sin comisiones ocultas</span>
        <span class="hero-badge"><i class="fas fa-shield-alt" aria-hidden="true"></i> Garantía legal</span>
        <span class="hero-badge"><i class="fas fa-video" aria-hidden="true"></i> Video tours 360°</span>
        <span class="hero-badge"><i class="fas fa-clock" aria-hidden="true"></i> Respuesta en 24h</span>
      </div>

      <div class="hero-cta-group">
        <a href="#catalogo" class="btn-hero-primary" id="heroCtaPrimario"><i class="fas fa-search" aria-hidden="true"></i> Ver propiedades</a>
        <a href="#contacto" class="btn-hero-secondary" id="heroCtaSecundario"><i class="fas fa-comment-dots" aria-hidden="true"></i> Solicitar asesoría</a>
      </div>

      <div class="hero-stats" id="heroStats">
        <div class="stat"><div class="number" id="statPropiedades">Cargando...</div><div class="label">Propiedades activas</div></div>
        <div class="stat"><div class="number">1.200+</div><div class="label">Operaciones cerradas</div></div>
        <div class="stat"><div class="number">98%</div><div class="label">Satisfacción clientes</div></div>
        <div class="stat"><div class="number">18+</div><div class="label">Años de experiencia</div></div>
      </div>
    </div>
  `;
  return hero;
}

function bindEvents() {
  if (!heroElement) return;

  // Smooth scroll for CTA links
  heroElement.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const header = document.querySelector('.header');
        const headerHeight = header?.offsetHeight || 0;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });

  // Animate stats on scroll
  initStatsAnimation();
}

function initStatsAnimation() {
  const stats = heroElement?.querySelectorAll('.stat .number');
  if (!stats.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target || el.textContent.replace(/\D/g, '')) || 0;
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(stat => {
    if (!stat.dataset.target) {
      stat.dataset.target = parseInt(stat.textContent.replace(/\D/g, '')) || 0;
    }
    observer.observe(stat);
  });
}

function animateCounter(element, target) {
  const duration = 2000;
  const start = performance.now();
  const startValue = 0;

  function update(currentTime) {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);
    const current = Math.floor(startValue + (target - startValue) * eased);

    element.textContent = current.toLocaleString('es-AR');

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

async function populateFromContent() {
  try {
    const { supabase } = await import('../../supabase.js');
    const { data, error } = await supabase
      .from('contenido_sitio')
      .select('*');

    if (error) throw error;

    const content = {};
    (data || []).forEach(item => {
      content[item.clave] = item.valor;
    });

    updateHeroContent(content);
  } catch (e) {
    console.warn('Could not load hero content:', e);
  }
}

function updateHeroContent(content) {
  if (!heroElement) return;

  const mappings = {
    'hero_badge': 'heroBadgeTop',
    'hero_titulo': 'heroTitulo',
    'hero_subtitulo': 'heroSubtitulo',
    'hero_badges': 'heroBadges',
    'hero_cta_primario': 'heroCtaPrimario',
    'hero_cta_secundario': 'heroCtaSecundario',
    'hero_stats': 'heroStats'
  };

  Object.entries(mappings).forEach(([key, id]) => {
    if (content[key] && heroElement) {
      const el = heroElement.querySelector(`#${id}`);
      if (el) {
        if (key === 'hero_badges' && Array.isArray(content[key])) {
          el.innerHTML = content[key].map(b => `<span class="hero-badge"><i class="fas fa-check-circle" aria-hidden="true"></i> ${b}</span>`).join('');
        } else if (key === 'hero_stats' && Array.isArray(content[key])) {
          el.innerHTML = content[key].map(s => `
            <div class="stat"><div class="number" data-target="${parseInt(s.valor) || 0}">${s.valor}</div><div class="label">${s.label}</div></div>
          `).join('');
          initStatsAnimation();
        } else if (key === 'hero_cta_primario' || key === 'hero_cta_secundario') {
          el.innerHTML = `<i class="${content[key].icon || 'fas fa-arrow-right'}" aria-hidden="true"></i> ${content[key].text || content[key]}`;
        } else {
          el.innerHTML = content[key];
        }
      }
    }
  });
}

// Make globally available
window.initHero = initHero;
window.updateHeroContent = updateHeroContent;

export default { initHero, updateHeroContent };