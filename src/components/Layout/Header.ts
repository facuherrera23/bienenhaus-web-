
// ================================================================
// HEADER COMPONENT
// ================================================================

import './Header.css';

let headerElement = null;
let isScrolled = false;

export function initHeader() {
  const existingHeader = document.querySelector('.header');
  if (existingHeader) {
    headerElement = existingHeader;
    bindEvents();
    handleScroll();
    return;
  }

  headerElement = createHeader();
  const placeholder = document.getElementById('header-placeholder');
  if (placeholder && placeholder.parentNode) {
    placeholder.parentNode.replaceChild(headerElement, placeholder);
  } else {
    document.body.insertBefore(headerElement, document.body.firstChild);
  }
  bindEvents();
  handleScroll();
}

function createHeader() {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <div class="header-inner container">
      <a href="/" class="header-brand" aria-label="Bienenhaus - Inicio">
        <i class="fas fa-building header-brand-icon" aria-hidden="true"></i>
        <span>Bienen<span>haus</span></span>
      </a>
      
      <nav class="header-nav" aria-label="Navegación principal">
        <a href="/" class="header-nav-link" data-page="home">Inicio</a>
        <a href="#propiedades" class="header-nav-link" data-page="properties">Propiedades</a>
        <a href="#nosotros" class="header-nav-link" data-page="about">Quiénes somos</a>
        <a href="#equipo" class="header-nav-link" data-page="team">Equipo</a>
        <a href="#servicios" class="header-nav-link" data-page="services">Servicios</a>
        <a href="#faq" class="header-nav-link" data-page="faq">FAQ</a>
        <a href="#contacto" class="header-nav-link header-nav-cta" data-page="contact"><i class="fas fa-envelope" aria-hidden="true"></i> Contacto</a>
      </nav>
      
      <div class="header-actions">
        <button class="header-btn mobile-menu-btn" aria-label="Abrir menú" aria-expanded="false" aria-controls="header-nav">
          <i class="fas fa-bars" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `;
  return header;
}

function bindEvents() {
  if (!headerElement) return;
  
  // Mobile menu toggle with focus trap
  const mobileBtn = headerElement.querySelector('.mobile-menu-btn');
  const nav = headerElement.querySelector('.header-nav');
  let lastFocusedElement = null;
  
  function trapFocus(e) {
    if (!nav.classList.contains('open')) return;
    
    const focusableElements = nav.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }

  if (mobileBtn && nav) {
    mobileBtn.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      mobileBtn.setAttribute('aria-expanded', isOpen);
      mobileBtn.innerHTML = isOpen ? '<i class="fas fa-times" aria-hidden="true"></i>' : '<i class="fas fa-bars" aria-hidden="true"></i>';
      document.body.style.overflow = isOpen ? 'hidden' : '';
      
      if (isOpen) {
        lastFocusedElement = document.activeElement;
        // Trap focus
        document.addEventListener('keydown', trapFocus);
        // Focus first link
        setTimeout(() => {
          const firstLink = nav.querySelector('.header-nav-link');
          if (firstLink) firstLink.focus();
        }, 0);
      } else {
        document.removeEventListener('keydown', trapFocus);
        if (lastFocusedElement && typeof (lastFocusedElement as HTMLElement).focus === 'function') {
          (lastFocusedElement as HTMLElement).focus();
        }
      }
    });
  }
  
  // Close mobile menu on link click
  headerElement.querySelectorAll('.header-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      mobileBtn.setAttribute('aria-expanded', 'false');
      mobileBtn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
      document.body.style.overflow = '';
    });
  });
  
  // Smooth scroll for anchor links
  headerElement.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerHeight = headerElement.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });
  
  // Scroll handler
  window.addEventListener('scroll', handleScroll, { passive: true });
}

function handleScroll() {
  if (!headerElement) return;
  
  const scrollY = window.scrollY;
  const shouldBeScrolled = scrollY > 20;
  
  if (shouldBeScrolled !== isScrolled) {
    isScrolled = shouldBeScrolled;
    headerElement.classList.toggle('scrolled', isScrolled);
  }
  
  // Update active nav link based on scroll position
  updateActiveNavLink();
}

function updateActiveNavLink() {
  if (!headerElement) return;
  
  const sections = ['home', 'properties', 'about', 'services', 'team', 'faq', 'contact'];
  const scrollY = window.scrollY + headerElement.offsetHeight + 100;
  
  let activeSection = 'home';
  
  sections.forEach(section => {
    const element = section === 'home' ? document.body : document.getElementById(section === 'properties' ? 'catalogo' : section);
    if (element) {
      const top = element.offsetTop;
      const bottom = top + element.offsetHeight;
      if (scrollY >= top && scrollY < bottom) {
        activeSection = section;
      }
    }
  });
  
  headerElement.querySelectorAll('.header-nav-link').forEach(link => {
    const page = link.dataset.page;
    link.classList.toggle('active', page === activeSection);
  });
}

// Export for manual control
export function setHeaderScrolled(scrolled) {
  if (headerElement) {
    isScrolled = scrolled;
    headerElement.classList.toggle('scrolled', scrolled);
  }
}

export function closeMobileMenu() {
  const nav = headerElement?.querySelector('.header-nav');
  const mobileBtn = headerElement?.querySelector('.mobile-menu-btn');
  if (nav && mobileBtn) {
    nav.classList.remove('open');
    mobileBtn.setAttribute('aria-expanded', 'false');
    mobileBtn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
    document.body.style.overflow = '';
  }
}

export default { initHeader };
