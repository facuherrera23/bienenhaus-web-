// ================================================================
// PROPERTY GRID - Infinite Scroll + Filters + URL Sync
// ================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks';
import { useFilters } from '../../hooks/useFilters.js';
import { updateURLFilters, getFiltersFromURL, FILTER_DEFAULTS } from '../../utils/urlState.js';
import { formatPrice } from '../../utils/format.js';
import './PropertyGrid.css';

export function PropertyGrid({ 
  initialProperties = [],
  onPropertyClick = () => {},
  onLoadMore = () => {},
  hasMore = true,
  isLoading = false,
  supabase = null
}) {
  // Filter state from hook
  const { 
    filters, 
    activeCount, 
    setFilters, 
    setFilter, 
    resetFilters, 
    clearFilter,
    pushToURL,
    loadFromURL,
    isLoading 
  } = useFilters({
    autoPersist: true,
    syncURL: true,
    onChange: (filters, { changes, source }) => {
      // Trigger property reload when filters change
      if (source === 'user' || source === 'url') {
        loadProperties(1, true);
      }
    }
  });

  // Property state
  const [properties, setProperties] = useState(initialProperties);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(hasMore);
  const [error, setError] = useState(null);
  
  // Infinite scroll refs
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  const isLoadingMore = useRef(false);

  // Initial load from URL
  useEffect(() => {
    const urlFilters = getFiltersFromURL();
    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    } else if (!isLoading) {
      loadProperties(1, true);
    }
  }, []);

  // Load properties from Supabase
  const loadProperties = useCallback(async (page, replace = false) => {
    if (isLoadingMore.current) return;
    
    if (page === 1) {
      setProperties([]);
    }
    
    isLoadingMore.current = true;
    setError(null);

    try {
      if (!supabase) {
        // Mock data for development
        const mockProps = generateMockProperties(page);
        setProperties(prev => replace ? mockProps : [...prev, ...mockProps]);
        setTotalCount(150);
        setHasMore(page < 15);
        setCurrentPage(page);
        return;
      }

      let query = supabase
        .from('propiedades')
        .select('*, imagenes(url, cloudinary_public_id, orden, es_principal)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * 12, page * 12 - 1);

      // Apply filters
      if (filters.operacion && filters.operacion !== 'ambos') {
        query = query.eq('operacion', filters.operacion);
      }
      if (filters.tipo && filters.tipo !== 'todos') {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters.precioMin > 0) {
        query = query.gte('precio', filters.precioMin);
      }
      if (filters.precioMax < FILTER_DEFAULTS.precioMax) {
        query = query.lte('precio', filters.precioMax);
      }
      if (filters.habitaciones > 0) {
        query = query.gte('habitaciones', filters.habitaciones);
      }
      if (filters.metrosMin > 0) {
        query = query.gte('m2', filters.metrosMin);
      }
      if (filters.banosMin > 0) {
        query = query.gte('banos', filters.banosMin);
      }
      if (filters.antiguedad && filters.antiguedad !== 'todas') {
        query = query.eq('antiguedad', filters.antiguedad);
      }
      if (filters.cochera) {
        query = query.eq('cochera', true);
      }
      if (filters.balcon) {
        query = query.eq('balcon', true);
      }
      if (filters.pileta) {
        query = query.eq('pileta', true);
      }
      if (filters.amueblado) {
        query = query.eq('amueblado', true);
      }
      if (filters.mascotas) {
        query = query.eq('mascotas', true);
      }
      if (filters.gastosMax > 0) {
        query = query.lte('gastos_comunes', filters.gastosMax);
      }

      // Sorting
      const sortMap = {
        'precio_asc': { column: 'precio', ascending: true },
        'precio_desc': { column: 'precio', ascending: false },
        'm2_desc': { column: 'm2', ascending: false },
        'm2_asc': { column: 'm2', ascending: true },
        'nuevas': { column: 'created_at', ascending: false },
        'antiguas': { column: 'created_at', ascending: true },
        'relevancia': { column: 'destacado', ascending: false },
        'destacado': { column: 'destacado', ascending: false }
      };
      const sort = sortMap[filters.ordenar] || sortMap.destacado;
      query = query.order(sort.column, { ascending: sort.ascending });

      const { data, error, count } = await query;

      if (error) throw error;

      const formattedProps = (data || []).map(p => ({
        ...p,
        imagenes: p.imagenes || [],
        imagen_principal: p.imagenes?.find(i => i.es_principal)?.url || 
                        p.imagenes?.[0]?.url || 
                        'https://via.placeholder.com/400x300?text=Sin+imagen',
        galeria: p.imagenes?.sort((a,b) => a.orden - b.orden).map(i => i.url) || []
      }));

      setProperties(prev => replace ? formattedProps : [...prev, ...formattedProps]);
      setTotalCount(count || 0);
      setHasMore(page * 12 < (count || 0));
      setCurrentPage(page);

    } catch (err) {
      console.error('Error loading properties:', err);
      setError(err.message);
    } finally {
      isLoadingMore.current = false;
    }
  }, [filters, supabase]);

  // Load more on scroll
  useEffect(() => {
    if (isLoadingMore.current || !hasMore || isLoading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore.current && hasMore) {
          loadProperties(currentPage + 1);
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, currentPage, isLoading]);

  // Handle filter changes from SearchBar
  useEffect(() => {
    const handleFilterChange = (e) => {
      const newFilters = e.detail;
      setFilters(newFilters);
    };

    window.addEventListener('filters-changed', handleFilterChange);
    return () => window.removeEventListener('filters-changed', handleFilterChange);
  }, []);

  // Reset scroll on new search
  useEffect(() => {
    if (currentPage === 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // Clear specific filter
  const handleClearFilter = (key) => {
    clearFilter(key);
    pushToURL();
  };

  // Format price helper
  const formatPrice = (price, currency, operation) => {
    return formatPrice(price, currency, operation);
  };

  return (
    <div className="property-grid-container">
      {/* Active Filters Bar */}
      {activeCount > 0 && (
        <div className="active-filters-bar" role="status" aria-live="polite">
          <span className="active-filters-label">
            <i className="fas fa-filter" aria-hidden="true"></i>
            {activeCount} filtro{activeCount !== 1 ? 's' : ''} activ{activeCount !== 1 ? 'os' : 'o'}
          </span>
          <div className="active-filters-chips">
            {Object.entries(filters).map(([key, value]) => {
              const defaultVal = FILTER_DEFAULTS[key];
              if (JSON.stringify(value) === JSON.stringify(defaultVal)) return null;
              
              const labels = {
                operacion: 'Operación',
                tipo: 'Tipo',
                precioMin: 'Precio mín.',
                precioMax: 'Precio máx.',
                habitaciones: 'Hab.',
                metrosMin: 'm² mín.',
                banosMin: 'Baños',
                antiguedad: 'Antigüedad',
                cochera: 'Cochera',
                balcon: 'Balcón',
                pileta: 'Pileta',
                amueblado: 'Amueblado',
                mascotas: 'Mascotas',
                gastosMax: 'Expensas máx.',
                ordenar: 'Orden'
              };
              
              const formatters = {
                operacion: v => v === 'ambos' ? 'Ambos' : v.charAt(0).toUpperCase() + v.slice(1),
                tipo: v => v === 'todos' ? 'Todos' : v.charAt(0).toUpperCase() + v.slice(1),
                precioMin: v => v > 0 ? `${v.toLocaleString('es-AR')} ARS` : 'Sin mínimo',
                precioMax: v => v < FILTER_DEFAULTS.precioMax ? `${v.toLocaleString('es-AR')} ARS` : 'Sin máximo',
                habitaciones: v => v === 0 ? 'Cualquiera' : v === 4 ? '4+' : String(v),
                metrosMin: v => v > 0 ? `${v} m²` : 'Sin mínimo',
                banosMin: v => v === 0 ? 'Cualquiera' : v === 3 ? '3+' : String(v),
                antiguedad: v => v === 'todas' ? 'Todas' : v.charAt(0).toUpperCase() + v.slice(1),
                ordenar: v => ({
                  'destacado': 'Destacados primero',
                  'precio_asc': 'Precio: menor a mayor',
                  'precio_desc': 'Precio: mayor a menor',
                  'm2_desc': 'Superficie: mayor a menor',
                  'm2_asc': 'Superficie: menor a mayor',
                  'nuevas': 'Más nuevas',
                  'antiguas': 'Más antiguas',
                  'relevancia': 'Relevancia'
                })[v] || v,
                cochera: v => v ? 'Sí' : 'No',
                balcon: v => v ? 'Sí' : 'No',
                pileta: v => v ? 'Sí' : 'No',
                amueblado: v => v ? 'Sí' : 'No',
                mascotas: v => v ? 'Sí' : 'No',
                gastosMax: v => v > 0 ? `${v.toLocaleString('es-AR')} ARS` : 'Sin límite'
              });

              const label = labels[key] || key;
              const formatted = formatters[key] ? formatters[key](value) : value;

              return (
                <span key={key} className="filter-chip">
                  <span className="filter-chip-label">{label}: </span>
                  <span className="filter-chip-value">{formatted}</span>
                  <button 
                    type="button" 
                    className="filter-chip-remove"
                    onClick={() => handleClearFilter(key)}
                    aria-label={`Quitar filtro ${label}`}
                  >
                    <i className="fas fa-times" aria-hidden="true"></i>
                  </button>
                </span>
              );
            })}
            <button 
              type="button" 
              className="btn-clear-all"
              onClick={() => { resetFilters(); pushToURL(); }}
              aria-label="Limpiar todos los filtros"
            >
              <i className="fas fa-times" aria-hidden="true"></i> Limpiar todo
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Properties Grid */}
      <div className="property-grid" role="list" aria-label="Propiedades">
        {properties.length === 0 && !isLoading && !isLoadingMore.current ? (
          <div className="empty-state" role="status" aria-live="polite">
            <i className="fas fa-home" aria-hidden="true"></i>
            <h3>No hay propiedades</h3>
            <p>No se encontraron propiedades con los filtros actuales</p>
            <button className="btn btn-secondary" onClick={() => { resetFilters(); pushToURL(); }}>
              <i className="fas fa-undo" aria-hidden="true"></i> Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            {properties.map((prop, index) => (
              <article 
                key={prop.id} 
                className="property-card"
                role="listitem"
                onClick={() => onPropertyClick(prop)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPropertyClick(prop); }}}
              >
                <div className="property-card-image">
                  <img 
                    src={prop.imagen_principal} 
                    alt={`${prop.titulo} - ${prop.ubicacion}`}
                    loading={index < 6 ? 'eager' : 'lazy'}
                    width="400"
                    height="300"
                  />
                  <span className="badge badge-{prop.operacion === 'venta' ? 'venta' : 'alquiler'}">
                    {prop.operacion === 'venta' ? 'Venta' : 'Alquiler'}
                  </span>
                  {prop.destacado && <span className="badge badge-destacado">Destacada</span>}
                </div>
                <div className="property-card-content">
                  <div className="property-price">
                    <span className="currency">$</span>
                    <span className="amount">{prop.precio.toLocaleString('es-AR')}</span>
                    <span className="period">{prop.operacion === 'alquiler' ? '/mes' : ''}</span>
                  </div>
                  <h3 className="property-title">{prop.titulo}</h3>
                  <div className="property-location">
                    <i className="fas fa-map-marker-alt" aria-hidden="true"></i>
                    <span>{prop.ubicacion}</span>
                  </div>
                  <div className="property-features">
                    {prop.habitaciones && <span className="feature"><i className="fas fa-bed" aria-hidden="true"></i> {prop.habitaciones}</span>}
                    {prop.banos && <span className="feature"><i className="fas fa-bath" aria-hidden="true"></i> {prop.banos}</span>}
                    {prop.m2 && <span className="feature"><i className="fas fa-arrows-alt" aria-hidden="true"></i> {prop.m2} m²</span>}
                  </div>
                  <div className="property-tags">
                    {prop.cochera && <span className="tag"><i className="fas fa-car" aria-hidden="true"></i> Cochera</span>}
                    {prop.balcon && <span className="tag"><i className="fas fa-window-maximize" aria-hidden="true"></i> Balcón</span>}
                    {prop.pileta && <span className="tag"><i className="fas fa-swimming-pool" aria-hidden="true"></i> Pileta</span>}
                  </div>
                </div>
                <div className="property-card-footer">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => { e.stopPropagation(); onPropertyClick(prop); }}
                    aria-label={`Ver detalles de ${prop.titulo}`}
                  >
                    <i className="fas fa-eye" aria-hidden="true"></i> Ver detalles
                  </button>
                </div>
              </article>
            ))}
            <div ref={sentinelRef} className="load-sentinel" aria-hidden="true">
              {isLoadingMore.current && hasMore && (
                <div className="loading-more" role="status" aria-live="polite">
                  <div className="spinner" aria-hidden="true"></div>
                  <span>Cargando más propiedades...</span>
                </div>
              )}
              {!hasMore && properties.length > 0 && (
                <div className="end-message">
                  <i className="fas fa-check-circle" aria-hidden="true"></i>
                  <span>Has visto todas las propiedades</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sticky CTA Mobile */}
      <div className="sticky-cta-mobile" role="complementary" aria-label="Acciones rápidas">
        <button className="btn btn-secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <i className="fas fa-arrow-up" aria-hidden="true"></i> Arriba
        </button>
        <button className="btn btn-primary" onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}>
          <i className="fab fa-whatsapp" aria-hidden="true"></i> WhatsApp
        </button>
      </div>
    </div>
  );
}

// Mock data generator for development
function generateMockProperties(page) {
  const types = ['piso', 'chalet', 'atico', 'local', 'terreno'];
  const operations = ['venta', 'alquiler'];
  const locations = ['Córdoba Centro', 'Nueva Córdoba', 'Cerro de las Rosas', 'Alta Córdoba', 'Guemes', 'Alberdi', 'Villa Belgrano'];
  
  return Array.from({ length: 12 }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const price = operation === 'venta' 
      ? Math.floor(Math.random() * 200000000) + 50000000 
      : Math.floor(Math.random() * 150000) + 30000;
    
    return {
      id: (page - 1) * 12 + i + 1,
      titulo: `${type.charAt(0).toUpperCase() + type.slice(1)} ${operation === 'venta' ? 'en venta' : 'en alquiler'} - ${location}`,
      operacion: operation,
      tipo: type,
      ubicacion: location,
      precio: price,
      moneda: 'ARS',
      habitaciones: Math.floor(Math.random() * 4) + 1,
      banos: Math.floor(Math.random() * 2) + 1,
      m2: Math.floor(Math.random() * 100) + 40,
      antiguedad: ['nuevo', 'reformado', 'viejo'][Math.floor(Math.random() * 3)],
      destacada: Math.random() > 0.7,
      cochera: Math.random() > 0.5,
      balcon: Math.random() > 0.5,
      pileta: Math.random() > 0.7,
      amueblado: Math.random() > 0.7,
      mascotas: Math.random() > 0.5,
      imagen_principal: `https://via.placeholder.com/400x300?text=${encodeURIComponent(type + ' ' + operation)}`,
      galeria: [
        `https://via.placeholder.com/800x600?text=${encodeURIComponent(type + ' ' + operation)}`,
        `https://via.placeholder.com/800x600?text=${encodeURIComponent(type + ' interior')}`,
        `https://via.placeholder.com/800x600?text=${encodeURIComponent(type + ' exterior')}`
      ]
    };
  }
}

// ================================================================
// PROPERTY GRID COMPONENT STYLES
// ================================================================

/* ... CSS from PropertyGrid.css ... */