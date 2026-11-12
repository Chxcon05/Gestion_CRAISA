const TZ = 'America/Costa_Rica'

// Las fechas sin hora (AAAA-MM-DD) se formatean en UTC para que no se corran un dia hacia atras.
export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return ''
  const dateOnly = iso.length === 10
  const d = new Date(dateOnly ? `${iso}T00:00:00Z` : iso)
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: dateOnly ? 'UTC' : TZ,
    ...opts,
  }).format(d)
}

export function formatDateTime(iso: string) {
  return formatDate(iso, { hour: '2-digit', minute: '2-digit' })
}

export function todayIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

export function shiftIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

export function relativeTime(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, s] of steps) {
    if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), unit)
  }
  return 'hace un momento'
}

export const formatNumber = (n: number) => new Intl.NumberFormat('es-CR').format(n)

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
