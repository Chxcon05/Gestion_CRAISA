import path from 'node:path'
import { existsSync } from 'node:fs'
import express from 'express'
import { env } from './env.ts'
import { createApp } from './app.ts'
import { backfillScores } from './leads/insights.ts'
import { startEmailPolling } from './ingest/email.ts'

const app = createApp()

// En produccion el mismo proceso sirve la SPA compilada; en desarrollo lo hace Vite con proxy a /api.
const webDist = path.resolve(import.meta.dirname, '../../web/dist')
if (existsSync(webDist)) {
  app.use(express.static(webDist, { index: false, maxAge: '1h' }))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'))
  })
}

app.listen(env.PORT, () => {
  console.info(`API CRAISA en http://localhost:${env.PORT}`)
  backfillScores()
    .then((n) => n && console.info(`Prioridad calculada en ${n} leads`))
    .catch((e: unknown) => console.error('No se pudo calcular la prioridad de los leads', e))
  if (startEmailPolling()) console.info(`Correo: revisando ${env.MAIL_IMAP_USER} cada ${env.MAIL_POLL_SECONDS} s`)
})
