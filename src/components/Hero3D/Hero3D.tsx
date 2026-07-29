import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { logDebug } from '../../utils/logger.ts';
import styles from './Hero3D.module.css';

interface Hero3DProps {
  className?: string;
}

export function Hero3D({ className = '' }: Hero3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const sceneRef = useRef<any>(null);

  // Detectar preferencias de usuario
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

  // Inicializar escena 3D
  useEffect(() => {
    if (!canvasRef.current) return;
    if (saveData || reducedMotion) return; // Fallback estático maneja esto

    // Import dinámico de Three.js + escena
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

  // Fallback estático para saveData / reducedMotion / mobile pequeño
  const useStaticFallback = saveData || reducedMotion || window.innerWidth < 480;

  const scrollToSearch = useCallback(() => {
    const searchSection = document.getElementById('search-bar');
    if (searchSection) {
      searchSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return (
    <div ref={containerRef} className={`${styles.hero3d} ${className}`} style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Canvas 3D */}
      {!useStaticFallback && (
        <canvas
          ref={canvasRef}
          className={`${styles.canvas} ${sceneReady ? styles.ready : ''}`}
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

      {/* Fallback estático */}
      {useStaticFallback && (
        <div
          className={styles.fallback}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/hero-bg.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className={styles.fallbackOverlay} style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(11,13,14,0.7) 0%, rgba(11,13,14,0.5) 50%, rgba(11,13,14,0.85) 100%)',
          }} />
        </div>
      )}

      {/* Overlay UI */}
      <div className={`${styles.overlay} ${className}`} style={{
        position: 'relative',
        zIndex: 10,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Nav flotante */}
        <nav className={`${styles.nav} ds-nav-floating`} role="navigation" aria-label="Navegación principal">
          <a href="/" className={`${styles.brand} ds-header-brand`} aria-label="Bienenhaus - Inicio">
            <i className="fas fa-building hero-3d__brand-icon" aria-hidden="true"></i>
            <span>Bienenhaus<span className="ds-text-primary">.</span></span>
          </a>

          <div className={`${styles.navLinks} ds-header-nav`}>
            <a href="#propiedades" className="ds-header-nav-link">Propiedades</a>
            <a href="#agentes" className="ds-header-nav-link">Agentes</a>
            <a href="#contacto" className="ds-header-nav-link">Contacto</a>
          </div>

          <div className={styles.navActions}>
            <a href="/admin.html" className="ds-btn ds-btn-ghost ds-header-btn" aria-label="Panel de administración">
              <i className="fas fa-cog"></i>
            </a>
          </div>
        </nav>

        {/* Contenido principal */}
        <main className={styles.content} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 var(--ds-container-padding-mobile)' }}>
          <div className={styles.badge}>
            <i className="fas fa-gem" aria-hidden="true"></i>
            <span>Exclusivas en Córdoba</span>
          </div>

          <h1 className={styles.title}>
            Encontrá tu <span className={styles.highlight}>próximo hogar</span>
          </h1>

          <p className={styles.subtitle}>
            Propiedades seleccionadas con criterio arquitectónico.<br />
            Asesoramiento experto en cada operación.
          </p>

          {/* Buscador flotante */}
          <form className={`${styles.searchForm} ds-search-floating`} action="/propiedades" method="GET" onSubmit={scrollToSearch}>
            <div className={`${styles.searchWrapper} ds-input-wrapper`}>
              <i className="fas fa-search searchIcon" aria-hidden="true"></i>
              <input
                type="search"
                name="q"
                placeholder="Barrio, tipo, operación…"
                className={`${styles.searchInput} ds-form-input`}
                aria-label="Buscar propiedades"
                autoComplete="off"
              />
            </div>
            <button type="submit" className={`${styles.searchSubmit} ds-btn ds-btn-primary`}>
              <i className="fas fa-arrow-right" aria-hidden="true"></i>
              <span>Buscar</span>
            </button>
          </form>

          {/* Stats */}
          <div className={styles.stats} role="list" aria-label="Estadísticas de propiedades">
            <div className={styles.stat} role="listitem">
              <span className={`${styles.statNumber} ds-font-num`}>240+</span>
              <span className={styles.statLabel}>Propiedades activas</span>
            </div>
            <div className={styles.stat} role="listitem">
              <span className={`${styles.statNumber} ds-font-num`}>15</span>
              <span className={styles.statLabel}>Agentes expertos</span>
            </div>
            <div className={styles.stat} role="listitem">
              <span className={`${styles.statNumber} ds-font-num`}>12</span>
              <span className={styles.statLabel}>Barrios cubiertos</span>
            </div>
            <div className={styles.stat} role="listitem">
              <span className={`${styles.statNumber} ds-font-num`}>98%</span>
              <span className={styles.statLabel}>Satisfacción</span>
            </div>
          </div>

          {/* CTA scroll */}
          <button
            type="button"
            className={`${styles.scrollCta} ds-btn ds-btn-ghost`}
            onClick={scrollToSearch}
            aria-label="Ver propiedades disponibles"
          >
            <i className="fas fa-chevron-down" aria-hidden="true"></i>
            <span>Ver propiedades</span>
          </button>
        </main>

        {/* Indicador scroll */}
        <div className={styles.scrollIndicator} aria-hidden="true">
          <div className={styles.scrollMouse}>
            <div className={styles.scrollWheel}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero3D;

// Init function for main.ts
export function initHero3D(): void {
  // Hero3D is a Preact component that self-initializes
  // The component handles its own mounting via the canvas element
  logDebug('Hero3D initialized', undefined, 'hero3d');
}