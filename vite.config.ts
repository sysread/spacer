import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'www',

  server: {
    port: 5173,
    open: true,
  },

  test: {
    // Vitest inherits root from Vite, but tests live in the project root,
    // not in www/. Override so vitest can find test/*.mjs.
    root: resolve(__dirname, '.'),
  },
});
