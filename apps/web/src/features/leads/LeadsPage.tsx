import { useEffect, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import * as P from '@radix-ui/react-popover'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Plus,
  RefreshCw,
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
import { formatDate, formatNumber, relativeTime, shiftIso, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MultiSelect } from '@/components/multi-select'
import { PriorityBadge, STATUS_STYLES, StatusBadge } from '@/components/status'
import { ChannelLabel } from '@/components/channel'
import { Avatar, EmptyState, ErrorState, PageHeader } from '@/components/states'
import { filtersQuery, useCatalogs, useLeadFilters, useLeads, type Filters } from './hooks'

type Update = (p: Partial<Filters>) => void

const isOverdue = (l: LeadListItem) =>
  Boolean(l.nextActionAt) && (l.nextActionAt ?? '') < todayIso() && !CLOSED_STATUSES.includes(l.status)

const shortDate = (iso: string) => formatDate(iso, { year: undefined })

// Fila de desplazamiento lateral en movil: los filtros quedan en una linea en vez de ocupar media pantalla.
const SCROLL_ROW =
  '-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden'


// Reparto del resultado actual por estado: deja ver de un vistazo donde se acumula el embudo.
function PipelineBar({ counts }: { counts?: Record<LeadStatus, number> }) {
  const total = counts ? Object.values(counts).reduce((a, n) => a + n, 0) : 0
  return (
    <div className="flex h-1 w-full bg-stone-100" aria-hidden>
      {counts &&
        total > 0 &&
        LEAD_STATUSES.filter((s) => counts[s] > 0).map((s) => (
          <span
            key={s}
            title={`${STATUS_LABELS[s]}: ${counts[s]}`}
            className={cn('h-full transition-[width] duration-300', STATUS_STYLES[s].dot)}
            style={{ width: `${(counts[s] / total) * 100}%` }}
          />
        ))}
    </div>
  )
}

function StatusTabs({ filters, update, counts }: { filters: Filters; update: Update; counts?: Record<LeadStatus, number> }) {
  const total = counts ? Object.values(counts).reduce((a, n) => a + n, 0) : undefined
  const single = filters.status.length === 1 ? filters.status[0] : undefined
  const tab = (key: string, label: string, count: number | undefined, active: boolean, onClick: () => void, dot?: string) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative inline-flex shrink-0 items-center gap-2 py-3.5 text-sm font-medium whitespace-nowrap transition-colors',
        active ? 'text-stone-900' : 'text-stone-500 hover:text-stone-800',
      )}
    >
      {dot && <span className={cn('size-2 rounded-full', dot)} aria-hidden />}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'min-w-6 rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums',
            active ? 'bg-brand-700 text-white' : 'bg-stone-100 text-stone-500',
          )}
        >
          {formatNumber(count)}
        </span>
      )}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-700" aria-hidden />}
    </button>
  )
  return (
    <div
      role="tablist"
      aria-label="Estado"
      className="flex gap-6 overflow-x-auto border-b border-stone-200 px-4 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
    >
      {tab('all', 'Todos', total, filters.status.length === 0, () => update({ status: [] }))}
      {LEAD_STATUSES.map((s) =>
        tab(s, STATUS_LABELS[s], counts?.[s], single === s, () => update({ status: [s] }), STATUS_STYLES[s].dot),
      )}
    </div>
  )
}


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
    <div className="relative w-full shrink-0 sm:w-72 lg:w-80">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
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

// Dos campos de fecha sueltos ocupaban casi una fila entera; en un desplegable caben con atajos.
function DateRangeFilter({ filters, update }: { filters: Filters; update: Update }) {
  const id = useId()
  const today = todayIso()
  const presets = [
    { label: 'Este año', from: `${today.slice(0, 4)}-01-01` },
    { label: 'Este mes', from: `${today.slice(0, 8)}01` },
    { label: 'Ultimos 30 dias', from: shiftIso(today, -29) },
  ]
  const active = Boolean(filters.from || filters.to)
  const label = active
    ? `${filters.from ? shortDate(filters.from) : 'Inicio'} - ${filters.to ? shortDate(filters.to) : 'hoy'}`
    : 'Fecha de ingreso'
  return (
    <P.Root>
      <P.Trigger
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm whitespace-nowrap shadow-xs transition-colors',
          active ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
        )}
      >
        <CalendarRange className="size-4 text-stone-400" />
        {label}
        <ChevronDown className="size-4 text-stone-400" />
      </P.Trigger>
      <P.Portal>
        <P.Content align="start" sideOffset={6} className="z-50 w-72 rounded-lg border border-stone-200 bg-white p-3 shadow-lg">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => {
              const on = filters.from === p.from && filters.to === today
              return (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update({ from: p.from, to: today })}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                    on ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-stone-200 text-stone-600 hover:bg-stone-50',
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`${id}-from`} className="text-xs font-medium text-stone-500">
                Desde
              </label>
              <Input
                id={`${id}-from`}
                type="date"
                aria-label="Ingreso desde"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => update({ from: e.target.value })}
                className="mt-1 px-2"
              />
            </div>
            <div>
              <label htmlFor={`${id}-to`} className="text-xs font-medium text-stone-500">
                Hasta
              </label>
              <Input
                id={`${id}-to`}
                type="date"
                aria-label="Ingreso hasta"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => update({ to: e.target.value })}
                className="mt-1 px-2"
              />
            </div>
          </div>
          {active && (
            <button
              type="button"
              onClick={() => update({ from: '', to: '' })}
              className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-[13px] text-stone-500 hover:bg-stone-100"
            >
              Quitar fechas
            </button>
          )}
        </P.Content>
      </P.Portal>
    </P.Root>
  )
}

const FOLLOW_UP = [
  { key: 'overdue', label: 'Vencidas', icon: AlertTriangle, active: 'bg-white text-red-700 shadow-sm ring-1 ring-red-200' },
  { key: 'today', label: 'Para hoy', icon: CalendarCheck, active: 'bg-white text-amber-800 shadow-sm ring-1 ring-amber-200' },
  { key: 'week', label: 'Esta semana', icon: CalendarDays, active: 'bg-white text-brand-800 shadow-sm ring-1 ring-brand-200' },
] as const

function FollowUpChips({ filters, update }: { filters: Filters; update: Update }) {
  const current = filters.overdue ? 'overdue' : filters.due
  const pick = (key: string) => {
    if (current === key) return update({ overdue: '', due: '' })
    if (key === 'overdue') return update({ overdue: '1', due: '', sort: 'nextActionAt', dir: 'asc' })
    return update({ overdue: '', due: key, sort: 'nextActionAt', dir: 'asc' })
  }
  return (
    <fieldset className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-stone-100 p-0.5">
      <legend className="sr-only">Seguimiento</legend>
      {FOLLOW_UP.map((c) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={current === c.key}
          onClick={() => pick(c.key)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
            current === c.key ? c.active : 'text-stone-600 hover:text-stone-900',
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
    <div className="space-y-3 border-b border-stone-200 px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchBox value={filters.q} onChange={(q) => update({ q })} />
        <div className={SCROLL_ROW}>
          <MultiSelect
            label="Canal"
            options={CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))}
            value={filters.channel}
            onChange={(channel) => update({ channel })}
          />
          {filters.status.length > 1 && (
            <MultiSelect
              label="Estados"
              options={LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              value={filters.status}
              onChange={(status) => update({ status })}
            />
          )}
          <DateRangeFilter filters={filters} update={update} />
          <MultiSelect
            label="Linea"
            options={(catalogs.data?.lines ?? []).map((l) => ({ value: l.id, label: l.name }))}
            value={filters.businessLineId}
            onChange={(businessLineId) => update({ businessLineId })}
          />
          {global && (
            <div className="shrink-0">
              <NativeSelect
                aria-label="Responsable"
                value={filters.assignedToId}
                onChange={(e) => update({ assignedToId: e.target.value })}
                className={cn('w-auto', filters.assignedToId && 'border-brand-200 bg-brand-50 text-brand-800')}
              >
                <option value="">Todos los responsables</option>
                <option value="none">Sin asignar</option>
                {catalogs.data?.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
        </div>
      </div>
      <div className={cn(SCROLL_ROW, 'justify-between')}>
        <FollowUpChips filters={filters} update={update} />
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} className="shrink-0">
            <X />
            Limpiar filtros ({activeCount})
          </Button>
        )}
      </div>
    </div>
  )
}


// Ancho fijo en las columnas cortas y el resto repartido: con table-fixed nada empuja la tabla fuera de la tarjeta.
const COLUMNS: { key: string; label: string; sort?: string; className?: string }[] = [
  { key: 'contact', label: 'Cliente', sort: 'contactName' },
  { key: 'status', label: 'Estado', sort: 'status', className: 'w-36' },
  { key: 'priority', label: 'Prioridad', sort: 'score', className: 'hidden w-24 md:table-cell' },
  { key: 'interest', label: 'Interes y canal', className: 'hidden w-[16%] xl:table-cell' },
  { key: 'owner', label: 'Responsable', className: 'hidden w-44 lg:table-cell' },
  { key: 'next', label: 'Proxima accion', sort: 'nextActionAt', className: 'w-[19%]' },
  { key: 'updated', label: 'Actualizado', sort: 'updatedAt', className: 'hidden w-36 pr-6 text-right md:table-cell' },
]

function SortHeader({ col, filters, update }: { col: (typeof COLUMNS)[number]; filters: Filters; update: Update }) {
  if (!col.sort) return <>{col.label}</>
  const active = filters.sort === col.sort
  const Icon = !active ? ArrowUpDown : filters.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <button
      type="button"
      className={cn('inline-flex items-center gap-1 uppercase hover:text-stone-900', active && 'text-stone-900')}
      onClick={() => update({ sort: col.sort, dir: active && filters.dir === 'desc' ? 'asc' : 'desc' })}
    >
      {col.label}
      <Icon className={cn('size-3.5', active ? 'opacity-100' : 'opacity-40')} />
    </button>
  )
}

function DueDate({ lead }: { lead: LeadListItem }) {
  if (!lead.nextActionAt) return null
  const overdue = isOverdue(lead)
  const today = lead.nextActionAt === todayIso()
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-xs whitespace-nowrap',
        overdue ? 'font-medium text-red-600' : today ? 'font-medium text-amber-700' : 'text-stone-500',
      )}
    >
      {overdue ? <AlertTriangle className="size-3" /> : <Clock className="size-3" />}
      {today ? 'Hoy' : shortDate(lead.nextActionAt)}
      {overdue && ' (vencida)'}
    </span>
  )
}

function NextAction({ lead }: { lead: LeadListItem }) {
  if (!lead.nextAction) return <span className="text-sm text-stone-400">Sin definir</span>
  return (
    <div className="min-w-0">
      <p className="truncate text-sm text-stone-800" title={lead.nextAction}>
        {lead.nextAction}
      </p>
      <DueDate lead={lead} />
    </div>
  )
}

// Marca lateral roja en lo vencido: se distingue al recorrer la lista sin leer la fecha.
function OverdueMark({ lead }: { lead: LeadListItem }) {
  if (!isOverdue(lead)) return null
  return <span className="absolute inset-y-0 left-0 w-[3px] bg-red-500" aria-hidden />
}

function LeadRow({ lead }: { lead: LeadListItem }) {
  const navigate = useNavigate()
  const href = `/leads/${lead.code}`
  const interest = lead.product?.name ?? lead.businessLine.name
  return (
    <tr
      className="group cursor-pointer border-b border-stone-100 last:border-0 hover:bg-brand-50/40"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('a')) navigate(href)
      }}
    >
      <td className="relative py-3.5 pr-4 pl-4 align-top sm:pl-6">
        <OverdueMark lead={lead} />
        <Link to={href} className="block truncate font-medium text-stone-900 group-hover:text-brand-700">
          {lead.contactName}
        </Link>
        <p className="mt-0.5 truncate text-xs text-stone-500">
          <span className="font-mono text-[11px]">{lead.code}</span>
          {lead.company && <span> · {lead.company}</span>}
        </p>
      </td>
      <td className="px-4 py-3.5 align-top">
        <StatusBadge status={lead.status} />
      </td>
      <td className="hidden px-4 py-3.5 align-top md:table-cell">
        <PriorityBadge priority={lead.priority} />
      </td>
      <td className="hidden px-4 py-3.5 align-top xl:table-cell">
        <p className="truncate text-sm text-stone-800" title={lead.product ? `${lead.businessLine.name} / ${interest}` : interest}>
          {interest}
        </p>
        <ChannelLabel auto={lead.autoCaptured} channel={lead.channel} className="mt-0.5 max-w-full text-xs text-stone-500" />
      </td>
      <td className="hidden px-4 py-3.5 align-top text-sm lg:table-cell">
        <div className="flex min-w-0 items-center">
          {lead.assignedTo ? (
            <span className="flex min-w-0 items-center gap-2" title={lead.assignedTo.name}>
              <Avatar name={lead.assignedTo.name} className="size-6 text-[10px]" />
              <span className="truncate text-stone-700">{lead.assignedTo.name}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-stone-400">
              <span className="size-6 rounded-full border border-dashed border-stone-300" aria-hidden />
              Sin asignar
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5 align-top">
        <NextAction lead={lead} />
      </td>
      <td className="hidden py-3.5 pr-6 pl-4 text-right align-top text-xs whitespace-nowrap text-stone-500 md:table-cell" title={lead.updatedAt}>
        {relativeTime(lead.updatedAt)}
      </td>
    </tr>
  )
}

// En pantallas angostas una tabla obliga a desplazarse de lado; se muestra una tarjeta por lead.
function LeadCard({ lead }: { lead: LeadListItem }) {
  return (
    <li>
      <Link to={`/leads/${lead.code}`} className="relative block px-4 py-4 active:bg-stone-50">
        <OverdueMark lead={lead} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-stone-900">{lead.contactName}</p>
            <p className="truncate text-xs text-stone-500">{lead.company ? `${lead.company} · ${lead.code}` : lead.code}</p>
          </div>
          <StatusBadge status={lead.status} className="shrink-0" />
        </div>
        {lead.nextAction && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2">
            <p className="min-w-0 truncate text-sm text-stone-800">{lead.nextAction}</p>
            <DueDate lead={lead} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-stone-500">
          <PriorityBadge priority={lead.priority} />
          <ChannelLabel auto={lead.autoCaptured} channel={lead.channel} />
          {lead.assignedTo ? (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={lead.assignedTo.name} className="size-5 text-[9px]" />
              {lead.assignedTo.name}
            </span>
          ) : (
            <span className="italic">Sin asignar</span>
          )}
        </div>
      </Link>
    </li>
  )
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-stone-100" aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="hidden h-4 w-40 md:block" />
        </div>
      ))}
    </div>
  )
}

function Pagination({ data, filters, update }: { data: { page: number; pageSize: number; total: number }; filters: Filters; update: Update }) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize))
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/60 px-4 py-3 text-sm text-stone-500 sm:flex-row sm:px-6">
      <p aria-live="polite">
        {formatNumber((data.page - 1) * data.pageSize + 1)}-{formatNumber(Math.min(data.page * data.pageSize, data.total))} de{' '}
        <span className="font-medium text-stone-900">{formatNumber(data.total)}</span> leads
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
        <span className="min-w-14 text-center tabular-nums">
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
  )
}

export function LeadsPage() {
  const state = useLeadFilters()
  const { filters, update, clear, activeCount } = state
  const leads = useLeads(filters)
  const data = leads.data
  const qc = useQueryClient()
  const [reloading, setReloading] = useState(false)

  // Un WhatsApp de un cliente con lead abierto no crea fila nueva, entra a su bitacora: por eso se recargan
  // tambien el detalle, la campana y el tablero, y se confirma con un aviso aunque la lista no cambie.
  async function reload() {
    setReloading(true)
    try {
      // 'leads' incluye la campana; throwOnError para que un fallo de red no se anuncie como exito.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['lead'] }),
        qc.refetchQueries({ queryKey: ['leads'], type: 'active' }, { throwOnError: true }),
      ])
      toast.success('Leads actualizados')
    } catch {
      toast.error('No se pudieron actualizar los leads')
    } finally {
      setReloading(false)
    }
  }
  const exportQuery = { ...filtersQuery(filters), page: undefined, pageSize: undefined }

  return (
    <>
      <PageHeader
        title="Leads"
        description="Todas las consultas comerciales y en que punto esta cada una."
        actions={
          <>
            <Button variant="secondary" asChild>
              <a href={`/api/leads/export.xlsx${toSearch(exportQuery)}`} download title="Descarga los leads con los filtros actuales">
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
            <Button variant="secondary" onClick={() => void reload()} disabled={reloading} title="Trae los leads y mensajes nuevos sin perder los filtros">
              <RefreshCw className={cn(reloading && 'animate-spin')} />
              Recargar
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden shadow-xs">
        <PipelineBar counts={data?.statusCounts} />
        <StatusTabs filters={filters} update={update} counts={data?.statusCounts} />
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
            <div className={cn('transition-opacity', leads.isPlaceholderData && 'opacity-60')}>
              <ul className="divide-y divide-stone-100 sm:hidden">
                {data.items.map((l) => (
                  <LeadCard key={l.id} lead={l} />
                ))}
              </ul>
              <table className="hidden w-full table-fixed sm:table">
                <thead className="bg-stone-50/60">
                  <tr className="border-b border-stone-200 text-left text-[11px] tracking-wide text-stone-500 uppercase">
                    {COLUMNS.map((c, i) => (
                      <th key={c.key} scope="col" className={cn('px-4 py-2.5 font-semibold', i === 0 && 'pl-4 sm:pl-6', c.className)}>
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
              <Pagination data={data} filters={filters} update={update} />
            </div>
          )
        )}
      </Card>
    </>
  )
}
