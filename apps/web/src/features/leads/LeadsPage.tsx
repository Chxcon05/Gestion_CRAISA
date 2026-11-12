import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  X,
} from 'lucide-react'
import {
  CHANNELS,
  CHANNEL_LABELS,
  CLOSED_STATUSES,
  LEAD_STATUSES,
  ROLES_WITH_GLOBAL_SCOPE,
  STATUS_LABELS,
  type LeadListItem,
  type LeadStatus,
} from '@craisa/shared'
import { useUser } from '@/app/auth'
import { toSearch } from '@/lib/api'
import { formatDate, formatNumber, relativeTime, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MultiSelect } from '@/components/multi-select'
import { STATUS_STYLES, StatusBadge } from '@/components/status'
import { ChannelLabel } from '@/components/channel'
import { EmptyState, ErrorState, PageHeader, PersonChip } from '@/components/states'
import { filtersQuery, useCatalogs, useLeadFilters, useLeads, type Filters } from './hooks'

const isOverdue = (l: LeadListItem) =>
  Boolean(l.nextActionAt) && (l.nextActionAt ?? '') < todayIso() && !CLOSED_STATUSES.includes(l.status)

/* ---------- Pestanas de estado ---------- */

function StatusTabs({
  filters,
  update,
  counts,
}: {
  filters: Filters
  update: (p: Partial<Filters>) => void
  counts?: Record<LeadStatus, number>
}) {
  const total = counts ? Object.values(counts).reduce((a, n) => a + n, 0) : undefined
  const single = filters.status.length === 1 ? filters.status[0] : undefined
  const allActive = filters.status.length === 0
  const tab = (key: string, label: string, count: number | undefined, active: boolean, onClick: () => void, dot?: string) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative inline-flex shrink-0 items-center gap-2 px-1 pt-1 pb-3 text-sm font-medium whitespace-nowrap transition-colors',
        active ? 'text-brand-800' : 'text-slate-500 hover:text-slate-800',
      )}
    >
      {dot && <span className={cn('size-2 rounded-full', dot)} aria-hidden />}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
            active ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-500',
          )}
        >
          {formatNumber(count)}
        </span>
      )}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-700" aria-hidden />}
    </button>
  )
  return (
    <div role="tablist" aria-label="Estado" className="-mb-px flex gap-5 overflow-x-auto border-b border-slate-200 px-4 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
      {tab('all', 'Todos', total, allActive, () => update({ status: [] }))}
      {LEAD_STATUSES.map((s) =>
        tab(s, STATUS_LABELS[s], counts?.[s], single === s, () => update({ status: [s] }), STATUS_STYLES[s].dot),
      )}
    </div>
  )
}

/* ---------- Filtros ---------- */

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  const [synced, setSynced] = useState(value)
  // Si el filtro cambia desde fuera (Limpiar, atras, buscador global), se refleja aqui sin un efecto extra.
  if (value !== synced) {
    setSynced(value)
    setText(value)
  }
  // Espera a que se deje de escribir para no lanzar una consulta por tecla.
  useEffect(() => {
    if (text === value) return
    const t = setTimeout(() => onChange(text), 300)
    return () => clearTimeout(t)
  }, [text, value, onChange])
  return (
    <div className="relative min-w-0 flex-1 basis-full sm:max-w-xs sm:basis-auto">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Buscar nombre, empresa, codigo..."
        aria-label="Buscar leads"
        className="pl-9"
      />
    </div>
  )
}

const FOLLOW_UP = [
  { key: 'overdue', label: 'Vencidas', icon: AlertTriangle, active: 'border-red-200 bg-red-50 text-red-700' },
  { key: 'today', label: 'Para hoy', icon: CalendarCheck, active: 'border-amber-200 bg-amber-50 text-amber-800' },
  { key: 'week', label: 'Esta semana', icon: CalendarDays, active: 'border-brand-200 bg-brand-50 text-brand-800' },
] as const

function FollowUpChips({ filters, update }: { filters: Filters; update: (p: Partial<Filters>) => void }) {
  const current = filters.overdue ? 'overdue' : filters.due
  const pick = (key: string) => {
    if (current === key) return update({ overdue: '', due: '' })
    if (key === 'overdue') return update({ overdue: '1', due: '', sort: 'nextActionAt', dir: 'asc' })
    return update({ overdue: '', due: key, sort: 'nextActionAt', dir: 'asc' })
  }
  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">Seguimiento</legend>
      {FOLLOW_UP.map((c) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={current === c.key}
          onClick={() => pick(c.key)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
            current === c.key ? c.active : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          <c.icon className="size-3.5" />
          {c.label}
        </button>
      ))}
    </fieldset>
  )
}

function FilterBar({ filters, update, clear, activeCount }: ReturnType<typeof useLeadFilters>) {
  const user = useUser()
  const catalogs = useCatalogs()
  const global = ROLES_WITH_GLOBAL_SCOPE.includes(user.role)
  return (
    <div className="flex flex-col gap-3 p-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={filters.q} onChange={(q) => update({ q })} />
        <MultiSelect
          label="Canal"
          options={CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))}
          value={filters.channel}
          onChange={(channel) => update({ channel })}
        />
        <MultiSelect
          label="Linea"
          options={(catalogs.data?.lines ?? []).map((l) => ({ value: l.id, label: l.name }))}
          value={filters.businessLineId}
          onChange={(businessLineId) => update({ businessLineId })}
        />
        {filters.status.length > 1 && (
          <MultiSelect
            label="Estados"
            options={LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            value={filters.status}
            onChange={(status) => update({ status })}
          />
        )}
        {global && (
          <NativeSelect
            aria-label="Responsable"
            value={filters.assignedToId}
            onChange={(e) => update({ assignedToId: e.target.value })}
            className={cn('w-auto min-w-44', filters.assignedToId && 'border-brand-200 bg-brand-50 text-brand-800')}
          >
            <option value="">Todos los responsables</option>
            <option value="none">Sin asignar</option>
            {catalogs.data?.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="Ingreso desde"
            title="Ingreso desde"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => update({ from: e.target.value })}
            className="w-[9.5rem]"
          />
          <span className="text-slate-400" aria-hidden>
            a
          </span>
          <Input
            type="date"
            aria-label="Ingreso hasta"
            title="Ingreso hasta"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => update({ to: e.target.value })}
            className="w-[9.5rem]"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FollowUpChips filters={filters} update={update} />
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X />
            Limpiar filtros ({activeCount})
          </Button>
        )}
      </div>
    </div>
  )
}

/* ---------- Tabla y tarjetas ---------- */

const COLUMNS: { key: string; label: string; sort?: string; className?: string }[] = [
  { key: 'contact', label: 'Cliente', sort: 'contactName' },
  { key: 'status', label: 'Estado', sort: 'status' },
  { key: 'origin', label: 'Origen e interes', className: 'hidden xl:table-cell' },
  { key: 'owner', label: 'Responsable', className: 'hidden lg:table-cell' },
  { key: 'next', label: 'Proxima accion', sort: 'nextActionAt' },
  { key: 'updated', label: 'Actualizado', sort: 'updatedAt', className: 'hidden md:table-cell' },
]

function SortHeader({ col, filters, update }: { col: (typeof COLUMNS)[number]; filters: Filters; update: (p: Partial<Filters>) => void }) {
  if (!col.sort) return <>{col.label}</>
  const active = filters.sort === col.sort
  const Icon = !active ? ArrowUpDown : filters.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <button
      type="button"
      className={cn('inline-flex items-center gap-1 hover:text-slate-900', active && 'text-slate-900')}
      onClick={() => update({ sort: col.sort, dir: active && filters.dir === 'desc' ? 'asc' : 'desc' })}
    >
      {col.label}
      <Icon className={cn('size-3.5', active ? 'opacity-100' : 'opacity-40')} />
    </button>
  )
}

function NextAction({ lead }: { lead: LeadListItem }) {
  if (!lead.nextAction) return <span className="text-sm text-slate-400">Sin definir</span>
  const overdue = isOverdue(lead)
  const today = lead.nextActionAt === todayIso()
  return (
    <div className="max-w-56">
      <p className="truncate text-sm text-slate-800">{lead.nextAction}</p>
      {lead.nextActionAt && (
        <p
          className={cn(
            'mt-0.5 inline-flex items-center gap-1 text-xs',
            overdue ? 'font-medium text-red-600' : today ? 'font-medium text-amber-700' : 'text-slate-500',
          )}
        >
          {overdue && <AlertTriangle className="size-3" />}
          {today ? 'Hoy' : formatDate(lead.nextActionAt, { year: undefined })}
          {overdue && ' (vencida)'}
        </p>
      )}
    </div>
  )
}

function LeadRow({ lead }: { lead: LeadListItem }) {
  const navigate = useNavigate()
  const href = `/leads/${lead.code}`
  return (
    <tr
      className="group cursor-pointer border-b border-slate-100 last:border-0 hover:bg-brand-50/40"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('a')) navigate(href)
      }}
    >
      <td className="max-w-72 min-w-56 py-3.5 pr-4 pl-4 align-top sm:pl-6">
        <Link to={href} className="block truncate font-medium text-slate-900 group-hover:text-brand-700">
          {lead.contactName}
        </Link>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          <span className="font-mono">{lead.code}</span>
          {lead.company && <span> / {lead.company}</span>}
        </p>
      </td>
      <td className="px-4 py-3.5 align-top">
        <StatusBadge status={lead.status} />
      </td>
      <td className="hidden px-4 py-3.5 align-top xl:table-cell">
        <ChannelLabel auto={lead.autoCaptured} channel={lead.channel} className="text-sm text-slate-700" />
        <p className="mt-0.5 text-xs text-slate-500">
          {lead.businessLine.name}
          {lead.product && ` / ${lead.product.name}`}
        </p>
      </td>
      <td className="hidden px-4 py-3.5 align-top text-sm lg:table-cell">
        {lead.assignedTo ? <PersonChip name={lead.assignedTo.name} /> : <span className="text-slate-400 italic">Sin asignar</span>}
      </td>
      <td className="px-4 py-3.5 align-top">
        <NextAction lead={lead} />
      </td>
      <td className="hidden py-3.5 pr-6 pl-4 align-top text-xs whitespace-nowrap text-slate-500 md:table-cell" title={lead.updatedAt}>
        {relativeTime(lead.updatedAt)}
      </td>
    </tr>
  )
}

// En pantallas angostas una tabla obliga a desplazarse de lado; se muestra una tarjeta por lead.
function LeadCard({ lead }: { lead: LeadListItem }) {
  return (
    <li>
      <Link to={`/leads/${lead.code}`} className="block px-4 py-3.5 active:bg-slate-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{lead.contactName}</p>
            <p className="truncate text-xs text-slate-500">{lead.company ?? lead.code}</p>
          </div>
          <StatusBadge status={lead.status} />
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <NextAction lead={lead} />
          <ChannelLabel auto={lead.autoCaptured} channel={lead.channel} className="shrink-0 text-xs text-slate-500" />
        </div>
      </Link>
    </li>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4 sm:px-6" aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function LeadsPage() {
  const state = useLeadFilters()
  const { filters, update, clear, activeCount } = state
  const leads = useLeads(filters)
  const data = leads.data
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const exportQuery = { ...filtersQuery(filters), page: undefined, pageSize: undefined }

  return (
    <>
      <PageHeader
        title="Leads"
        description="Todas las consultas comerciales y en que punto esta cada una."
        actions={
          <>
            <Button variant="secondary" asChild>
              <a href={`/api/leads/export.csv${toSearch(exportQuery)}`} download title="Descarga los leads con los filtros actuales">
                <Download />
                Exportar a Excel
              </a>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/leads/nuevo">
                <Plus />
                Nuevo lead
              </Link>
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="pt-2">
          <StatusTabs filters={filters} update={update} counts={data?.statusCounts} />
        </div>
        <FilterBar {...state} />

        {leads.isPending ? (
          <TableSkeleton />
        ) : leads.isError ? (
          <ErrorState message={leads.error.message} onRetry={() => leads.refetch()} />
        ) : data && data.items.length === 0 ? (
          activeCount ? (
            <EmptyState
              title="Ningun lead coincide con estos filtros"
              description="Pruebe con otros criterios o limpie los filtros para ver todos los leads."
              action={
                <Button variant="secondary" onClick={clear}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Aun no hay leads"
              description="Registre la primera consulta comercial para empezar a darle seguimiento."
              action={
                <Button asChild>
                  <Link to="/leads/nuevo">
                    <Plus />
                    Registrar lead
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          data && (
            <div className={cn('border-t border-slate-100 transition-opacity', leads.isPlaceholderData && 'opacity-60')}>
              <ul className="divide-y divide-slate-100 sm:hidden">
                {data.items.map((l) => (
                  <LeadCard key={l.id} lead={l} />
                ))}
              </ul>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-medium text-slate-500">
                      {COLUMNS.map((c, i) => (
                        <th
                          key={c.key}
                          scope="col"
                          className={cn('px-4 py-2.5 font-medium', i === 0 && 'pl-4 sm:pl-6', c.className)}
                        >
                          <SortHeader col={c} filters={filters} update={update} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((l) => (
                      <LeadRow key={l.id} lead={l} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:px-6">
                <p aria-live="polite">
                  {formatNumber((data.page - 1) * data.pageSize + 1)}-
                  {formatNumber(Math.min(data.page * data.pageSize, data.total))} de{' '}
                  <span className="font-medium text-slate-900">{formatNumber(data.total)}</span> leads
                </p>
                <div className="flex items-center gap-2">
                  <NativeSelect
                    aria-label="Filas por pagina"
                    value={filters.pageSize}
                    onChange={(e) => update({ pageSize: Number(e.target.value) })}
                    className="h-8 w-auto"
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n} por pagina
                      </option>
                    ))}
                  </NativeSelect>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-8"
                    disabled={filters.page <= 1}
                    onClick={() => update({ page: filters.page - 1 })}
                    aria-label="Pagina anterior"
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="min-w-16 text-center tabular-nums">
                    {filters.page} / {pages}
                  </span>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-8"
                    disabled={filters.page >= pages}
                    onClick={() => update({ page: filters.page + 1 })}
                    aria-label="Pagina siguiente"
                  >
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
