// ================================================================
// HERO3D LAZY WRAPPER - Dynamic import with Suspense
// ================================================================

import { lazy, Suspense } from 'preact/compat';
import { useEffect } from 'preact/hooks';
import { logDebug } from '../../utils/logger.ts';
import styles from './Hero3D.module.css';

// Lazy load the heavy Three.js component
const Hero3DHeavy = lazy(() => import('./Hero3D.tsx').then(m => ({ default: m.Hero3D })));

// Skeleton fallback matching Hero3D dimensions
function Hero3DSkeleton() {
  return (
    <div class={`${styles['hero3d']} ${styles['hero3d--skeleton']}`} role="status" aria-label="Cargando experiencia 3D">
      <div className={styles['hero3d__canvas-wrapper']} style={{ background: 'var(--ds-color-surface-2)' }}>
        <div className={`${styles['hero3d__skeleton']} ${styles['hero3d__skeleton--canvas']}`} />
      </div>
      <main className={styles['hero3d__content']} style={{ opacity: 0.4 }}>
        <div className={styles['hero3d__badges']}>
          <span className={`${styles['hero3d__badge']} ${styles['hero3d__badge--skeleton']}`} />
          <span className={`${styles['hero3d__badge']} ${styles['hero3d__badge--skeleton']}`} />
          <span className={`${styles['hero3d__badge']} ${styles['hero3d__badge--skeleton']}`} />
          <span className={`${styles['hero3d__badge']} ${styles['hero3d__badge--skeleton']}`} />
        </div>
        <h1 className={`${styles['hero3d__title']} ${styles['hero3d__title--skeleton']}`} style={{ width: '70%' }} />
        <p className={`${styles['hero3d__subtitle']} ${styles['hero3d__subtitle--skeleton']}`} style={{ width: '60%' }} />
        <div className={styles['hero3d__badges']}>
          <span className={`${styles['hero3d__badge']} ${styles['hero3d__badge--skeleton']}`} />
          <span className={`${styles['hero3d__badge']} ${styles['hero3d__badge--skeleton']}`} />
          <span className={`${styles['hero3d__badge']} ${styles['hero3d__badge--skeleton']}`} />
          <span className={`${styles['hero3d__badge']} ${styles['hero3d__badge--skeleton']}`} />
        </div>
        <div className={styles['hero3d__cta-group']}>
          <button className={`${styles['hero3d__cta-primary']} ${styles['hero3d__cta--skeleton']}`} disabled />
          <button className={`${styles['hero3d__cta-secondary']} ${styles['hero3d__cta--skeleton']}`} disabled />
        </div>
        <div className={styles['hero3d__stats']}>
          <div className={`${styles['hero3d__stat']} ${styles['hero3d__stat--skeleton']}`} />
          <div className={styles['hero3d__stat']} style={{ opacity: 0.4 }} />
          <div className={styles['hero3d__stat']} style={{ opacity: 0.4 }} />
          <div className={styles['hero3d__stat']} style={{ opacity: 0.4 }} />
        </div>
        <div className={styles['hero3d__cta-secondary']}>
          <button className={`${styles['hero3d__scroll-cta']} ${styles['hero3d__cta--skeleton']}`} disabled />
          <a className={`${styles['hero3d__cta-secondary']} ${styles['hero3d__cta--skeleton']}`} />
        </div>
      </main>
    </div>
  );
}

// Preload the Three.js chunk on hover/focus of hero section
export function preloadHero3D() {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('./Hero3D.tsx').catch(() => {});
    }, { timeout: 2000 });
  }
}

// Preload on hover intent
export function setupHero3DPreload() {
  const heroPlaceholder = document.getElementById('hero-placeholder');
  if (!heroPlaceholder) return;

  let preloadTriggered = false;
  const triggerPreload = () => {
    if (!preloadTriggered) {
      preloadTriggered = true;
      preloadHero3D();
    }
  };

  heroPlaceholder.addEventListener('mouseenter', triggerPreload, { once: true });
  heroPlaceholder.addEventListener('focusin', triggerPreload, { once: true });
}

export function Hero3DLazy() {
  return (
    <Suspense fallback={<Hero3DSkeleton />}>
      <Hero3DHeavy />
    </Suspense>
  );
}

export default Hero3DHeavy;