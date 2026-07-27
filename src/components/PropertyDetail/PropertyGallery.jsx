// ================================================================
// PROPERTY GALLERY - Fullscreen lightbox with thumbnails
// ================================================================

import { useState, useEffect, useCallback } from 'preact/hooks';
import './PropertyGallery.css';

export function PropertyGallery({ 
  images = [], 
  currentIndex = 0, 
  onImageClick,
  featured,
  operation,
  className = ''
}) {
  const [current, setCurrent] = useState(currentIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);

  const imagesArray = images.filter(Boolean);
  const total = imagesArray.length;

  const goTo = (index) => {
    setCurrent((index + total) % total);
  };

  const handleKeyDown = (e) => {
    if (!lightboxOpen) return;
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'Escape') setLightboxOpen(false);
  };

  useEffect(() => {
    if (lightboxOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen]);

  const handleImageClick = (index) => {
    setLightboxOpen(true);
    setCurrent(index);
  };

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrent(i => (i - 1 + total) % total);
      else setCurrent(i => (i + 1) % total);
    }
    setTouchStartX(null);
  };

  const renderThumbnails = () => {
    if (total <= 1) return null;
    return (
      <div className="property-gallery__thumbs" role="group" aria-label="Miniaturas">
        {imagesArray.map((img, index) => (
          <button
            key={index}
            className={`property-gallery__thumb ${index === current ? 'active' : ''}`}
            onClick={() => setCurrent(index)}
            aria-label={`Ver imagen ${index + 1}`}
            aria-current={index === current ? 'true' : 'false'}
          >
            <img src={img} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    );
  };

  const renderLightbox = () => {
    if (!lightboxOpen) return null;
    return (
      <div className="property-gallery__lightbox" onClick={handleLightboxClose} role="dialog" aria-modal="true" aria-label="Galería de imágenes">
        <button className="lightbox__close" onClick={handleLightboxClose} aria-label="Cerrar">
          <i className="fas fa-times" aria-hidden="true"></i>
        </button>
        <button className="lightbox__nav lightbox__nav--prev" onClick={() => setCurrent(i => (i - 1 + total) % total)} aria-label="Anterior">
          <i className="fas fa-chevron-left" aria-hidden="true"></i>
        </button>
        <div className="lightbox__image-wrapper">
          <img 
            src={imagesArray[current]} 
            alt={`${imagesArray[current]?.alt || 'Imagen'} ${current + 1} de ${total}`}
          />
        </div>
        <button className="lightbox__nav lightbox__nav--next" onClick={() => setCurrent(i => (i + 1) % total)} aria-label="Siguiente">
          <i className="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
        <div className="lightbox__counter" aria-live="polite">
          {current + 1} / {total}
        </div>
      </div>
    );
  };

  const handleLightboxClose = () => {
    setLightboxOpen(false);
  };

  const imagesArray = images.filter(Boolean);

  return (
    <div className={`property-gallery ${className}`} role="region" aria-label="Galería de imágenes">
      {/* Main Image */}
      <div className="property-gallery__main" onClick={() => setLightboxOpen(true)}>
        <img 
          src={imagesArray[current] || 'https://via.placeholder.com/800x600?text=Sin+imagen'}
          alt={`${imagesArray[current]?.alt || 'Imagen'} ${current + 1} de ${total}`}
          loading={current === 0 ? 'eager' : 'lazy'}
          width="800"
          height="600"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
        
        {/* Operation Badge */}
        <span className={`property-gallery__badge badge-${operation === 'venta' ? 'venta' : 'alquiler'}`}>
          {operation === 'venta' ? 'Venta' : 'Alquiler'}
        </span>
        
        {/* Featured Badge */}
        {featured && <span className="property-gallery__badge badge-destacada">Destacada</span>}
        
        {/* Counter */}
        {total > 1 && (
          <div className="property-gallery__counter" aria-live="polite">
            {current + 1} / {total}
          </div>
        )}
        
        {/* Navigation Arrows */}
        {total > 1 && (
          <>
            <button 
              className="property-gallery__nav property-gallery__nav--prev"
              onClick={() => setCurrent(i => (i - 1 + total) % total)}
              aria-label="Imagen anterior"
            >
              <i className="fas fa-chevron-left" aria-hidden="true"></i>
            </button>
            <button 
              className="property-gallery__nav property-gallery__nav--next"
              onClick={() => setCurrent(i => (i + 1) % total)}
              aria-label="Imagen siguiente"
            >
              <i className="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          </>
        )}
        
        {/* Fullscreen Button */}
        <button 
          className="property-gallery__fullscreen"
          onClick={() => setLightboxOpen(true)}
          aria-label="Ver en pantalla completa"
        >
          <i className="fas fa-expand" aria-hidden="true"></i>
        </button>
      </div>

      {/* Thumbnails */}
      <div className="property-gallery__thumbs" role="group" aria-label="Miniaturas">
        {imagesArray.map((img, index) => (
          <button
            key={index}
            className={`property-gallery__thumb ${index === current ? 'active' : ''}`}
            onClick={() => setCurrent(index)}
            aria-label={`Ver imagen ${index + 1}`}
            aria-current={index === current ? 'true' : 'false'}
          >
            <img src={img} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <div 
        className={`property-gallery__lightbox ${lightboxOpen ? 'open' : ''}`}
        onClick={(e) => { if (e.target === e.currentTarget) setLightboxOpen(false); }}
        role="dialog" 
        aria-modal="true" 
        aria-label="Galería de imágenes en pantalla completa"
      >
        <button className="lightbox__close" onClick={handleLightboxClose} aria-label="Cerrar">
          <i className="fas fa-times" aria-hidden="true"></i>
        </button>
        <button className="lightbox__nav lightbox__nav--prev" onClick={() => setCurrent(i => (i - 1 + total) % total)} aria-label="Anterior">
          <i className="fas fa-chevron-left" aria-hidden="true"></i>
        </button>
        <div className="lightbox__image-wrapper">
          <img 
            src={imagesArray[current]} 
            alt={`${imagesArray[current]?.alt || 'Imagen'} ${current + 1} de ${total}`}
          />
        </div>
        <button className="lightbox__nav lightbox__nav--next" onClick={() => setCurrent(i => (i + 1) % total)} aria-label="Siguiente">
          <i className="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
        <div className="lightbox__counter" aria-live="polite">
          {current + 1} / {total}
        </div>
      </div>
    </div>
  );
}

export default PropertyGallery;