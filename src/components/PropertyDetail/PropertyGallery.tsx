import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import './PropertyGallery.css';


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
        case 'f': /* fullscreen removed (was dead state) */ break;
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
      <div className="property-gallery">
        <div className="property-gallery__main" role="region" aria-label="Galería de imágenes de la propiedad">
          <img
            src={images[currentIndex] || '/placeholder-property.webp'}
            alt={`Imagen ${currentIndex + 1} de ${images.length}`}
            className={styles.mainImage}
            loading={currentIndex === 0 ? 'eager' : 'lazy'}
            onClick={() => setIsLightboxOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsLightboxOpen(true);
              }
            }}
          />
          {badge && (
            <span className={`property-gallery__badge property-gallery__badge--${badgeVariant}`}>
              {badge}
           </span>
          )}
          {images.length > 1 && (
            <>
              <button
                className="property-gallery__nav property-gallery__nav--prev"
                onClick={prevImage}
                aria-label="Imagen anterior"
                disabled={images.length <= 1}
              >
                <i className="fas fa-chevron-left" aria-hidden="true" />
             </button>
              <button
                className="property-gallery__nav property-gallery__nav--next"
                onClick={nextImage}
                aria-label="Imagen siguiente"
                disabled={images.length <= 1}
              >
                <i className="fas fa-chevron-right" aria-hidden="true" />
             </button>
            </>
          )}
          <div className="property-gallery__counter" aria-live="polite">
            {currentIndex + 1} / {images.length}
         </div>
          <nav className="property-gallery__thumbs" aria-label="Miniaturas">
            {images.map((img, idx) => (
              <button
                key={idx}
                className={`property-gallery__thumb ${currentIndex === idx ? 'is-active' : ''}`}
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
        {isLightboxOpen && (
          <div
            ref={lightboxRef}
            className="property-gallery__lightbox is-open"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lightbox-title"
            onClick={(e: MouseEvent) => {
              if (e.target === e.currentTarget) setIsLightboxOpen(false);
            }}
          >
            <h3 id="lightbox-title" className="visually-hidden">Galería ampliada</h3>
            <button
              ref={closeBtnRef}
              className="property-gallery__close"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Cerrar galería"
            >
              <i className="fas fa-times" aria-hidden="true" />
           </button>
            {images.length > 1 && (
              <>
                <button
                  ref={prevBtnRef}
                  className="property-gallery__nav property-gallery__nav--prev property-gallery__nav--lightbox"
                  onClick={prevImage}
                  aria-label="Imagen anterior"
                >
                  <i className="fas fa-chevron-left" aria-hidden="true" />
               </button>
                <button
                  ref={nextBtnRef}
                  className="property-gallery__nav property-gallery__nav--next property-gallery__nav--lightbox"
                  onClick={nextImage}
                  aria-label="Imagen siguiente"
                >
                  <i className="fas fa-chevron-right" aria-hidden="true" />
               </button>
              </>
            )}
            <img
              src={images[currentIndex] || '/placeholder-property.webp'}
              alt={`Imagen ${currentIndex + 1} de ${images.length}`}
              className="property-gallery__lightbox-image"
            />
         </div>
        )}
     </div>
  );
}

export default PropertyGallery;