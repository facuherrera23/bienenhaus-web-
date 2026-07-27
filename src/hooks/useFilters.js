/**
 * useFilters Hook - Centralized filter state management
 * Handles: state, URL sync, persistence, analytics, cross-component access
 */

import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { 
  FILTER_DEFAULTS, 
  getFiltersFromURL, 
  serializeFilters, 
  updateURLFilters, 
  diffFilters, 
  countActiveFilters 
} from '../utils/urlState.js';

const STORAGE_KEY = 'bh_filters_v2';
const PERSIST_DELAY = 500; // ms debounce for localStorage

/**
 * @typedef {Object} FilterState
 * @property {Object} filters - Current filter values
 * @property {Number} activeCount - Number of non-default filters
 * @property {Function} setFilters - Update filters (merges with current)
 * @property {Function} setFilter - Update single filter
 * @property {Function} resetFilters - Reset to defaults
 * @property {Function} clearFilter - Clear single filter to default
 * @property {Function} loadFromURL - Load filters from current URL
 * @property {Function} pushToURL - Push current filters to URL
 * @property {Boolean} isLoading - Initial load state
 * @property {Object} lastChanges - Last diff result
 */

export function useFilters(options = {}) {
  const { 
    persistKey = STORAGE_KEY, 
    autoPersist = true, 
    syncURL = true,
    onChange = null 
  } = options;

  // Initial state from URL or localStorage
  const [filters, setFiltersState] = useState(() => {
    // 1. Try URL first (highest priority for shareable links)
    const urlFilters = getFiltersFromURL();
    
    // 2. Fallback to localStorage
    if (autoPersist) {
      try {
        const stored = localStorage.getItem(persistKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge: URL wins over stored for non-null values
          return { ...parsed, ...urlFilters };
        }
      } catch (e) {
        console.warn('Failed to parse stored filters:', e);
      }
    }
    
    return urlFilters;
  });

  const [activeCount, setActiveCount] = useState(() => countActiveFilters(filters));
  const [isLoading, setIsLoading] = useState(true);
  const [lastChanges, setLastChanges] = useState({ changed: false, changes: {} });
  
  const persistTimerRef = useRef(null);
  const previousFiltersRef = useRef(filters);

  // Initialize: load from URL on mount
  useEffect(() => {
    const urlFilters = getFiltersFromURL();
    const hasURLParams = window.location.hash.includes('?');
    
    if (hasURLParams) {
      setFiltersState(urlFilters);
    }
    setIsLoading(false);
  }, []);

  // Persist to localStorage (debounced)
  useEffect(() => {
    if (!autoPersist) return;
    
    clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(persistKey, JSON.stringify(filters));
      } catch (e) {
        console.warn('Failed to persist filters:', e);
      }
    }, PERSIST_DELAY);
    
    return () => clearTimeout(persistTimerRef.current);
  }, [filters, autoPersist, persistKey]);

  // Sync to URL
  useEffect(() => {
    if (!syncURL || isLoading) return;
    
    updateURLFilters(filters, true); // replaceState
  }, [filters, syncURL, isLoading]);

  // Analytics / callbacks on change
  useEffect(() => {
    if (isLoading) return;
    
    const { changed, changes } = diffFilters(previousFiltersRef.current, filters);
    if (!changed) return;
    
    previousFiltersRef.current = filters;
    setLastChanges({ changed: true, changes });
    setActiveCount(countActiveFilters(filters));
    
    // Fire custom callback
    if (onChange) {
      onChange(filters, { previous: previousFiltersRef.current, changes });
    }
    
    // Fire global event for other components
    window.dispatchEvent(new CustomEvent('filters-changed', { 
      detail: { filters, changes, activeCount: countActiveFilters(filters) } 
    }));
    
    // Analytics event
    if (window.gtag) {
      window.gtag('event', 'filter_change', {
        filter_changes: JSON.stringify(changes),
        active_filters_count: countActiveFilters(filters),
        timestamp: Date.now()
      });
    }
    
    if (window.fbq) {
      window.fbq('trackCustom', 'FilterChange', {
        filter_changes: Object.keys(changes).join(','),
        active_count: countActiveFilters(filters)
      });
    }
  }, [filters, isLoading, onChange]);

  // Update all filters (merge)
  const setFilters = useCallback((newFilters) => {
    setFiltersState(prev => {
      const merged = { ...prev, ...newFilters };
      // Clean up: remove null/undefined
      Object.keys(merged).forEach(key => {
        if (merged[key] === null || merged[key] === undefined) {
          delete merged[key];
        }
      });
      return merged;
    });
  }, []);

  // Update single filter
  const setFilter = useCallback((key, value) => {
    setFiltersState(prev => {
      // Handle clearing to default
      if (value === null || value === undefined || value === '') {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  // Reset all to defaults
  const resetFilters = useCallback(() => {
    setFiltersState(FILTER_DEFAULTS);
  }, []);

  // Clear single filter (set to default)
  const clearFilter = useCallback((key) => {
    setFiltersState(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Load from current URL
  const loadFromURL = useCallback(() => {
    const urlFilters = getFiltersFromURL();
    setFiltersState(urlFilters);
    return urlFilters;
  }, []);

  // Push current state to URL (with pushState for history)
  const pushToURL = useCallback((replace = true) => {
    updateURLFilters(filters, replace);
  }, [filters]);

  // Get active filter summary for UI
  const getSummary = useCallback(() => {
    // This would use the utility from urlState
    const active = {};
    Object.entries(filters).forEach(([key, value]) => {
      const defaultVal = FILTER_DEFAULTS[key];
      if (JSON.stringify(value) !== JSON.stringify(defaultVal)) {
        active[key] = value;
      }
    });
    return active;
  }, [filters]);

  // Computed: has any active filters
  const hasActiveFilters = activeCount > 0;

  return {
    // State
    filters,
    activeCount,
    isLoading,
    hasActiveFilters,
    lastChanges,
    
    // Actions
    setFilters,
    setFilter,
    resetFilters,
    clearFilter,
    loadFromURL,
    pushToURL,
    getSummary,
    
    // Raw access
    setFiltersState,
    
    // Defaults for reference
    defaults: FILTER_DEFAULTS
  };
}

// Global accessor for components not using the hook
window.getFilters = () => {
  // This will be set by the first component that uses the hook
  return window._bhFilters || FILTER_DEFAULTS;
};

window.setFilters = (filters) => {
  if (window._bhSetFilters) window._bhSetFilters(filters);
};

// Register for global access
export function registerGlobalFilters(hookReturn) {
  window._bhFilters = hookReturn.filters;
  window._bhSetFilters = hookReturn.setFilters;
  
  // Expose methods
  window.getFilters = () => hookReturn.filters;
  window.setFilters = hookReturn.setFilters;
  window.resetFilters = hookReturn.resetFilters;
  window.clearFilter = hookReturn.clearFilter;
  window.getFilterSummary = hookReturn.getSummary;
  window.activeFilterCount = hookReturn.activeCount;
}

export default useFilters;