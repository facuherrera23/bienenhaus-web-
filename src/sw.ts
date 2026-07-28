/// <reference types="@types/serviceworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// ===== PRECACHING =====
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ===== CONSTANTES =====
const MAINTENANCE_URL = '/maintenance.html';
const SUPABASE_URL = 'https://rnldqiwwzhjnurkguihu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubGRxaXd3emhqbnVya2d1aWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NDA4MzMsImV4cCI6MjEwMDUxNjgzM30.tzqe0Z1vS9R5GiCTxIe3m6uY4kkggF3kewPrRUY8BwE';

let maintenanceCache: { enabled: boolean; timestamp: number } | null = null;
const MAINTENANCE_CACHE_TTL = 30000;

// ===== CHECK MAINTENANCE =====
async function checkMaintenance(): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.timestamp < MAINTENANCE_CACHE_TTL) {
    return maintenanceCache.enabled;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/contenido_sitio?clave=eq.maintenance_mode&select=valor`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }, signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const data = await resp.json();
    const enabled = data?.[0]?.valor?.enabled === true;
    maintenanceCache = { enabled, timestamp: now };
    return enabled;
  } catch {
    return false;
  }
}

// ===== MAINTENANCE ROUTE =====
const maintenanceRoute = new NavigationRoute(async ({ event }) => {
  const url = event.request.url;
  if (url.includes('/admin') || url.includes('/maintenance.html')) return fetch(event.request);
  if (await checkMaintenance()) {
    const cache = await caches.open('maintenance-cache');
    let resp = await cache.match(MAINTENANCE_URL);
    if (!resp) {
      resp = await fetch(MAINTENANCE_URL);
      if (resp.ok) await cache.put(MAINTENANCE_URL, resp.clone());
    }
    return new Response(resp?.body, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '30', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'X-Maintenance-Mode': 'true' }
    });
  }
  return fetch(event.request);
});
registerRoute(maintenanceRoute);

// ===== RUNTIME CACHING =====
// 1. Supabase API
registerRoute(
  ({ url }) => url.origin === SUPABASE_URL,
  new NetworkFirst({ cacheName: 'supabase-api', plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 })], networkTimeoutSeconds: 10 })
);
// 2. Cloudinary Images
registerRoute(
  ({ url }) => url.origin.includes('cloudinary.com'),
  new CacheFirst({ cacheName: 'cloudinary-images', plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 2592000 })] })
);
// 3. Google Fonts CSS
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-styles' })
);
// 4. Google Fonts Webfonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({ cacheName: 'google-fonts-webfonts', plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 31536000 }), new CacheableResponsePlugin({ statuses: [0, 200] })] })
);
// 5. Leaflet
registerRoute(
  ({ url }) => url.origin === 'https://unpkg.com' && url.pathname.includes('leaflet'),
  new CacheFirst({ cacheName: 'leaflet-assets', plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 2592000 })] })
);
// 6. Cloudinary API
registerRoute(
  ({ url }) => url.origin === 'https://api.cloudinary.com',
  new NetworkFirst({ cacheName: 'cloudinary-api', plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 })] })
);
// 7. Nominatim Geocoding
registerRoute(
  ({ url }) => url.origin === 'https://nominatim.openstreetmap.org',
  new NetworkFirst({ cacheName: 'geocoding-api', plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 604800 })], networkTimeoutSeconds: 10 })
);

// ===== MESSAGE HANDLER =====
self.addEventListener('message', (e) => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting(); });