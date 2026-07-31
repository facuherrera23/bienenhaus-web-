import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { CONFIG } from '../../config.ts';
import './PropertyDetail.css';

interface Property {
  id: number;
  titulo: string;
  precio: number;
  moneda: string;
  operacion: 'venta' | 'alquiler';
  ubicacion?: string;
  descripcion?: string;
  imagen_principal?: string;
  imagenes?: string[];
  caracteristicas?: string | string[];
  dormitorios?: number;
  banos?: number;
  cochera?: number;
  superficie?: number;
  superficie_cubierta?: number;
  antiguedad?: number | string;
  latitud?: number | string;
  longitud?: number | string;
  agente?: {
    nombre: string;
    avatar?: string;
    especialidad?: string;
  };
}

interface PropertyDetailProps {
  property: Property | null;
  onClose?: () => void;
  onContact?: (property: Property) => void;
}

export function PropertyDetail({ property, onClose, onContact }: PropertyDetailProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Null guard FIRST — all hooks below must run regardless of property value, so guard after hooks.
  // For safety, bail early at the top of every render path that touches property fields.

  const formatPrice = useCallback((price: number, currency: string, operation: string): string => {
    const symbol = currency === 'USD' ? 'U$S' : '$';
    const suffix = operation === 'alquiler' ? '/mes' : '';
    return `${symbol} ${Number(price).toLocaleString('es-AR')}${suffix}`;
  }, []);

  const images = property?.imagenes ?? (property?.imagen_principal ? [property.imagen_principal] : []);
  const currentImg = images[currentImage] || '/placeholder-property.webp';

  const goToImage = useCallback((index: number) => {
    setCurrentImage((index + images.length) % images.length);
  }, [images.length]);

  const nextImage = useCallback(() => goToImage(currentImage + 1), [goToImage, currentImage]);
  const prevImage = useCallback(() => goToImage(currentImage - 1), [goToImage, currentImage]);

  // Escape on overlay closes the detail (parent gets called via onClose)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) setIsLightboxOpen(false);
        else onClose?.();
      }
      if (!isLightboxOpen) return;
      switch (e.key) {
        case 'ArrowRight': nextImage(); break;
        case 'ArrowLeft': prevImage(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, nextImage, prevImage, onClose]);

  // Restore body overflow on unmount in case the modal is closed via route change
  useEffect(() => {
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Outside-click closes the detail modal (only when the lightbox is closed)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (isLightboxOpen) return;
      const target = e.target as HTMLElement;
      if (target.closest && target.closest('.detail-modal')) return;
      onClose?.();
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isLightboxOpen, onClose]);

  const shareUrl = property ? `${window.location.origin}/detalle/${property.id}` : '';
  const shareTitle = property?.titulo ?? '';
  const shareText = property ? `${property.titulo} - ${property.ubicacion ?? ''}` : '';

  const onShareFacebook = useCallback(() => {
    if (!property) return;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
  }, [property, shareUrl]);

  const onShareTwitter = useCallback(() => {
    if (!property) return;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [property, shareTitle, shareUrl]);

  const onShareEmail = useCallback(() => {
    if (!property) return;
    window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
  }, [property, shareTitle, shareText, shareUrl]);

  const onShareCopy = useCallback(async () => {
    if (!property) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      const { showToast } = await import('../../main.ts');
      showToast('Enlace copiado al portapapeles', 'success', 2000);
    } catch {
      window.prompt('Copia el enlace:', shareUrl);
    }
  }, [property, shareUrl]);

  if (!property) return null;

  const formattedPrice = formatPrice(property.precio, property.moneda, property.operacion);
  const isVenta = property.operacion === 'venta';
  const badgeText = isVenta ? 'Venta' : 'Alquiler';

  return (
    <div className="detail-overlay" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="detail-modal" ref={lightboxRef}>
        <header className="detail-header">
          <h2 id="detail-title" className="detail-title">
            {property.titulo}
         </h2>
          <button
            ref={closeBtnRef}
            className="detail-close"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
       </header>

        <div className="detail-image-wrapper">
          <img
            src={currentImg}
            alt={`${property.titulo} - Imagen ${currentImage + 1} de ${images.length}`}
            className="detail-image"
            loading={currentImage === 0 ? 'eager' : 'lazy'}
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

          {images.length > 1 && (
            <>
              <button
                className="nav-btn nav-prev"
                onClick={prevImage}
                aria-label="Imagen anterior"
              >
                <i className="fas fa-chevron-left" aria-hidden="true" />
             </button>
              <button
                className="nav-btn nav-next"
                onClick={nextImage}
                aria-label="Imagen siguiente"
              >
                <i className="fas fa-chevron-right" aria-hidden="true" />
             </button>
            </>
          )}

          <span className={`badge ${isVenta ? 'badge-venta' : 'badge-alquiler'}`}>
            {badgeText}
         </span>

          <div className="counter" aria-live="polite">
            {currentImage + 1} / {images.length}
         </div>
       </div>

        <div className="thumbnails" role="group" aria-label="Miniaturas de la propiedad">
          {images.map((img, index) => (
            <button
              key={`${index}-${img}`}
              className={`thumb ${index === currentImage ? 'active' : ''}`}
              onClick={() => goToImage(index)}
              aria-label={`Ver imagen ${index + 1}`}
              aria-current={index === currentImage ? 'true' : 'false'}
            >
              <img src={img} alt={`Miniatura ${index + 1}`} loading="lazy" />
           </button>
          ))}
       </div>

        <div className="detail-grid">
          <div className="detail-main">
            <div className="detail-header-content">
              <h3 className="detail-title-secondary">{property.titulo}</h3>
              <div className="detail-location">
                <i className="fas fa-map-marker-alt" aria-hidden="true" />
                <span>{property.ubicacion || 'Ubicación no disponible'}</span>
             </div>
           </div>

            <div className="detail-price">
              <span className="price-label">{isVenta ? 'Precio' : 'Alquiler'}</span>
              <span className="price-value">{formattedPrice}</span>
              <span className={`price-badge ${isVenta ? 'badge-venta' : 'badge-alquiler'}`}>
                {isVenta ? 'En venta' : 'En alquiler'}
             </span>
           </div>

            <section className="detail-section">
              <h3 className="section-title">Descripción</h3>
              <p className="detail-description">{property.descripcion || 'Sin descripción disponible'}</p>
           </section>

            <section className="detail-section">
              <h3 className="section-title">Características</h3>
              <div className="features-grid">
                <div className="feature-item">
                  <i className="fas fa-bed" aria-hidden="true" />
                  <span className="feature-value">{property.dormitorios || 0}</span>
                  <span className="feature-label">Dormitorios</span>
               </div>
                <div className="feature-item">
                  <i className="fas fa-bath" aria-hidden="true" />
                  <span className="feature-value">{property.banos || 0}</span>
                  <span className="feature-label">Baños</span>
               </div>
                <div className="feature-item">
                  <i className="fas fa-car" aria-hidden="true" />
                  <span className="feature-value">{property.cochera || 0}</span>
                  <span className="feature-label">Cocheras</span>
               </div>
                <div className="feature-item">
                  <i className="fas fa-ruler-combined" aria-hidden="true" />
                  <span className="feature-value">{property.superficie || 0}</span>
                  <span className="feature-label">m² Totales</span>
               </div>
                <div className="feature-item">
                  <i className="fas fa-ruler" aria-hidden="true" />
                  <span className="feature-value">{property.superficie_cubierta || 0}</span>
                  <span className="feature-label">m² Cubiertos</span>
               </div>
                <div className="feature-item">
                  <i className="fas fa-calendar" aria-hidden="true" />
                  <span className="feature-value">{property.antiguedad || 0}</span>
                  <span className="feature-label">Años antigüedad</span>
               </div>
             </div>
           </section>

            {property.caracteristicas && (
              <section className="detail-section">
                <h3 className="section-title">Características destacadas</h3>
                <div className="tags">
                  {(Array.isArray(property.caracteristicas)
                    ? property.caracteristicas
                    : property.caracteristicas.split(',')
                  ).map((tag: string, i: number) => (
                    <span key={`${i}-${tag.trim()}`} className="tag">{tag.trim()}</span>
                  ))}
               </div>
             </section>
            )}

            {property.agente && (
              <section className="detail-section">
                <h3 className="section-title">Contactar agente</h3>
                <div className="agent-card">
                  <div className="agent-avatar">
                    {property.agente.avatar
                      ? <img src={property.agente.avatar} alt={property.agente.nombre} />
                      : <span>{(property.agente.nombre || '?').charAt(0).toUpperCase()}</span>
                    }
                 </div>
                  <div className="agent-info">
                    <h4 className="agent-name">{property.agente.nombre}</h4>
                    <p className="agent-specialty">{property.agente.especialidad || 'Agente inmobiliario'}</p>
                 </div>
                  <button
                    className="btn btn-primary agent-contact-btn"
                    onClick={() => onContact?.(property)}
                  >
                    <i className="fab fa-whatsapp" aria-hidden="true" />
                    <span>Contactar por WhatsApp</span>
                 </button>
               </div>
             </section>
            )}
         </div>

          <aside className="detail-sidebar">
            <section className="detail-section">
              <h3 className="section-title">Ubicación</h3>
              <div
                className="map-container"
                id={`property-map-${property.id}`}
                style={{ height: '300px', borderRadius: '12px', overflow: 'hidden' }}
              >
                <div
                  className="map-placeholder"
                  style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ds-color-surface-2)' }}
                >
                  <div style={{ textAlign: 'center', padding: 'var(--ds-space-5)' }}>
                    <i className="fas fa-map-marked-alt" style={{ fontSize: '3rem', color: 'var(--ds-color-primary)', marginBottom: 'var(--ds-space-3)' }} />
                    <p style={{ color: 'var(--ds-color-text-secondary)', marginBottom: 'var(--ds-space-3)' }}>
                      {property.ubicacion || 'Ubicación no disponible'}
                   </p>
                    {property.latitud && property.longitud && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${property.latitud},${property.longitud}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ds-btn ds-btn-primary"
                        style={{ minHeight: '44px' }}
                      >
                        <i className="fas fa-external-link-alt" aria-hidden="true" />
                        <span>Ver en Google Maps</span>
                     </a>
                    )}
                 </div>
               </div>
             </div>
           </section>

            <section className="detail-section detail-section--contact">
              <button
                className="btn btn-primary btn-fullwidth"
                onClick={() => onContact?.(property)}
                style={{ minHeight: '56px', fontSize: '1rem' }}
              >
                <i className="fab fa-whatsapp" aria-hidden="true" />
                <span>Contactar por WhatsApp</span>
             </button>
              <a
                href={`tel:${CONFIG.WHATSAPP_NUMBER}`}
                className="btn btn-outline btn-fullwidth"
                style={{ minHeight: '44px', marginTop: 'var(--ds-space-3)' }}
              >
                <i className="fas fa-phone" aria-hidden="true" />
                <span>Llamar ahora</span>
             </a>
           </section>

            <section className="detail-section">
              <h3 className="section-title">Compartir</h3>
              <div className="share-buttons">
                <button className="btn btn-ghost" aria-label="Compartir en Facebook" onClick={onShareFacebook}>
                  <i className="fab fa-facebook-f" aria-hidden="true" />
               </button>
                <button className="btn btn-ghost" aria-label="Compartir en Twitter" onClick={onShareTwitter}>
                  <i className="fab fa-twitter" aria-hidden="true" />
               </button>
                <button className="btn btn-ghost" aria-label="Compartir por email" onClick={onShareEmail}>
                  <i className="fas fa-envelope" aria-hidden="true" />
               </button>
                <button className="btn btn-ghost" aria-label="Copiar enlace" onClick={onShareCopy}>
                  <i className="fas fa-link" aria-hidden="true" />
               </button>
             </div>
           </section>
         </aside>
       </div>

        {isLightboxOpen && (
          <div
            className="detail-lightbox-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lightbox-title"
            onClick={(e: MouseEvent) => {
              if (e.target === e.currentTarget) setIsLightboxOpen(false);
            }}
          >
            <h3 id="lightbox-title" className="visually-hidden">Visor de imagen</h3>
            <button
              className="detail-close detail-close--lightbox"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Cerrar visor"
            >
              <i className="fas fa-times" aria-hidden="true" />
           </button>
            {images.length > 1 && (
              <>
                <button
                  className="nav-btn nav-prev nav-btn--lightbox"
                  onClick={prevImage}
                  aria-label="Imagen anterior"
                >
                  <i className="fas fa-chevron-left" aria-hidden="true" />
               </button>
                <button
                  className="nav-btn nav-next nav-btn--lightbox"
                  onClick={nextImage}
                  aria-label="Imagen siguiente"
                >
                  <i className="fas fa-chevron-right" aria-hidden="true" />
               </button>
              </>
            )}
            <img
              src={currentImg}
              alt={`${property.titulo} - Imagen ampliada ${currentImage + 1} de ${images.length}`}
              className="detail-lightbox-image"
            />
         </div>
        )}
     </div>
   </div>
  );
}

export default PropertyDetail;
