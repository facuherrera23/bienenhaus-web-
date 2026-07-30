import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { logDebug } from '../../utils/logger.ts';
import styles from './Hero3D.module.css';

interface Hero3DProps {
  className?: string;
}

export function Hero3D({ className = '' }: Hero3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLNavElement>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const sceneRef = useRef<any>(null);

  // Detect user preferences
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

  // Scroll handler for nav
  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize 3D scene
  useEffect(() => {
    if (!canvasRef.current) return;
    if (saveData || reducedMotion) return;

    import('../../three/scene').then(({ Hero3DScene }) => {
      if (!canvasRef.current) return;

      const scene = new Hero3DScene({
        canvas: canvasRef.current,
        onReady: () => setSceneReady(true),
        reducedMotion: false,
      });

      sceneRef.current = scene;

      // Mouse parallax
      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        sceneRef.current?.setMousePosition(x, y);
      };

      containerRef.current?.addEventListener('mousemove', handleMouseMove);

      return () => {
        containerRef.current?.removeEventListener('mousemove', handleMouseMove);
        scene.dispose();
      };
    });
  }, [reducedMotion, saveData]);

  // Cleanup
  useEffect(() => {
    return () => {
      sceneRef.current?.dispose();
    };
  }, []);

  // Static fallback for saveData / reducedMotion / small mobile
  const useStaticFallback = saveData || reducedMotion || window.innerWidth < 480;

  const scrollToSearch = useCallback(() => {
    const searchSection = document.getElementById('search-bar');
    if (searchSection) {
      searchSection.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`${styles.hero3d} ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow - Signal accent as light source */}
      <div className={styles['hero3d__ambient-glow']} aria-hidden="true" />

      {/* 3D Canvas */}
      {!useStaticFallback && (
        <canvas
          ref={canvasRef}
          className={`${styles['hero3d__canvas']} ${sceneReady ? styles['hero3d__canvas--ready'] : ''}`}
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

      {/* Static fallback */}
      {useStaticFallback && (
        <div
          className={styles['hero3d__fallback']}
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
            className={styles['hero3d__fallback-overlay']}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(11,13,14,0.85) 0%, rgba(11,13,14,0.6) 40%, rgba(11,13,14,0.9) 100%)',
            }}
          />
        </div>
      )}

      {/* Overlay UI */}
      <div className={`${styles['hero3d__overlay']} ${className}`} style={{
        position: 'relative',
        zIndex: 10,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Floating Nav */}
        <nav
          ref={navRef}
          className={`${styles['hero3d__nav']} ${navScrolled ? styles['hero3d__nav--scrolled'] : ''}`}
          role="navigation"
          aria-label="Navegación principal"
        >
          <div className={styles['hero3d__nav-inner']}>
            <a href="/" className={styles['hero3d__nav-brand']} aria-label="Bienenhaus - Inicio">
              <i className="fas fa-building hero-3d__brand-icon" aria-hidden="true"></i>
              <span>Bienenhaus<span className="ds-text-primary">.</span></span>
            </a>

            <div className={styles['hero3d__nav-links']}>
              <a href="#propiedades" className={styles['hero3d__nav-link']}>Propiedades</a>
              <a href="#agentes" className={styles['hero3d__nav-link']}>Agentes</a>
              <a href="#contacto" className={styles['hero3d__nav-link']}>Contacto</a>
            </div>

            <div className={styles['hero3d__nav-actions']}>
              <a href="/admin.html" className={styles['hero3d__nav-btn']} aria-label="Panel de administración">
                <i className="fas fa-cog"></i>
              </a>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className={styles['hero3d__content']} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 var(--ds-container-padding-mobile)' }}>
          {/* Badge */}
          <div className={styles['hero3d__badge']}>
            <span className={styles['hero3d__badge-inner']}>
              <i className="fas fa-gem" aria-hidden="true"></i>
              <span>Exclusivas en Córdoba</span>
            </span>
          </div>

          {/* Headline */}
          <h1 className={styles['hero3d__title']}>
            Encontrá tu <span className={styles['hero3d__highlight']}>próximo hogar</span>
          </h1>

          {/* Subtitle */}
          <p className={styles['hero3d__lead']}>
            Propiedades seleccionadas con criterio arquitectónico.<br />
            Asesoramiento experto en cada operación.
          </p>

          {/* Trust indicators */}
          <div className={styles['hero3d__trust']} role="list" aria-label="Servicios destacados">
            <span className={styles['hero3d__trust-item']} role="listitem">
              <i className="fas fa-shield-alt" aria-hidden="true"></i>
              Verificación jurídica
            </span>
            <span className={styles['hero3d__trust-item']} role="listitem">
              <i className="fas fa-camera" aria-hidden="true"></i>
              Tours 3D
            </span>
            <span className={styles['hero3d__trust-item']} role="listitem">
              <i className="fas fa-hand-holding-heart" aria-hidden="true"></i>
              Acompañamiento integral
            </span>
          </div>

          {/* Floating Search */}
          <form className={`${styles['hero3d__search']} ds-search-floating`} action="/propiedades" method="GET" onSubmit={scrollToSearch}>
            <div className={`${styles['hero3d__search-form']} ds-input-wrapper`}>
              <div className={`${styles['hero3d__search-field']} ds-input-wrapper`}>
                <i className="fas fa-search searchIcon" aria-hidden="true"></i>
                <input
                  type="search"
                  name="q"
                  placeholder="Barrio, tipo, operación…"
                  className={`${styles['hero3d__search-input']} ds-form-input`}
                  aria-label="Buscar propiedades"
                  autoComplete="off"
                />
              </div>
              <button type="submit" className={`${styles['hero3d__search-submit']} ds-btn ds-btn-primary`}>
                <i className="fas fa-arrow-right" aria-hidden="true"></i>
                <span>Buscar</span>
              </button>
            </div>
          </form>

          {/* Stats */}
          <div className={styles['hero3d__stats']} role="list" aria-label="Estadísticas de propiedades">
            <div className={styles['hero3d__stat']} role="listitem">
              <span className={`${styles['hero3d__stat-number']} ds-font-num`}>240+</span>
              <span className={styles['hero3d__stat-label']}>Propiedades activas</span>
            </div>
            <div className={styles['hero3d__stat']} role="listitem">
              <span className={`${styles['hero3d__stat-number']} ds-font-num`}>15</span>
              <span className={styles['hero3d__stat-label']}>Agentes expertos</span>
            </div>
            <div className={styles['hero3d__stat']} role="listitem">
              <span className={`${styles['hero3d__stat-number']} ds-font-num`}>12</span>
              <span className={styles['hero3d__stat-label']}>Barrios cubiertos</span>
            </div>
            <div className={styles['hero3d__stat']} role="listitem">
              <span className={`${styles['hero3d__stat-number']} ds-font-num`}>98%</span>
              <span className={styles['hero3d__stat-label']}>Satisfacción</span>
            </div>
          </div>

          {/* Secondary CTA */}
          <div className={styles['hero3d__cta-secondary']}>
            <button
              type="button"
              className={`${styles['hero3d__scroll-cta']} ds-btn ds-btn-ghost`}
              onClick={scrollToSearch}
              aria-label="Ver propiedades disponibles"
            >
              <i className="fas fa-chevron-down" aria-hidden="true"></i>
              <span>Ver propiedades</span>
            </button>
            <a href="#contacto" className="ds-btn ds-btn-outline">
              <i className="fas fa-envelope" aria-hidden="true"></i>
              <span>Contactar</span>
            </a>
          </div>
        </main>

        {/* Scroll Indicator */}
        <div className={styles['hero3d__scroll']} aria-hidden="true">
          <div className={styles['hero3d__scroll-mouse']}>
            <div className={styles['hero3d__scroll-wheel']}></div>
          </div>
          <span>Explorar</span>
        </div>
      </div>
    </div>
  );
}

export default Hero3D;

// Init function for main.ts
export function initHero3D(): void {
  logDebug('Hero3D initialized', undefined, 'hero3d');
}