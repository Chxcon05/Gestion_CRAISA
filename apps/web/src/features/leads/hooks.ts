import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BoardResponse, Catalogs, LeadDetail, LeadListItem, LeadListResponse } from '@craisa/shared'
import { api, toSearch } from '@/lib/api'

export function useCatalogs() {
  return useQuery({ queryKey: ['catalogs'], queryFn: () => api<Catalogs>('/catalogs'), staleTime: 5 * 60_000 })
}

export interface Filters {
  q: string
  status: string[]
  channel: string[]
  businessLineId: string[]
  assignedToId: string
  from: string
  to: string
  overdue: string
  due: string
  sort: string
  dir: 'asc' | 'desc'
  page: number
  pageSize: number
  /** Vista elegida en Leads; vacio es la tabla. No es un filtro: Limpiar la conserva. */
  view: LeadsView
  /** Mes del calendario (AAAA-MM); vacio es el mes en curso. */
  month: string
}

export type LeadsView = '' | 'board' | 'calendar'

const ARRAY_KEYS = ['status', 'channel', 'businessLineId'] as const

// Los filtros viven en la URL: se pueden compartir, sobreviven a recargas y el boton atras funciona.
export function useLeadFilters() {
  const [sp, setSp] = useSearchParams()
  const filters = useMemo<Filters>(() => {
    const arr = (k: string) => sp.get(k)?.split(',').filter(Boolean) ?? []
    return {
      q: sp.get('q') ?? '',
      status: arr('status'),
      channel: arr('channel'),
      businessLineId: arr('businessLineId'),
      assignedToId: sp.get('assignedToId') ?? '',
      from: sp.get('from') ?? '',
      to: sp.get('to') ?? '',
      overdue: sp.get('overdue') ?? '',
      due: sp.get('due') ?? '',
      sort: sp.get('sort') ?? 'entryDate',
      dir: sp.get('dir') === 'asc' ? 'asc' : 'desc',
      page: Number(sp.get('page') ?? 1) || 1,
      pageSize: Number(sp.get('pageSize') ?? 20) || 20,
      view: sp.get('view') === 'board' || sp.get('view') === 'calendar' ? (sp.get('view') as LeadsView) : '',
      month: /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.get('month') ?? '') ? sp.get('month')! : '',
    }
  }, [sp])

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch }
    // Cualquier cambio de filtro vuelve a la primera pagina.
    if (!('page' in patch)) next.page = 1
    const out = new URLSearchParams()
    for (const [k, v] of Object.entries(next)) {
      if (Array.isArray(v)) {
        if (v.length) out.set(k, v.join(','))
      } else if (v !== '' && v !== undefined) {
        const isDefault =
          (k === 'sort' && v === 'entryDate') || (k === 'dir' && v === 'desc') || (k === 'page' && v === 1) || (k === 'pageSize' && v === 20)
        if (!isDefault) out.set(k, String(v))
      }
    }
    setSp(out, { replace: true })
  }

  const clear = () => {
    const out = new URLSearchParams()
    if (filters.view) out.set('view', filters.view)
    if (filters.month) out.set('month', filters.month)
    setSp(out, { replace: true })
  }
  const activeCount =
    ARRAY_KEYS.reduce((n, k) => n + (filters[k].length ? 1 : 0), 0) +
    (filters.q ? 1 : 0) +
    (filters.assignedToId ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    (filters.overdue ? 1 : 0) +
    (filters.due ? 1 : 0)

  return { filters, update, clear, activeCount, search: sp.toString() }
}

export function filtersQuery(f: Filters) {
  return {
    q: f.q,
    status: f.status,
    channel: f.channel,
    businessLineId: f.businessLineId,
    assignedToId: f.assignedToId,
    from: f.from,
    to: f.to,
    overdue: f.overdue,
    due: f.due,
    sort: f.sort,
    dir: f.dir,
    page: f.page,
    pageSize: f.pageSize,
  }
}

export function useLeads(f: Filters) {
  return useQuery({
    queryKey: ['leads', filtersQuery(f)],
    queryFn: () => api<LeadListResponse>(`/leads${toSearch(filtersQuery(f))}`),
    placeholderData: keepPreviousData,
  })
}

// Mismos filtros que el listado, sin estado ni paginacion. La clave empieza con 'leads' para que
// las mutaciones y el boton Recargar tambien refresquen el tablero y el calendario.
const viewQuery = (f: Filters) => ({ ...filtersQuery(f), dir: undefined, page: undefined, pageSize: undefined, sort: undefined, status: undefined })

export function useCalendar(f: Filters, month: string) {
  const q = { ...viewQuery(f), month }
  return useQuery({
    queryKey: ['leads', 'calendar', q],
    queryFn: () => api<LeadListItem[]>(`/leads/calendar${toSearch(q)}`),
    placeholderData: keepPreviousData,
  })
}

export function useBoard(f: Filters) {
  const q = viewQuery(f)
  return useQuery({
    queryKey: ['leads', 'board', q],
    queryFn: () => api<BoardResponse>(`/leads/board${toSearch(q)}`),
    placeholderData: keepPreviousData,
  })
}

export function useLead(code: string) {
  return useQuery({ queryKey: ['lead', code], queryFn: () => api<LeadDetail>(`/leads/${code}`) })
}

/** Tras cualquier mutacion se refrescan el detalle, el listado y el tablero. */
export function useLeadMutation<V>(fn: (v: V) => Promise<LeadDetail | void>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      if (data) qc.setQueryData(['lead', data.code], data)
      void qc.invalidateQueries({ queryKey: ['leads'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
