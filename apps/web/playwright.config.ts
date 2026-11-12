import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Comparten la BD de prueba sembrada al arrancar; en serie el orden es predecible.
  workers: 1,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3101',
    trace: 'retain-on-failure',
    locale: 'es-CR',
    timezoneId: 'America/Costa_Rica',
  },
  // Usa el Chrome instalado en el equipo: evita descargar navegadores en la red de CRAISA.
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: [
    {
      command: 'npx tsx test/e2e-server.ts',
      cwd: '../api',
      url: 'http://localhost:8191/api/health',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'npx vite --port 3101 --strictPort',
      url: 'http://localhost:3101',
      env: { API_URL: 'http://localhost:8191' },
      reuseExistingServer: false,
    },
  ],
})
