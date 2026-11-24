import { z } from 'zod'

// Falla al arrancar en lugar de firmar tokens con un secreto por defecto, que fue el error del prototipo anterior.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8081),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  // Direccion publica de la web, para el enlace al lead que va en el aviso por WhatsApp.
  APP_URL: z.string().url().default('http://localhost:3000'),
  // Evolution API (WhatsApp conectado por QR). Sin clave no se mandan avisos; sin secreto el webhook es 404.
  EVOLUTION_API_KEY: z.string().min(16, 'EVOLUTION_API_KEY debe tener al menos 16 caracteres').optional(),
  EVOLUTION_INSTANCE: z.string().trim().min(1).default('atencion_cliente'),
  EVOLUTION_URL: z.string().url().default('http://localhost:8080'),
  EVOLUTION_WEBHOOK_SECRET: z.string().min(32, 'EVOLUTION_WEBHOOK_SECRET debe tener al menos 32 caracteres').optional(),
  // Captura automatica: sin INGEST_WEB_SECRET la ruta del formulario web no existe (404).
  INGEST_BUSINESS_LINE: z.string().trim().min(2).default('Sin clasificar'),
  INGEST_WEB_SECRET: z.string().min(32, 'INGEST_WEB_SECRET debe tener al menos 32 caracteres').optional(),
  // Buzon que se revisa por IMAP (info@craisa.com). Sin usuario y clave no se revisa ningun correo.
  MAIL_IMAP_FOLDER: z.string().min(1).default('INBOX'),
  MAIL_IMAP_HOST: z.string().min(1).default('imap.gmail.com'),
  MAIL_IMAP_PASSWORD: z.string().min(8, 'MAIL_IMAP_PASSWORD debe tener al menos 8 caracteres').optional(),
  MAIL_IMAP_PORT: z.coerce.number().int().default(993),
  MAIL_IMAP_USER: z.string().trim().toLowerCase().email().optional(),
  MAIL_LOOKBACK_HOURS: z.coerce.number().int().min(1).max(720).default(48),
  MAIL_POLL_SECONDS: z.coerce.number().int().min(30).default(60),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('Variables de entorno invalidas:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}
if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET.length < 32) {
  console.error('En produccion JWT_SECRET debe tener al menos 32 caracteres')
  process.exit(1)
}

export const env = parsed.data
