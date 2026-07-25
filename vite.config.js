import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@supabase/supabase-js', 'axios']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    // SPA fallback para desarrollo - sirve index.html en rutas no encontradas
    fs: { strict: false }
  },
  appType: 'spa'
});