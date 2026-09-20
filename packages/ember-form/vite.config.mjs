import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { extensions, ember } from '@embroider/vite'
import { babel } from '@rollup/plugin-babel'

export default defineConfig({
  resolve: {
    alias: {
      '@tanstack/form-core/internals': fileURLToPath(
        new URL('../form-core/src/internals.ts', import.meta.url),
      ),
      '@tanstack/form-core': fileURLToPath(
        new URL('../form-core/src/index.ts', import.meta.url),
      ),
      '@tanstack/ember-form': fileURLToPath(
        new URL('./src/index.ts', import.meta.url),
      ),
    },
  },
  plugins: [
    ember(),
    babel({
      babelHelpers: 'inline',
      extensions,
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        tests: 'tests/index.html',
      },
    },
  },
})
