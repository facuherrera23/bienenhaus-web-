// ================================================================
// MLSyncUI - Interfaz de sincronización con MercadoLibre
// ================================================================

import { useState, useEffect, useCallback } from 'preact/hooks';
import { supabase } from '../../supabase.js';
import { formatPrice } from '../../utils/format.js';
import './MLSyncUI.css';

export function MLSyncUI({ 
  property, 
  onSync, 
  syncStatus 
}) {
  const [expanded, setExpanded] = useState(false);
  const [mlDetails, setMlDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const statusConfig = {
    published: { label: 'Publicada en ML', icon: 'fa-check-circle', class: 'success' },
    pending: { label: 'Pendiente de publicación', icon: 'fa-clock', class: 'warning' },
    syncing: { label: 'Sincronizando...', icon: 'fa-spinner fa-spin', class: 'info' },
    error: { label: 'Error de sincronización', icon: 'fa-exclamation-triangle', class: 'danger' },
    draft: { label: 'Borrador en ML', icon: 'fa-edit', class: 'secondary' },
    not_connected: { label: 'No conectado a ML', icon: 'fa-unlink', class: 'secondary' }
  };

  const status = property?.ml_sync_status || 'not_connected';
  const config = statusConfig[status] || statusConfig.not_connected;

  // Load ML details when expanded
  useEffect(() => {
    if (expanded && property?.ml_item_id && !mlDetails) {
      loadMlDetails();
    }
  }, [expanded, property?.ml_item_id]);

  const loadMlDetails = useCallback(async () => {
    if (!property?.ml_item_id) return;
    
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke('ml-get-item', {
        body: { item_id: property.ml_item_id }
      });
      
      if (error) throw error;
      if (data?.item) {
        setMlDetails(data.item);
      }
    } catch (err) {
      console.error('Error loading ML details:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, [property?.ml_item_id]);

  const handleSync = useCallback(async () => {
    if (onSync) {
      await onSync(property);
    }
  }, [onSync, property]);

  const handleViewOnML = useCallback(() => {
    if (property?.ml_item_id) {
      window.open(`https://www.mercadolibre.com.ar/items/${property.ml_item_id}`, '_blank', 'noopener,noreferrer');
    }
  }, [property?.ml_item_id]);

  const handleRefreshML = useCallback(async () => {
    if (!property?.ml_item_id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('ml-get-item', {
        body: { item_id: property.ml_item_id }
      });
      
      if (error) throw error;
      
      if (data?.item) {
        // Update property with fresh ML data
        window.dispatchEvent(new CustomEvent('ml-data-updated', { 
          detail: { property_id: property.id, mlData: data.item }
        }));
      }
    } catch (err) {
      console.error('Error refreshing ML data:', err);
    }
  }, [property]);

  return (
    <div className="ml-sync-ui">
      {/* Header */}
      <div className="ml-sync__header">
        <h3 className="ml-sync__title">
          <i className="fab fa-mercadolibre" aria-hidden="true"></i>
          MercadoLibre
        </h3>
        <button 
          className={`ml-sync__toggle ${expanded ? 'expanded' : ''}`}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="ml-sync-content"
        >
          <i className={expanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'} aria-hidden="true"></i>
        </button>
      </div>

      {/* Content */}
      <div 
        id="ml-sync-content" 
        className={`ml-sync__content ${expanded ? 'expanded' : ''}`}
        hidden={!expanded}
      >
        {/* Status Badge */}
        <div className="ml-sync__status">
          <span className={`badge badge-${config.class}`}>
            <i className={`fas ${config.icon}`} aria-hidden="true"></i>
            {config.label}
          </span>
          
          {property?.ml_last_sync && (
            <span className="ml-sync__last-sync">
              Última sincronización: {new Date(property.ml_last_sync).toLocaleString('es-AR')}
            </span>
          )}
        </div>

        {/* ML Item ID */}
        {property?.ml_item_id && (
          <div className="ml-sync__item-id">
            <label>ML Item ID:</label>
            <div className="ml-sync__item-id-value">
              <code>{property.ml_item_id}</code>
              <button 
                className="ml-sync__copy-btn"
                onClick={() => navigator.clipboard.writeText(property.ml_item_id)}
                aria-label="Copiar ID"
                title="Copiar ID"
              >
                <i className="fas fa-copy" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        )}

        {/* ML Price & Status */}
        <div className="ml-sync__details">
          {property?.ml_price && (
            <div className="ml-sync__detail">
              <label>Precio en ML:</label>
              <span className="ml-sync__detail-value">{formatPrice(property.ml_price, property.moneda || 'ARS')}</span>
            </div>
          )}
          
          {property?.ml_status && (
            <div className="ml-sync__detail">
              <label>Estado en ML:</label>
              <span className={`badge badge-${property.ml_status === 'active' ? 'success' : property.ml_status === 'paused' ? 'warning' : 'danger'}`}>
                {property.ml_status}
              </span>
            </div>
          )}

          {property?.ml_available_quantity !== undefined && (
            <div className="ml-sync__detail">
              <label>Stock disponible:</label>
              <span className="ml-sync__detail-value">{property.ml_available_quantity}</span>
            </div>
          )}

          {property?.ml_sold_quantity !== undefined && (
            <div className="ml-sync__detail">
              <label>Vendidos:</label>
              <span className="ml-sync__detail-value">{property.ml_sold_quantity}</span>
            </div>
          )}

          {/* Last Sync */}
          {property?.ml_last_sync && (
            <div className="ml-sync__detail">
              <label>Última sincronización:</label>
              <span className="ml-sync__detail-value">
                {new Date(property.ml_last_sync).toLocaleString('es-AR')}
              </span>
            </div>
          )}
        </div>

        {/* ML Details (when expanded) */}
        {mlDetails && (
          <div className="ml-sync__ml-details">
            <h4>Detalles en MercadoLibre</h4>
            <div className="ml-sync__ml-grid">
              <div className="ml-sync__ml-detail">
                <label>Título en ML:</label>
                <span>{mlDetails.title}</span>
              </div>
              <div className="ml-sync__ml-detail">
                <label>Permalink:</label>
                <a href={mlDetails.permalink} target="_blank" rel="noopener noreferrer">
                  {mlDetails.permalink}
                </a>
              </div>
              {mlDetails.pictures?.length > 0 && (
                <div className="ml-sync__ml-detail ml-sync__ml-detail--full">
                  <label>Imágenes en ML:</label>
                  <div className="ml-sync__ml-images">
                    {mlDetails.pictures.slice(0, 5).map((pic, i) => (
                      <img 
                        key={i} 
                        src={pic.url} 
                        alt={`Imagen ${i + 1} en ML`}
                        loading="lazy"
                      />
                    )}
                  </div>
                </div>
              )}
              {mlDetails.attributes?.length > 0 && (
                <div className="ml-sync__ml-detail ml-sync__ml-detail--full">
                  <label>Atributos en ML:</label>
                  <ul className="ml-sync__ml-attributes">
                    {mlDetails.attributes.slice(0, 10).map((attr, i) => (
                      <li key={i}>
                        <strong>{attr.name}:</strong> {attr.value_name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading ML Details */}
        {expanded && !mlDetails && loadingDetails && (
          <div className="ml-sync__loading">
            <div className="spinner" aria-label="Cargando..."></div>
            <span>Cargando detalles de ML...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Default export
export default MLSyncUI;