/**
 * URL State Utilities - Filter serialization/deserialization for URL sync
 * Handles: parsing, serialization, diffing, active filter detection
 */

import { FILTER_DEFAULTS } from '../config.js';

/**
 * Default filter configuration with metadata
 * @type {Object}
 */
export const FILTER_DEFAULTS = {
  // Main filters
  operacion: 'ambos',           // 'venta' | 'alquiler' | 'ambos'
  tipo: 'todos',                // 'piso' | 'chalet' | 'atico' | 'local' | 'terreno' | 'todos'
  precioMin: 0,
  precioMax: 900000,
  habitaciones: 0,              // 0 | 1 | 2 | 3 | 4
  metrosMin: 0,
  
  // Advanced filters
  banosMin: 0,
  antiguedad: 'todas',          // 'nuevo' | 'reformado' | 'viejo' | 'todas'
  cochera: false,
  balcon: false,
  pileta: false,
  amueblado: false,
  mascotas: false,
  gastosMax: 0,
  
  // Sort
  ordenar: 'destacado',         // 'destacado' | 'precio_asc' | 'precio_desc' | 'm2_desc' | 'm2_asc' | 'nuevas' | 'antiguas'
  
  // Geolocation (only in URL if explicitly set)
  lat: null,
  lng: null,
  radio: 10,
  
  // Internal (not in URL)
  _locationName: null
};

/**
 * Filter keys that should appear in URL when non-default
 * @type {String[]}
 */
export const URL_FILTER_KEYS = [
  'operacion', 'tipo', 'precioMin', 'precioMax', 'habitaciones', 'metrosMin',
  'banosMin', 'antiguedad', 'cochera', 'balcon', 'pileta', 'amueblado', 'mascotas',
  'gastosMax', 'ordenar', 'lat', 'lng', 'radio'
];

/**
 * Filter keys that are boolean
 * @type {String[]}
 */
export const BOOLEAN_FILTERS = ['cochera', 'balcon', 'pileta', 'amueblado', 'mascotas'];

/**
 * Filter keys that are numbers
 * @type {String[]}
 */
export const NUMBER_FILTERS = ['precioMin', 'precioMax', 'habitaciones', 'metrosMin', 'banosMin', 'gastosMax', 'radio'];

/**
 * Parse filters from URL hash
 * @param {String} [hash] - Optional hash string (default: window.location.hash)
 * @returns {Object} Parsed filters
 */
export function getFiltersFromURL(hash = window.location.hash) {
  const filters = { ...FILTER_DEFAULTS };
  const queryIndex = hash.indexOf('?');
  
  if (queryIndex === -1) return filters;
  
  const queryString = hash.slice(queryIndex + 1);
  const params = new URLSearchParams(queryString);
  
  params.forEach((value, key) => {
    // Only process known filter keys
    if (!URL_FILTER_KEYS.includes(key)) return;
    
    let parsedValue;
    
    // Boolean filters
    if (BOOLEAN_FILTERS.includes(key)) {
      parsedValue = value === 'true';
    }
    // Number filters
    else if (NUMBER_FILTERS.includes(key)) {
      const num = Number(value);
      parsedValue = isNaN(num) ? FILTER_DEFAULTS[key] : num;
    }
    // String filters (enum values)
    else {
      parsedValue = value;
    }
    
    // Only set if different from default (avoids pollution)
    if (JSON.stringify(parsedValue) !== JSON.stringify(FILTER_DEFAULTS[key])) {
      filters[key] = parsedValue;
    }
  });
  
  return filters;
}

/**
 * Serialize filters to URL query string
 * @param {Object} filters - Current filter state
 * @param {Boolean} [includeDefaults=false] - Include default values in URL
 * @returns {String} Query string (without leading ?)
 */
export function serializeFilters(filters, includeDefaults = false) {
  const params = new URLSearchParams();
  
  URL_FILTER_KEYS.forEach(key => {
    const value = filters[key];
    const defaultValue = FILTER_DEFAULTS[key];
    
    // Skip if default and not including defaults
    if (!includeDefaults && JSON.stringify(value) === JSON.stringify(defaultValue)) {
      return;
    }
    
    // Skip null/undefined
    if (value === null || value === undefined) return;
    
    // Boolean: only serialize if true
    if (BOOLEAN_FILTERS.includes(key)) {
      if (value === true) params.set(key, 'true');
      return;
    }
    
    // Number: only serialize if non-default
    if (NUMBER_FILTERS.includes(key)) {
      if (value !== defaultValue) params.set(key, String(value));
      return;
    }
    
    // String: only serialize if non-default
    if (value !== defaultValue) {
      params.set(key, String(value));
    }
  });
  
  return params.toString();
}

/**
 * Update URL with current filters (pushState or replaceState)
 * @param {Object} filters - Current filter state
 * @param {Boolean} [replace=true] - Use replaceState (true) or pushState (false)
 */
export function updateURLFilters(filters, replace = true) {
  const queryString = serializeFilters(filters);
  const baseHash = window.location.hash.split('?')[0];
  const newHash = queryString ? `${baseHash}?${queryString}` : baseHash;
  
  // Only update if actually different
  if (newHash !== window.location.hash) {
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method](null, '', newHash);
  }
}

/**
 * Parse filters from any object (form data, etc.)
 * @param {Object} raw - Raw filter data (e.g., formData entries)
 * @returns {Object} Normalized filters
 */
export function parseFilters(raw) {
  const filters = { ...FILTER_DEFAULTS };
  
  Object.entries(raw).forEach(([key, value]) => {
    if (!URL_FILTER_KEYS.includes(key)) return;
    
    // Handle FormData / multi-value (take first)
    const val = Array.isArray(value) ? value[0] : value;
    
    // Type coercion
    if (BOOLEAN_FILTERS.includes(key)) {
      filters[key] = val === 'true' || val === true || val === 'on' || val === 1 || val === '1';
    } else if (NUMBER_FILTERS.includes(key)) {
      const num = Number(val);
      filters[key] = isNaN(num) ? FILTER_DEFAULTS[key] : num;
    } else {
      filters[key] = String(val);
    }
  });
  
  return filters;
}

/**
 * Deep diff two filter objects
 * @param {Object} oldFilters 
 * @param {Object} newFilters 
 * @returns {Object} { changed: Boolean, changes: Object }
 */
export function diffFilters(oldFilters, newFilters) {
  const changes = {};
  let changed = false;
  
  const allKeys = new Set([...Object.keys(oldFilters), ...Object.keys(newFilters)]);
  
  allKeys.forEach(key => {
    // Skip internal keys
    if (key.startsWith('_')) return;
    
    const oldVal = oldFilters[key];
    const newVal = newFilters[key];
    
    // Deep comparison for objects/arrays
    const equal = JSON.stringify(oldVal) === JSON.stringify(newVal);
    
    if (!equal) {
      changed = true;
      changes[key] = { old: oldVal, new: newVal };
    }
  });
  
  return { changed, changes };
}

/**
 * Get active (non-default) filters
 * @param {Object} filters 
 * @returns {Object} Only active filters
 */
export function getActiveFilters(filters) {
  const active = {};
  
  URL_FILTER_KEYS.forEach(key => {
    const value = filters[key];
    const defaultValue = FILTER_DEFAULTS[key];
    
    if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
      active[key] = value;
    }
  });
  
  return active;
}

/**
 * Count active filters
 * @param {Object} filters 
 * @returns {Number}
 */
export function countActiveFilters(filters) {
  return Object.keys(getActiveFilters(filters)).length;
}

/**
 * Get human-readable filter summary for UI
 * @param {Object} filters 
 * @returns {Array} Array of { key, label, value, formatted }
 */
export function getFilterSummary(filters) {
  const labels = {
    operacion: 'Operación',
    tipo: 'Tipo',
    precioMin: 'Precio mín.',
    precioMax: 'Precio máx.',
    habitaciones: 'Habitaciones',
    metrosMin: 'Metros mín.',
    banosMin: 'Baños mín.',
    antiguedad: 'Antigüedad',
    cochera: 'Cochera',
    balcon: 'Balcón',
    pileta: 'Pileta',
    amueblado: 'Amueblado',
    mascotas: 'Mascotas',
    gastosMax: 'Expensas máx.',
    ordenar: 'Ordenar',
    lat: 'Latitud',
    lng: 'Longitud',
    radio: 'Radio (km)'
  };
  
  const formatters = {
    operacion: v => v === 'ambos' ? 'Ambos' : v.charAt(0).toUpperCase() + v.slice(1),
    tipo: v => v === 'todos' ? 'Todos' : v.charAt(0).toUpperCase() + v.slice(1),
    precioMin: v => v > 0 ? `${v.toLocaleString('es-AR')} ARS` : 'Sin mínimo',
    precioMax: v => v < 900000 ? `${v.toLocaleString('es-AR')} ARS` : 'Sin máximo',
    habitaciones: v => v === 0 ? 'Cualquiera' : v === 4 ? '4+' : String(v),
    metrosMin: v => v > 0 ? `${v} m²` : 'Sin mínimo',
    banosMin: v => v === 0 ? 'Cualquiera' : v === 3 ? '3+' : String(v),
    antiguedad: v => v === 'todas' ? 'Todas' : v.charAt(0).toUpperCase() + v.slice(1),
    cochera: v => v ? 'Sí' : 'No',
    balcon: v => v ? 'Sí' : 'No',
    pileta: v => v ? 'Sí' : 'No',
    amueblado: v => v ? 'Sí' : 'No',
    mascotas: v => v ? 'Sí' : 'No',
    gastosMax: v => v > 0 ? `${v.toLocaleString('es-AR')} ARS` : 'Sin límite',
    ordenar: v => ({
      'destacado': 'Destacados primero',
      'precio_asc': 'Precio: menor a mayor',
      'precio_desc': 'Precio: mayor a menor',
      'm2_desc': 'Superficie: mayor a menor',
      'm2_asc': 'Superficie: menor a mayor',
      'nuevas': 'Más nuevas',
      'antiguas': 'Más antiguas'
    })[v] || v,
    radio: v => `${v} km`
  };
  
  return Object.entries(getActiveFilters(filters)).map(([key, value]) => ({
    key,
    label: labels[key] || key,
    value,
    formatted: formatters[key] ? formatters[key](value) : String(value)
  }));
}

/**
 * Get filter config for UI rendering (type, options, etc.)
 * @returns {Array} Array of filter configs
 */
export function getFilterConfigs() {
  return [
    {
      key: 'operacion',
      label: 'Operación',
      type: 'select',
      options: [
        { value: 'venta', label: 'Venta' },
        { value: 'alquiler', label: 'Alquiler' },
        { value: 'ambos', label: 'Ambos' }
      ],
      default: 'ambos'
    },
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos' },
        { value: 'piso', label: 'Piso/Apartamento' },
        { value: 'chalet', label: 'Chalet/Casa' },
        { value: 'atico', label: 'Ático' },
        { value: 'local', label: 'Local/Oficina' },
        { value: 'terreno', label: 'Terreno/Solar' }
      ],
      default: 'todos'
    },
    {
      key: 'precioMin',
      label: 'Precio mín.',
      type: 'number',
      min: 0,
      step: 5000,
      default: 0
    },
    {
      key: 'precioMax',
      label: 'Precio máx.',
      type: 'number',
      min: 0,
      step: 10000,
      default: 900000
    },
    {
      key: 'habitaciones',
      label: 'Hab.',
      type: 'select',
      options: [
        { value: 0, label: 'Cualquiera' },
        { value: 1, label: '1' },
        { value: 2, label: '2' },
        { value: 3, label: '3' },
        { value: 4, label: '4+' }
      ],
      default: 0
    },
    {
      key: 'metrosMin',
      label: 'm² mín.',
      type: 'number',
      min: 0,
      step: 10,
      default: 0
    }
  ];
}

export default {
  FILTER_DEFAULTS,
  URL_FILTER_KEYS,
  BOOLEAN_FILTERS,
  NUMBER_FILTERS,
  getFiltersFromURL,
  serializeFilters,
  updateURLFilters,
  parseFilters,
  diffFilters,
  getActiveFilters,
  countActiveFilters,
  getFilterSummary,
  getFilterConfigs
};