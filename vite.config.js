import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // Para que los assets funcionen bien en subdirectorios si es necesario
  build: {
    // three.js lives in its own lazy chunk (src/world/), loaded after first paint
    chunkSizeWarningLimit: 650,
  },
})
