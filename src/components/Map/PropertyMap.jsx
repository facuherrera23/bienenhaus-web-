// ================================================================
// PROPERTY MAP - Leaflet + MarkerCluster + fallback
// ================================================================

import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import './PropertyMap.css';

export function PropertyMap({ 
  properties = [], 
  onPropertyClick = () => {},
  center = [-31.42, -64.18], // Córdoba, Argentina
  zoom = 12,
  className = ''
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef(L.markerClusterGroup());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [useFallback, setUseFallback] = useState(false);

  // Initialize map
  useEffect(() => {
    if (mapInstance.current || useFallback) return;

    try {
      const map = L.map('property-map', {
        center,
        zoom,
        zoomControl: false,
        scrollWheelZoom: false
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Add zoom control
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Initialize marker cluster
      const clusterGroup = L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 80,
        iconCreateFunction: createClusterIcon
      });

      map.addLayer(clusterGroup);
      markersRef.current = clusterGroup;
      mapInstance.current = map;

      setMapLoaded(true);

      // Add properties
      if (properties.length > 0) {
        addPropertiesToMap(properties);
      }

      // Handle map view toggle
      const viewButtons = document.querySelectorAll('.vista-btn');
      viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.vista === 'mapa') {
            setTimeout(() => map.invalidateSize(), 100);
          }
        });
      });

    } catch (err) {
      console.error('Map initialization error:', err);
      setMapError(err.message);
      setUseFallback(true);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [useFallback]);

  // Update properties on map
  useEffect(() => {
    if (!mapInstance.current || !markersRef.current) return;
    
    markersRef.current.clearLayers();
    
    if (properties.length > 0) {
      addPropertiesToMap(properties);
    }
  }, [properties]);

  const addPropertiesToMap = (props) => {
    if (!markersRef.current) return;

    props.forEach(prop => {
      if (!prop.lat || !prop.lng) return;

      const isVenta = prop.operacion === 'venta';
      const marker = L.marker([prop.lat, prop.lng], {
        icon: createPropertyIcon(isVenta)
      });

      marker.bindPopup(createPopupContent(prop));
      markersRef.current.addLayer(marker);
    });
  };

  // Render fallback
  if (useFallback || mapError) {
    return (
      <div className={`property-map property-map--fallback ${className}`} style={{ height: '400px' }}>
        <div className="property-map__fallback">
          <i className="fas fa-map-marked-alt" aria-hidden="true"></i>
          <h3>Mapa no disponible</h3>
          <p>No se pudo cargar el mapa interactivo.</p>
          <div className="property-map__fallback-list">
            {properties.slice(0, 5).map(prop => (
              <button 
                key={prop.id}
                className="property-map__fallback-item"
                onClick={() => onPropertyClick(prop)}
                type="button"
              >
                <img src={prop.imagen_principal || 'https://via.placeholder.com/60x45'} alt="" />
                <div>
                  <strong>{prop.titulo}</strong>
                  <span>{prop.ubicacion}</span>
                  <span className="price">{formatPrice(prop.precio, prop.moneda, prop.operacion)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`property-map ${className}`} style={{ height: '400px' }}>
      {!mapLoaded && !useFallback && (
        <div className="property-map__loading">
          <div className="spinner" aria-label="Cargando mapa..."></div>
          <p>Cargando mapa...</p>
        </div>
      )}
      <div id="property-map" className="property-map__container" aria-label="Mapa de propiedades"></div>
      {mapError && !useFallback && (
        <div className="property-map__error">
          <p>Error cargando mapa: {mapError}</p>
          <button className="btn btn-secondary" onClick={() => setUseFallback(true)}>
            Usar vista lista
          </button>
        </div>
      )}
    </div>
  );
}

// Custom property icons
function createPropertyIcon(isVenta) {
  return L.divIcon({
    html: `
      <div class="custom-marker ${isVenta ? 'venta' : 'alquiler'}">
        <div class="marker-pin ${isVenta ? 'venta' : 'alquiler'}">
          <i class="fas fa-${isVenta ? 'home' : 'key'}" aria-hidden="true"></i>
        </div>
        <div class="marker-badge ${isVenta ? 'venta' : 'alquiler'}"></div>
      </div>
    `,
    className: 'custom-marker-icon',
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46]
  });
}

// Cluster icons
function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  let className = 'cluster-marker';
  let size = 30;
  
  if (count < 10) {
    className += ' cluster-small';
    size = 30;
  } else if (count < 100) {
    className += ' cluster-medium';
    size = 40;
  } else {
    className += ' cluster-large';
    size = 50;
  }

  return L.divIcon({
    html: `<div class="${className}"><span>${count}</span></div>`,
    className: 'marker-cluster',
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2)
  });
}

// Popup content
function createPopupContent(property) {
  const price = formatPrice(property.precio, property.moneda, property.operacion);
  const imageUrl = property.imagen_principal || 'https://via.placeholder.com/300x200?text=Sin+imagen';
  
  return `
    <div class="map-popup">
      <img src="${imageUrl}" alt="${property.titulo}" style="width:100%;height:150px;object-fit:cover;border-radius:8px 8px 0 0;">
      <div style="padding:12px;">
        <span class="badge badge-${property.operacion === 'venta' ? 'sale' : 'rent'}">${property.operacion === 'venta' ? 'Venta' : 'Alquiler'}</span>
        <h4 style="margin:8px 0 4px;font-size:1rem;font-weight:700;color:var(--color-gray-900);">${property.titulo}</h4>
        <p style="font-size:0.85rem;color:var(--color-gray-600);margin-bottom:8px;">
          <i class="fas fa-map-marker-alt" style="color:var(--color-accent);margin-right:4px;"></i>${property.ubicacion}
        </p>
        <div style="font-size:1.1rem;font-weight:800;color:var(--color-primary);margin-bottom:8px;">${price}</div>
        <a href="#propiedad/${property.id}" class="btn btn-primary" style="width:100%;justify-content:center;padding:8px 12px;font-size:0.85rem;">
          <i class="fas fa-eye" aria-hidden="true"></i> Ver detalles
        </a>
      </div>
    </div>
  `;
}

// Price formatting
function formatPrice(price, currency, operation) {
  const symbol = currency === 'USD' ? 'U$S' : '$';
  const suffix = operation === 'alquiler' ? '/mes' : '';
  return `${symbol} ${Number(price).toLocaleString('es-AR')}${suffix}`;
}

export default PropertyMap;