import { NOTE_IMAGE_MAX_BYTES } from '@craisa/shared'

const MAX_SIDE = 2000

// Una captura de celular sale de 2 a 5 MB en PNG; reescalada y en WebP queda en unos cientos de KB y el
// texto del chat se sigue leyendo. Safari sin WebP devuelve PNG y por eso se cae a JPEG.
export async function toNoteImage(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  for (const quality of [0.85, 0.7, 0.5]) {
    let url = canvas.toDataURL('image/webp', quality)
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality)
    if (base64Bytes(url) <= NOTE_IMAGE_MAX_BYTES) return url
  }
  throw new Error('La imagen pesa demasiado')
}

function base64Bytes(dataUrl: string) {
  return Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4)
}

export const stripDataUrl = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1)
