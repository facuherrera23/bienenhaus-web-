// @ts-nocheck
/**
 * Photon API Client - Lightweight wrapper for OpenStreetMap Photon geocoder
 * Free, no API key required, good for Argentina
 */

const PHOTON_BASE = 'https://photon.komoot.io/api/';
const PHOTON_REVERSE = 'https://photon.komoot.io/reverse/';

/**
 * Search for places
 * @param {String} query - Search query (e.g., "Córdoba", "Nueva Córdoba")
 * @param {Object} options
 * @param {Number} options.limit - Max results (default 5)
 * @param {String} options.lang - Language code (default 'es')
 * @param {Object} options.bias - Bias results to location { lat, lng, radius }
 * @param {Array} options.osmTag - Filter by OSM tags (e.g., [{ key: 'place', value: 'city' }])
 * @returns {Promise<Array>} Array of { name, city, state, country, lat, lon, type, extent, bbox, osm_id, osm_type, osm_key, osm_value }
 */
export async function searchPhoton(query, options = {}) {
  const { 
    limit = 5, 
    lang = 'es', 
    bias = null, 
    osmTag = null 
  } = options;
  
  if (!query || query.trim().length < 2) return [];
  
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
    lang,
  });
  
  if (bias && bias.lat && bias.lng) {
    params.set('lon', String(bias.lng));
    params.set('lat', String(bias.lat));
    if (bias.radius) params.set('radius', String(bias.radius));
  }
  
  if (osmTag) {
    params.set('osm_tag', `${osmTag.key}:${osmTag.value}`);
  }
  
  try {
    const response = await fetch(`${PHOTON_BASE}?${params}`);
    if (!response.ok) throw new Error(`Photon API error: ${response.status}`);
    
    const data = await response.json();
    
    return data.features.map(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates; // [lon, lat]
      
      return {
        // Display
        name: props.name,
        city: props.city || props.town || props.village || props.suburb || '',
        state: props.state || '',
        country: props.country || '',
        postcode: props.postcode || '',
        
        // Geometry
        lat: coords[1],
        lng: coords[0],
        
        // Metadata
        type: props.type || 'place', // city, town, village, suburb, neighbourhood, hamlet, etc.
        extent: props.extent, // [minLon, minLat, maxLon, maxLat]
        bbox: props.bbox,
        osm_id: props.osm_id,
        osm_type: props.osm_type,
        osm_key: props.osm_key,
        osm_value: props.osm_value,
        
        // Formatted for display
        displayName: formatDisplayName(props),
        shortName: formatShortName(props)
      };
    });
  } catch (error) {
    console.error('Photon search error:', error);
    return [];
  }
}

/**
 * Reverse geocode: coords -> address
 * @param {Number} lat 
 * @param {Number} lng 
 * @param {Object} options
 * @returns {Promise<Object|null>}
 */
export async function reversePhoton(lat, lng, options = {}) {
  const { lang = 'es' } = options;
  
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      lang
    });
    
    const response = await fetch(`${PHOTON_REVERSE}?${params}`);
    if (!response.ok) throw new Error(`Photon reverse error: ${response.status}`);
    
    const data = await response.json();
    if (!data.features.length) return null;
    
    const props = data.features[0].properties;
    return {
      name: props.name,
      city: props.city || props.town || props.village || props.suburb || '',
      state: props.state || '',
      country: props.country || '',
      postcode: props.postcode || '',
      lat,
      lng,
      type: props.type,
      displayName: formatDisplayName(props)
    };
  } catch (error) {
    console.error('Photon reverse error:', error);
    return null;
  }
}

/**
 * Format display name from Photon properties
 * @param {Object} props 
 * @returns {String}
 */
function formatDisplayName(props) {
  const parts = [];
  if (props.name) parts.push(props.name);
  if (props.city || props.town || props.village || props.suburb) {
    parts.push(props.city || props.town || props.village || props.suburb);
  }
  if (props.state) parts.push(props.state);
  if (props.country) parts.push(props.country);
  return parts.join(', ');
}

function formatShortName(props) {
  if (props.name && (props.city || props.town || props.village)) {
    return `${props.name}, ${props.city || props.town || props.village}`;
  }
  return props.name || props.city || props.town || props.village || '';
}

/**
 * Autocomplete helper with debounce + cache
 */
export function createAutocomplete(options = {}) {
  const { 
    debounceMs = 300, 
    minQueryLength = 2,
    maxCacheSize = 50,
    bias = null,
    onResults = null,
    onError = null
  } = options;
  
  const cache = new Map();
  let debounceTimer = null;
  let abortController = null;
  let lastQuery = '';
  
  return {
    /**
     * Search with debounce
     * @param {String} query 
     * @returns {Promise<Array>}
     */
    async search(query) {
      const trimmed = query.trim();
      
      // Too short
      if (trimmed.length < minQueryLength) return [];
      
      // Same as last query
      if (trimmed === lastQuery && cache.has(trimmed)) {
        return cache.get(trimmed);
      }
      
      // Cancel previous request
      if (abortController) abortController.abort();
      abortController = new AbortController();
      
      // Debounce
      return new Promise(resolve => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          lastQuery = trimmed;
          
          // Check cache first
          if (cache.has(trimmed)) {
            resolve(cache.get(trimmed));
            return;
          }
          
          try {
            const results = await searchPhoton(trimmed, { 
              ...options, 
              signal: abortController.signal 
            });
            
            // Update cache (LRU)
            if (cache.size >= maxCacheSize) {
              const firstKey = cache.keys().next().value;
              cache.delete(firstKey);
            }
            cache.set(trimmed, results);
            
            if (onResults) onResults(results, trimmed);
            resolve(results);
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error('Autocomplete search error:', error);
              if (onError) onError(error, trimmed);
              resolve([]);
            }
          }
        }, debounceMs);
      });
    },
    
    /**
     * Clear cache and timers
     */
    clear() {
      clearTimeout(debounceTimer);
      if (abortController) abortController.abort();
      cache.clear();
      lastQuery = '';
    },
    
    /**
     * Get cached results for query
     * @param {String} query 
     * @returns {Array|null}
     */
    getCached(query) {
      return cache.get(query.trim()) || null;
    },
    
    /**
     * Pre-populate cache (e.g., on page load)
     * @param {Array} queries 
     */
    async warmup(queries) {
      for (const q of queries) {
        if (!cache.has(q)) {
          try {
            const results = await searchPhoton(q, options);
            if (cache.size >= 50) {
              const firstKey = cache.keys().next().value;
              cache.delete(firstKey);
            }
            cache.set(q, results);
          } catch (e) {
            console.warn('Warmup failed for', q, e);
          }
        }
      }
    }
  };
}

/**
 * Get user location via browser Geolocation API
 * @param {Object} options - { enableHighAccuracy, timeout, maximumAge }
 * @returns {Promise<{ lat, lng, accuracy }>}
 */
export function getUserLocation(options = {}) {
  const { 
    enableHighAccuracy = true, 
    timeout = 10000, 
    maximumAge = 300000 
  } = options;
  
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      }),
      err => reject(err),
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
}

/**
 * Watch user location (for mobile)
 * @param {Function} callback - (location) => void
 * @param {Object} options
 * @returns {Number} watchId (for clearWatch)
 */
export function watchUserLocation(callback, options = {}) {
  const { 
    enableHighAccuracy = true, 
    timeout = 10000, 
    maximumAge = 60000 
  } = options;
  
  if (!navigator.geolocation) return null;
  
  return navigator.geolocation.watchPosition(
    pos => callback({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy
    }),
    err => console.warn('Geolocation watch error:', err),
    { enableHighAccuracy, timeout, maximumAge }
  );
}

export default {
  searchPhoton,
  reversePhoton,
  createAutocomplete,
  getUserLocation,
  watchUserLocation
};