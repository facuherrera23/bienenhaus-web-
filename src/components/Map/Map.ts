
// ================================================================
// MAP COMPONENT - Nocturne Dark Theme
// ================================================================
declare const L: any;

import './Map.css';
import { logError } from '../../utils/logger.ts';

let map = null;
let markersLayer = null;
let clustersLayer = null;

export function initMap(containerId: string, properties: any[], options: {
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (property: any) => void;
} = {}) {
  const { center = [-31.42, -64.18], zoom = 12, onMarkerClick } = options;

  try {
    // Destroy existing map
    if (map) {
      map.remove();
      map = null;
    }

    // Initialize Leaflet map
    map = L.map(containerId, {
center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      tap: true,
      touchZoom: true,
    });

    // Dark tile layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
      minZoom: 8,
    }).addTo(map);

    // Custom zoom control styling
    map.zoomControl.setPosition('topright');

    // Create layers
    markersLayer = L.layerGroup().addTo(map);
    clustersLayer = L.layerGroup().addTo(map);

    // Add properties to map
    if (properties && properties.length > 0) {
      addPropertiesToMap(properties, onMarkerClick);
    }

    // Fit bounds if properties exist
    if (properties && properties.length > 0) {
      const bounds = L.latLngBounds(properties.map(p => [p.latitud, p.longitud]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    logError('Map initialized', { propertiesCount: properties?.length }, 'map');
    return map;

  } catch (error) {
    logError('Error initializing map', error, 'map');
    return null;
  }
}

function addPropertiesToMap(properties: any[], onClick?: (property: any) => void) {
  if (!markersLayer || !clustersLayer) return;

  markersLayer.clearLayers();
  clustersLayer.clearLayers();

  const markers = [];

  properties.forEach(property => {
    if (!property.latitud || !property.longitud) return;

    const isVenta = property.operacion === 'venta';
    const markerColor = isVenta ? '#2ee6c5' : '#39d98a';
    const markerColorDark = isVenta ? '#1fb89e' : '#2da87a';

    // Custom marker with Signal glow
    const markerHtml = `
      <div class="custom-marker" style="
        background: ${markerColor};
        border: 3px solid #0b0d0e;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px ${markerColor}66, 0 0 0 3px #0b0d0e;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      ">
        <i class="fas ${isVenta ? 'fa-home' : 'fa-building'}" style="
          color: #0b0d0e;
          font-size: 16px;
          transform: rotate(45deg);
          margin-bottom: 2px;
        "></i>
      </div>
      <div class="marker-badge" style="
        position: absolute;
        bottom: -18px;
        left: 50%;
        transform: translateX(-50%) rotate(45deg);
        white-space: nowrap;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        color: #0b0d0e;
        background: ${markerColor};
        box-shadow: 0 2px 8px ${markerColor}66;
      ">
        ${isVenta ? 'Venta' : 'Alquiler'}
      </div>
    `;

    const marker = L.marker([property.latitud, property.longitud], {
      icon: L.divIcon({
        html: markerHtml,
        className: 'custom-marker-wrapper',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      }),
    });

    marker.on('click', () => {
      if (onClick) {
        onClick(property);
      } else {
        // Default: show popup
        const popupContent = createPopupContent(property);
        marker.bindPopup(popupContent, {
          className: 'custom-popup',
          minWidth: 280,
          maxWidth: 340,
        }).openPopup();
      }
    });

    markers.push(marker);
  });

  // Add to clusters
  markers.forEach(m => clustersLayer.addLayer(m));

  // Cluster styling
  const clusterIcon = L.divIcon({
    html: '<div class="cluster-marker cluster-small"></div>',
    className: 'cluster-marker-wrapper',
    iconSize: [30, 30],
  });

  // Add clusters
  // Note: In a real implementation, you'd use Leaflet.markercluster plugin
  // For now, add all markers to the clusters layer
}

function createPopupContent(property: any): string {
  const isVenta = property.operacion === 'venta';
  const price = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: property.moneda || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(property.precio || 0);

  return `
    <div class="map-popup">
      <img src="${property.imagen_principal || '/placeholder-property.webp'}" alt="${property.titulo}" class="popup-image" style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px 12px 0 0; margin-bottom: 12px;">
      <h3 class="popup-title" style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: #e8ecee;">${property.titulo}</h3>
      <div class="popup-price" style="font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 800; color: #2ee6c5; margin-bottom: 8px;">
        ${price} ${isVenta ? '' : '/mes'}
      </div>
      <div class="popup-location" style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #9aa1a6; margin-bottom: 12px;">
        <i class="fas fa-map-marker-alt" style="color: #2ee6c5;"></i>
        <span>${property.ubicacion || 'Ubicación no disponible'}</span>
      </div>
      <div class="popup-features" style="display: flex; gap: 16px; font-size: 12px; color: #9aa1a6; margin-bottom: 12px; flex-wrap: wrap;">
        <span><i class="fas fa-bed" style="color: #7a7f81; margin-right: 4px;"></i> ${property.dormitorios || 0}</span>
        <span><i class="fas fa-bath" style="color: #7a7f81; margin-right: 4px;"></i> ${property.banos || 0}</span>
        <span><i class="fas fa-car" style="color: #7a7f81; margin-right: 4px;"></i> ${property.cochera || 0}</span>
        <span><i class="fas fa-ruler-combined" style="color: #7a7f81; margin-right: 4px;"></i> ${property.superficie || 0} m²</span>
      </div>
      <button class="popup-btn" data-property-id="${property.id}" style="
        display: block;
        width: 100%;
        text-align: center;
        background: #2ee6c5;
        color: #0b0d0e;
        border: none;
        padding: 12px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.2s ease;
      ">
        Ver detalles
      </button>
    </div>
  `;
}

export function destroyMap() {
  if (map) {
    map.remove();
    map = null;
    markersLayer = null;
    clustersLayer = null;
  }
}

export function flyToLocation(lat: number, lng: number, zoom = 15) {
  if (map) {
    map.flyTo([lat, lng], zoom, { duration: 1.5 });
  }
}

export function getMapInstance() {
  return map;
}
