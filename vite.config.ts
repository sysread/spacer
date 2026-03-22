import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'www',
  base: '/spacer/',

  // Static files in www/ (images, sw.js, css/index.css, fonts) are copied
  // to dist/ as-is. Vite skips files it processes (index.html, imported JS/CSS).
  publicDir: '.',

  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    open: true,
    fs: {
      // Allow Vite to follow imports above root (www/) into src/
      allow: ['..'],
    },
  },

  resolve: {
    alias: {
      // Vue 2 full build (includes template compiler, required for
      // string templates in Vue.component() calls)
      'vue': 'vue/dist/vue.esm.js',
    },
  },

  test: {
    // Vitest inherits root from Vite, but tests live in the project root,
    // not in www/. Override so vitest can find test/*.mjs.
    root: resolve(__dirname, '.'),
  },
});
