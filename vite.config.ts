import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true }
    },
    rollupOptions: {
      input: { main: './index.html', admin: './admin.html' },
      output: {
        manualChunks: (id) => {
          if (id.includes('@supabase/supabase-js') || id.includes('axios')) return 'vendor';
          if (id.includes('cropperjs') || id.includes('xlsx')) return 'admin-vendor';
          if (id.includes('/admin/features/properties/') || id.includes('/admin/shared/utils.ts')) return 'admin-properties';
          if (id.includes('/admin/features/agents/')) return 'admin-agents';
          if (id.includes('/admin/features/content/')) return 'admin-content';
          if (id.includes('/admin/features/settings/')) return 'admin-settings';
          if (id.includes('/admin/features/mercadoLibre/')) return 'admin-mercadoLibre';
        }
      }
    }
  },
  server: { port: 3000, open: true, fs: { strict: false } },
  appType: 'spa',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'og-image.svg'],
      manifest: {
        name: 'Bienenhaus Propiedades',
        short_name: 'Bienenhaus',
        description: 'Agencia inmobiliaria en Córdoba, Argentina. Encuentra tu próximo hogar.',
        theme_color: '#0b2b4a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
        shortcuts: [
          { name: 'Propiedades', short_name: 'Propiedades', description: 'Ver propiedades disponibles', url: '/#catalogo', icons: [{ src: '/favicon.svg', sizes: '96x96' }] },
          { name: 'Contacto', short_name: 'Contacto', description: 'Contactar con Bienenhaus', url: '/#contacto', icons: [{ src: '/favicon.svg', sizes: '96x96' }] }
        ],
        screenshots: [{ src: '/og-image.svg', sizes: '1280x720', type: 'image/svg+xml', form_factor: 'wide', label: 'Bienenhaus Propiedades - Catálogo' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          { urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i, handler: 'NetworkFirst', options: { cacheName: 'supabase-api', expiration: { maxEntries: 100, maxAgeSeconds: 86400 }, networkTimeoutSeconds: 10 } },
          { urlPattern: /^https:\/\/.*\.cloudinary\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'cloudinary-images', expiration: { maxEntries: 200, maxAgeSeconds: 2592000 } } },
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts-styles' } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'google-fonts-webfonts', expiration: { maxEntries: 30, maxAgeSeconds: 31536000 } } },
          { urlPattern: /^https:\/\/unpkg\.com\/leaflet@.*/i, handler: 'CacheFirst', options: { cacheName: 'leaflet-assets', expiration: { maxEntries: 50, maxAgeSeconds: 2592000 } } },
          { urlPattern: /^https:\/\/api\.cloudinary\.com\/.*/i, handler: 'NetworkFirst', options: { cacheName: 'cloudinary-api', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } } },
          { urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i, handler: 'NetworkFirst', options: { cacheName: 'geocoding-api', expiration: { maxEntries: 200, maxAgeSeconds: 604800 }, networkTimeoutSeconds: 10 } }
        ]
      }
    })
  ]
});