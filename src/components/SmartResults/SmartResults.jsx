// ================================================================
// SMART RESULTS - Empty State Contextual + Suggestions + Nearby
// ================================================================

import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import { supabase } from '../../supabase.js';
import { formatPrice } from '../../utils/format.js';
import './SmartResults.css';

export function SmartResults({ 
  filters, 
  currentProperties = [], 
  totalCount = 0,
  onFilterChange = () => {},
  onPropertyClick = () => {},
  supabase = null,
  className = ''
}) {
  const [nearbyProperties, setNearbyProperties] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Generate suggestions to relax filters when 0 results
  const suggestions = useMemo(() => {
    if (totalCount > 0) return [];
    
    const suggestions = [];
    const f = filters;
    
    // Sugerencia 1: Ampliar radio de búsqueda
    if (f.lat && f.lng && f.radio < 25) {
      suggestions.push({
        id: 'expand-radius',
        icon: 'fa-map-marker-alt',
        title: 'Ampliar zona de búsqueda',
        description: `Aumentar radio de ${f.radio}km a 25km`,
        action: () => onFilterChange({ ...filters, radio: 25 }),
        priority: 1,
        impact: 'alto'
      });
    }
    
    // Sugerencia 2: Quitar filtro de precio
    if (f.precioMin > 0 || f.precioMax < 900000) {
      suggestions.push({
        id: 'remove-price',
        icon: 'fa-dollar-sign',
        title: 'Ampliar rango de precio',
        description: `Rango actual: ${f.precioMin > 0 ? formatPrice(f.precioMin) : 'Sin mín.'} - ${f.precioMax < 900000 ? formatPrice(f.precioMax) : 'Sin máx.'}`,
        action: () => onFilterChange({ ...filters, precioMin: 0, precioMax: 900000 }),
        priority: 2,
        impact: 'alto'
      });
    }
    
    // Sugerencia 3: Quitar filtro de habitaciones
    if (f.habitaciones > 0) {
      suggestions.push({
        id: 'remove-rooms',
        icon: 'fa-bed',
        title: 'Quitar filtro de habitaciones',
        description: `Actualmente: ${f.habitaciones === 4 ? '4+' : f.habitaciones} habitaciones`,
        action: () => onFilterChange({ ...filters, habitaciones: 0 }),
        priority: 3,
        impact: 'medio'
      });
    }
    
    // Sugerencia 4: Quitar filtro de baños
    if (f.banosMin > 0) {
      suggestions.push({
        id: 'remove-baths',
        icon: 'fa-bath',
        title: 'Quitar filtro de baños',
        description: `Actualmente: ${f.banosMin === 3 ? '3+' : f.banosMin} baños`,
        action: () => onFilterChange({ ...filters, banosMin: 0 }),
        priority: 4,
        impact: 'medio'
      });
    }
    
    // Sugerencia 5: Cambiar operación a "ambos"
    if (f.operacion !== 'ambos') {
      suggestions.push({
        id: 'change-operation',
        icon: 'fa-exchange-alt',
        title: 'Incluir ambas operaciones',
        description: `Actualmente solo: ${f.operacion === 'venta' ? 'Venta' : 'Alquiler'}`,
        action: () => onFilterChange({ ...filters, operacion: 'ambos' }),
        priority: 5,
        impact: 'alto'
      });
    }
    
    // Sugerencia 6: Quitar tipo de propiedad
    if (f.tipo !== 'todos') {
      suggestions.push({
        id: 'remove-type',
        icon: 'fa-building',
        title: 'Incluir todos los tipos',
        description: `Actualmente solo: ${getTypeLabel(f.tipo)}`,
        action: () => onFilterChange({ ...filters, tipo: 'todos' }),
        priority: 6,
        impact: 'medio'
      });
    }
    
    // Sugerencia 7: Quitar antigüedad
    if (f.antiguedad !== 'todas') {
      suggestions.push({
        id: 'remove-age',
        icon: 'fa-calendar-alt',
        title: 'Incluir todas las antigüedades',
        description: `Actualmente solo: ${f.antiguedad}`,
        action: () => onFilterChange({ ...filters, antiguedad: 'todas' }),
        priority: 7,
        impact: 'bajo'
      });
    }
    
    // Sugerencia 8: Quitar amenities
    const amenities = ['cochera', 'balcon', 'pileta', 'amueblado', 'mascotas'];
    const activeAmenities = amenities.filter(a => filters[a]);
    if (activeAmenities.length > 0) {
      suggestions.push({
        id: 'remove-amenities',
        icon: 'fa-check-circle',
        title: 'Quitar comodidades requeridas',
        description: `Activas: ${activeAmenities.map(getAmenityLabel).join(', ')}`,
        action: () => onFilterChange({ 
          ...filters, 
          cochera: false, balcon: false, pileta: false, 
          amueblado: false, mascotas: false 
        }),
        priority: 8,
        impact: 'alto'
      });
    }
    
    // Sugerencia 9: Cambiar orden a "relevancia"
    if (f.ordenar !== 'relevancia') {
      suggestions.push({
        id: 'change-sort',
        icon: 'fa-sort',
        title: 'Ordenar por relevancia',
        description: `Orden actual: ${getSortLabel(f.ordenar)}`,
        action: () => onFilterChange({ ...filters, ordenar: 'relevancia' }),
        priority: 9,
        impact: 'bajo'
      });
    }
    
    // Sugerencia 10: Limpiar todo
    suggestions.push({
      id: 'clear-all',
      icon: 'fa-undo',
      title: 'Limpiar todos los filtros',
      description: 'Ver todas las propiedades disponibles',
      action: () => onFilterChange({ 
        operacion: 'ambos', tipo: 'todos', precioMin: 0, precioMax: 900000,
        habitaciones: 0, metrosMin: 0, banosMin: 0, antiguedad: 'todas',
        cochera: false, balcon: false, pileta: false, amueblado: false,
        mascotas: false, gastosMax: 0, ordenar: 'relevancia'
      }),
      priority: 10,
      impact: 'muy alto'
    });
    
    return suggestions.sort((a, b) => a.priority - b.priority);
  }, [filters, totalCount, onFilterChange]);

  // Load nearby properties when few results
  useEffect(() => {
    if (totalCount > 0 && totalCount < 6 && filters.lat && filters.lng) {
      loadNearbyProperties();
    }
  }, [totalCount, filters.lat, filters.lng]);

  const loadNearbyProperties = useCallback(async () => {
    if (!filters.lat || !filters.lng) return;
    
    setLoadingNearby(true);
    try {
      if (!supabase) {
        // Mock data
        setNearbyProperties(generateMockNearby(6 - totalCount));
        return;
      }

      const { data, error } = await supabase
        .from('propiedades')
        .select('*, imagenes(url, orden, es_principal)')
        .neq('id', currentProperties.map(p => p.id).filter(Boolean))
        .limit(6 - totalCount);

      if (error) throw error;
      
      const formatted = (data || []).map(p => ({
        ...p,
        imagenes: p.imagenes || [],
        imagen_principal: p.imagenes?.find(i => i.es_principal)?.url || 
                        p.imagenes?.[0]?.url || 
                        'https://via.placeholder.com/400x300?text=Sin+imagen',
        galeria: p.imagenes?.sort((a,b) => a.orden - b.orden).map(i => i.url) || []
      }));
      
      setNearbyProperties(formatted);
    } catch (err) {
      console.error('Error loading nearby:', err);
    } finally {
      setLoadingNearby(false);
    }
  }, [supabase, filters, totalCount, currentProperties]);

  // Render
  if (totalCount === 0) {
    return (
      <div className={`smart-results smart-results--empty ${className}`} role="status" aria-live="polite">
        <div className="smart-results__empty">
          <div className="smart-results__icon">
            <i className="fas fa-search" aria-hidden="true"></i>
          </div>
          <h2 className="smart-results__title">No se encontraron propiedades</h2>
          <p className="smart-results__description">
            No hay propiedades que coincidan con tus filtros actuales
          </p>
          
          {/* Active Filters Summary */}
          {Object.keys(filters).some(k => JSON.stringify(filters[k]) !== JSON.stringify({ 
            operacion: 'ambos', tipo: 'todos', precioMin: 0, precioMax: 900000,
            habitaciones: 0, metrosMin: 0, banosMin: 0, antiguedad: 'todas',
            cochera: false, balcon: false, pileta: false, amueblado: false,
            mascotas: false, gastosMax: 0, ordenar: 'relevancia'
          }[k])) && (
            <div className="smart-results__active-filters" role="region" aria-label="Filtros activos">
              <h3 className="smart-results__active-title">
                <i className="fas fa-filter" aria-hidden="true"></i>
                Filtros activos ({Object.keys(filters).filter(k => 
                  JSON.stringify(filters[k]) !== JSON.stringify({ 
                    operacion: 'ambos', tipo: 'todos', precioMin: 0, precioMax: 900000,
                    habitaciones: 0, metrosMin: 0, banosMin: 0, antiguedad: 'todas',
                    cochera: false, balcon: false, pileta: false, amueblado: false,
                    mascotas: false, gastosMax: 0, ordenar: 'relevancia'
                  }[k])).length})
              </h3>
              <ul className="smart-results__active-list">
                {Object.entries(filters).filter(([k, v]) => {
                  const defaults = { operacion: 'ambos', tipo: 'todos', precioMin: 0, precioMax: 900000,
                    habitaciones: 0, metrosMin: 0, banosMin: 0, antiguedad: 'todas',
                    cochera: false, balcon: false, pileta: false, amueblado: false,
                    mascotas: false, gastosMax: 0, ordenar: 'relevancia' };
                  return JSON.stringify(v) !== JSON.stringify(defaults[k]);
                }).map(([key, value]) => (
                  <li key={key} className="smart-results__active-item">
                    <span className="smart-results__active-label">{getFilterLabel(key)}:</span>
                    <span className="smart-results__active-value">{formatFilterValue(key, value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Relax Filter Suggestions */}
          {suggestions.length > 0 && (
            <div className="smart-results__suggestions" role="region" aria-label="Sugerencias para ampliar búsqueda">
              <h3 className="smart-results__suggestions-title">
                <i className="fas fa-lightbulb" aria-hidden="true"></i>
                Prueba ampliando tu búsqueda
              </h3>
              <div className="smart-results__suggestions-grid" role="list">
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    className={`smart-results__suggestion-card smart-results__suggestion-card--impact-${suggestion.impact}`}
                    onClick={suggestion.action}
                    role="listitem"
                    aria-label={`${suggestion.title}. ${suggestion.description}`}
                  >
                    <div className="smart-results__suggestion-icon">
                      <i className={`fas ${suggestion.icon}`} aria-hidden="true"></i>
                      <span className={`smart-results__impact smart-results__impact--${suggestion.impact}`}>
                        Impacto: {suggestion.impact}
                      </span>
                    </div>
                    <div className="smart-results__suggestion-content">
                      <h4 className="smart-results__suggestion-title">{suggestion.title}</h4>
                      <p className="smart-results__suggestion-description">{suggestion.description}</p>
                    </div>
                    <span className="smart-results__suggestion-action">
                      <i className="fas fa-arrow-right" aria-hidden="true"></i>
                      Aplicar
                    </span>
                  </button>
                ))}
              </div>
              {suggestions.length > 6 && (
                <button className="btn btn-secondary smart-results__show-more" 
                  onClick={() => { /* show all in modal */ }}>
                  Ver todas las sugerencias ({suggestions.length})
                </button>
              )}
            </div>
          )}
          
          {/* Clear All Button */}
          <button 
            className="btn btn-primary smart-results__clear-all"
            onClick={() => onFilterChange({ 
              operacion: 'ambos', tipo: 'todos', precioMin: 0, precioMax: 900000,
              habitaciones: 0, metrosMin: 0, banosMin: 0, antiguedad: 'todas',
              cochera: false, balcon: false, pileta: false, amueblado: false,
              mascotas: false, gastosMax: 0, ordenar: 'relevancia'
            })}
          >
            <i className="fas fa-undo" aria-hidden="true"></i>
            Limpiar todos los filtros
          </button>
        </div>
      </div>
    );
  }

  // Has results but few - show nearby
  const showNearby = totalCount > 0 && totalCount < 6 && nearbyProperties.length > 0;

  return (
    <div className={`smart-results ${className}`}>
      {/* Nearby Properties Section */}
      {showNearby && (
        <section className="smart-results__nearby" aria-labelledby="nearby-title">
          <header className="smart-results__nearby-header">
            <h2 id="nearby-title" className="smart-results__nearby-title">
              <i className="fas fa-map-marker-alt" aria-hidden="true"></i>
              También te puede interesar cerca de aquí
            </h2>
            <p className="smart-results__nearby-description">
              Solo encontraste {totalCount} {totalCount === 1 ? 'propiedad' : 'propiedades'} con tus filtros.
              Te mostramos opciones cercanas que podrían interesarte.
            </p>
          </header>
          
          {loadingNearby ? (
            <div className="smart-results__loading" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true"></div>
              <span>Buscando propiedades cercanas...</span>
            </div>
          ) : (
            <div className="smart-results__nearby-grid" role="list">
              {nearbyProperties.map((prop, index) => (
                <article key={prop.id} className="smart-results__nearby-card" role="listitem">
                  <div className="smart-results__nearby-image">
                    <img 
                      src={prop.imagen_principal} 
                      alt={`${prop.titulo} - ${prop.ubicacion}`}
                      loading="lazy"
                      width="400"
                      height="225"
                    />
                    <span className="badge badge-{prop.operacion === 'venta' ? 'venta' : 'alquiler'}">
                      {prop.operacion === 'venta' ? 'Venta' : 'Alquiler'}
                    </span>
                    <span className="smart-results__distance">
                      <i className="fas fa-map-marker-alt" aria-hidden="true"></i>
                      ~{calculateDistance(prop.lat, prop.lng, filters.lat, filters.lng).toFixed(1)}km
                    </span>
                  </div>
                  <div className="smart-results__nearby-content">
                    <h3 className="smart-results__nearby-title">{prop.titulo}</h3>
                    <div className="smart-results__nearby-location">
                      <i className="fas fa-map-marker-alt" aria-hidden="true"></i>
                      <span>{prop.ubicacion}</span>
                    </div>
                    <div className="smart-results__nearby-price">
                      {formatPrice(prop.precio, prop.moneda, prop.operacion)}
                    </div>
                    <div className="smart-results__nearby-features">
                      {prop.habitaciones && <span className="feature"><i className="fas fa-bed" aria-hidden="true"></i> {prop.habitaciones}</span>}
                      {prop.banos && <span className="feature"><i className="fas fa-bath" aria-hidden="true"></i> {prop.banos}</span>}
                      {prop.m2 && <span className="feature"><i className="fas fa-arrows-alt" aria-hidden="true"></i> {prop.m2} m²</span>}
                    </div>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onPropertyClick(prop)}
                      aria-label={`Ver detalles de ${prop.titulo}`}
                    >
                      <i className="fas fa-eye" aria-hidden="true"></i> Ver detalles
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="smart-results__nearby-footer">
            <button className="btn btn-secondary" onClick={() => onFilterChange({ ...filters, radio: (filters.radio || 10) + 5 })}>
              <i className="fas fa-search-plus" aria-hidden="true"></i>
              Ampliar radio de búsqueda
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// Helpers
function getFilterLabel(key) {
  const labels = {
    operacion: 'Operación', tipo: 'Tipo', precioMin: 'Precio mín.',
    precioMax: 'Precio máx.', habitaciones: 'Habitaciones', metrosMin: 'm² mín.',
    banosMin: 'Baños mín.', antiguedad: 'Antigüedad', cochera: 'Cochera',
    balcon: 'Balcón', pileta: 'Pileta', amueblado: 'Amueblado',
    mascotas: 'Mascotas', gastosMax: 'Expensas máx.', ordenar: 'Ordenar'
  };
  return labels[key] || key;
}

function formatFilterValue(key, value) {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') {
    if (key.includes('precio') || key.includes('gastos')) return value.toLocaleString('es-AR') + ' ARS';
    if (key === 'metrosMin') return value + ' m²';
    return String(value);
  }
  const labels = {
    operacion: { ambos: 'Ambos', venta: 'Venta', alquiler: 'Alquiler' },
    tipo: { todos: 'Todos', piso: 'Piso', chalet: 'Chalet', atico: 'Ático', local: 'Local', terreno: 'Terreno' },
    antiguedad: { todas: 'Todas', nuevo: 'Nuevo', reformado: 'Reformado', viejo: 'A reformar' },
    ordenar: { 
      relevancia: 'Relevancia', destacado: 'Destacados primero', 
      precio_asc: 'Precio: menor a mayor', precio_desc: 'Precio: mayor a menor',
      m2_desc: 'Superficie: mayor a menor', m2_asc: 'Superficie: menor a mayor',
      nuevas: 'Más nuevas', antiguas: 'Más antiguas'
    }
  };
  return labels[key]?.[value] || value;
}

function getTypeLabel(type) {
  const labels = { piso: 'Piso/Apartamento', chalet: 'Chalet/Casa', atico: 'Ático', local: 'Local/Oficina', terreno: 'Terreno/Solar' };
  return labels[type] || type;
}

function getAmenityLabel(key) {
  const labels = { cochera: 'Cochera', balcon: 'Balcón', pileta: 'Pileta', amueblado: 'Amueblado', mascotas: 'Mascotas' };
  return labels[key] || key;
}

function getSortLabel(sort) {
  const labels = { 
    relevancia: 'Relevancia', destacado: 'Destacados primero', 
    precio_asc: 'Precio: menor a mayor', precio_desc: 'Precio: mayor a menor',
    m2_desc: 'Superficie: mayor a menor', m2_asc: 'Superficie: menor a mayor',
    nuevas: 'Más nuevas', antiguas: 'Más antiguas'
  };
  return labels[sort] || sort;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function generateMockNearby(count) {
  const types = ['piso', 'chalet', 'atico', 'local', 'terreno'];
  const operations = ['venta', 'alquiler'];
  const locations = ['Córdoba Centro', 'Nueva Córdoba', 'Cerro de las Rosas', 'Alta Córdoba', 'Guemes', 'Alberdi', 'Villa Belgrano'];
  
  return Array.from({ length: count }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const price = operation === 'venta' 
      ? Math.floor(Math.random() * 200000000) + 50000000 
      : Math.floor(Math.random() * 150000) + 30000;
    
    return {
      id: `nearby-${Date.now()}-${i}`,
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
      destacada: Math.random() > 0.8,
      cochera: Math.random() > 0.5,
      balcon: Math.random() > 0.5,
      pileta: Math.random() > 0.7,
      amueblado: Math.random() > 0.7,
      mascotas: Math.random() > 0.5,
      lat: -31.42 + (Math.random() - 0.5) * 0.1,
      lng: -64.18 + (Math.random() - 0.5) * 0.1,
      imagen_principal: `https://via.placeholder.com/400x225?text=Propiedad+Cercana`,
      galeria: Array.from({ length: 3 }, (_, j) => `https://via.placeholder.com/800x600?text=Propiedad+Cercana+${j+1}`)
    };
  });
}

export default SmartResults;