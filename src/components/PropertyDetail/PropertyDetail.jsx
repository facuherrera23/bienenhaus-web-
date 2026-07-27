// ================================================================
// PROPERTY DETAIL PAGE - Día 1: Gallery + Info + Map + JSON-LD + ML Sync
// ================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { supabase } from '../../supabase.js';
import { formatPrice } from '../../utils/format.js';
import { getPropertyJSONLDScript, getBreadcrumbJSONLDScript } from '../../utils/jsonld.js';
import { PropertyMap } from '../Map/PropertyMap.js';
import { PropertyGallery } from './PropertyGallery.jsx';
import { PropertyInfo } from './PropertyInfo.jsx';
import { MLSyncUI } from './MLSyncUI.jsx';
import { PropertyActions } from './PropertyActions.jsx';
import './PropertyDetail.css';

export function PropertyDetail({ 
  propertyId, 
  onClose, 
  onEdit 
}) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('gallery');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mlSyncStatus, setMlSyncStatus] = useState(null);

  // Fetch property data
  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch from local cache first
        const { data: cached } = await supabase
          .from('propiedades')
          .select('*, imagenes(url, cloudinary_public_id, orden, es_principal), agente:agentes(*)')
          .eq('id', propertyId)
          .single();

        if (cached) {
          setProperty(cached);
          
          // Fetch fresh data from ML if connected
          if (cached.ml_item_id) {
            try {
              const { data: mlData } = await supabase.functions.invoke('ml-get-item', {
                body: { item_id: cached.ml_item_id }
              });
              
              if (mlData?.item) {
                // Merge ML data with local
                setProperty(prev => ({
                  ...prev,
                  ml_sync_status: mlData.item.status,
                  ml_price: mlData.item.price,
                  ml_last_sync: new Date().toISOString()
                }));
              }
            } catch (e) {
              console.warn('ML sync failed:', e);
            }
          }
        } else {
          throw new Error('Propiedad no encontrada');
        }
      } catch (err) {
        console.error('Error loading property:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  // Inject JSON-LD
  useEffect(() => {
    if (property) {
      // Inject JSON-LD script
      const existing = document.getElementById('property-jsonld');
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = 'property-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(generatePropertyJSONLD(property));
      document.head.appendChild(script);

      // Breadcrumb JSON-LD
      const breadcrumbScript = document.createElement('script');
      breadcrumbScript.type = 'application/ld+json';
      breadcrumbScript.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${window.location.origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Propiedades', item: `${window.location.origin}/#propiedades` },
          { '@type': 'ListItem', position: 3, name: property.titulo, item: window.location.href }
        ]
      });
      document.head.appendChild(breadcrumbScript);

      // Meta tags
      updateMetaTags(property);

      return () => {
        const jsonld = document.getElementById('property-jsonld');
        if (jsonld) jsonld.remove();
        const bc = document.querySelector('script[type="application/ld+json"][data-breadcrumb]');
        if (bc) bc.remove();
      };
    }, [property]);

  const handleImageClick = (index) => {
    setGalleryIndex(index);
    setLightboxOpen(true);
  };

  const handleGalleryClose = () => {
    setLightboxOpen(false);
  };

  const handleMlSync = useCallback(async () => {
    if (!property?.ml_item_id) return;
    
    setMlSyncStatus('syncing');
    
    try {
      const { data, error } = await supabase.functions.invoke('ml-sync', {
        body: { 
          property_id: property.id,
          action: 'publish' 
        }
      });

      if (error) throw error;

      setMlSyncStatus('success');
      
      // Refresh property data
      const { data: refreshed } = await supabase
        .from('propiedades')
        .select('ml_sync_status, ml_last_sync, ml_item_id')
        .eq('id', property.id)
        .single();

      if (refreshed) {
        setProperty(prev => ({ ...prev, ...refreshed }));
      }
    } catch (err) {
      console.error('ML Sync error:', err);
      setMlSyncStatus('error');
      setTimeout(() => setMlSyncStatus(null), 3000);
    }
  }, [property]);

  // Breadcrumb items
  const breadcrumbs = useMemo(() => [
    { name: 'Inicio', url: '/' },
    { name: 'Propiedades', url: '#propiedades' },
    { name: property?.titulo || 'Detalle' }
  ], [property]);

  if (loading) {
    return (
      <div className="property-detail__loading" role="status" aria-live="polite">
        <div className="spinner" aria-label="Cargando propiedad..."></div>
        <p>Cargando propiedad...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="property-detail__error" role="alert">
        <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
        <h3>Error al cargar</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          <i className="fas fa-redo" aria-hidden="true"></i> Reintentar
        </button>
      </div>
    );
  }

  if (!property) return null;

  return (
    <article className="property-detail" role="main">
      {/* Breadcrumb JSON-LD is injected via useEffect */}
      
      {/* Hero Gallery */}
      <PropertyGallery
        images={property.galeria || [property.imagen_principal].filter(Boolean)}
        currentIndex={galleryIndex}
        onImageClick={handleImageClick}
        featured={property.destacada}
        operation={property.operacion}
        className="property-detail__gallery"
      />

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="lightbox" onClick={handleGalleryClose} role="dialog" aria-modal="true" aria-label="Galería de imágenes">
          <button className="lightbox__close" onClick={handleGalleryClose} aria-label="Cerrar galería">
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
          <button className="lightbox__nav lightbox__nav--prev" onClick={() => setGalleryIndex(i => (i - 1 + (property.galeria?.length || 1)) % (property.galeria?.length || 1))} aria-label="Anterior">
            <i className="fas fa-chevron-left" aria-hidden="true"></i>
          </button>
          <div className="lightbox__image-wrapper">
            <img 
              src={property.galeria?.[galleryIndex] || property.imagen_principal} 
              alt={`${property.titulo} - Imagen ${galleryIndex + 1}`}
            />
          </div>
          <button className="lightbox__nav lightbox__nav--next" onClick={() => setGalleryIndex(i => (i + 1) % (property.galeria?.length || 1))} aria-label="Siguiente">
            <i className="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
          <div className="lightbox__counter" aria-live="polite">
            {galleryIndex + 1} / {(property.galeria?.length || 1)}
          </div>
        </div>
      )}

      <div className="property-detail__content">
        {/* Header with badges */}
        <header className="property-detail__header">
          <div className="property-detail__badges">
            <span className={`badge badge-${property.operacion === 'venta' ? 'venta' : 'alquiler'}`}>
              {property.operacion === 'venta' ? 'Venta' : 'Alquiler'}
            </span>
            {property.destacada && <span className="badge badge-destacada">Destacada</span>}
            {property.ml_item_id && (
              <span className={`badge badge-ml badge-ml--${property.ml_sync_status || 'pending'}`}>
                ML: {property.ml_sync_status === 'published' ? 'Publicada' : property.ml_sync_status === 'syncing' ? 'Sincronizando...' : 'Pendiente'}
              </span>
            )}
          </div>

          <h1 className="property-detail__title">{property.titulo}</h1>
          
          <div className="property-detail__meta">
            <div className="property-detail__price">
              <span className="currency">$</span>
              <span className="amount">{property.precio.toLocaleString('es-AR')}</span>
              <span className="period">{property.operacion === 'alquiler' ? '/mes' : ''}</span>
            </div>
            <div className="property-detail__location">
              <i className="fas fa-map-marker-alt" aria-hidden="true"></i>
              <span>{property.ubicacion}</span>
              {property.lat && property.lng && (
                <button className="btn-link" onClick={() => setActiveTab('map')}>
                  <i className="fas fa-map-marked-alt" aria-hidden="true"></i>
                  Ver en mapa
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <nav className="property-detail__tabs" role="tablist" aria-label="Secciones de la propiedad">
            <button 
              role="tab" 
              aria-selected={activeTab === 'gallery'} 
              aria-controls="panel-gallery"
              id="tab-gallery"
              className={`property-detail__tab ${activeTab === 'gallery' ? 'active' : ''}`}
              onClick={() => setActiveTab('gallery')}
            >
              <i className="fas fa-images" aria-hidden="true"></i> Galería
            </button>
            <button 
              role="tab" 
              aria-selected={activeTab === 'info'} 
              aria-controls="panel-info"
              id="tab-info"
              className={`property-detail__tab ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <i className="fas fa-info-circle" aria-hidden="true"></i> Información
            </button>
            <button 
              role="tab" 
              aria-selected={activeTab === 'map'} 
              aria-controls="panel-map"
              id="tab-map"
              className={`property-detail__tab ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <i className="fas fa-map" aria-hidden="true"></i> Mapa
            </button>
            {property.ml_item_id && (
              <button 
                role="tab" 
                aria-selected={activeTab === 'ml'} 
                aria-controls="panel-ml"
                id="tab-ml"
                className={`property-detail__tab ${activeTab === 'ml' ? 'active' : ''}`}
                onClick={() => setActiveTab('ml')}
              >
                <i className="fab fa-mercadolibre" aria-hidden="true"></i> MercadoLibre
              </button>
            )}
            <button 
              role="tab" 
              aria-selected={activeTab === 'agent'} 
              aria-controls="panel-agent"
              id="tab-agent"
              className={`property-detail__tab ${activeTab === 'agent' ? 'active' : ''}`}
              onClick={() => setActiveTab('agent')}
            >
              <i className="fas fa-user-tie" aria-hidden="true"></i> Agente
            </button>
          </nav>

          {/* Tab Panels */}
          <div className="property-detail__panels">
            {/* Gallery Panel */}
            <div 
              role="tabpanel" 
              id="panel-gallery" 
              aria-labelledby="tab-gallery" 
              hidden={activeTab !== 'gallery'}
            >
              <PropertyGallery
                images={property.galeria || [property.imagen_principal].filter(Boolean)}
                currentIndex={galleryIndex}
                onImageClick={handleImageClick}
                featured={property.destacada}
                operation={property.operacion}
              />
            </div>

            {/* Info Panel */}
            <div 
              role="tabpanel" 
              id="panel-info" 
              aria-labelledby="tab-info" 
              hidden={activeTab !== 'info'}
            >
              <PropertyInfo property={property} />
            </div>

            {/* Map Panel */}
            <div 
              role="tabpanel" 
              id="panel-map" 
              aria-labelledby="tab-map" 
              hidden={activeTab !== 'map'}
            >
              <PropertyMap
                properties={[property]}
                onPropertyClick={() => {}}
                center={[property.lat, property.lng]}
                zoom={15}
                className="property-detail__map"
              />
            </div>

            {/* MercadoLibre Panel */}
            {property.ml_item_id && (
              <div 
                role="tabpanel" 
                id="panel-ml" 
                aria-labelledby="tab-ml" 
                hidden={activeTab !== 'ml'}
              >
                <MLSyncUI 
                  property={property} 
                  onSync={handleMlSync}
                  syncStatus={mlSyncStatus}
                />
              </div>
            )}

            {/* Agent Panel */}
            <div 
              role="tabpanel" 
              id="panel-agent" 
              aria-labelledby="tab-agent" 
              hidden={activeTab !== 'agent'}
            >
              <PropertyAgent agent={property.agente} />
            </div>
          </div>

          {/* Actions */}
          <PropertyActions 
            property={property} 
            onEdit={onEdit}
            onClose={onClose}
            onWhatsApp={() => {}}
          />
        </header>
      </div>
    </article>
  );
}

// ================================================================
// PROPERTY GALLERY COMPONENT
// ================================================================
function PropertyGallery({ images = [], currentIndex = 0, onImageClick, featured, operation, className = '' }) {
  const [current, setCurrent] = useState(currentIndex);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const imagesArray = images.filter(Boolean);
  const total = imagesArray.length;

  const goTo = (index) => {
    setCurrent((index + total) % total);
  };

  const handleKeyDown = (e) => {
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
        />
        
        {/* Operation Badge */}
        <span className={`property-gallery__badge badge-${operacion === 'venta' ? 'venta' : 'alquiler'}`}>
          {operacion === 'venta' ? 'Venta' : 'Alquiler'}
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
              onClick={() => goTo(current + 1)}
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
      {total > 1 && (
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
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="lightbox" onClick={handleGalleryClose} role="dialog" aria-modal="true" aria-label="Galería en pantalla completa">
          <button className="lightbox__close" onClick={handleGalleryClose} aria-label="Cerrar">
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
          <button className="lightbox__nav lightbox__nav--prev" onClick={() => goTo(current - 1)} aria-label="Anterior">
            <i className="fas fa-chevron-left" aria-hidden="true"></i>
          </button>
          <div className="lightbox__image-wrapper">
            <img src={imagesArray[current]} alt="" />
          </div>
          <button className="lightbox__nav lightbox__nav--next" onClick={() => goTo(current + 1)} aria-label="Siguiente">
            <i className="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
          <div className="lightbox__counter" aria-live="polite">
            {current + 1} / {total}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// PROPERTY INFO COMPONENT
// ================================================================
function PropertyInfo({ property }) {
  const features = [];
  
  if (property.habitaciones) features.push({ icon: 'fa-bed', label: 'Habitaciones', value: property.habitaciones });
  if (property.banos) features.push({ icon: 'fa-bath', label: 'Baños', value: property.banos });
  if (property.m2) features.push({ icon: 'fa-arrows-alt', label: 'Superficie', value: `${property.m2} m²` });
  if (property.antiguedad) features.push({ icon: 'fa-calendar-alt', label: 'Antigüedad', value: property.antiguedad });
  if (property.piso) features.push({ icon: 'fa-building', label: 'Piso', value: property.piso });
  if (property.expensas) features.push({ icon: 'fa-receipt', label: 'Expensas', value: formatPrice(property.expensas) });

  const tags = [];
  if (property.cochera) tags.push({ icon: 'fa-car', label: 'Cochera' });
  if (property.balcon) tags.push({ icon: 'fa-window-maximize', label: 'Balcón' });
  if (property.pileta) tags.push({ icon: 'fa-swimming-pool', label: 'Pileta' });
  if (property.quincho) tags.push({ icon: 'fa-utensils', label: 'Quincho' });
  if (property.ascensor) tags.push({ icon: 'fa-elevator', label: 'Ascensor' });
  if (property.seguridad) tags.push({ icon: 'fa-shield-alt', label: 'Seguridad 24hs' });
  if (property.gimnasio) tags.push({ icon: 'fa-dumbbell', label: 'Gimnasio' });
  if (property.laundry) tags.push({ icon: 'fa-tshirt', label: 'Laundry' });
  if (property.mascotas) tags.push({ icon: 'fa-paw', label: 'Mascotas permitidas' });
  if (property.amueblado) tags.push({ icon: 'fa-couch', label: 'Amueblado' });

  return (
    <div className="property-info">
      <section className="property-info__section" aria-labelledby="features-heading">
        <h2 id="features-heading" className="property-info__title">Características principales</h2>
        <dl className="property-features">
          {features.map((feature, index) => (
            <div key={index} className="property-feature">
              <dt className="property-feature__label">
                <i className={`fas ${feature.icon}`} aria-hidden="true"></i>
                {feature.label}
              </dt>
              <dd className="property-feature__value">{feature.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="property-info__section" aria-labelledby="tags-heading">
        <h2 id="tags-heading" className="property-info__title">Comodidades y servicios</h2>
        <div className="property-tags" role="list">
          {tags.map((tag, index) => (
            <span key={index} className="property-tag" role="listitem">
              <i className={`fas ${tag.icon}`} aria-hidden="true"></i>
              {tag.label}
            </span>
          ))}
        </div>
      </section>

      <section className="property-info__section" aria-labelledby="description-heading">
        <h2 id="description-heading" className="property-info__title">Descripción</h2>
        <div className="property-info__description">
          {property.descripcion || <p className="text-muted">Sin descripción disponible</p>}
        </div>
      </section>

      {property.caracteristicas && property.caracteristicas.length > 0 && (
        <section className="property-info__section" aria-labelledby="features-list-heading">
          <h2 id="features-list-heading" className="property-info__title">Características adicionales</h2>
          <ul className="property-features-list">
            {property.caracteristicas.map((feature, index) => (
              <li key={index} className="property-features-list__item">
                <i className="fas fa-check" aria-hidden="true"></i>
                {feature}
              </li>
            ))}
          </ul>
        </section>
      )}

      {property.video_url && (
        <section className="property-info__section" aria-labelledby="video-heading">
          <h2 id="video-heading" className="property-info__title">Video tour</h2>
          <div className="property-video">
            <iframe 
              src={property.video_url} 
              title="Video tour de la propiedad"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}
    </div>
  );
}

// ================================================================
// ML SYNC UI COMPONENT
// ================================================================
function MLSyncUI({ property, onSync, syncStatus }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    published: { label: 'Publicada en ML', icon: 'fa-check-circle', class: 'success' },
    pending: { label: 'Pendiente de publicación', icon: 'fa-clock', class: 'warning' },
    syncing: { label: 'Sincronizando...', icon: 'fa-spinner fa-spin', class: 'info' },
    error: { label: 'Error de sincronización', icon: 'fa-exclamation-triangle', class: 'danger' },
    draft: { label: 'Borrador en ML', icon: 'fa-edit', class: 'secondary' },
    not_connected: { label: 'No conectado a ML', icon: 'fa-unlink', class: 'secondary' }
  };

  const status = property.ml_sync_status || 'not_connected';
  const config = statusConfig[status] || statusConfig.not_connected;

  return (
    <div className="ml-sync-ui">
      <div className="ml-sync__header">
        <h3 className="ml-sync__title">
          <i className="fab fa-mercadolibre" aria-hidden="true"></i>
          MercadoLibre
        </h3>
        <button 
          className={`btn btn-sm ${expanded ? 'active' : ''}`}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="ml-sync-content"
        >
          <i className={expanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'} aria-hidden="true"></i>
        </button>
      </div>

      <div id="ml-sync-content" className={`ml-sync__content ${expanded ? 'expanded' : ''}`} hidden={!expanded}>
        {/* Status Badge */}
        <div className="ml-sync__status">
          <span className={`badge badge-${config.class}`}>
            <i className={`fas ${config.icon}`} aria-hidden="true"></i>
            {config.label}
          </span>
          
          {property.ml_last_sync && (
            <span className="ml-sync__last-sync">
              Última sincronización: {new Date(property.ml_last_sync).toLocaleString('es-AR')}
            </span>
          )}
        </div>

        {/* ML Item ID */}
        {property.ml_item_id && (
          <div className="ml-sync__item-id">
            <label>ML Item ID:</label>
            <div className="ml-sync__item-id-value">
              <code>{property.ml_item_id}</code>
              <button 
                className="btn-icon"
                onClick={() => navigator.clipboard.writeText(property.ml_item_id)}
                aria-label="Copiar ID"
              >
                <i className="fas fa-copy" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        )}

        {/* ML Price & Status */}
        {property.ml_price && (
          <div className="ml-sync__price">
            <label>Precio en ML:</label>
            <span className="ml-sync__price-value">{formatPrice(property.ml_price, property.moneda || 'ARS')}</span>
          </div>
        )}

        {property.ml_status && (
          <div className="ml-sync__ml-status">
            <label>Estado en ML:</label>
            <span className={`badge badge-${property.ml_status === 'active' ? 'success' : property.ml_status === 'paused' ? 'warning' : 'danger'}`}>
              {property.ml_status}
            </span>
          </div>
        )}

        {/* Last Sync */}
        {property.ml_last_sync && (
          <div className="ml-sync__last-sync">
            <label>Última sincronización:</label>
            <span>{new Date(property.ml_last_sync).toLocaleString('es-AR')}</span>
          </div>
        )}

        {/* Actions */}
        <div className="ml-sync__actions">
          <button 
            className="btn btn-primary"
            onClick={() => onSync(property)}
            disabled={syncStatus === 'syncing'}
          >
            {syncStatus === 'syncing' ? (
              <>
                <div className="spinner" aria-hidden="true"></div>
                Sincronizando...
              </>
            ) : (
              <>
                <i className="fas fa-sync" aria-hidden="true"></i>
                Sincronizar ahora
              </>
            )}
          </button>
          
          {property.ml_item_id && (
            <button 
              className="btn btn-secondary"
              onClick={() => window.open(`https://www.mercadolibre.com.ar/items/${property.ml_item_id}`, '_blank')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fas fa-external-link-alt" aria-hidden="true"></i>
              Ver en ML
            </button>
          )}
        </div>

        {/* Error State */}
        {syncStatus === 'error' && (
          <div className="ml-sync__error" role="alert">
            <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
            Error al sincronizar. Intenta nuevamente.
          </div>
        )}

        {/* Success State */}
        {syncStatus === 'success' && (
          <div className="ml-sync__success" role="status">
            <i className="fas fa-check-circle" aria-hidden="true"></i>
            ¡Sincronización completada!
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// PROPERTY ACTIONS COMPONENT
// ================================================================
function PropertyActions({ property, onEdit, onClose, onWhatsApp }) {
  return (
    <div className="property-actions">
      <button 
        className="btn btn-secondary property-actions__btn"
        onClick={onClose}
        aria-label="Cerrar detalle"
      >
        <i className="fas fa-times" aria-hidden="true"></i>
        Cerrar
      </button>
      
      <button 
        className="btn btn-primary property-actions__btn"
        onClick={() => onEdit(property)}
        aria-label="Editar propiedad"
      >
        <i className="fas fa-edit" aria-hidden="true"></i>
        Editar
      </button>

      <button 
        className="btn btn-success property-actions__btn"
        onClick={() => onWhatsApp(property)}
        aria-label="Contactar por WhatsApp"
      >
        <i className="fab fa-whatsapp" aria-hidden="true"></i>
        Contactar por WhatsApp
      </button>

      {property.ml_item_id && (
        <button 
          className="btn btn-info property-actions__btn"
          onClick={() => window.open(`https://www.mercadolibre.com.ar/items/${property.ml_item_id}`, '_blank', 'noopener,noreferrer')}
          aria-label="Ver en MercadoLibre"
        >
          <i className="fab fa-mercadolibre" aria-hidden="true"></i>
          Ver en MercadoLibre
        </button>
      )}
    </div>
  );
}

// ================================================================
// PROPERTY AGENT COMPONENT
// ================================================================
function PropertyAgent({ agent }) {
  if (!agent) {
    return (
      <div className="property-agent">
        <p className="text-muted">Sin agente asignado</p>
      </div>
    );
  }

  return (
    <div className="property-agent">
      <div className="property-agent__card">
        <div className="property-agent__avatar">
          {agent.avatar_url ? (
            <img src={agent.avatar_url} alt={`${agent.nombre} ${agent.apellido}`} />
          ) : (
            <span className="avatar-placeholder">
              {agent.nombre?.[0]}{agent.apellido?.[0]}
            </span>
          )}
        </div>
        
        <div className="property-agent__info">
          <h3 className="property-agent__name">
            {agent.nombre} {agent.apellido}
          </h3>
          <p className="property-agent__specialty">{agent.especialidad}</p>
          
          {agent.telefono && (
            <a href={`tel:${agent.telefono}`} className="property-agent__contact">
              <i className="fas fa-phone" aria-hidden="true"></i>
              {agent.telefono}
            </a>
          )}
          
          {agent.email && (
            <a href={`mailto:${agent.email}`} className="property-agent__contact">
              <i className="fas fa-envelope" aria-hidden="true"></i>
              {agent.email}
            </a>
          )}
        </div>
        
        <div className="property-agent__actions">
          <button className="btn btn-secondary btn-sm">
            <i className="fas fa-envelope" aria-hidden="true"></i>
            Contactar
          </button>
          <button className="btn btn-primary btn-sm">
            <i className="fab fa-whatsapp" aria-hidden="true"></i>
            WhatsApp
          </button>
        </div>
      </div>
      
      {agent.descripcion && (
        <div className="property-agent__bio">
          <h4>Sobre el agente</h4>
          <p>{agent.descripcion}</p>
        </div>
      )}
    </div>
  );
}

// ================================================================
// HELPERS
// ================================================================
function updateMetaTags(property) {
  // Update Open Graph tags
  updateMeta('og:title', property.titulo);
  updateMeta('og:description', property.descripcion?.substring(0, 160) || '');
  updateMeta('og:image', property.imagen_principal || '');
  updateMeta('og:url', window.location.href);
  updateMeta('og:type', 'website');
  
  // Twitter
  updateMeta('twitter:card', 'summary_large_image');
  updateMeta('twitter:title', property.titulo);
  updateMeta('twitter:description', property.descripcion?.substring(0, 160) || '');
  updateMeta('twitter:image', property.imagen_principal || '');
  
  // Canonical
  updateCanonical(window.location.href);
}

function updateMeta(name, content) {
  let meta = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      meta.setAttribute('property', name);
    } else {
      meta.setAttribute('name', name);
    }
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function updateCanonical(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

// Helper para generar JSON-LD de propiedad
function generatePropertyJSONLD(property) {
  const price = property.precio || 0;
  const currency = property.moneda === 'USD' ? 'USD' : 'ARS';
  
  const images = property.galeria?.map(img => ({
    '@type': 'ImageObject',
    contentUrl: img,
    caption: property.titulo
  }) || [];

  if (property.imagen_principal && !images.some(img => img.contentUrl === property.imagen_principal)) {
    images.unshift({
      '@type': 'ImageObject',
      contentUrl: property.imagen_principal,
      caption: property.titulo
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.titulo,
    description: property.descripcion || '',
    url: window.location.href,
    image: images.map(img => img.contentUrl),
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.direccion || '',
      addressLocality: property.ubicacion?.split(',')[0]?.trim() || '',
      addressRegion: property.provincia || 'Córdoba',
      addressCountry: 'AR'
    },
    geo: property.lat && property.lng ? {
      '@type': 'GeoCoordinates',
      latitude: Number(property.lat),
      longitude: Number(property.lng)
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: Number(price),
      priceCurrency: currency,
      availability: 'https://schema.org/InStock'
    },
    propertyType: getPropertyType(property.tipo),
    floorSize: property.m2 ? {
      '@type': 'QuantitativeValue',
      value: Number(property.m2),
      unitCode: 'MTK'
    } : undefined,
    numberOfRooms: property.habitaciones ? Number(property.habitaciones) : undefined,
    numberOfBathrooms: property.banos ? Number(property.banos) : undefined,
    petsAllowed: property.mascotas === true
  };
}

function getPropertyType(tipo) {
  const types = {
    'piso': 'Apartment',
    'chalet': 'House',
    'atico': 'Apartment',
    'local': 'CommercialProperty',
    'terreno': 'Land'
  };
  return types[tipo] || 'RealEstate';
}

// Helper para formatear precio
function formatPrice(price, currency = 'ARS') {
  const symbol = currency === 'USD' ? 'U$S' : '$';
  return `${symbol} ${Number(price).toLocaleString('es-AR')}`;
}

// Export
export { PropertyDetail, PropertyGallery, PropertyInfo, MLSyncUI, PropertyActions, PropertyAgent };
export { generatePropertyJSONLD, formatPrice };