import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AUDIT_ACTIONS, AUDIT_ACTION_LABELS, type AuditAction, type AuditListResponse } from '@craisa/shared'
import { api, toSearch } from '@/lib/api'
import { formatDateTime, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState, PageHeader } from '@/components/states'
import { useCatalogs } from '@/features/leads/hooks'

// Las opciones van por su etiqueta visible, no por el codigo: asi las lee el admin.
const ACTION_OPTIONS = [...AUDIT_ACTIONS].sort((a, b) => AUDIT_ACTION_LABELS[a].localeCompare(AUDIT_ACTION_LABELS[b], 'es'))

const actionLabel = (a: string) => AUDIT_ACTION_LABELS[a as AuditAction] ?? a

interface Query {
  action: string
  from: string
  page: number
  to: string
  userId: string
}

const EMPTY: Query = { action: '', from: '', page: 1, to: '', userId: '' }

export function AuditPage() {
  const [q, setQ] = useState<Query>(EMPTY)
  const catalogs = useCatalogs()
  const audit = useQuery({
    queryKey: ['audit', q],
    queryFn: () => api<AuditListResponse>(`/audit${toSearch({ ...q })}`),
    placeholderData: keepPreviousData,
  })
  const set = (patch: Partial<Query>) => setQ((prev) => ({ ...prev, page: 1, ...patch }))
  const data = audit.data
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const filtered = q.action || q.userId || q.from || q.to

  return (
    <>
      <PageHeader title="Auditoria" description="Ingresos, exportaciones, importaciones, borrados y cambios de usuarios." />
      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-stone-200/80 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto] lg:items-end">
          <Field label="Accion" htmlFor="audit-action">
            <NativeSelect id="audit-action" value={q.action} onChange={(e) => set({ action: e.target.value })}>
              <option value="">Todas</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {AUDIT_ACTION_LABELS[a]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Usuario" htmlFor="audit-user">
            <NativeSelect id="audit-user" value={q.userId} onChange={(e) => set({ userId: e.target.value })}>
              <option value="">Todos</option>
              {catalogs.data?.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Desde" htmlFor="audit-from">
            <Input id="audit-from" type="date" value={q.from} max={q.to || undefined} onChange={(e) => set({ from: e.target.value })} />
          </Field>
          <Field label="Hasta" htmlFor="audit-to">
            <Input id="audit-to" type="date" value={q.to} min={q.from || undefined} onChange={(e) => set({ to: e.target.value })} />
          </Field>
          <Button variant="secondary" onClick={() => setQ(EMPTY)} disabled={!filtered}>
            Limpiar
          </Button>
        </div>

        {audit.isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : audit.isError ? (
          <ErrorState message={audit.error.message} onRetry={() => audit.refetch()} />
        ) : data && data.items.length === 0 ? (
          <EmptyState title="Sin registros" description={filtered ? 'Ningun registro coincide con estos filtros.' : 'Aun no hay acciones registradas.'} />
        ) : (
          data && (
            <div className={cn('transition-opacity', audit.isPlaceholderData && 'opacity-60')}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200/80 text-left text-xs font-medium text-stone-500">
                      <th scope="col" className="px-4 py-2.5 font-medium whitespace-nowrap">
                        Fecha
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Usuario
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Accion
                      </th>
                      <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
                        Detalle
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {data.items.map((e) => (
                      <tr key={e.id} className="align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-stone-600 tabular-nums">{formatDateTime(e.createdAt)}</td>
                        <td className="px-4 py-3">{e.user?.name ?? <span className="text-stone-500">Sistema</span>}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-stone-800">{actionLabel(e.action)}</span>
                          {e.detail && <p className="mt-0.5 break-words text-xs text-stone-500 md:hidden">{e.detail}</p>}
                        </td>
                        <td className="hidden max-w-md px-4 py-3 break-words text-stone-600 md:table-cell">{e.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-stone-200/80 px-4 py-3 text-sm text-stone-600">
                <span>
                  {formatNumber(data.total)} {data.total === 1 ? 'registro' : 'registros'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">
                    Pagina {data.page} de {pages}
                  </span>
                  <Button variant="secondary" size="icon" aria-label="Pagina anterior" disabled={data.page <= 1} onClick={() => setQ((p) => ({ ...p, page: p.page - 1 }))}>
                    <ChevronLeft />
                  </Button>
                  <Button variant="secondary" size="icon" aria-label="Pagina siguiente" disabled={data.page >= pages} onClick={() => setQ((p) => ({ ...p, page: p.page + 1 }))}>
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </div>
          )
        )}
      </Card>
    </>
  )
}
