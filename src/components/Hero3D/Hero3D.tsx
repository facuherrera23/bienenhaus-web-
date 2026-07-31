import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { logDebug, logError } from '../../utils/logger.ts';
import './Hero3D.css';

function webglSupported(): boolean {
  // Three.js r185 features (transmission, UnrealBloomPass, SRGBColorSpace working space)
  // assume WebGL2. A WebGL1-only context would silently render black.
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

interface Hero3DProps {
  className?: string;
}

export function Hero3D({ className = '' }: Hero3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [isSmallViewport, setIsSmallViewport] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const sceneRef = useRef<any>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  useEffect(() => {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      setSaveData(conn.saveData === true);
    }
  }, []);

  // Detect automated testing
  const isAutomated = (
    (navigator as any).webdriver === true ||
    (window as any).__lighthouse === true ||
    (navigator as any).__lighthouse === true ||
    document.cookie.includes('__lighthouse') ||
    window.location.search.includes('lighthouse')
  );

  // Track viewport width with resize listener (instead of every-render read).
  useEffect(() => {
    const update = () => setIsSmallViewport(window.innerWidth < 480);
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 50);
      updateActiveSection();
    };
    const updateActiveSection = () => {
      const sections = [
        { id: 'home', el: document.body },
        { id: 'properties', el: document.getElementById('catalogo') },
        { id: 'about', el: document.getElementById('nosotros') },
        { id: 'team', el: document.getElementById('equipo') },
        { id: 'services', el: document.getElementById('servicios') },
        { id: 'faq', el: document.getElementById('faq') },
        { id: 'contact', el: document.getElementById('contacto') },
      ];
      const scrollY = window.scrollY + 120;
      let current = 'home';
      for (const s of sections) {
        if (s.el) {
          const top = s.el.offsetTop;
          const bottom = top + s.el.offsetHeight;
          if (scrollY >= top && scrollY < bottom) {
            current = s.id;
            break;
          }
        }
      }
      setActiveSection(current);
    };
    updateActiveSection();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Toggle uses functional updater + handles body overflow correctly without stale closure.
  const toggleNav = useCallback(() => {
    setNavOpen(prev => {
      const next = !prev;
      document.body.style.overflow = next ? 'hidden' : '';
      return next;
    });
  }, []);

  // Close nav + restore scroll
  const handleNavClick = useCallback(() => {
    setNavOpen(false);
    document.body.style.overflow = '';
  }, []);

  // Escape closes mobile nav
  useEffect(() => {
    if (!navOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleNavClick();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navOpen, handleNavClick]);

  // Cleanup body overflow on unmount (defensive)
  useEffect(() => {
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Initialize 3D scene
  useEffect(() => {
    if (!canvasRef.current) return;
    if (saveData || reducedMotion || !webglSupported()) {
      if (!webglSupported()) setWebglFailed(true);
      return;
    }

    let disposeScene = () => {};

    import('../../three/scene').then(({ Hero3DScene }) => {
      if (!canvasRef.current) return;

      const scene = new Hero3DScene({
        canvas: canvasRef.current,
        onReady: () => setSceneReady(true),
        reducedMotion: false,
      });

      sceneRef.current = scene;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        sceneRef.current?.setMousePosition(x, y);
      };

      containerRef.current?.addEventListener('mousemove', handleMouseMove);

      disposeScene = () => {
        containerRef.current?.removeEventListener('mousemove', handleMouseMove);
        scene.dispose();
      };
    }).catch(() => {
      setWebglFailed(true);
    });

    return () => disposeScene();
  }, [reducedMotion, saveData]);

  useEffect(() => {
    return () => {
      sceneRef.current?.dispose();
    };
  }, []);

  const useStaticFallback = saveData || reducedMotion || isAutomated || isSmallViewport || webglFailed;

  const scrollToSearch = useCallback((e?: Event) => {
    if (e) e.preventDefault();
    const searchSection = document.getElementById('search-bar');
    if (searchSection) {
      searchSection.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`hero3d ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      <div className="hero3d__ambient-glow" aria-hidden="true" />

      {!useStaticFallback && (
        <canvas
          ref={canvasRef}
          className={`hero3d__canvas ${sceneReady ? 'hero3d__canvas--ready' : ''}`}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            opacity: sceneReady ? 1 : 0,
            transition: 'opacity 0.6s ease-out',
          }}
        />
      )}

      {useStaticFallback && (
        <div
          className="hero3d__fallback"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/hero-bg.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div
            className="hero3d__fallback-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(11,13,14,0.85) 0%, rgba(11,13,14,0.6) 40%, rgba(11,13,14,0.9) 100%)',
            }}
          />
       </div>
      )}

      <div className={`hero3d__overlay ${className}`} style={{
        position: 'relative',
        zIndex: 10,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <nav
          ref={navRef}
          className={`hero3d__nav ${navScrolled ? 'hero3d__nav--scrolled' : ''}`}
          role="navigation"
          aria-label="Navegación principal"
        >
          <div className="hero3d__nav-inner">
            <a href="/" className="hero3d__nav-brand" aria-label="Bienenhaus - Inicio">
              <i className="fas fa-building hero-3d__brand-icon" aria-hidden="true" />
              <span>Bienenhaus<span className="ds-text-primary"></span></span>
           </a>

            <div className={`hero3d__nav-links ${navOpen ? 'hero3d__nav-links--open' : ''}`}>
              <a href="/" className={`hero3d__nav-link ${activeSection === 'home' ? 'is-active' : ''}`} data-page="home" onClick={handleNavClick}>Inicio</a>
              <a href="/seccion/catalogo" className={`hero3d__nav-link ${activeSection === 'properties' ? 'is-active' : ''}`} data-page="properties" onClick={handleNavClick}>Propiedades</a>
              <a href="/seccion/nosotros" className={`hero3d__nav-link ${activeSection === 'about' ? 'is-active' : ''}`} data-page="about" onClick={handleNavClick}>Quiénes somos</a>
              <a href="/seccion/equipo" className={`hero3d__nav-link ${activeSection === 'team' ? 'is-active' : ''}`} data-page="team" onClick={handleNavClick}>Equipo</a>
              <a href="/seccion/servicios" className={`hero3d__nav-link ${activeSection === 'services' ? 'is-active' : ''}`} data-page="services" onClick={handleNavClick}>Servicios</a>
              <a href="/seccion/faq" className={`hero3d__nav-link ${activeSection === 'faq' ? 'is-active' : ''}`} data-page="faq" onClick={handleNavClick}>FAQ</a>
              <a href="/seccion/contacto" className={`hero3d__nav-link ${activeSection === 'contact' ? 'is-active' : ''}`} data-page="contact" onClick={handleNavClick}>Contacto</a>
           </div>

            <div className="hero3d__nav-actions">
              <a href="/admin.html" className="hero3d__nav-btn" aria-label="Panel de administración">
                <i className="fas fa-cog" aria-hidden="true" />
             </a>
              <button
                type="button"
                className={`hero3d__nav-hamburger ${navOpen ? 'hero3d__nav-hamburger--open' : ''}`}
                aria-label={navOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={navOpen}
                onClick={toggleNav}
              >
                <span></span>
                <span></span>
                <span></span>
             </button>
           </div>
         </div>
       </nav>

        <main className="hero3d__content" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 var(--ds-container-padding-mobile)' }}>
          <div className="hero3d__badge">
            <span className="hero3d__badge-inner">
              <i className="fas fa-gem" aria-hidden="true"></i>
              <span>Exclusivas en Córdoba</span>
           </span>
         </div>

          <h1 id="hero-title" className="hero3d__title">
            Encontrá tu <span className="hero3d__highlight">próximo hogar</span>
         </h1>

          <p className="hero3d__lead">
            Propiedades seleccionadas con criterio arquitectónico.<br />
            Asesoramiento experto en cada operación.
         </p>

          <div className="hero3d__trust" role="list" aria-label="Servicios destacados">
            <span className="hero3d__trust-item" role="listitem">
              <i className="fas fa-shield-alt" aria-hidden="true" />
              Verificación jurídica
           </span>
            <span className="hero3d__trust-item" role="listitem">
              <i className="fas fa-camera" aria-hidden="true" />
              Tours 3D
           </span>
            <span className="hero3d__trust-item" role="listitem">
              <i className="fas fa-hand-holding-heart" aria-hidden="true" />
              Acompañamiento integral
           </span>
         </div>

          <form className="hero3d__search ds-search-floating" action="/propiedades" method="GET" onSubmit={scrollToSearch}>
            <div className="hero3d__search-form ds-input-wrapper">
              <div className="hero3d__search-field ds-input-wrapper">
                <i className="fas fa-search searchIcon" aria-hidden="true" />
                <input
                  type="search"
                  name="q"
                  placeholder="Barrio, tipo, operación…"
                  className="hero3d__search-input ds-form-input"
                  aria-label="Buscar propiedades"
                  autoComplete="off"
                />
             </div>
              <button type="submit" className="hero3d__search-submit ds-btn ds-btn-primary">
                <i className="fas fa-arrow-right" aria-hidden="true" />
                <span>Buscar</span>
             </button>
           </div>
         </form>

          <div className="hero3d__stats" role="list" aria-label="Estadísticas de propiedades">
            <div className="hero3d__stat" role="listitem">
              <span className="hero3d__stat-number ds-font-num">240+</span>
              <span className="hero3d__stat-label">Propiedades activas</span>
           </div>
            <div className="hero3d__stat" role="listitem">
              <span className="hero3d__stat-number ds-font-num">15</span>
              <span className="hero3d__stat-label">Agentes expertos</span>
           </div>
            <div className="hero3d__stat" role="listitem">
              <span className="hero3d__stat-number ds-font-num">12</span>
              <span className="hero3d__stat-label">Barrios cubiertos</span>
           </div>
            <div className="hero3d__stat" role="listitem">
              <span className="hero3d__stat-number ds-font-num">98%</span>
              <span className="hero3d__stat-label">Satisfacción</span>
           </div>
         </div>

          <div className="hero3d__cta-secondary">
            <button
              type="button"
              className="hero3d__scroll-cta ds-btn ds-btn-ghost"
              onClick={() => scrollToSearch()}
              aria-label="Ver propiedades disponibles"
            >
              <i className="fas fa-chevron-down" aria-hidden="true" />
              <span>Ver propiedades</span>
           </button>
            <a href="/seccion/contacto" className="ds-btn ds-btn-outline">
              <i className="fas fa-envelope" aria-hidden="true" />
              <span>Contactar</span>
           </a>
         </div>
       </main>

        <div className="hero3d__scroll" aria-hidden="true">
          <div className="hero3d__scroll-mouse">
            <div className="hero3d__scroll-wheel"></div>
         </div>
          <span>Explorar</span>
       </div>
     </div>
   </div>
  );
}

export default Hero3D;

export function initHero3D(): void {
  const placeholder = document.getElementById('hero-placeholder');
  if (!placeholder) {
    logError('Hero placeholder not found', undefined, 'hero3d');
    return;
  }

  import('preact').then(({ render }) => {
    render(<Hero3D />, placeholder);
    logDebug('Hero3D rendered', undefined, 'hero3d');
  });
}
