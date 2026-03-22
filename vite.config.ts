import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
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
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,js}'],
      exclude: ['src/component/**', 'src/main.ts'],
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
  },
}));
