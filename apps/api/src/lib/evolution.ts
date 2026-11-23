import { env } from '../env.ts'

const TIMEOUT_MS = 10_000

/**
 * Manda un texto desde el numero de la empresa vinculado en Evolution. Devuelve false si no se pudo:
 * un aviso perdido no debe tumbar la asignacion que lo provoco, asi que nunca lanza.
 */
export async function sendWhatsApp(number: string, text: string) {
  if (!env.EVOLUTION_API_KEY) return false
  const url = `${env.EVOLUTION_URL.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(env.EVOLUTION_INSTANCE)}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { apikey: env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) console.error(`Evolution respondio ${res.status} al enviar a ${number}`)
    return res.ok
  } catch (e) {
    console.error('No se pudo enviar el WhatsApp por Evolution:', e instanceof Error ? e.message : e)
    return false
  }
}
