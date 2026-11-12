import type { ApiErrorBody } from '@craisa/shared'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
  }
}

const SERVER_DOWN = 'No hay conexion con el servidor. Intente de nuevo en unos segundos o avise a soporte.'

type Query =Record<string, string | number | string[] | undefined | null>

export function toSearch(q: Query = {}) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(','))
    } else sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init
  const res = await fetch(`/api${path}`, {
    ...rest,
    credentials: 'same-origin',
    headers: { ...(json !== undefined && { 'Content-Type': 'application/json' }), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  }).catch(() => {
    throw new ApiError(0, 'OFFLINE', SERVER_DOWN)
  })
  if (res.status === 204) return undefined as T
  const body = (await res.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized()
    // El API siempre responde JSON; un 5xx sin cuerpo viene del proxy de Vite porque el API no esta corriendo.
    if (res.status >= 500 && !body) throw new ApiError(res.status, 'OFFLINE', SERVER_DOWN)
    const e = body?.error
    throw new ApiError(res.status, e?.code ?? 'HTTP', e?.message ?? 'No se pudo completar la solicitud', e?.fields)
  }
  return body as T
}
