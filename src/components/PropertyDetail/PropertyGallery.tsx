import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import styles from './PropertyGallery.module.css';

interface PropertyGalleryProps {
  images: string[];
  initialIndex?: number;
  badge?: string;
  badgeVariant?: 'venta' | 'alquiler' | 'destacada';
}

export function PropertyGallery({ 
  images = [], 
  initialIndex = 0, 
  badge, 
  badgeVariant = 'venta' 
}: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const mainImageRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const totalImages = images.length;

  const goToImage = useCallback((index: number) => {
    setCurrentIndex((index + images.length) % images.length);
  }, [images.length]);

  const nextImage = useCallback(() => goToImage(currentIndex + 1), [goToImage]);
  const prevImage = useCallback(() => goToImage(currentIndex - 1), [goToImage]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      switch (e.key) {
        case 'ArrowRight': nextImage(); break;
        case 'ArrowLeft': prevImage(); break;
        case 'Escape': setIsLightboxOpen(false); break;
        case 'f': setIsFullscreen(!isFullscreen); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, nextImage, prevImage]);

  // Focus management for lightbox
  useEffect(() => {
    if (isLightboxOpen) {
      closeBtnRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isLightboxOpen]);

  // Handle outside click to close lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (lightboxRef.current && !lightboxRef.current.contains(e.target as Node)) {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isLightboxOpen]);

  const currentImg = images[currentIndex] || '/placeholder-property.webp';

return (
      <div className={styles.gallery}>
        <div className={styles.main} role="region" aria-label="Galería de imágenes de la propiedad">
          <img
            src={images[currentIndex] || '/placeholder-property.webp'}
            alt={`Imagen ${currentIndex + 1} de ${images.length}`}
            className={styles.mainImage}
            loading={currentIndex === 0 ? 'eager' : 'lazy'}
          />
          {badge && (
            <span className={`${styles.badge} ${badgeVariant === 'venta' ? styles.badgeVenta : badgeVariant === 'alquiler' ? styles.badgeAlquiler : styles.badgeDestacada}`}>
              {badge}
            </span>
          )}
          {images.length > 1 && (
            <>
              <button
                className={`${styles.nav} ${styles.navPrev}`}
                onClick={prevImage}
                aria-label="Imagen anterior"
                disabled={images.length <= 1}
              >
                <i className="fas fa-chevron-left" aria-hidden="true"></i>
              </button>
              <button
                className={`${styles.nav} ${styles.navNext}`}
                onClick={nextImage}
                aria-label="Imagen siguiente"
                disabled={images.length <= 1}
              >
                <i className="fas fa-chevron-right" aria-hidden="true"></i>
              </button>
            </>
          )}
          <button
            className={styles.fullscreen}
            onClick={() => setIsFullscreen(!isFullscreen)}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-pressed={isFullscreen}
          >
            <i className={isFullscreen ? 'fas fa-compress-alt' : 'fas fa-expand-alt'} aria-hidden="true"></i>
          </button>
          <div className={styles.counter} aria-live="polite">
            {currentIndex + 1} / {images.length}
          </div>
          <nav className={styles.thumbs} aria-label="Miniaturas">
            {images.map((img, idx) => (
              <button
                key={idx}
                className={`${styles.thumb} ${currentIndex === idx ? styles.active : ''}`}
                onClick={() => goToImage(idx)}
                aria-label={`Ver imagen ${idx + 1}`}
                aria-current={currentIndex === idx ? 'true' : 'false'}
              >
                <img src={img} alt="" loading="lazy" />
              </button>
            ))}
          </nav>
        </div>

        {/* Lightbox */}
        <div
          ref={lightboxRef}
          className={`${styles.lightbox} ${isLightboxOpen ? styles.open : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
          hidden={!isLightboxOpen}
        >
          <button
            ref={closeBtnRef}
            className={styles.close}
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Cerrar galería"
          >
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
          <button
            ref={prevBtnRef}
            className={`${styles.nav} ${styles.navPrev}`}
            onClick={prevImage}
            aria-label="Imagen anterior"
            hidden={images.length <= 1}
          >
            <i className="fas fa-chevron-left" aria-hidden="true"></i>
          </button>
          <button
            ref={nextBtnRef}
            className={`${styles.nav} ${styles.navNext}`}
            onClick={nextImage}
            aria-label="Imagen siguiente"
            hidden={images.length <= 1}
          >
            <i className="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
          <div className={styles.imageWrapper}>
            <img
              src={images[currentIndex] || '/placeholder-property.webp'}
              alt={`Imagen ${currentIndex + 1} de ${images.length}`}
              className={styles.lightboxImage}
            />
          </div>
          <div className={styles.counter} aria-live="polite">
            {currentIndex + 1} / {images.length}
</div>
      </div>
    </div>
  );
}

export default PropertyGallery;