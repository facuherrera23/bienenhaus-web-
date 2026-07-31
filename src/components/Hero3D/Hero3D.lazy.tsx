import { lazy, Suspense } from 'preact/compat';
import { useEffect } from 'preact/hooks';
import { logDebug } from '../../utils/logger.ts';
import './Hero3D.css';

const Hero3DHeavy = lazy(() => import('./Hero3D.tsx').then(m => ({ default: m.Hero3D })));

function Hero3DSkeleton() {
  return (
    <div class="hero3d hero3d--skeleton" role="status" aria-label="Cargando experiencia 3D">
      <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface-2)' }}>
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-surface-3) 50%, var(--color-surface-2) 75%)', backgroundSize: '600px 100%', animation: 'shimmer 1.4s linear infinite' }} />
      </div>
      <main class="hero3d__content" style={{ opacity: 0.4 }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
          {[0,1,2,3].map(i => (
            <span key={i} style={{ width: '80px', height: '24px', borderRadius: 'var(--radius-full)', background: 'var(--color-surface-3)' }} />
          ))}
        </div>
        <h1 style={{ width: '70%', height: 'clamp(2.5rem, 7vw, 4.5rem)', margin: '0 auto var(--space-5)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-3)' }} />
        <p style={{ width: '60%', height: '1.25rem', margin: '0 auto var(--space-7)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-3)' }} />
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', marginBottom: 'var(--space-7)' }}>
          {[0,1,2,3].map(i => (
            <span key={i} style={{ width: '100px', height: '32px', borderRadius: 'var(--radius-full)', background: 'var(--color-surface-3)' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', marginBottom: 'var(--space-8)' }}>
          <span style={{ width: '160px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-3)' }} />
          <span style={{ width: '120px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-3)' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-7)', justifyContent: 'center' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ textAlign: 'center', width: '80px' }}>
              <span style={{ display: 'block', width: '60px', height: 'clamp(1.75rem, 3.5vw, 2.5rem)', margin: '0 auto var(--space-1)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-3)' }} />
              <span style={{ display: 'block', width: '50px', height: '14px', margin: '0 auto', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-3)' }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function preloadHero3D() {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('./Hero3D.tsx').catch(() => {});
    }, { timeout: 2000 });
  }
}

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