import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
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
        lines: 50,
        functions: 50,
        branches: 30,
        statements: 50
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@utils': resolve(__dirname, './src/utils'),
      '@hooks': resolve(__dirname, './src/hooks')
    }
  },
  define: {
    'import.meta.env.DEV': true,
    'import.meta.env.PROD': false,
    'import.meta.env.VITE_SUPABASE_URL': '"https://test.supabase.co"',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': '"test-key"'
  },
  assetsInclude: ['**/*.cjs']
});