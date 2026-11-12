// Las columnas @db.Date se guardan como medianoche UTC; trabajar en UTC evita correr el dia en Costa Rica (UTC-6).
export const toDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
export const toIsoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

export function todayIso(now = new Date()) {
  // Fecha local de Costa Rica, sin depender de la zona horaria del servidor.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(now)
}

export function addDays(iso: string, days: number) {
  const d = toDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toIsoDate(d)!
}
