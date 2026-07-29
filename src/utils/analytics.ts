
// ================================================================
// ANALYTICS - Unified tracking for GA4, Meta Pixel, custom events
// ================================================================

const ANALYTICS_CONFIG = {
  ga4MeasurementId: import.meta.env.VITE_GA4_ID || null,
  metaPixelId: import.meta.env.VITE_META_PIXEL_ID || null,
  debug: import.meta.env.DEV
};

/**
 * Initialize analytics providers
 */
export function initAnalytics() {
  if (typeof window === 'undefined') return;

  // GA4
  if (ANALYTICS_CONFIG.ga4MeasurementId && !window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
    };
    window.gtag('js', new Date());
    window.gtag('config', ANALYTICS_CONFIG.ga4MeasurementId, {
      send_page_view: false, // We'll send manually
      anonymize_ip: true
    });

    // Load GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.ga4MeasurementId}`;
    document.head.appendChild(script);
  }

  // Meta Pixel
  if (ANALYTICS_CONFIG.metaPixelId && !window.fbq) {
    window.fbq = function fbq() {
      if (window.fbq.callMethod) {
        window.fbq.callMethod.apply(window.fbq, arguments); // eslint-disable-line prefer-rest-params, prefer-spread
      } else {
        window.fbq.queue.push(arguments); // eslint-disable-line prefer-rest-params
      }
    };
    window.fbq.queue = [];
    window.fbq('init', ANALYTICS_CONFIG.metaPixelId, {
      em: '', // email if available
      external_id: '' // user id if logged in
    });
    window.fbq('track', 'PageView');

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  // Consent mode v2
  if (ANALYTICS_CONFIG.ga4MeasurementId) {
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      analytics_storage: 'granted',
      functionality_storage: 'granted',
      personalization_storage: 'denied',
      security_storage: 'granted'
    });
  }
}

/**
 * Track page view
 */
export function trackPageView(pagePath, pageTitle) {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
      page_location: window.location.href
    });
  }

  if (window.fbq) {
    window.fbq('track', 'PageView');
  }

  if (ANALYTICS_CONFIG.debug) {
    console.warn('[Analytics] Page view:', { pagePath, pageTitle });
  }
}

/**
 * Track custom event
 */
export function trackEvent(eventName, parameters = {}) {
  if (typeof window === 'undefined') return;

  const enrichedParams = {
    ...parameters,
    timestamp: Date.now(),
    page_path: window.location.pathname,
    page_location: window.location.href,
    user_agent: navigator.userAgent
  };

  if (window.gtag) {
    window.gtag('event', eventName, enrichedParams);
  }

  if (window.fbq) {
    // Map common event names to FB standard events
    const fbEventMap = {
'contact_form_submit': 'Contact',
    'whatsapp_click': 'Contact',
    'property_view': 'ViewContent',
    'property_favorite': 'AddToWishlist',
    'search_submit': 'Search',
    'filter_change': 'Filter',
    'cta_click': 'Click',
    'price_alert_create': 'Lead',
    'price_alert_trigger': 'Lead',
  };
    const fbEvent = fbEventMap[eventName] || 'CustomEvent';
    window.fbq('track', fbEvent, enrichedParams);
  }

  if (ANALYTICS_CONFIG.debug) {
    console.warn('[Analytics] Event:', eventName, enrichedParams);
  }
}

/**
 * Track search
 */
export function trackSearch(searchTerm, filters = {}, resultsCount = 0) {
  trackEvent('search_submit', {
    search_term: searchTerm,
    filters: JSON.stringify(filters),
    results_count: resultsCount
  });
}

/**
 * Track filter change
 */
export function trackFilterChange(filterName, oldValue, newValue, activeFiltersCount) {
  trackEvent('filter_change', {
    filter_name: filterName,
    old_value: String(oldValue),
    new_value: String(newValue),
    active_filters_count: activeFiltersCount
  });
}

/**
 * Track property view
 */
export function trackPropertyView(propertyId, propertyData) {
  trackEvent('property_view', {
    property_id: propertyId,
    property_type: propertyData?.tipo,
    operation: propertyData?.operacion,
    price: propertyData?.precio,
    currency: propertyData?.moneda,
    location: propertyData?.ubicacion,
    is_featured: propertyData?.destacado
  });
}

/**
 * Track WhatsApp click
 */
export function trackWhatsAppClick(context, propertyId = null) {
  trackEvent('whatsapp_click', {
    context, // 'property_detail', 'search_results', 'sticky_cta', 'floating_btn', 'modal'
    property_id: propertyId
  });
}

/**
 * Track price alert creation
 */
export function trackPriceAlertCreate(alertData) {
  trackEvent('price_alert_create', {
    min_price: alertData.minPrice,
    max_price: alertData.maxPrice,
    location: alertData.location,
    property_type: alertData.propertyType,
    operation: alertData.operation
  });
}

/**
 * Track price alert trigger (email sent)
 */
export function trackPriceAlertTrigger(alertId, propertyId) {
  trackEvent('price_alert_trigger', {
    alert_id: alertId,
    property_id: propertyId
  });
}

/**
 * Track CTA click
 */
export function trackCTAClick(action, label, location = null) {
  trackEvent('cta_click', {
    action,
    label,
    location
  });
}

/**
 * Track contact form submit
 */
export function trackContactFormSubmit(formData, success = true) {
  trackEvent('contact_form_submit', {
    subject: formData.subject || formData.motivo,
    property_type: formData.propertyType || formData.tipoPropiedad,
    has_phone: !!formData.phone,
    prefers_whatsapp: !!formData.prefer_whatsapp,
    success
  });
}

/**
 * Track favorite toggle
 */
export function trackPropertyFavorite(propertyId, isFavorite) {
  trackEvent('property_favorite', {
    property_id: propertyId,
    is_favorite: isFavorite
  });
}

/**
 * Track comparator usage
 */
export function trackComparatorAction(action, propertyCount, propertyIds = []) {
  trackEvent('comparator_action', {
    action, // 'add', 'remove', 'open', 'clear'
    property_count: propertyCount,
    property_ids: propertyIds
  });
}

/**
 * Track scroll depth
 */
export function trackScrollDepth(depthPercent) {
  trackEvent('scroll_depth', {
    depth_percent: Math.min(Math.round(depthPercent), 100)
  });
}

/**
 * Track video play
 */
export function trackVideoPlay(videoId, videoTitle, propertyId = null) {
  trackEvent('video_play', {
    video_id: videoId,
    video_title: videoTitle,
    property_id: propertyId
  });
}

/**
 * Track file download
 */
export function trackDownload(fileName, fileType, propertyId = null) {
  trackEvent('file_download', {
    file_name: fileName,
    file_type: fileType,
    property_id: propertyId
  });
}

/**
 * Set user properties (for logged in users)
 */
export function setUserProperties(userId, properties = {}) {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('set', 'user_id', userId);
    window.gtag('set', 'user_properties', properties);
  }

  if (window.fbq) {
    window.fbq('set', 'userData', properties);
  }
}

/**
 * Update consent mode
 */
export function updateConsent(consent) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('consent', 'update', {
    ad_storage: consent.advertising ? 'granted' : 'denied',
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    functionality_storage: consent.functional ? 'granted' : 'denied',
    personalization_storage: consent.personalization ? 'granted' : 'denied',
    security_storage: 'granted'
  });
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled() {
  return !!(ANALYTICS_CONFIG.ga4MeasurementId || ANALYTICS_CONFIG.metaPixelId);
}

export default {
  initAnalytics,
  trackPageView,
  trackEvent,
  trackSearch,
  trackFilterChange,
  trackPropertyView,
  trackWhatsAppClick,
  trackPriceAlertCreate,
  trackPriceAlertTrigger,
  trackCTAClick,
  trackContactFormSubmit,
  trackPropertyFavorite,
  trackComparatorAction,
  trackScrollDepth,
  trackVideoPlay,
  trackDownload,
  setUserProperties,
  updateConsent,
  isAnalyticsEnabled
};


