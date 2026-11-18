import { z } from 'zod'

// Falla al arrancar en lugar de firmar tokens con un secreto por defecto, que fue el error del prototipo anterior.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8081),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  // Captura automatica: sin INGEST_WEB_SECRET la ruta del formulario web no existe (404).
  INGEST_ASSIGNEE_EMAIL: z.string().trim().toLowerCase().email().optional(),
  INGEST_BUSINESS_LINE: z.string().trim().min(2).default('Sin clasificar'),
  INGEST_WEB_SECRET: z.string().min(32, 'INGEST_WEB_SECRET debe tener al menos 32 caracteres').optional(),
  // WhatsApp Cloud API: el token se inventa y se pega en el panel de Meta; el secreto es el de la app de Meta.
  WHATSAPP_APP_SECRET: z.string().min(16, 'WHATSAPP_APP_SECRET debe tener al menos 16 caracteres').optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(16, 'WHATSAPP_VERIFY_TOKEN debe tener al menos 16 caracteres').optional(),
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
