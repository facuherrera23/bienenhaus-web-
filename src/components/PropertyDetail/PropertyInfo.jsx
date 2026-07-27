// ================================================================
// PROPERTY INFO - Información detallada de la propiedad
// ================================================================

import { useMemo } from 'preact/hooks';
import { formatPrice } from '../../utils/format.js';
import './PropertyInfo.css';

export function PropertyInfo({ property }) {
  const features = useMemo(() => {
    const features = [];
    if (property.habitaciones) features.push({ icon: 'fa-bed', label: 'Habitaciones', value: property.habitaciones });
    if (property.banos) features.push({ icon: 'fa-bath', label: 'Baños', value: property.banos });
    if (property.m2) features.push({ icon: 'fa-arrows-alt', label: 'Superficie', value: `${property.m2} m²` });
    if (property.antiguedad) features.push({ icon: 'fa-calendar-alt', label: 'Antigüedad', value: getAntiguedadLabel(property.antiguedad) });
    if (property.piso) features.push({ icon: 'fa-building', label: 'Piso', value: property.piso });
    if (property.expensas) features.push({ icon: 'fa-receipt', label: 'Expensas', value: formatPrice(property.expensas) });
    return features;
  }, [property]);

  const tags = useMemo(() => {
    const tags = [];
    if (property.cochera) tags.push({ icon: 'fa-car', label: 'Cochera' });
    if (property.balcon) tags.push({ icon: 'fa-window-maximize', label: 'Balcón' });
    if (property.pileta) tags.push({ icon: 'fa-swimming-pool', label: 'Pileta' });
    if (property.quincho) tags.push({ icon: 'fa-fire', label: 'Quincho' });
    if (property.ascensor) tags.push({ icon: 'fa-elevator', label: 'Ascensor' });
    if (property.gimnasio) tags.push({ icon: 'fa-dumbbell', label: 'Gimnasio' });
    if (property.seguridad) tags.push({ icon: 'fa-shield-alt', label: 'Seguridad 24hs' });
    if (property.lavadero) tags.push({ icon: 'fa-tshirt', label: 'Lavadero' });
    if (property.aire) tags.push({ icon: 'fa-snowflake', label: 'Aire acondicionado' });
    if (property.calefaccion) tags.push({ icon: 'fa-fire', label: 'Calefacción' });
    if (property.gas) tags.push({ icon: 'fa-burn', label: 'Gas natural' });
    if (property.agua) tags.push({ icon: 'fa-tint', label: 'Agua corriente' });
    if (property.cloacas) tags.push({ icon: 'fa-toilet', label: 'Cloacas' });
    if (property.pavimento) tags.push({ icon: 'fa-road', label: 'Pavimento' });
    if (property.mascotas) tags.push({ icon: 'fa-paw', label: 'Mascotas permitidas' });
    if (property.amueblado) tags.push({ icon: 'fa-couch', label: 'Amueblado' });
    return tags;
  }, [property]);

  const description = useMemo(() => {
    if (!property.descripcion) return null;
    // Procesar markdown simple
    return property.descripcion
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }, [property.descripcion]);

  if (!property) return null;

  return (
    <div className="property-info">
      {/* Descripción */}
      {property.descripcion && (
        <section className="property-info__section" aria-labelledby="desc-title">
          <h2 id="desc-title" className="property-info__section-title">
            <i className="fas fa-align-left" aria-hidden="true"></i>
            Descripción
          </h2>
          <div className="property-info__description" dangerouslySetInnerHTML={{ __html: description }} />
        </section>
      )}

      {/* Características principales */}
      {features.length > 0 && (
        <section className="property-info__section" aria-labelledby="features-title">
          <h2 id="features-title" className="property-info__section-title">
            <i className="fas fa-list" aria-hidden="true"></i>
            Características principales
          </h2>
          <div className="property-info__features">
            {features.map((feature, index) => (
              <div key={index} className="property-info__feature">
                <i className={`fas ${feature.icon} property-info__feature-icon`} aria-hidden="true"></i>
                <div className="property-info__feature-content">
                  <span className="property-info__feature-label">{feature.label}</span>
                  <span className="property-info__feature-value">{feature.value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Características / Tags */}
      {tags.length > 0 && (
        <section className="property-info__section" aria-labelledby="tags-title">
          <h2 id="tags-title" className="property-info__section-title">
            <i className="fas fa-tags" aria-hidden="true"></i>
            Características
          </h2>
          <div className="property-info__tags">
            {tags.map((tag, index) => (
              <span key={index} className="property-info__tag">
                <i className={`fas ${tag.icon}`} aria-hidden="true"></i>
                {tag.label}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Descripción */}
      {property.descripcion && (
        <section className="property-info__section" aria-labelledby="desc-title">
          <h2 id="desc-title" className="property-info__section-title">
            <i className="fas fa-align-left" aria-hidden="true"></i>
            Descripción
          </h2>
          <div className="property-info__description" dangerouslySetInnerHTML={{ __html: description }} />
        </section>
      )}

      {/* Video tour */}
      {property.video_url && (
        <section className="property-info__section" aria-labelledby="video-title">
          <h2 id="video-title" className="property-info__section-title">
            <i className="fas fa-video" aria-hidden="true"></i>
            Video tour 360°
          </h2>
          <div className="property-info__video">
            <iframe
              src={property.video_url}
              title="Video tour 360° de la propiedad"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </section>
      )}

      {/* Plano / Plano de la propiedad */}
      {property.plano_url && (
        <section className="property-info__section" aria-labelledby="plano-title">
          <h2 id="plano-title" className="property-info__section-title">
            <i className="fas fa-project-diagram" aria-hidden="true"></i>
            Plano de la propiedad
          </h2>
          <div className="property-info__plano">
            <img 
              src={property.plano_url} 
              alt="Plano de la propiedad" 
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* Documentos */}
      {property.documentos?.length > 0 && (
        <section className="property-info__section" aria-labelledby="docs-title">
          <h2 id="docs-title" className="property-info__section-title">
            <i className="fas fa-file-alt" aria-hidden="true"></i>
            Documentos
          </h2>
          <div className="property-info__documents">
            {property.documentos.map((doc, index) => (
              <a 
                key={index}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="property-info__document"
              >
                <i className={`fas ${getDocIcon(doc.tipo)}`} aria-hidden="true"></i>
                <span>{doc.nombre}</span>
                <span className="property-info__doc-size">{doc.tamaño}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* SEO / Meta tags info */}
      {(property.seo_title || property.seo_description || property.seo_keywords) && (
        <section className="property-info__section" aria-labelledby="seo-title">
          <h2 id="seo-title" className="property-info__section-title">
            <i className="fas fa-search" aria-hidden="true"></i>
            SEO
          </h2>
          <div className="property-info__seo">
            {property.seo_title && (
              <div className="property-info__seo-field">
                <label>Meta Title</label>
                <span>{property.seo_title}</span>
              </div>
            )}
            {property.seo_description && (
              <div className="property-info__seo-field">
                <label>Meta Description</label>
                <span>{property.seo_description}</span>
              </div>
            )}
            {property.seo_keywords && (
              <div className="property-info__seo-field">
                <label>Keywords</label>
                <span>{property.seo_keywords}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Historial de precios */}
      {property.historial_precios?.length > 0 && (
        <section className="property-info__section" aria-labelledby="history-title">
          <h2 id="history-title" className="property-info__section-title">
            <i className="fas fa-history" aria-hidden="true"></i>
            Historial de precios
          </h2>
          <div className="property-info__history">
            {property.historial_precios
              .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
              .map((entry, index) => (
                <div key={index} className="property-info__history-item">
                  <div className="property-info__history-date">
                    {new Date(entry.fecha).toLocaleDateString('es-AR')}
                  </div>
                  <div className="property-info__history-price">
                    {formatPrice(entry.precio, entry.moneda)}
                    {entry.operacion === 'alquiler' && '/mes'}
                  </div>
                  <div className="property-info__history-action">
                    {entry.accion}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Helpers
function getAntiguedadLabel(antiguedad) {
  const labels = {
    'nuevo': 'Nuevo',
    'reformado': 'Reformado',
    'viejo': 'A reformar'
  };
  return labels[antiguedad] || antiguedad;
}

function getDocIcon(tipo) {
  const icons = {
    'escritura': 'fa-file-contract',
    'plano': 'fa-file-image',
    'expensas': 'fa-file-invoice',
    'impuestos': 'fa-file-invoice-dollar',
    'servicios': 'fa-file-alt',
    'otro': 'fa-file'
  };
  return icons[tipo] || 'fa-file';
}

// Helpers
function formatPrice(price, currency = 'ARS') {
  const symbol = currency === 'USD' ? 'U$S' : '$';
  return `${symbol} ${Number(price).toLocaleString('es-AR')}`;
}

// Export
export default PropertyInfo;