import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/env.ts'],
    // Todas las pruebas comparten la misma BD de prueba; en paralelo se pisarian los datos.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
})
