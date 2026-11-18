import { Router } from 'express'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { rateLimit } from 'express-rate-limit'
import { webIngestSchema } from '@craisa/shared'
import { env } from '../env.ts'
import { HttpError, parse } from '../lib/http.ts'
import { ingestLead } from './service.ts'
import { parseWhatsAppWebhook } from './whatsapp.ts'

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

// Meta valida la URL una sola vez: manda el token que se escribio en su panel y espera el challenge de vuelta.
ingestRouter.get('/whatsapp', (req, res) => {
  const token = env.WHATSAPP_VERIFY_TOKEN
  if (!token) throw new HttpError(404, 'NOT_FOUND', 'Ruta no encontrada')
  const q = req.query
  if (q['hub.mode'] !== 'subscribe' || typeof q['hub.challenge'] !== 'string' || !validKey(String(q['hub.verify_token'] ?? ''), token)) {
    throw new HttpError(403, 'FORBIDDEN', 'Token de verificacion no valido')
  }
  res.type('text/plain').send(q['hub.challenge'])
})

// La firma es un HMAC del cuerpo exacto con el secreto de la app; por eso app.ts entrega aqui el Buffer crudo.
function validSignature(raw: Buffer, header: string | undefined, secret: string) {
  const expected = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`
  return validKey(header, expected)
}

ingestRouter.post('/whatsapp', async (req, res) => {
  const secret = env.WHATSAPP_APP_SECRET
  if (!secret) throw new HttpError(404, 'NOT_FOUND', 'Ruta no encontrada')
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
  if (!validSignature(raw, req.get('x-hub-signature-256'), secret)) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Firma no valida')
  }
  let body: unknown
  try {
    body = JSON.parse(raw.toString('utf8'))
  } catch {
    throw new HttpError(400, 'BAD_JSON', 'Cuerpo no valido')
  }
  // En serie para que los codigos LEAD-AAAA-#### sigan el orden de llegada de los mensajes.
  const codes: string[] = []
  for (const lead of parseWhatsAppWebhook(body)) codes.push(await ingestLead(lead))
  // Siempre 200 si la firma es buena: cualquier otro codigo hace que Meta reintente durante horas.
  res.json({ received: codes.length })
})
