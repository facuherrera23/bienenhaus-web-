import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    preact()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@utils': resolve(__dirname, './src/utils'),
      '@hooks': resolve(__dirname, './src/hooks'),
      // Preact compat aliases: lets any React-style code (including CSS modules
      // emitting `className` props via preact/compat) work without aliases breaking.
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    }
  },
  css: {
    treeshake: false
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three';
          }
          if (id.includes('node_modules/preact') || id.includes('node_modules/preact-compat')) {
            return 'vendor';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor';
          }
          if (id.includes('cropperjs')) {
            return 'admin-vendor';
          }
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.cjs'],
    include: ['test/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'dist/',
        '*.config.*',
        '*.d.ts',
        '*.config.ts',
        '*.config.js',
        'src/main.ts',
        'src/router.ts',
        'src/sw.ts'
      ],
      thresholds: {
        lines: 58,
        functions: 60,
        branches: 50,
        statements: 58
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  assetsInclude: ['**/*.cjs']
});
