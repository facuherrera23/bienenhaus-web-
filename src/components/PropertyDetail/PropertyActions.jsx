// ================================================================
// PROPERTY ACTIONS - Botones de acción en el detalle
// ================================================================

import { useState } from 'preact/hooks';
import { supabase } from '../../supabase.js';
import { formatPrice } from '../../utils/format.js';
import './PropertyActions.css';

export function PropertyActions({ 
  property, 
  onEdit, 
  onClose, 
  onWhatsApp 
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [comparing, setComparing] = useState(false);

  const handleWhatsApp = useCallback(() => {
    if (onWhatsApp) {
      onWhatsApp(property);
    } else {
      // Fallback: open WhatsApp with contextual message
      const message = generateWhatsAppMessage(property);
      const url = `https://wa.me/5493511234567?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [property, onWhatsApp]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: property.titulo,
      text: `${property.operacion === 'venta' ? 'En venta' : 'En alquiler'}: ${property.titulo} - ${formatPrice(property.precio, property.moneda, property.operacion)} en ${property.ubicacion}`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share failed:', err);
          fallbackCopy();
        }
      }
    } else {
      fallbackCopy();
    }
  }, [property]);

  const fallbackCopy = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Enlace copiado al portapapeles');
    }).catch(() => {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('Enlace copiado al portapapeles');
    });
  }, []);

  const handleFavorite = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('Debes iniciar sesión para guardar favoritos', 'warning');
        return;
      }

      const newFavorited = !favorited;
      setFavorited(newFavorited);

      if (newFavorited) {
        await supabase.from('favoritos').insert({
          user_id: user.id,
          propiedad_id: property.id
        });
        showToast('Agregado a favoritos');
      } else {
        await supabase.from('favoritos').delete()
          .eq('user_id', user.id)
          .eq('propiedad_id', property.id);
        showToast('Eliminado de favoritos');
      }
    } catch (err) {
      console.error('Favorite error:', err);
      setFavorited(!favorited); // Revert
      showToast('Error al actualizar favoritos', 'error');
    }
  }, [property, favorited]);

  const handleCompare = useCallback(() => {
    const stored = JSON.parse(localStorage.getItem('compare_properties') || '[]');
    const exists = stored.some(p => p.id === property.id);
    
    if (exists) {
      const updated = stored.filter(p => p.id !== property.id);
      localStorage.setItem('compare_properties', JSON.stringify(updated));
      setComparing(false);
      showToast('Eliminado del comparador');
    } else {
      if (stored.length >= 3) {
        showToast('Máximo 3 propiedades para comparar', 'warning');
        return;
      }
      const updated = [...stored, { 
        id: property.id, 
        titulo: property.titulo, 
        precio: property.precio,
        moneda: property.moneda,
        operacion: property.operacion,
        imagen_principal: property.imagen_principal
      }];
      localStorage.setItem('compare_properties', JSON.stringify(updated));
      setComparing(true);
      showToast('Agregado al comparador');
    }
  }, [property]);

  // Check initial favorite/compare state
  useEffect(() => {
    const checkStates = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: fav } = await supabase
            .from('favoritos')
            .select('id')
            .eq('user_id', user.id)
            .eq('propiedad_id', property.id)
            .single();
          setFavorited(!!fav);
        }
        const stored = JSON.parse(localStorage.getItem('compare_properties') || '[]');
        setComparing(stored.some(p => p.id === property.id));
      } catch (err) {
        console.error('Error checking states:', err);
      }
    };
    checkStates();
  }, [property.id]);

  return (
    <div className="property-actions">
      <div className="property-actions__primary">
        <button 
          className={`btn btn-primary property-actions__btn property-actions__btn--whatsapp`}
          onClick={handleWhatsApp}
          aria-label={`Contactar por WhatsApp sobre ${property.titulo}`}
        >
          <i className="fab fa-whatsapp" aria-hidden="true"></i>
          <span>WhatsApp</span>
        </button>
        
        <button 
          className="btn btn-secondary property-actions__btn"
          onClick={() => onEdit(property)}
          aria-label={`Editar ${property.titulo}`}
        >
          <i className="fas fa-edit" aria-hidden="true"></i>
          <span>Editar</span>
        </button>
      </div>

      <div className="property-actions__secondary">
        <button 
          className={`btn btn-secondary property-actions__btn ${favorited ? 'active' : ''}`}
          onClick={handleFavorite}
          aria-label={favorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-pressed={favorited}
        >
          <i className={favorited ? 'fas fa-heart' : 'far fa-heart'} aria-hidden="true"></i>
          <span>{favorited ? 'Guardado' : 'Guardar'}</span>
        </button>

        <button 
          className={`btn btn-secondary property-actions__btn ${comparing ? 'active' : ''}`}
          onClick={handleCompare}
          aria-label={comparing ? 'Quitar del comparador' : 'Agregar al comparador'}
          aria-pressed={comparing}
        >
          <i className="fas fa-balance-scale" aria-hidden="true"></i>
          <span>{comparing ? 'Comparando' : 'Comparar'}</span>
        </button>

        <button 
          className="btn btn-secondary property-actions__btn"
          onClick={handleShare}
          aria-label="Compartir propiedad"
        >
          <i className="fas fa-share-alt" aria-hidden="true"></i>
          <span>Compartir</span>
        </button>

        <button 
          className="btn btn-secondary property-actions__btn"
          onClick={() => window.open(`https://www.mercadolibre.com.ar/items/${property.ml_item_id}`, '_blank', 'noopener,noreferrer')}
          disabled={!property.ml_item_id}
          aria-label="Ver en MercadoLibre"
        >
          <i className="fab fa-mercadolibre" aria-hidden="true"></i>
          <span>Ver en ML</span>
        </button>
      </div>

      {/* Share modal */}
      {shareOpen && (
        <div className="share-modal__overlay" onClick={() => setShareOpen(false)} role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
          <div className="share-modal">
            <header className="share-modal__header">
              <h3 id="share-modal-title">Compartir propiedad</h3>
              <button className="share-modal__close" onClick={() => setShareOpen(false)} aria-label="Cerrar">
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </header>
            <div className="share-modal__body">
              <p>Compartir esta propiedad con:</p>
              <div className="share-modal__options">
                <button className="share-option" onClick={() => { navigator.share({ title: property.titulo, text: `Propiedad en ${property.ubicacion}: ${formatPrice(property.precio, property.moneda, property.operacion)}`, url: window.location.href }); setShareOpen(false); }}>
                  <i className="fas fa-share" aria-hidden="true"></i>
                  <span>Nativo del sistema</span>
                </button>
                <button className="share-option" onClick={() => { fallbackCopy(); setShareOpen(false); }}>
                  <i className="fas fa-link" aria-hidden="true"></i>
                  <span>Copiar enlace</span>
                </button>
                <button className="share-option" onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`Mira esta propiedad: ${property.titulo} - ${window.location.href}`)}`); setShareOpen(false); }}>
                  <i className="fab fa-whatsapp" aria-hidden="true"></i>
                  <span>WhatsApp</span>
                </button>
                <button className="share-option" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(property.titulo)}&body=${encodeURIComponent(`Mira esta propiedad: ${window.location.href}`)}`); setShareOpen(false); }}>
                  <i className="fas fa-envelope" aria-hidden="true"></i>
                  <span>Email</span>
                </button>
              </div>
            </div>
            <div className="share-modal__footer">
              <button className="btn btn-secondary" onClick={() => setShareOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// PROPERTY AGENT - Tarjeta del agente asignado
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

// Helper para generar mensaje WhatsApp
function generateWhatsAppMessage(property) {
  const parts = ['Hola!'];
  parts.push(`Me interesa la propiedad "${property.titulo}"`);
  parts.push(`${property.operacion === 'venta' ? 'En venta' : 'En alquiler'}: ${formatPrice(property.precio, property.moneda, property.operacion)}`);
  parts.push(`Ubicación: ${property.ubicacion}`);
  parts.push('¿Podrían darme más información?');
  return parts.join('\n');
}

export { PropertyActions, PropertyAgent };