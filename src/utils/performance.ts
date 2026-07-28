// @ts-nocheck
// ================================================================
// PERFORMANCE UTILITIES - Web Vitals, lazy loading, optimization
// ================================================================

/**
 * Measure and report Web Vitals
 * @param {Function} onReport - Callback with vitals data
 */
export function measureWebVitals(onReport) {
  if (typeof window === 'undefined') return;
  
  // LCP - Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((entries) => {
        const lastEntry = entries[entries.length - 1];
        onReport({ name: 'LCP', value: lastEntry.startTime, rating: getLCPRating(lastEntry.startTime) });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP observer not supported');
    }
    
    // FID - First Input Delay
    try {
      const fidObserver = new PerformanceObserver((entries) => {
        const firstEntry = entries[0];
        onReport({ name: 'FID', value: firstEntry.processingStart - firstEntry.startTime, rating: getFIDRating(firstEntry.processingStart - firstEntry.startTime) });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.warn('FID observer not supported');
    }
    
    // CLS - Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entries) => {
        for (const entry of entries) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        onReport({ name: 'CLS', value: clsValue, rating: getCLSRating(clsValue) });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('CLS observer not supported');
    }
    
    // TTFB - Time to First Byte
    if ('PerformanceNavigationTiming' in window) {
      const navTiming = performance.getEntriesByType('navigation')[0];
      if (navTiming) {
        const ttfb = navTiming.responseStart - navTiming.requestStart;
        onReport({ name: 'TTFB', value: ttfb, rating: getTTFBRating(ttfb) });
      }
    }
  }

/**
 * Lazy load images with IntersectionObserver
 * @param {string} selector - Selector for images to lazy load
 * @param {Object} options - IntersectionObserver options
 */
export function lazyLoadImages(selector = 'img[data-src]', options = {}) {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    // Fallback for browsers without IntersectionObserver
    document.querySelectorAll(selector).forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
    return;
  }
  
  const defaultOptions = {
    rootMargin: '50px 0px',
    threshold: 0.01
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
          img.removeAttribute('data-srcset');
        }
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  }, { ...defaultOptions, ...options });
  
  document.querySelectorAll(selector).forEach(img => {
    if (img.dataset.src) {
      img.loading = 'lazy';
      observer.observe(img);
    }
  });
  
  return observer;
}

/**
 * Lazy load components with dynamic import
 * @param {Function} importFn - Dynamic import function
 * @param {Object} options - Options for lazy loading
 * @returns {Promise} Resolves with the component
 */
export function lazyLoadComponent(importFn, options = {}) {
  const { fallback = null, timeout = 10000 } = options;
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Component load timeout'));
    }, timeout);
    
    importFn()
      .then(module => {
        clearTimeout(timeoutId);
        resolve(module.default || module);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        if (fallback) {
          resolve(fallback);
        } else {
          reject(err);
        }
      });
  });
}

/**
 * Preload critical resources
 * @param {Array} resources - Array of { href, as, type, crossorigin }
 */
export function preloadResources(resources) {
  if (typeof document === 'undefined') return;
  
  resources.forEach(({ href, as, type, crossorigin }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    if (crossorigin) link.crossOrigin = crossorigin;
    document.head.appendChild(link);
  });
}

/**
 * Prefetch next page
 * @param {string} url - URL to prefetch
 */
export function prefetchPage(url) {
  if (typeof document === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * DNS prefetch for external domains
 * @param {string[]} domains - Array of domains
 */
export function dnsPrefetch(domains) {
  if (typeof document === 'undefined') return;
  
  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = `https://${domain}`;
    document.head.appendChild(link);
  });
}

/**
 * Preconnect to external domains
 * @param {string[]} domains - Array of domains
 */
export function preconnect(domains) {
  if (typeof document === 'undefined') return;
  
  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = `https://${domain}`;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

/**
 * Measure and report custom timing
 * @param {string} name - Timing name
 * @param {Function} fn - Function to measure
 * @returns {Promise} Result of the function
 */
export async function measureTiming(name, fn) {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (err) {
    const duration = performance.now() - start;
    console.error(`[Perf] ${name} failed after ${duration.toFixed(2)}ms`, err);
    throw err;
  }
}

/**
 * Mark a performance timestamp
 * @param {string} name - Mark name
 */
export function mark(name) {
  if (typeof performance !== 'undefined') {
    performance.mark(name);
  }
}

/**
 * Measure between two marks
 * @param {string} name - Measure name
 * @param {string} startMark - Start mark name
 * @param {string} endMark - End mark name
 * @returns {number} Duration in milliseconds
 */
export function measure(name, startMark, endMark) {
  if (typeof performance === 'undefined') return 0;
  
  try {
    performance.measure(name, startMark, endMark);
    const entries = performance.getEntriesByName(name, 'measure');
    return entries[0]?.duration || 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Report custom metric to analytics
 * @param {string} name - Metric name
 * @param {number} value - Metric value
 * @param {Object} attributes - Additional attributes
 */
export function reportMetric(name, value, attributes = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'custom_metric', {
      metric_name: name,
      value,
      ...attributes
    });
  }
  
  console.log(`[Metrics] ${name}:`, value, attributes);
}

/**
 * Debounce function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    return new Promise(resolve => {
      timeoutId = setTimeout(() => resolve(fn(...args)), delay);
    });
  };
}

/**
 * Throttle function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Get connection info
 * @returns {Object} Connection info
 */
export function getConnectionInfo() {
  if (typeof navigator === 'undefined') return {};
  
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return {};
  
  return {
    effectiveType: conn.effectiveType,
    downlink: conn.downlink,
    rtt: conn.rtt,
    saveData: conn.saveData
  };
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers reduced data
 * @returns {boolean}
 */
export function prefersReducedData() {
  if (typeof navigator === 'undefined') return false;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return conn?.saveData === true;
}

// Rating functions
function getLCPRating(lcp) {
  if (lcp <= 2500) return 'good';
  if (lcp <= 4000) return 'needs-improvement';
  return 'poor';
}

function getFIDRating(fid) {
  if (fid <= 100) return 'good';
  if (fid <= 300) return 'needs-improvement';
  return 'poor';
}

function getCLSRating(cls) {
  if (cls <= 0.1) return 'good';
  if (cls <= 0.25) return 'needs-improvement';
  return 'poor';
}

function getTTFBRating(ttfb) {
  if (ttfb <= 800) return 'good';
  if (ttfb <= 1800) return 'needs-improvement';
  return 'poor';
}

export default {
  measureWebVitals,
  lazyLoadImages,
  lazyLoadComponent,
  preloadResources,
  prefetchPage,
  dnsPrefetch,
  preconnect,
  measureTiming,
  mark,
  measure,
  reportMetric,
  debounce,
  throttle,
  getConnectionInfo,
  prefersReducedMotion,
  prefersReducedData
};
}