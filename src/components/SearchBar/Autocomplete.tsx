
/**
 * Autocomplete Search Component - Photon-powered location autocomplete
 * Features: debounced search, cache, keyboard nav, "cerca de mí", recent searches
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { 
  createAutocomplete, 
  getUserLocation, 
  reversePhoton 
} from '../../utils/photon.ts';
import { logError, logWarn } from '../../utils/logger.ts';
import './Autocomplete.css';

/**
 * @param {Object} props
 * @param {String} props.name - Input name attribute
 * @param {String} props.placeholder - Placeholder text
 * @param {Function} props.onSelect - (location) => void
 * @param {Function} props.onChange - (query) => void
 * @param {String} props.value - Current input value
 * @param {Boolean} props.disabled - Disable input
 * @param {Object} props.bias - { lat, lng, radius } for biasing results
 * @param {String} props.id - Input ID
 * @param {String} props.label - Label text
 */
export function Autocomplete({ 
  name = 'location',
  placeholder = 'Buscar zona, barrio, ciudad...',
  onSelect = (...args: any[]) => {},
  onChange = (...args: any[]) => {},
  value = '',
  disabled = false,
  bias = null,
  id = 'location-autocomplete',
  label = 'Ubicación',
  required = false
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const autocompleteRef = useRef(null);
  
  // Create autocomplete instance
  const autocomplete = useMemo(() => createAutocomplete({
    debounceMs: 300,
    minQueryLength: 2,
    maxCacheSize: 50,
    bias,
    onResults: (results) => {
      setSuggestions(results);
      setIsLoading(false);
    },
    onError: (error) => {
      logError('Autocomplete error', error, 'autocomplete');
      setIsLoading(false);
    }
  }), [bias]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bh_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      logWarn('Failed to load recent searches:', e, 'autocomplete');
    }
  }, []);

  // Save recent searches
  const saveRecentSearch = useCallback((search) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.name !== search.name);
      const updated = [search, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('bh_recent_searches', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  // Handle query change
  const handleChange = useCallback((e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onChange(newQuery);
    setHighlightedIndex(-1);
    
    if (newQuery.trim().length >= 2) {
      autocomplete.search(newQuery).then(results => {
        setSuggestions(results);
        setShowRecent(false);
      });
    } else {
      setSuggestions([]);
      setShowRecent(true);
    }
  }, [autocomplete, onChange]);

  // Handle suggestion click
  const handleSelect = useCallback((suggestion) => {
    const formatted = {
      name: suggestion.displayName,
      shortName: suggestion.shortName,
      lat: suggestion.lat,
      lng: suggestion.lng,
      type: suggestion.type,
      city: suggestion.city,
      state: suggestion.state,
      country: suggestion.country
    };
    
    setQuery(formatted.shortName || formatted.name);
    onSelect(formatted);
    onChange(formatted.shortName || formatted.name);
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    
    // Save to recent
    saveRecentSearch({
      name: formatted.shortName || formatted.name,
      lat: formatted.lat,
      lng: formatted.lng
    });
  }, [onSelect, onChange, saveRecentSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        } else if (query.trim().length >= 2) {
          // Submit current query as-is
          onSelect({ name: query, shortName: query });
        }
        break;
      case 'Escape':
        setSuggestions([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        if (isOpen && highlightedIndex >= 0) {
          e.preventDefault();
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
    }
  }, [suggestions, highlightedIndex, query, isOpen, handleSelect, onSelect]);

  // Focus handling
  const handleFocus = useCallback(() => {
    setIsOpen(true);
    if (query.trim().length < 2) {
      setShowRecent(true);
      setSuggestions([]);
    }
  }, [query]);

  const handleBlur = useCallback(() => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setIsOpen(false);
      setShowRecent(false);
    }, 200);
  }, []);

  // Get user location
  const handleGeolocate = useCallback(async () => {
    setIsLocating(true);
    try {
      const location = await getUserLocation({ enableHighAccuracy: true, timeout: 10000 });
      setUserLocation(location);
      
      // Reverse geocode for display name
      const address = await reversePhoton(location.lat, location.lng);
      const name = address?.displayName || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
      
      const suggestion = {
        name,
        shortName: address?.shortName || name,
        lat: location.lat,
        lng: location.lng,
        type: 'user_location',
        _isCurrentLocation: true
      };
      
      setQuery(suggestion.shortName || name);
      onSelect(suggestion);
      onChange(suggestion.shortName || name);
      setIsOpen(false);
    } catch (error) {
      logError('Geolocation failed', error, 'autocomplete');
      alert('No se pudo obtener tu ubicación. Verifica los permisos del navegador.');
    } finally {
      setIsLocating(false);
    }
  }, [onSelect, onChange]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowRecent(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync external value
  useEffect(() => {
    if (value !== query) {
      setQuery(value);
    }
  }, [value]);

  // Render suggestions
  const renderSuggestions = () => {
    if (!isOpen) return null;
    
    // Recent searches
    if (showRecent && recentSearches.length > 0 && suggestions.length === 0 && query.trim().length < 2) {
      return (
        <div className="autocomplete-section">
          <div className="autocomplete-section-header">
            <i className="fas fa-history" aria-hidden="true"></i>
            <span>Búsquedas recientes</span>
            <button 
              type="button" 
              className="autocomplete-clear-recent"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                localStorage.removeItem('bh_recent_searches');
                setRecentSearches([]);
              }}
              aria-label="Limpiar historial"
            >
              <i className="fas fa-trash" aria-hidden="true"></i>
            </button>
          </div>
          <ul className="autocomplete-list" role="listbox">
            {recentSearches.map((search, index) => (
              <li 
                key={`${search.name}-${search.lat}-${search.lng}`}
                className="autocomplete-item autocomplete-recent"
                role="option"
                onClick={() => {
                  const suggestion = {
                    ...search,
                    displayName: search.name,
                    shortName: search.name,
                    lat: search.lat,
                    lng: search.lng,
                    type: 'recent'
                  };
                  handleSelect(suggestion);
                }}
              >
                <i className="fas fa-history autocomplete-item-icon" aria-hidden="true"></i>
                <span className="autocomplete-item-name">{search.name}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // Search results
    if (suggestions.length > 0) {
      return (
        <div className="autocomplete-section">
          {query.trim().length >= 2 && (
            <div className="autocomplete-section-header">
              <i className="fas fa-search" aria-hidden="true"></i>
              <span>Resultados para "{query}"</span>
            </div>
          )}
          <ul className="autocomplete-list" role="listbox" ref={listRef}>
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.name}-${suggestion.lat}-${suggestion.lng}`}
                className={`autocomplete-item ${index === highlightedIndex ? 'highlighted' : ''} ${suggestion._isCurrentLocation ? 'current-location' : ''}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {suggestion._isCurrentLocation && (
                  <span className="autocomplete-item-badge">Ubicación actual</span>
                )}
                <i className={`fas ${getIconForType(suggestion.type)} autocomplete-item-icon`} aria-hidden="true"></i>
                <div className="autocomplete-item-content">
                  <span className="autocomplete-item-name">{suggestion.displayName || suggestion.name}</span>
                  {suggestion.city && suggestion.city !== suggestion.name && (
                    <span className="autocomplete-item-context">{suggestion.city}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // No results
    if (isOpen && query.trim().length >= 2 && suggestions.length === 0 && !isLoading) {
      return (
        <div className="autocomplete-section autocomplete-empty">
          <i className="fas fa-search" aria-hidden="true"></i>
          <p>No se encontraron resultados para "{query}"</p>
          <small>Intenta con otra búsqueda o amplía el radio</small>
        </div>
      );
    }

    // Loading
    if (isLoading && isOpen) {
      return (
        <div className="autocomplete-section autocomplete-loading">
          <div className="spinner" aria-label="Buscando..."></div>
          <span>Buscando...</span>
        </div>
      );
    }

    return null;
  };

  // Helper for icons
  const getIconForType = (type) => {
    const icons = {
      city: 'fa-city',
      town: 'fa-city',
      village: 'fa-home',
      suburb: 'fa-map-marker-alt',
      neighbourhood: 'fa-map-pin',
      hamlet: 'fa-map-pin',
      current_location: 'fa-crosshairs',
      user_location: 'fa-crosshairs',
      recent: 'fa-history'
    };
    return icons[type] || 'fa-map-marker-alt';
  };

  return (
    <div className="autocomplete-wrapper" ref={autocompleteRef}>
      <label htmlFor={id} className="autocomplete-label">
        {label}
        {required && <span className="required" aria-hidden="true">*</span>}
      </label>
      
      <div className="autocomplete-input-group">
        <div className="autocomplete-input-wrapper">
          <i className="fas fa-search autocomplete-search-icon" aria-hidden="true"></i>
          <input
            ref={inputRef}
            type="text"
            id={id}
            name={name}
            value={query}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={`${id}-list`}
            aria-expanded={isOpen && (suggestions.length > 0 || showRecent)}
            aria-haspopup="listbox"
            aria-label={label}
            aria-activedescendant={highlightedIndex >= 0 ? `${id}-suggestion-${highlightedIndex}` : (showRecent && recentSearches.length > 0 ? `${id}-recent-0` : undefined)}
          />
          {!disabled && (
            <button
              type="button"
              className="autocomplete-geolocate"
              onClick={handleGeolocate}
              disabled={isLocating}
              aria-label="Usar mi ubicación actual"
              title="Usar mi ubicación actual"
            >
              <i className={isLocating ? 'fas fa-spinner fa-spin' : 'fas fa-crosshairs'} aria-hidden="true"></i>
            </button>
          )}
        </div>
        
        <div 
          id={`${id}-list`}
          className={`autocomplete-dropdown ${isOpen && (suggestions.length > 0 || showRecent || isLoading) ? 'open' : ''}`}
          role="listbox"
          ref={listRef}
        >
          {renderSuggestions()}
        </div>
      </div>
    </div>
  );
}
// Default export
export default Autocomplete;

