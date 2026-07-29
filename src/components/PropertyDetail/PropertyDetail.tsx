import { useState, useEffect, useCallback, useRef } from 'preact/hooks';

const scrollToSearch = () => {
  const searchSection = document.getElementById('search-bar');
  if (searchSection) {
    searchSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

interface PropertyDetailProps {
  property: any;
  onClose?: () => void;
  onContact?: (property: any) => void;
}

export function PropertyDetail({ property, onClose, onContact }: any) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const galleryMainRef = useRef<HTMLDivElement>(null);
  const fullscreenBtnRef = useRef<HTMLButtonElement>(null);

  const images = property.imagenes || [property.imagen_principal].filter(Boolean);
  const currentImg = images[currentImage] || '/placeholder-property.webp';

  // Format price
  const formatPrice = useCallback((price: number, currency: string, operation: string) => {
    const symbol = currency === 'USD' ? 'U$S' : '$';
    const suffix = operation === 'alquiler' ? '/mes' : '';
    return `${symbol} ${Number(price).toLocaleString('es-AR')}${suffix}`;
  }, []);

  // Navigation
  const goToImage = useCallback((index: number) => {
    setCurrentImage((prev) => (index + images.length) % images.length);
  }, [images.length]);

  const nextImage = useCallback(() => goToImage(currentImage + 1), [goToImage]);
  const prevImage = useCallback(() => goToImage(currentImage - 1), [goToImage]);

  // Keyboard navigation
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

  const formattedPrice = formatPrice(property.precio, property.moneda, property.operacion);
  const isVenta = property.operacion === 'venta';
  const badgeClass = isVenta ? 'badge-venta' : 'badge-alquiler';
  const badgeText = isVenta ? 'Venta' : 'Alquiler';

  if (!property) return null;

  return (
    <>
      {/* Main Detail Modal */}
      <div className={`detail-overlay ${isLightboxOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div className="detail-modal" ref={lightboxRef}>
          {/* Header */}
          <header className="detail-header">
            <h2 id="detail-title" className="detail-title">
              {property.titulo}
            </h2>
            <div className="detail-header-actions">
              <button
                ref={fullscreenBtnRef}
                className={`detail-btn ${isFullscreen ? 'active' : ''}`}
                onClick={() => setIsFullscreen(!isFullscreen)}
                aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                aria-pressed={isFullscreen}
              >
                <i className={isFullscreen ? 'fas fa-compress-alt' : 'fas fa-expand-alt'} aria-hidden="true"></i>
              </button>
              <button
                ref={closeBtnRef}
                className="detail-close"
                onClick={() => setIsLightboxOpen(false)}
                aria-label="Cerrar detalle"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>
          </header>

          {/* Main Image */}
          <div className="detail-image-wrapper" ref={galleryMainRef}>
            <img
              src={images[currentImage] || '/placeholder-property.webp'}
              alt={`${property.titulo} - Imagen ${currentImage + 1} de ${images.length}`}
              className="detail-image"
              loading={currentImage === 0 ? 'eager' : 'lazy'}
            />
            {/* Navigation arrows */}
            <button
              ref={prevBtnRef}
              className={`nav-btn nav-prev`}
              onClick={prevImage}
              aria-label="Imagen anterior"
              aria-hidden={images.length <= 1}
            >
              <i className="fas fa-chevron-left" aria-hidden="true"></i>
            </button>
            <button
              ref={nextBtnRef}
              className={`nav-btn nav-next`}
              onClick={nextImage}
              aria-label="Imagen siguiente"
              aria-hidden={images.length <= 1}
            >
              <i className="fas fa-chevron-right" aria-hidden="true"></i>
            </button>

            {/* Badge */}
            <span className={`badge ${isVenta ? 'badge-venta' : 'badge-alquiler'}`}>
              {badgeText}
            </span>

            {/* Counter */}
            <div className="counter">
              {currentImage + 1} / {images.length}
            </div>
          </div>

          {/* Thumbnails */}
          <div className="thumbnails" role="group" aria-label="Miniaturas de la propiedad">
            {images.map((img, index) => (
              <button
                key={img}
                className={`thumb ${index === currentImage ? 'active' : ''}`}
                onClick={() => goToImage(index)}
                aria-label={`Ver imagen ${index + 1}`}
                aria-current={index === currentImage ? 'true' : 'false'}
              >
                <img src={img} alt={`Miniatura ${index + 1}`} loading="lazy" />
                {index === currentImage && <span className="thumb-indicator" aria-hidden="true" />}
              </button>
            ))}
          </div>

          {/* Content Grid */}
          <div className="detail-grid">
            {/* Main Info */}
            <div className="detail-main">
              {/* Title & Location */}
              <div className="detail-header-content">
                <h2 className="detail-title">{property.titulo}</h2>
                <div className="detail-location">
                  <i className="fas fa-map-marker-alt" aria-hidden="true"></i>
                  <span>{property.ubicacion || 'Ubicación no disponible'}</span>
                </div>
              </div>

              {/* Price */}
              <div className="detail-price">
                <span className="price-label">{isVenta ? 'Precio' : 'Alquiler'}</span>
                <span className="price-value">{formatPrice(property.precio, property.moneda, property.operacion)}</span>
                <span className={`price-badge ${isVenta ? 'badge-venta' : 'badge-alquiler'}`}>
                  {isVenta ? 'En venta' : 'En alquiler'}
                </span>
              </div>

              {/* Description */}
              <section className="detail-section">
                <h3 className="section-title">Descripción</h3>
                <p className="detail-description">{property.descripcion || 'Sin descripción disponible'}</p>
              </section>

              {/* Features */}
              <section className="detail-section">
                <h3 className="section-title">Características</h3>
                <div className="features-grid">
                  <div className="feature-item">
                    <i className="fas fa-bed" aria-hidden="true"></i>
                    <span className="feature-value">{property.dormitorios || 0}</span>
                    <span className="feature-label">Dormitorios</span>
                  </div>
                  <div className="feature-item">
                    <i className="fas fa-bath" aria-hidden="true"></i>
                    <span className="feature-value">{property.banos || 0}</span>
                    <span className="feature-label">Baños</span>
                  </div>
                  <div className="feature-item">
                    <i className="fas fa-car" aria-hidden="true"></i>
                    <span className="feature-value">{property.cochera || 0}</span>
                    <span className="feature-label">Cocheras</span>
                  </div>
                  <div className="feature-item">
                    <i className="fas fa-ruler-combined" aria-hidden="true"></i>
                    <span className="feature-value">{property.superficie || 0}</span>
                    <span className="feature-label">m² Totales</span>
                  </div>
                  <div className="feature-item">
                    <i className="fas fa-ruler" aria-hidden="true"></i>
                    <span className="feature-value">{property.superficie_cubierta || 0}</span>
                    <span className="feature-label">m² Cubiertos</span>
                  </div>
                  <div className="feature-item">
                    <i className="fas fa-calendar" aria-hidden="true"></i>
                    <span className="feature-value">{property.antiguedad || 0}</span>
                    <span className="feature-label">Años antigüedad</span>
                  </div>
                </div>
              </section>

              {/* Tags */}
              {property.caracteristicas && property.caracteristicas.length > 0 && (
                <section className="detail-section">
                  <h3 className="section-title">Características destacadas</h3>
                  <div className="tags">
                    {property.caracteristicas.split(',').map((tag: string) => (
                      <span key={tag.trim()} className="tag">{tag.trim()}</span>
                    ))}
                  </div>
                </section>
              )}

              {/* Agent Info */}
              {property.agente && (
                <section className="detail-section">
                  <h3 className="section-title">Contactar agente</h3>
                  <div className="agent-card">
                    <div className="agent-avatar">
                      {property.agente.avatar 
                        ? <img src={property.agente.avatar} alt={property.agente.nombre} />
                        : <span>{property.agente.nombre.charAt(0).toUpperCase()}</span>
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
                      <i className="fab fa-whatsapp" aria-hidden="true"></i>
                      <span>Contactar por WhatsApp</span>
                    </button>
                  </div>
                </section>
              )}

            </div>

            {/* Sidebar - Map & Contact */}
            <aside className="detail-sidebar">
              {/* Map */}
              <section className="detail-section">
                <h3 className="section-title">Ubicación</h3>
                <div className="map-container" id={`property-map-${property.id}`} style={{ height: '300px', borderRadius: '12px', overflow: 'hidden' }}>
                  <div className="map-placeholder" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ds-color-surface-2)' }}>
                    <div style={{ textAlign: 'center', padding: 'var(--ds-space-5)' }}>
                      <i className="fas fa-map-marked-alt" style={{ fontSize: '3rem', color: 'var(--ds-color-primary)', marginBottom: 'var(--ds-space-3)' }}></i>
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
                          <i className="fas fa-external-link-alt" aria-hidden="true"></i>
                          <span>Ver en Google Maps</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Contact CTA */}
              <section className="detail-section">
                <button
                  className="btn btn-primary btn-fullwidth"
                  onClick={() => onContact?.(property)}
                  style={{ minHeight: '56px', fontSize: '1rem' }}
                >
                  <i className="fab fa-whatsapp" aria-hidden="true"></i>
                  <span>Contactar por WhatsApp</span>
                </button>
                <button
                  className="btn btn-outline btn-fullwidth"
                  onClick={() => window.open(`tel:+5493511234567`, '_self')}
                  style={{ minHeight: '44px', marginTop: 'var(--ds-space-3)' }}
                >
                  <i className="fas fa-phone" aria-hidden="true"></i>
                  <span>Llamar ahora</span>
                </button>
              </section>

              {/* Share */}
              <section className="detail-section">
                <h3 className="section-title">Compartir</h3>
                <div className="share-buttons" style={{ display: 'flex', gap: 'var(--ds-space-3)' }}>
                  <button className="btn btn-ghost" aria-label="Compartir en Facebook">
                    <i className="fab fa-facebook-f" aria-hidden="true"></i>
                  </button>
                  <button className="btn btn-ghost" aria-label="Compartir en Twitter">
                    <i className="fab fa-twitter" aria-hidden="true"></i>
                  </button>
                  <button className="btn btn-ghost" aria-label="Compartir por email">
                    <i className="fas fa-envelope" aria-hidden="true"></i>
                  </button>
                  <button className="btn btn-ghost" aria-label="Copiar enlace">
                    <i className="fas fa-link" aria-hidden="true"></i>
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      <style jsx>{`
        .detailOverlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        .detailOverlay.open {
          opacity: 1;
          visibility: visible;
        }
        .detailModal {
          background: #1c1f21;
          border-radius: 16px;
          max-width: 95vw;
          max-height: 95vh;
          overflow-y: auto;
          box-shadow: 0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(46,230,197,0.18);
          border: 1px solid rgba(232,236,238,0.06);
          animation: scaleIn 0.3s cubic-bezier(0.23,1,0.32,1);
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .detailHeader {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px 16px 8px;
          position: sticky;
          top: 0;
          background: rgba(28,31,33,0.95);
          backdrop-filter: blur(8px);
          z-index: 10;
          border-bottom: 1px solid rgba(232,236,238,0.06);
        }
        .detailBtn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid rgba(232,236,238,0.12);
          background: #1c1f21;
          color: #c4a882;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .detailBtn:hover {
          background: #2ee6c5;
          color: #0b0d0e;
          border-color: #2ee6c5;
        }
        .detailBtn.active {
          background: #2ee6c5;
          color: #0b0d0e;
          border-color: #2ee6c5;
        }
        .detailClose { font-size: 24px; }
        .detailImageWrapper { position: relative; width: 100%; aspect-ratio: 16/9; background: #16181a; overflow: hidden; }
        .detailImage { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s cubic-bezier(0.23,1,0.32,1); }
        .navBtn { position: absolute; top: 50%; transform: translateY(-50%); width: 56px; height: 56px; border-radius: 50%; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); border: 1px solid rgba(232,236,238,0.12); display: flex; align-items: center; justify-content: center; color: #e8ecee; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 16px rgba(0,0,0,0.45); font-size: 24px; }
        .navBtn:hover { background: rgba(0,0,0,0.8); color: #2ee6c5; transform: translateY(-50%) scale(1.1); }
        .navPrev { left: 16px; }
        .navNext { right: 16px; }
        .badge { position: absolute; top: 16px; right: 16px; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
        .badgeVenta { background: #2ee6c5; color: #0b0d0e; }
        .badgeAlquiler { background: #39d98a; color: #0b0d0e; }
        .counter { position: absolute; bottom: 16px; right: 16px; background: rgba(0,0,0,0.7); color: #e8ecee; padding: 8px 16px; border-radius: 9999px; font-size: 14px; font-weight: 600; backdrop-filter: blur(4px); }
        .thumbnails { display: flex; gap: 12px; padding: 16px; overflow-x: auto; scroll-snap-type: x mandatory; background: #16181a; border-top: 1px solid rgba(232,236,238,0.06); }
        .thumb { flex: 0 0 auto; width: 80px; height: 60px; border-radius: 8px; overflow: hidden; border: 2px solid transparent; cursor: pointer; scroll-snap-align: center; transition: opacity 0.2s ease, border-color 0.2s ease; opacity: 0.6; }
        .thumb:hover { opacity: 1; border-color: #2ee6c5; }
        .thumb.active { opacity: 1; border-color: #2ee6c5; box-shadow: 0 0 0 2px rgba(46,230,197,0.18); }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }
        .thumbIndicator { position: absolute; bottom: 4px; right: 4px; width: 8px; height: 8px; background: #2ee6c5; border-radius: 50%; }
        .detailGrid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
        @media (max-width: 900px) { .detailGrid { grid-template-columns: 1fr; } }
        .detailMain { display: flex; flex-direction: column; gap: 24px; }
        .detailHeaderContent { margin-bottom: 8px; }
        .detailTitle { font-family: 'General Sans', sans-serif; font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 800; color: #e8ecee; text-transform: uppercase; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 8px; }
        .detailLocation { display: flex; align-items: center; gap: 8px; color: #9aa1a6; font-size: 14px; }
        .detailPrice { display: flex; flex-direction: column; gap: 8px; padding: 16px; background: #16181a; border-radius: 12px; border: 1px solid rgba(232,236,238,0.06); }
        .priceLabel { font-size: 12px; font-weight: 600; color: #9aa1a6; text-transform: uppercase; letter-spacing: 0.08em; }
        .priceValue { font-family: 'JetBrains Mono', monospace; font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 800; color: #2ee6c5; letter-spacing: -0.01em; }
        .priceBadge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
        .badgeVenta { background: rgba(46,230,197,0.16); color: #2ee6c5; border: 1px solid rgba(46,230,197,0.25); }
        .badgeAlquiler { background: rgba(57,217,138,0.16); color: #39d98a; border: 1px solid rgba(57,217,138,0.25); }
        .detailSection { padding-top: 8px; }
        .sectionTitle { font-family: 'General Sans', sans-serif; font-size: 18px; font-weight: 700; color: #e8ecee; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
        .detailDescription { color: #c4a882; line-height: 1.7; font-size: 14px; }
        .featuresGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; }
        .featureItem { background: #16181a; padding: 16px; border-radius: 12px; border: 1px solid rgba(232,236,238,0.06); text-align: center; transition: all 0.2s ease; }
        .featureItem:hover { border-color: #2ee6c5; box-shadow: 0 4px 20px rgba(46,230,197,0.18); transform: translateY(-2px); }
        .featureItem i { font-size: 24px; color: #2ee6c5; margin-bottom: 8px; display: block; }
        .featureValue { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 800; color: #e8ecee; letter-spacing: -0.01em; line-height: 1; display: block; margin-bottom: 4px; }
        .featureLabel { font-size: 12px; color: #9aa1a6; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; }
        .tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .tag { background: #2ee6c533; color: #2ee6c5; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; border: 1px solid rgba(46,230,197,0.25); }
        .agentCard { background: #16181a; border: 1px solid rgba(232,236,238,0.06); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .agentAvatar { width: 48px; height: 48px; border-radius: 50%; background: rgba(46,230,197,0.16); display: flex; align-items: center; justify-content: center; color: #2ee6c5; font-weight: 700; font-size: 18px; overflow: hidden; border: 2px solid rgba(46,230,197,0.25); }
        .agentAvatar img { width: 100%; height: 100%; object-fit: cover; }
        .agentInfo { text-align: center; }
        .agentName { font-weight: 700; color: #e8ecee; margin-bottom: 2px; }
        .agentSpecialty { font-size: 13px; color: #9aa1a6; }
        .agentContactBtn { width: 100%; justify-content: center; margin-top: 4px; }
        .detailSidebar { display: flex; flex-direction: column; gap: 20px; }
        .detailSection { background: #16181a; border: 1px solid rgba(232,236,238,0.06); border-radius: 12px; padding: 20px; }
        .sectionTitle { font-family: 'General Sans', sans-serif; font-size: 18px; font-weight: 700; color: #e8ecee; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
        .mapContainer { height: 300px; border-radius: 12px; overflow: hidden; }
        .mapPlaceholder { height: 100%; display: flex; align-items: center; justify-content: center; background: var(--ds-color-surface-2); }
        .btnFullwidth { width: 100%; }
        .shareButtons { display: flex; gap: 12px; }
        .btnFullwidth { width: 100%; }

        /* Mobile adjustments */
        @media (max-width: 900px) {
          .detailGrid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}

export default PropertyDetail;