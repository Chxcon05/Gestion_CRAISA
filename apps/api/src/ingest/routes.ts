import { Router } from 'express'
import { timingSafeEqual } from 'node:crypto'
import { rateLimit } from 'express-rate-limit'
import { webIngestSchema } from '@craisa/shared'
import { env } from '../env.ts'
import { HttpError, parse } from '../lib/http.ts'
import { ingestLead } from './service.ts'
import { ingestMeta, validSignature, type WithRawBody } from './meta.ts'
import { parseEvolutionWebhook } from './whatsapp.ts'

export const ingestRouter = Router()

// Las peticiones llegan desde la funcion de Vercel, no del navegador: todas comparten IP y este limite es
// un freno global contra un bucle o un abuso. El filtro anti-spam por visitante vive en el sitio.
const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  skip: () => env.NODE_ENV !== 'production',
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes, intente de nuevo en un minuto' } },
})

// Comparacion en tiempo constante: un === permitiria adivinar la clave midiendo cuanto tarda en fallar.
function validKey(given: string | undefined, expected: string) {
  const a = Buffer.from(given ?? '')
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Meta llama esta ruta una vez, al guardar el webhook en la app, y espera de vuelta el challenge tal cual.
ingestRouter.get('/meta', (req, res) => {
  const token = env.META_VERIFY_TOKEN
  if (!token) throw new HttpError(404, 'NOT_FOUND', 'Ruta no encontrada')
  const { 'hub.challenge': challenge, 'hub.mode': mode, 'hub.verify_token': given } = req.query
  if (mode !== 'subscribe' || typeof challenge !== 'string' || typeof given !== 'string' || !validKey(given, token)) {
    throw new HttpError(403, 'FORBIDDEN', 'Token de verificacion no valido')
  }
  res.type('text/plain').send(challenge)
})

ingestRouter.post('/meta', async (req, res) => {
  const secret = env.META_APP_SECRET
  if (!secret) throw new HttpError(404, 'NOT_FOUND', 'Ruta no encontrada')
  if (!validSignature((req as WithRawBody).rawBody, req.get('x-hub-signature-256'), secret)) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Firma de Meta no valida')
  }
  const codes = await ingestMeta(req.body)
  res.json({ received: codes.length })
})

ingestRouter.post('/web', ingestLimiter, async (req, res) => {
  const secret = env.INGEST_WEB_SECRET
  if (!secret) throw new HttpError(404, 'NOT_FOUND', 'Ruta no encontrada')
  if (!validKey(req.get('x-ingest-key'), secret)) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Clave de ingreso no valida')
  }
  const { businessLine, company, contactName, email, message, phone } = parse(webIngestSchema, req.body)
  const code = await ingestLead({ businessLine, channel: 'SITIO_WEB', company, contactName, email, message, phone })
  res.status(201).json({ code })
})

// Evolution no firma el webhook: se protege con una clave en el header, o en ?key= si la version no manda headers.
ingestRouter.post('/whatsapp', async (req, res) => {
  const secret = env.EVOLUTION_WEBHOOK_SECRET
  if (!secret) throw new HttpError(404, 'NOT_FOUND', 'Ruta no encontrada')
  const given = req.get('x-ingest-key') ?? (typeof req.query.key === 'string' ? req.query.key : undefined)
  if (!validKey(given, secret)) throw new HttpError(401, 'UNAUTHORIZED', 'Clave de ingreso no valida')
  // En serie para que los codigos LEAD-AAAA-#### sigan el orden de llegada de los mensajes.
  const codes: string[] = []
  for (const lead of parseEvolutionWebhook(req.body)) codes.push(await ingestLead(lead))
  // Siempre 200 si la clave es buena: otro codigo hace que Evolution reintente el mismo evento.
  res.json({ received: codes.length })
})
