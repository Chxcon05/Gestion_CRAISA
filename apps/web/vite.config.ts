import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 3000,
    // Mismo origen en desarrollo: la cookie de sesion viaja sin configurar CORS.
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:8081' },
  },
  build: {
    rollupOptions: {
      output: {
        // Por ruta y no por nombre: asi entran tambien subrutas como react-dom/client (Vite normaliza a '/').
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler|react-router)\//.test(id)) return 'react'
          if (/node_modules\/(zod|react-hook-form|@hookform)\//.test(id)) return 'forms'
        },
      },
    },
  },
})
