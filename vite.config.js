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
      input: {
        main: './index.html',
        admin: './admin.html'
      },
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
    fs: { strict: false }
  },
  appType: 'spa'
});