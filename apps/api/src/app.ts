import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { auditRouter } from './audit/routes.ts'
import { authRouter } from './auth/routes.ts'
import { requireAuth, requireRole } from './auth/session.ts'
import { leadsRouter } from './leads/routes.ts'
import { dashboardRouter } from './dashboard/routes.ts'
import { catalogsRouter } from './catalogs/routes.ts'
import { usersRouter } from './users/routes.ts'
import { errorHandler } from './lib/http.ts'
import { env } from './env.ts'
import { ingestRouter } from './ingest/routes.ts'
import type { WithRawBody } from './ingest/meta.ts'
import { notificationsRouter } from './notifications/routes.ts'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // En el hosting hay un proxy delante: sin esto todas las peticiones traen su IP y el limite de
  // intentos del login bloquearia a todos los usuarios a la vez.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1)
  app.use(helmet())
  // Un evento de Evolution con media en base64 pasa de 100kb; con el limite general responderia 413.
  app.use('/api/ingest/whatsapp', express.json({ limit: '1mb' }))
  app.use(
    '/api/ingest/meta',
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        ;(req as WithRawBody).rawBody = buf
      },
    }),
  )
  // Una nota puede traer hasta cuatro capturas de 1.5 MB, que en base64 ocupan un tercio mas.
  app.use('/api/leads/:code/notes', express.json({ limit: '9mb' }))
  // Un Excel de hasta 5 MB en base64 pesa un tercio mas.
  app.use('/api/leads/import', express.json({ limit: '7mb' }))
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  const api = express.Router()
  api.get('/health', (_req, res) => {
    res.json({ ok: true })
  })
  api.use('/auth', authRouter)
  // Antes de requireAuth: los canales externos se autentican con su propia clave, no con sesion.
  api.use('/ingest', ingestRouter)
  api.use(requireAuth)
  api.use('/leads', leadsRouter)
  api.use('/dashboard', dashboardRouter)
  api.use('/catalogs', catalogsRouter)
  api.use('/audit', requireRole('ADMIN'), auditRouter)
  api.use('/notifications', notificationsRouter)
  api.use('/users', requireRole('ADMIN'), usersRouter)
  api.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } })
  })

  app.use('/api', api)
  app.use(errorHandler)
  return app
}
