
// ================================================================
// CONVERSION UX - Sticky CTA + WhatsApp Contextual + Price Alerts
// ================================================================

import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { supabase } from '../../supabase.ts';
import { formatPrice } from '../../utils/format.ts';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';
import './ConversionUX.css';

export function ConversionUX({ 
  property = null,
  currentSection = 'home',
  filters = {},
  onWhatsAppClick = () => {},
  className = ''
}) {
  // Sticky CTA state
  const [showSticky, setShowSticky] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  
  // WhatsApp modal state
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [waForm, setWaForm] = useState({
    name: '',
    phone: '',
    message: '',
    source: ''
  });
  const [waSubmitting, setWaSubmitting] = useState(false);
  const [waSuccess, setWaSuccess] = useState(false);
  const [waError, setWaError] = useState('');
  
  // Price alert state
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [alertForm, setAlertForm] = useState({
    email: '',
    minPrice: 0,
    maxPrice: 900000,
    location: '',
    propertyType: 'todos',
    operation: 'ambos'
  });
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [alertError, setAlertError] = useState('');
  
  // Back to top button
  const backToTopRef = useRef(null);

  // Modal refs for focus trap (WCAG 2.4.3)
  const whatsappModalRef = useRef<HTMLDivElement>(null);
  const priceAlertModalRef = useRef<HTMLDivElement>(null);
  
  // Apply focus traps (WCAG 2.4.3)
  useFocusTrap(showWhatsApp, whatsappModalRef);
  useFocusTrap(showPriceAlert, priceAlertModalRef);

  // Scroll handler for sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrollY(y);
      setShowSticky(y > 300);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track scroll for analytics
  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'scroll_depth', {
        scroll_depth: Math.min(Math.round(scrollY / document.body.scrollHeight * 100), 100),
        page_location: window.location.href
      });
    }
  }, [scrollY]);

  // Generate contextual WhatsApp message
  const generateWhatsAppMessage = useCallback((context = {}) => {
    const { property, section, filters } = context;
    
    let message = 'Hola! ';
    
    if (property) {
      message += `Me interesa la propiedad "${property.titulo}" `;
      message += `(${property.operacion === 'venta' ? 'Venta' : 'Alquiler'} - ${formatPrice(property.precio, property.moneda, property.operacion)}) `;
      message += `en ${property.ubicacion}. `;
    } else if (filters) {
      const parts = [];
      if (filters.operacion && filters.operacion !== 'ambos') {
        parts.push(filters.operacion === 'venta' ? 'en venta' : 'en alquiler');
      }
      if (filters.tipo && filters.tipo !== 'todos') {
        parts.push(filters.tipo);
      }
      if (filters.precioMin > 0 || filters.precioMax < 900000) {
        parts.push(`hasta ${formatPrice(filters.precioMax)}`);
      }
      if (filters.habitaciones > 0) {
        parts.push(`${filters.habitaciones === 4 ? '4+' : filters.habitaciones} habitaciones`);
      }
      if (filters.ubicacion) {
        parts.push(`en ${filters.ubicacion}`);
      }
      if (parts.length) {
        message += `Busco propiedades ${parts.join(', ')}. `;
      }
    } else {
      message += 'Quiero información sobre sus propiedades. ';
    }
    
    message += '¿Podrían contactarme?';
    return message;
  }, []);

  // Open WhatsApp with context
  const openWhatsApp = useCallback((context = {}) => {
    const message = generateWhatsAppMessage(context);
    const encoded = encodeURIComponent(message);
    const phone = '5493511234567'; // Configurar número real
    const url = `https://wa.me/${phone}?text=${encoded}`;
    
    // Track event
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'whatsapp_click', {
        context: context.property ? 'property_detail' : context.section || 'search_results',
        property_id: context.property?.id || null
      });
    }
    
    // Also call custom callback
    onWhatsAppClick(context);
    
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [generateWhatsAppMessage, onWhatsAppClick]);

  // WhatsApp modal handlers
  const openWhatsAppModal = useCallback((context = {}) => {
    const message = generateWhatsAppMessage(context);
    setWaForm(prev => ({ ...prev, message, source: context.section || 'modal' }));
    setShowWhatsApp(true);
    document.body.style.overflow = 'hidden';
  }, [generateWhatsAppMessage]);

  const closeWhatsAppModal = useCallback(() => {
    setShowWhatsApp(false);
    document.body.style.overflow = '';
    setWaSuccess(false);
    setWaError('');
    setWaForm({ name: '', phone: '', message: '', source: '' });
  }, []);

  const handleWhatsAppSubmit = useCallback(async (e) => {
    e.preventDefault();
    setWaSubmitting(true);
    setWaError('');

    try {
      // Submit to Supabase
      const { error } = await supabase.from('whatsapp_leads').insert([{
        name: waForm.name,
        phone: waForm.phone,
        message: waForm.message,
        source: waForm.source,
        user_agent: navigator.userAgent,
        referrer: document.referrer
      }]);

      if (error) throw error;

      // Also open WhatsApp with the message
      const phone = '5493511234567';
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(waForm.message)}`;
      
      setWaSuccess(true);
      
      // Open WhatsApp after short delay
      setTimeout(() => {
        window.open(`https://wa.me/5493511234567?text=${encodeURIComponent(waForm.message)}`, '_blank');
        closeWhatsAppModal();
      }, 1500);

    } catch (err) {
      console.error('WhatsApp lead error:', err);
      setWaError('Error al enviar. Intenta nuevamente.');
    } finally {
      setWaSubmitting(false);
    }
  }, [waForm, onWhatsAppClick]);

  // Price alert handlers
  const openPriceAlert = useCallback((context = {}) => {
    setAlertForm(prev => ({
      ...prev,
      minPrice: context.minPrice || 0,
      maxPrice: context.maxPrice || 900000,
      location: context.location || '',
      propertyType: context.propertyType || 'todos',
      operation: context.operation || 'ambos'
    }));
    setShowPriceAlert(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closePriceAlert = useCallback(() => {
    setShowPriceAlert(false);
    document.body.style.overflow = '';
    setAlertSuccess(false);
    setAlertError('');
    setAlertForm({ email: '', minPrice: 0, maxPrice: 900000, location: '', propertyType: 'todos', operation: 'ambos' });
  }, []);

  const handleAlertSubmit = useCallback(async (e) => {
    e.preventDefault();
    setAlertSubmitting(true);
    setAlertError('');

    // Validate email
    if (!alertForm.email || !alertForm.email.includes('@')) {
      setAlertError('Ingresa un email válido');
      setAlertSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from('price_alerts').insert([{
        email: alertForm.email,
        min_price: alertForm.minPrice,
        max_price: alertForm.maxPrice,
        location: alertForm.location,
        property_type: alertForm.propertyType,
        operation: alertForm.operation,
        user_agent: navigator.userAgent,
        referrer: document.referrer
      }]);

      if (error) throw error;

      setAlertSuccess(true);
      
      setTimeout(() => {
        closePriceAlert();
      }, 2000);

    } catch (err) {
      console.error('Price alert error:', err);
      setAlertError('Error al crear la alerta. Intenta nuevamente.');
    } finally {
      setAlertSubmitting(false);
    }
  }, [alertForm, closePriceAlert]);

  // Back to top
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Track CTA clicks
  const trackCTA = useCallback((action, label) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'cta_click', { action, label });
    }
  }, []);

  // ============ RENDER ============

  return (
    <>
{/* Sticky CTA Mobile */}
      {showSticky && (
        <div 
          className={`conversion-ux__sticky-cta ${className}`} 
          role="complementary" 
          aria-label="Acciones rápidas"
        >
          <button 
            className="conversion-ux__sticky-btn conversion-ux__sticky-btn--secondary"
            onClick={() => { scrollToTop(); trackCTA('scroll_top', 'back_to_top'); }}
            aria-label="Volver al inicio"
          >
            <i className="fas fa-arrow-up" aria-hidden="true"></i>
            <span>Arriba</span>
          </button>
          
          <button 
            className="conversion-ux__sticky-btn conversion-ux__sticky-btn--primary"
            onClick={() => { openWhatsAppModal({ section: 'sticky_cta' }); trackCTA('whatsapp', 'sticky_cta'); }}
            aria-label="Contactar por WhatsApp"
          >
            <i className="fab fa-whatsapp" aria-hidden="true"></i>
            <span>WhatsApp</span>
          </button>
          
          {/* Price alert trigger on property pages */}
          {property && (
            <button 
              className="conversion-ux__sticky-btn conversion-ux__sticky-btn--alert"
              onClick={() => { 
                openPriceAlert({ 
                  minPrice: Math.max(0, property.precio - 500000),
                  maxPrice: property.precio + 500000,
                  location: property.ubicacion,
                  propertyType: property.tipo,
                  operation: property.operacion
                }); 
                trackCTA('price_alert', 'sticky_cta');
              }}
              aria-label="Crear alerta de precio"
            >
<i className="fas fa-bell" aria-hidden="true"></i>
              <span>Alerta precio</span>
            </button>
          )}
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsApp && (
        <div className="conversion-ux__modal-overlay" onClick={closeWhatsAppModal} role="dialog" aria-modal="true" aria-labelledby="wa-modal-title">
          <div ref={whatsappModalRef} className="conversion-ux__modal conversion-ux__modal--whatsapp">
            <header className="conversion-ux__modal-header">
              <h2 id="wa-modal-title" className="conversion-ux__modal-title">
                <i className="fab fa-whatsapp" aria-hidden="true"></i>
                Contactar por WhatsApp
              </h2>
              <button 
                className="conversion-ux__modal-close" 
                onClick={closeWhatsAppModal}
                aria-label="Cerrar"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </header>

            {waSuccess ? (
              <div className="conversion-ux__modal-success" role="status" aria-live="polite">
                <div className="conversion-ux__success-icon">
                  <i className="fas fa-check-circle" aria-hidden="true"></i>
                </div>
                <h3>¡Mensaje enviado!</h3>
                <p>Te redirigiremos a WhatsApp en unos segundos...</p>
                <div className="spinner" aria-label="Redirigiendo..." aria-hidden="true"></div>
              </div>
            ) : (
              <form onSubmit={handleWhatsAppSubmit} className="conversion-ux__modal-form" noValidate>
                <div className="conversion-ux__modal-context" aria-live="polite">
                  <p>Tu mensaje se enviará directamente a WhatsApp.</p>
                </div>

                {waError && (
                  <div id="wa-error" className="conversion-ux__error" role="alert">
                    <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                    {waError}
                  </div>
                )}

                <div className="conversion-ux__form-row">
                  <div className="conversion-ux__form-group">
                    <label htmlFor="waNombre" className="conversion-ux__label">
                      Nombre <span className="required" aria-hidden="true">*</span>
                    </label>
                    <input
                      type="text"
                      id="waNombre"
                      name="name"
                      value={waForm.name}
                      onChange={(e) => setWaForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      autoComplete="name"
                      placeholder="Tu nombre"
                      aria-invalid={!!waError}
                      aria-describedby={waError ? 'wa-error' : undefined}
                    />
                  </div>
                  <div className="conversion-ux__form-group">
                    <label htmlFor="waTelefono" className="conversion-ux__label">
                      Teléfono <span className="required" aria-hidden="true">*</span>
                    </label>
                    <input
                      type="tel"
                      id="waTelefono"
                      name="phone"
                      value={waForm.phone}
                      onChange={(e) => setWaForm(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      autoComplete="tel"
                      placeholder="+54 9 351 123-4567"
                      aria-invalid={!!waError}
                      aria-describedby={waError ? 'wa-error' : undefined}
                    />
                  </div>
                </div>

                <div className="conversion-ux__form-group">
                  <label htmlFor="waMensaje" className="conversion-ux__label">
                    Mensaje <span className="required" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="waMensaje"
                    name="message"
                    value={waForm.message}
                    onChange={(e) => setWaForm(prev => ({ ...prev, message: e.target.value }))}
                    required
                    rows="4"
                    placeholder="Tu mensaje..."
                    aria-invalid={!!waError}
                    aria-describedby={waError ? 'wa-error' : undefined}
                  />
                </div>

                <div className="conversion-ux__modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeWhatsAppModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={waSubmitting}>
                    {waSubmitting ? (
                      <>
                        <div className="spinner" aria-hidden="true"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <i className="fab fa-whatsapp" aria-hidden="true"></i>
                        Enviar por WhatsApp
                      </>
                    )}
                  </button>
                </div>

                <p className="conversion-ux__privacy" aria-live="polite">
                  <i className="fas fa-shield-alt" aria-hidden="true"></i>
                  Tu información es confidencial. No compartimos tus datos.
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Price Alert Modal */}
      {showPriceAlert && (
        <div className="conversion-ux__modal-overlay" onClick={closePriceAlert} role="dialog" aria-modal="true" aria-labelledby="alert-modal-title">
          <div ref={priceAlertModalRef} className="conversion-ux__modal conversion-ux__modal--alert">
            <header className="conversion-ux__modal-header">
              <h2 id="alert-modal-title" className="conversion-ux__modal-title">
                <i className="fas fa-bell" aria-hidden="true"></i>
                Alerta de Precio
              </h2>
              <button 
                className="conversion-ux__modal-close" 
                onClick={closePriceAlert}
                aria-label="Cerrar"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </header>

            {alertSuccess ? (
              <div className="conversion-ux__modal-success" role="status" aria-live="polite">
                <div className="conversion-ux__success-icon">
                  <i className="fas fa-check-circle" aria-hidden="true"></i>
                </div>
                <h3>¡Alerta creada!</h3>
                <p>Te avisaremos por email cuando haya propiedades que coincidan.</p>
              </div>
            ) : (
              <form onSubmit={handleAlertSubmit} className="conversion-ux__modal-form" noValidate>
                <div className="conversion-ux__modal-context" aria-live="polite">
                  <p>Recibe notificaciones cuando una propiedad coincida con tus criterios.</p>
                </div>

                {alertError && (
                  <div id="alert-error" className="conversion-ux__error" role="alert">
                    <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                    {alertError}
                  </div>
                )}

                <div className="conversion-ux__form-row">
                  <div className="conversion-ux__form-group">
                    <label htmlFor="alertEmail" className="conversion-ux__label">
                      Email <span className="required" aria-hidden="true">*</span>
                    </label>
                    <input
                      type="email"
                      id="alertEmail"
                      name="email"
                      value={alertForm.email}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      autoComplete="email"
                      placeholder="tu@email.com"
                      aria-invalid={!!alertError}
                      aria-describedby={alertError ? 'alert-error' : undefined}
                    />
                  </div>
                </div>

                <div className="conversion-ux__form-row">
                  <div className="conversion-ux__form-group">
                    <label htmlFor="alertMinPrice" className="conversion-ux__label">
                      Precio mínimo
                    </label>
                    <input
                      type="number"
                      id="alertMinPrice"
                      name="minPrice"
                      value={alertForm.minPrice}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, minPrice: parseInt(e.target.value) || 0 }))}
                      min="0"
                      step="5000"
                      aria-invalid={!!alertError}
                      aria-describedby={alertError ? 'alert-error' : undefined}
                    />
                  </div>
                  <div className="conversion-ux__form-group">
                    <label htmlFor="alertMaxPrice" className="conversion-ux__label">
                      Precio máximo
                    </label>
                    <input
                      type="number"
                      id="alertMaxPrice"
                      name="maxPrice"
                      value={alertForm.maxPrice}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, maxPrice: parseInt(e.target.value) || 900000 }))}
                      min="0"
                      step="10000"
                      aria-invalid={!!alertError}
                      aria-describedby={alertError ? 'alert-error' : undefined}
                    />
                  </div>
                </div>

                <div className="conversion-ux__form-row">
                  <div className="conversion-ux__form-group">
                    <label htmlFor="alertLocation" className="conversion-ux__label">
                      Ubicación (opcional)
                    </label>
                    <input
                      type="text"
                      id="alertLocation"
                      name="location"
                      value={alertForm.location}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Ej: Nueva Córdoba"
                      aria-invalid={!!alertError}
                      aria-describedby={alertError ? 'alert-error' : undefined}
                    />
                  </div>
                  <div className="conversion-ux__form-group">
                    <label htmlFor="alertPropertyType" className="conversion-ux__label">
                      Tipo de propiedad
                    </label>
                    <select
                      id="alertPropertyType"
                      name="propertyType"
                      value={alertForm.propertyType}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, propertyType: e.target.value }))}
                      aria-invalid={!!alertError}
                      aria-describedby={alertError ? 'alert-error' : undefined}
                    >
                      <option value="todos">Todos</option>
                      <option value="piso">Piso/Apartamento</option>
                      <option value="chalet">Chalet/Casa</option>
                      <option value="atico">Ático</option>
                      <option value="local">Local/Oficina</option>
                      <option value="terreno">Terreno/Solar</option>
                    </select>
                  </div>
                </div>

                <div className="conversion-ux__form-row">
                  <div className="conversion-ux__form-group">
                    <label htmlFor="alertOperation" className="conversion-ux__label">
                      Operación
                    </label>
                    <select
                      id="alertOperation"
                      name="operation"
                      value={alertForm.operation}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, operation: e.target.value }))}
                    >
                      <option value="ambos">Ambos</option>
                      <option value="venta">Venta</option>
                      <option value="alquiler">Alquiler</option>
                    </select>
                  </div>
                </div>

                <div className="conversion-ux__modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closePriceAlert}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={alertSubmitting}>
                    {alertSubmitting ? (
                      <>
                        <div className="spinner" aria-hidden="true"></div>
                        Creando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-bell" aria-hidden="true"></i>
                        Crear alerta
                      </>
                    )}
                  </button>
                </div>

                <p className="conversion-ux__privacy" aria-live="polite">
                  <i className="fas fa-shield-alt" aria-hidden="true"></i>
                  Tu email es confidencial. Solo lo usamos para alertas. Puedes darte de baja cuando quieras.
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating WhatsApp Button */}
      <div className="conversion-ux__floating-whatsapp">
        <button 
          className="conversion-ux__floating-btn"
          onClick={() => { openWhatsAppModal({ section: 'floating_btn' }); trackCTA('whatsapp', 'floating_btn'); }}
          aria-label="Contactar por WhatsApp"
        >
          <i className="fab fa-whatsapp" aria-hidden="true"></i>
        </button>
        
        <span className="conversion-ux__floating-tooltip">
          Contactar por WhatsApp
        </span>
        
        <div className="conversion-ux__pulse" aria-hidden="true"></div>
      </div>

      {/* Back to Top Button */}
      <button 
        ref={backToTopRef}
        className="conversion-ux__back-to-top"
        onClick={() => { scrollToTop(); trackCTA('scroll_top', 'back_to_top'); }}
        aria-label="Volver al inicio"
      >
        <i className="fas fa-arrow-up" aria-hidden="true"></i>
      </button>
    </>
  );
}

// Track CTA clicks
const trackCTA = (action, label) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'cta_click', { action, label });
  }
};

// Floating WhatsApp tooltip
const FloatingWhatsApp = () => {
  // ... implementation would go here if needed
  return null;
}

export default ConversionUX;
