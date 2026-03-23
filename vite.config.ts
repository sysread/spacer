import { defineConfig } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import VueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig(({ command }) => ({
  plugins: [vue(), VueDevTools()],

  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },

  root: 'www',

  // GitHub Pages serves from /spacer/. In dev mode, serve from /.
  base: command === 'build' ? '/spacer/' : '/',

  // Static assets (images, sw.js, css/index.css) live in www/public/ and are
  // copied to the build root as-is. Vite's default publicDir is 'public'
  // relative to root, which resolves to www/public/.

  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    open: false,
    fs: {
      // Allow Vite to follow imports above root (www/) into src/
      allow: ['..'],
    },
  },

  resolve: {
    alias: {},
  },

  test: {
    // Vitest inherits root from Vite, but tests live in the project root,
    // not in www/. Override so vitest can find test/*.mjs.
    root: resolve(__dirname, '.'),
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,js}'],
      exclude: ['src/component/**', 'src/main.ts'],
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
  },
}));
