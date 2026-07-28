// @ts-nocheck
// ================================================================
// MAP COMPONENT
// ================================================================
declare const L: any;

import './Map.css';

let map = null;
let markers = L.markerClusterGroup();

export function initMap() {
  const mapContainer = document.getElementById('mapaPropiedades');
  if (!mapContainer || map) return;

  try {
    // Initialize Leaflet map
    map = L.map('mapaPropiedades', {
      center: [-31.42, -64.18], // Córdoba, Argentina
      zoom: 12,
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

    // Initialize marker cluster group
    markers = L.markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 80,
      iconCreateFunction: createClusterIcon
    });

    map.addLayer(markers);

    // Listen for properties loaded
    window.addEventListener('properties-loaded', (e) => {
      updateMapMarkers(e.detail.properties);
    });

    // Handle map view toggle
    const viewButtons = document.querySelectorAll('.vista-btn');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.vista === 'mapa') {
          setTimeout(() => map.invalidateSize(), 100);
        }
      });
    });

  } catch (error) {
    console.error('Error initializing map:', error);
  }
}

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

function updateMapMarkers(properties) {
  if (!map || !markers) return;

  markers.clearLayers();

  properties.forEach(prop => {
    if (!prop.lat || !prop.lng) return;

    const isVenta = prop.operacion === 'venta';
    const marker = L.marker([prop.lat, prop.lng], {
      icon: createPropertyIcon(isVenta)
    });

    marker.bindPopup(createPopupContent(prop));
    markers.addLayer(marker);
  });

  map.addLayer(markers);

  // Fit bounds to show all markers
  if (markers.getLayers().length > 0) {
    const group = L.featureGroup(markers.getLayers());
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

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

function formatPrice(price, currency, operation) {
  const symbol = currency === 'USD' ? 'U$S' : '$';
  const suffix = operation === 'alquiler' ? '/mes' : '';
  return `${symbol} ${Number(price).toLocaleString('es-AR')}${suffix}`;
}

// Export for global access
window.initMapaPropiedades = initMap;

export default { initMap };