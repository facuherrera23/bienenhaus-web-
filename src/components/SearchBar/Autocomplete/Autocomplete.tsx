// @ts-nocheck
// ================================================================
// AUTOCOMPLETE COMPONENT - Vanilla JS (Photon-powered)
// ================================================================

import '../Autocomplete.css';
import { 
  createAutocomplete, 
  getUserLocation, 
  reversePhoton 
} from '../../../utils/photon.ts';

// Global state for API access
let autocompleteInstance = null;
let autocompleteContainer = null;

// Expose global API
window.Autocomplete = {
  init(config) {
    const {
      container,
      name = 'location',
      placeholder = 'Buscar zona, barrio, ciudad...',
      label = 'Ubicación',
      required = false,
      bias = null,
      onSelect = () => {},
      onChange = () => {},
      disabled = false
    } = config;
    
    autocompleteContainer = container;
    
    // Clear existing
    if (autocompleteInstance) {
      autocompleteInstance.destroy();
    }
    
    autocompleteInstance = createAutocompleteComponent({
      container,
      name,
      placeholder,
      label,
      required,
      bias,
      onSelect,
      onChange,
      disabled
    });
    
    return autocompleteInstance;
  },
  
  clear() {
    if (autocompleteInstance && autocompleteInstance.clear) {
      autocompleteInstance.clear();
    }
    if (autocompleteContainer) {
      autocompleteContainer.innerHTML = '';
    }
    autocompleteInstance = null;
    autocompleteContainer = null;
  },
  
  getValue() {
    return autocompleteInstance?.getValue?.() || '';
  },
  
  setValue(value) {
    if (autocompleteInstance?.setValue) {
      autocompleteInstance.setValue(value);
    }
  },
  
  destroy() {
    if (autocompleteInstance?.destroy) {
      autocompleteInstance.destroy();
    }
    autocompleteInstance = null;
    autocompleteContainer = null;
  }
}

export function initAutocomplete(config) {
  return window.Autocomplete.init(config);
}

// Internal component factory
export function createAutocompleteComponent(config) {
  const {
    container,
    name = 'location',
    placeholder = 'Buscar zona, barrio, ciudad...',
    onSelect = () => {},
    onChange = () => {},
    value = '',
    disabled = false,
    bias = null,
    id = 'location-autocomplete',
    label = 'Ubicación',
    required = false
  } = config;

  // State
  let query = value || '';
  let suggestions = [];
  let isOpen = false;
  let isLoading = false;
  let highlightedIndex = -1;
  let recentSearches = [];
  let showRecent = false;
  let userLocation = null;
  let isLocating = false;

  // DOM refs
  let inputRef = null;
  let listRef = null;
  let autocompleteRef = null;

  // Create autocomplete instance
  const autocomplete = createAutocomplete({
    debounceMs: 300,
    minQueryLength: 2,
    maxCacheSize: 50,
    bias,
    onResults: (results) => {
      suggestions = results;
      isLoading = false;
      renderSuggestions();
    },
    onError: (error) => {
      console.error('Autocomplete error:', error);
      isLoading = false;
      renderSuggestions();
    }
  });

  // Load recent searches from localStorage
  function loadRecentSearches() {
    try {
      const stored = localStorage.getItem('bh_recent_searches');
      if (stored) {
        recentSearches = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load recent searches:', e);
    }
  }

  // Save recent searches
  function saveRecentSearch(search) {
    recentSearches = [search, ...recentSearches.filter(s => s.name !== search.name)].slice(0, 5);
    try {
      localStorage.setItem('bh_recent_searches', JSON.stringify(recentSearches));
    } catch (e) {}
  }

  // Render suggestions
  function renderSuggestions() {
    if (!listRef) return;
    
    if (!isOpen) {
      listRef.innerHTML = '';
      return;
    }

    // Recent searches
    if (showRecent && recentSearches.length > 0 && suggestions.length === 0 && query.trim().length < 2) {
      listRef.innerHTML = `
        <div class="autocomplete-section">
          <div class="autocomplete-section-header">
            <i class="fas fa-history" aria-hidden="true"></i>
            <span>Búsquedas recientes</span>
            <button type="button" class="autocomplete-clear-recent" aria-label="Limpiar historial">
              <i class="fas fa-trash" aria-hidden="true"></i>
            </button>
          </div>
          <ul class="autocomplete-list" role="listbox">
            ${recentSearches.map((search, index) => `
              <li class="autocomplete-item autocomplete-recent" role="option" data-index="${index}" data-name="${search.name}" data-lat="${search.lat}" data-lng="${search.lng}">
                <i class="fas fa-history autocomplete-item-icon" aria-hidden="true"></i>
                <span class="autocomplete-item-name">${search.name}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      attachRecentClickHandlers();
      return;
    }

    // Search results
    if (suggestions.length > 0) {
      listRef.innerHTML = `
        <div class="autocomplete-section">
          ${query.trim().length >= 2 ? `
            <div class="autocomplete-section-header">
              <i class="fas fa-search" aria-hidden="true"></i>
              <span>Resultados para "${query}"</span>
            </div>
          ` : ''}
          <ul class="autocomplete-list" role="listbox">
            ${suggestions.map((suggestion, index) => `
              <li class="autocomplete-item ${index === highlightedIndex ? 'highlighted' : ''} ${suggestion._isCurrentLocation ? 'current-location' : ''}" 
                  role="option" aria-selected="${index === highlightedIndex}"
                  data-index="${index}"
                  data-name="${suggestion.displayName || suggestion.name}"
                  data-lat="${suggestion.lat}"
                  data-lng="${suggestion.lng}"
                  data-type="${suggestion.type}">
                ${suggestion._isCurrentLocation ? '<span class="autocomplete-item-badge">Ubicación actual</span>' : ''}
                <i class="fas ${getIconForType(suggestion.type)} autocomplete-item-icon" aria-hidden="true"></i>
                <div class="autocomplete-item-content">
                  <span class="autocomplete-item-name">${suggestion.displayName || suggestion.name}</span>
                  ${suggestion.city && suggestion.city !== suggestion.name ? `<span class="autocomplete-item-context">${suggestion.city}</span>` : ''}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      attachSuggestionClickHandlers();
      return;
    }

    // No results
    if (isOpen && query.trim().length >= 2 && suggestions.length === 0 && !isLoading) {
      listRef.innerHTML = `
        <div class="autocomplete-section autocomplete-empty">
          <i class="fas fa-search" aria-hidden="true"></i>
          <p>No se encontraron resultados para "${query}"</p>
          <small>Intenta con otra búsqueda o amplía el radio</small>
        </div>
      `;
      return;
    }

    // Loading
    if (isLoading && isOpen) {
      listRef.innerHTML = `
        <div class="autocomplete-section autocomplete-loading">
          <div class="spinner" aria-label="Buscando..."></div>
          <span>Buscando...</span>
        </div>
      `;
      return;
    }

    // Empty
    listRef.innerHTML = '';
  }

  function attachSuggestionClickHandlers() {
    if (!listRef) return;
    listRef.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        if (index >= 0 && suggestions[index]) {
          handleSelect(suggestions[index]);
        }
      });
      item.addEventListener('mouseenter', () => {
        highlightedIndex = parseInt(item.dataset.index);
        renderSuggestions();
      });
    });
  }

  function attachRecentClickHandlers() {
if (!listRef) return;
  listRef.querySelectorAll('.autocomplete-recent').forEach(item => {
    item.addEventListener('click', () => {
      const search = recentSearches[parseInt(item.dataset.index)];
      if (search) {
const suggestion = {
          ...search,
          displayName: search.name,
          shortName: search.name,
          lat: search.lat,
          lng: search.lng,
          type: 'recent'
        };

  handleSelect(suggestion);
      }
    });
  });

  const clearBtn = listRef.querySelector('.autocomplete-clear-recent');
  if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        localStorage.removeItem('bh_recent_searches');
        recentSearches = [];
        renderSuggestions();
      });
    }
  }

  // Handle query change
  function handleChange(e) {
    const newQuery = e.target.value;
    query = newQuery;
    onChange(newQuery);
    highlightedIndex = -1;
    
    if (newQuery.trim().length >= 2) {
      isLoading = true;
      autocomplete.search(newQuery).then(results => {
        suggestions = results;
        showRecent = false;
        isLoading = false;
        renderSuggestions();
      });
    } else {
      suggestions = [];
      showRecent = true;
      renderSuggestions();
    }
  }

  // Handle suggestion click
  function handleSelect(suggestion) {
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
    
    query = formatted.shortName || formatted.name;
    if (inputRef) inputRef.value = query;
    onSelect(formatted);
    onChange(formatted.shortName || formatted.name);
    suggestions = [];
    isOpen = false;
    highlightedIndex = -1;
    renderSuggestions();
    
    // Save to recent
    saveRecentSearch({
      name: formatted.shortName || formatted.name,
      lat: formatted.lat,
      lng: formatted.lng
    });
  }

  // Keyboard navigation
  function handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, suggestions.length - 1);
        renderSuggestions();
        break;
      case 'ArrowUp':
        e.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, -1);
        renderSuggestions();
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        } else if (query.trim().length >= 2) {
          onSelect({ name: query, shortName: query });
        }
        break;
      case 'Escape':
        suggestions = [];
        isOpen = false;
        highlightedIndex = -1;
        renderSuggestions();
        break;
      case 'Tab':
        if (isOpen && highlightedIndex >= 0) {
          e.preventDefault();
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
    }
  }

  // Focus handling
  function handleFocus() {
    isOpen = true;
    if (query.trim().length < 2) {
      showRecent = true;
      suggestions = [];
      renderSuggestions();
    }
  }

  function handleBlur() {
    // Delay to allow click on suggestion
    setTimeout(() => {
      isOpen = false;
      showRecent = false;
      renderSuggestions();
    }, 200);
  }

  // Get user location
  async function handleGeolocate() {
    isLocating = true;
    renderSuggestions();
    try {
      const location = await getUserLocation({ enableHighAccuracy: true, timeout: 10000 });
      userLocation = location;
      
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
       
      query = suggestion.shortName || name;
      if (inputRef) inputRef.value = query;
      onSelect(suggestion);
      onChange(suggestion.shortName || name);
      isOpen = false;
      renderSuggestions();
    } catch (error) {
      console.error('Geolocation failed:', error);
      alert('No se pudo obtener tu ubicación. Verifica los permisos del navegador.');
    } finally {
      isLocating = false;
      renderSuggestions();
    }
  }

  // Click outside to close
  function handleClickOutside(e) {
    if (autocompleteRef && !autocompleteRef.contains(e.target)) {
      isOpen = false;
      showRecent = false;
      renderSuggestions();
    }
  }

  // Helper for icons
  function getIconForType(type) {
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
  }

  // Create DOM
  function createDOM() {
    autocompleteRef = document.createElement('div');
    autocompleteRef.className = 'autocomplete-wrapper';
    autocompleteRef.innerHTML = `
      <label htmlFor="${id}" class="autocomplete-label">
        ${label}
        ${required ? '<span class="required" aria-hidden="true">*</span>' : ''}
      </label>
      
      <div class="autocomplete-input-group">
        <div class="autocomplete-input-wrapper">
          <i class="fas fa-search autocomplete-search-icon" aria-hidden="true"></i>
          <input
            type="text"
            id="${id}"
            name="${name}"
            value="${query}"
            placeholder="${placeholder}"
            disabled="${disabled}"
            required="${required}"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="${id}-list"
            aria-expanded="false"
            aria-haspopup="listbox"
            aria-label="${label}"
          />
          ${!disabled ? `
            <button
              type="button"
              class="autocomplete-geolocate"
              aria-label="Usar mi ubicación actual"
              title="Usar mi ubicación actual"
            >
              <i class="fas fa-crosshairs" aria-hidden="true"></i>
            </button>
          ` : ''}
        </div>
        
        <div 
          id="${id}-list"
          class="autocomplete-dropdown"
          role="listbox"
        ></div>
      </div>
    `;

    // Get refs
    inputRef = autocompleteRef.querySelector('input');
    listRef = autocompleteRef.querySelector('.autocomplete-dropdown');

    // Bind events
    inputRef.addEventListener('input', handleChange);
    inputRef.addEventListener('focus', () => {
      isOpen = true;
      if (query.trim().length < 2) {
        showRecent = true;
        suggestions = [];
        renderSuggestions();
      }
    });
    inputRef.addEventListener('blur', () => {
      setTimeout(() => {
        isOpen = false;
        showRecent = false;
        renderSuggestions();
      }, 200);
    });
    inputRef.addEventListener('keydown', handleKeyDown);
    
    // Value sync
    Object.defineProperty(inputRef, 'value', {
      set(v) { query = v; },
      get() { return query; }
    });

    const geoBtn = autocompleteRef.querySelector('.autocomplete-geolocate');
    if (geoBtn) {
      geoBtn.addEventListener('click', handleGeolocate);
    }

    // Click outside
    document.addEventListener('mousedown', handleClickOutside);

    // Load recent searches
    loadRecentSearches();

    // Insert into container
    container.appendChild(autocompleteRef);

    return autocompleteRef;
  }

  // Public API
  return {
    element: autocompleteRef,
    inputRef,
    listRef,
    
    destroy() {
      document.removeEventListener('mousedown', handleClickOutside);
      if (autocompleteRef) autocompleteRef.remove();
    },
    
    clear() {
      query = '';
      if (inputRef) inputRef.value = '';
      suggestions = [];
      isOpen = false;
      showRecent = false;
      renderSuggestions();
    },
    
    getValue() {
      return query;
    },
    
    setValue(v) {
      query = v || '';
      if (inputRef) inputRef.value = query;
    }
  };
}