// @ts-nocheck
// ================================================================
// FOOTER COMPONENT
// ================================================================

import './Footer.css';
import { supabase } from '../../supabase.ts';
import { showToast } from '../../main.ts';

let footerElement = null;

export function initFooter() {
  const existingFooter = document.querySelector('.footer');
  if (existingFooter) {
    footerElement = existingFooter;
    bindEvents();
    return;
  }

  footerElement = createFooter();
  const placeholder = document.getElementById('footer-placeholder');
  if (placeholder && placeholder.parentNode) {
    placeholder.parentNode.replaceChild(footerElement, placeholder);
  } else {
    document.body.appendChild(footerElement);
  }
  bindEvents();
}

function createFooter() {
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.setAttribute('role', 'contentinfo');
  footer.innerHTML = `
    <div class="footer-grid container">
      <div class="footer-brand" id="footerBrand">
        <h3><i class="fas fa-building" aria-hidden="true"></i> <span>Bienen</span>haus</h3>
        <p id="footerDescripcion">Comprometidos con tu hogar desde 2008. <strong>CPI. 1834</strong> · Córdoba, Argentina.</p>
        <div class="social">
          <a href="https://instagram.com/bienenhaus.prop" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fab fa-instagram" aria-hidden="true"></i></a>
          <a href="https://facebook.com/Bienenhaus.prop" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fab fa-facebook-f" aria-hidden="true"></i></a>
          <a href="https://www.youtube.com/@BienenhausPropiedades" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i class="fab fa-youtube" aria-hidden="true"></i></a>
          <a href="https://www.tiktok.com/@bienenhaus.prop" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><i class="fab fa-tiktok" aria-hidden="true"></i></a>
          <a href="mailto:bienenhaus.propiedades@gmail.com" aria-label="Email"><i class="fas fa-envelope" aria-hidden="true"></i></a>
          <a href="#" aria-label="WhatsApp"><i class="fab fa-whatsapp" aria-hidden="true"></i></a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Enlaces rápidos</h4>
        <ul id="footerLinks">
          <li><a href="#catalogo"><i class="fas fa-chevron-right" aria-hidden="true"></i> Propiedades</a></li>
          <li><a href="#quienes-somos"><i class="fas fa-chevron-right" aria-hidden="true"></i> Quiénes somos</a></li>
          <li><a href="#servicios"><i class="fas fa-chevron-right" aria-hidden="true"></i> Servicios</a></li>
          <li><a href="#equipo"><i class="fas fa-chevron-right" aria-hidden="true"></i> Equipo</a></li>
          <li><a href="#contacto"><i class="fas fa-chevron-right" aria-hidden="true"></i> Contacto</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Servicios</h4>
        <ul id="footerServicios">
          <li><a href="#"><i class="fas fa-chevron-right" aria-hidden="true"></i> Venta de propiedades</a></li>
          <li><a href="#"><i class="fas fa-chevron-right" aria-hidden="true"></i> Alquiler de viviendas</a></li>
          <li><a href="#"><i class="fas fa-chevron-right" aria-hidden="true"></i> Tasación profesional</a></li>
          <li><a href="#"><i class="fas fa-chevron-right" aria-hidden="true"></i> Asesoría financiera</a></li>
          <li><a href="#"><i class="fas fa-chevron-right" aria-hidden="true"></i> Gestión legal</a></li>
        </ul>
      </div>
      <div class="footer-col footer-newsletter">
        <h4>Newsletter</h4>
        <p>Recibe las últimas propiedades y ofertas.</p>
        <form id="footerNewsletter" novalidate>
          <div class="input-group">
            <input type="email" placeholder="Tu email" required aria-label="Email para suscripción">
            <button type="submit" class="btn-subscribe">Suscribir</button>
          </div>
        </form>
        <p style="margin-top:14px;font-size:0.8rem;opacity:0.6;">Sin spam. Puedes darte de baja.</p>
      </div>
    </div>
    <div class="footer-bottom container">
      <span id="footerCopyright">© 2026 <strong>Bienenhaus Propiedades</strong> · CPI. 1834 · Córdoba · Argentina</span>
      <div class="footer-links">
        <a href="#">Aviso legal</a>
        <a href="#">Política de cookies</a>
        <a href="#">Política de privacidad</a>
        <a href="#">Términos y condiciones</a>
        <a href="#">Mapa web</a>
      </div>
    </div>
  `;
  return footer;
}

function bindEvents() {
  if (!footerElement) return;

  // Newsletter form
  const newsletterForm = footerElement.querySelector('#footerNewsletter');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', handleNewsletterSubmit);
  }
}

async function handleNewsletterSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const input = form.querySelector('input[type="email"]');
  const button = form.querySelector('button[type="submit"]');
  const email = input.value.trim();
  
  if (!email || !isValidEmail(email)) {
    showToast('Ingresa un email válido', 'error');
    return;
  }
  
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  
  try {
    // Save to Supabase
    const { error } = await supabase.from('newsletter').upsert({ email }, { onConflict: 'email' });
    
    if (error) throw error;
    
    showToast('¡Te has suscrito correctamente!', 'success');
    form.reset();
  } catch (error) {
    console.error('Newsletter error:', error);
    showToast('Error al suscribirse. Intenta nuevamente.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Suscribir';
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Export for dynamic content updates
export function updateFooterContent(content) {
  if (!footerElement) return;
  
  if (content.footer_marca) {
    const brand = footerElement.querySelector('#footerBrand h3');
    if (brand) brand.innerHTML = `<i class="fas fa-building" aria-hidden="true"></i> <span>${content.footer_marca}</span>`;
  }
  
  if (content.footer_descripcion) {
    const desc = footerElement.querySelector('#footerDescripcion');
    if (desc) desc.textContent = content.footer_descripcion;
  }
  
  if (content.footer_links) {
    const list = footerElement.querySelector('#footerLinks');
    if (list && Array.isArray(content.footer_links)) {
      list.innerHTML = content.footer_links.map(l => `<li><a href="${l.url}"><i class="fas fa-chevron-right" aria-hidden="true"></i> ${l.texto}</a></li>`).join('');
    }
  }
  
  if (content.footer_servicios) {
    const list = footerElement.querySelector('#footerServicios');
    if (list && Array.isArray(content.footer_servicios)) {
      list.innerHTML = content.footer_servicios.map(s => `<li><a href="${s.url}"><i class="fas fa-chevron-right" aria-hidden="true"></i> ${s.texto}</a></li>`).join('');
    }
  }
  
  if (content.footer_copyright) {
    const copyright = footerElement.querySelector('#footerCopyright');
    if (copyright) copyright.textContent = content.footer_copyright;
  }
}

// Make globally available for inline handlers
window.initFooter = initFooter;
window.updateFooterContent = updateFooterContent;

export default { initFooter, updateFooterContent };