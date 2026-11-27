import { useState, type DragEvent } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MoreHorizontal } from 'lucide-react'
import { CLOSED_STATUSES, LEAD_STATUSES, STATUS_LABELS, type BoardResponse, type LeadListItem, type LeadStatus } from '@craisa/shared'
import { api, toSearch } from '@/lib/api'
import { formatDate, formatNumber, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '@/components/ui/menu'
import { PriorityBadge, STATUS_STYLES } from '@/components/status'
import { ChannelLabel } from '@/components/channel'
import { ErrorState } from '@/components/states'
import { StatusDialog } from './StatusDialog'
import { filtersQuery, useBoard, type Filters } from './hooks'

type Move = (lead: LeadListItem, to: LeadStatus) => void

function BoardCard({ lead, onMove }: { lead: LeadListItem; onMove: Move }) {
  const open = !CLOSED_STATUSES.includes(lead.status)
  const overdue = open && Boolean(lead.nextActionAt) && lead.nextActionAt! < todayIso()
  return (
    <article className="rounded-lg border border-stone-200 bg-white shadow-xs">
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', lead.code)
          e.dataTransfer.effectAllowed = 'move'
        }}
        className="cursor-grab p-3 active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-2">
          <Link to={`/leads/${lead.code}`} className="min-w-0 hover:underline">
            <span className="block font-mono text-[11px] text-stone-500">{lead.code}</span>
            <span className="block truncate text-sm font-medium text-stone-900">{lead.contactName}</span>
          </Link>
          <Menu>
            <MenuTrigger
              aria-label="Mover a"
              className="-mt-1 -mr-1 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <MoreHorizontal className="size-4" />
            </MenuTrigger>
            <MenuContent>
              <MenuLabel>Mover a</MenuLabel>
              {LEAD_STATUSES.filter((s) => s !== lead.status).map((s) => (
                <MenuItem key={s} onSelect={() => onMove(lead, s)}>
                  <span className={cn('size-2 rounded-full', STATUS_STYLES[s].dot)} aria-hidden />
                  {STATUS_LABELS[s]}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
        </div>
        {lead.company && <p className="mt-0.5 truncate text-xs text-stone-500">{lead.company}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <ChannelLabel channel={lead.channel} auto={lead.autoCaptured} className="text-xs" />
          {open && <PriorityBadge priority={lead.priority} />}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-500">
          <span className="truncate">{lead.assignedTo?.name ?? 'Sin asignar'}</span>
          {open && lead.nextActionAt && (
            <span className={cn('shrink-0 tabular-nums', overdue && 'font-medium text-red-600')}>
              {formatDate(lead.nextActionAt, { year: undefined })}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

export function BoardView({ filters }: { filters: Filters }) {
  const board = useBoard(filters)
  const qc = useQueryClient()
  const [over, setOver] = useState<LeadStatus>()
  const [losing, setLosing] = useState<{ key: number; lead: LeadListItem }>()

  // Mueve la tarjeta en el cache antes de que responda el API; si falla, se vuelve a pedir el tablero.
  const shift = (lead: LeadListItem, to: LeadStatus) =>
    qc.setQueriesData<BoardResponse>({ queryKey: ['leads', 'board'] }, (prev) =>
      prev && {
        columns: prev.columns.map((c) => {
          if (c.status === lead.status) return { ...c, items: c.items.filter((l) => l.id !== lead.id), total: c.total - 1 }
          if (c.status === to) return { ...c, items: [{ ...lead, status: to }, ...c.items], total: c.total + 1 }
          return c
        }),
      },
    )

  const move: Move = (lead, to) => {
    if (to === lead.status) return
    // Perdido pide motivo: lo resuelve el mismo dialogo del detalle.
    if (to === 'PERDIDO') {
      setLosing({ key: Date.now(), lead })
      return
    }
    shift(lead, to)
    api(`/leads/${lead.code}/status`, { method: 'POST', json: { status: to } })
      .then(() => toast.success(`${lead.code} paso a ${STATUS_LABELS[to]}`))
      .catch((e: Error) => toast.error(e.message || 'No se pudo mover el lead'))
      .finally(() => {
        void qc.invalidateQueries({ queryKey: ['leads'] })
        void qc.invalidateQueries({ queryKey: ['dashboard'] })
      })
  }

  const onDrop = (e: DragEvent, to: LeadStatus) => {
    e.preventDefault()
    setOver(undefined)
    const code = e.dataTransfer.getData('text/plain')
    const lead = board.data?.columns.flatMap((c) => c.items).find((l) => l.code === code)
    if (lead) move(lead, to)
  }

  if (board.isPending) {
    return (
      <div className="flex gap-3 overflow-hidden p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-72 w-64 shrink-0" />
        ))}
      </div>
    )
  }
  if (board.isError) return <ErrorState message={board.error.message} onRetry={() => board.refetch()} />

  const tableQuery = { ...filtersQuery(filters), page: undefined, pageSize: undefined }

  return (
    <div className={cn('transition-opacity', board.isPlaceholderData && 'opacity-60')}>
      <div className="flex gap-3 overflow-x-auto p-4 sm:px-6">
        {board.data.columns.map((col) => (
          <section
            key={col.status}
            aria-label={STATUS_LABELS[col.status]}
            className={cn(
              'flex w-64 shrink-0 flex-col rounded-xl border border-stone-200 bg-stone-50/70 transition-colors',
              over === col.status && 'border-brand-300 bg-brand-50/60',
            )}
          >
            <h3 className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-stone-800">
              <span className={cn('size-2 rounded-full', STATUS_STYLES[col.status].dot)} aria-hidden />
              {STATUS_LABELS[col.status]}
              <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-stone-500 tabular-nums">
                {formatNumber(col.total)}
              </span>
            </h3>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setOver(col.status)
              }}
              onDragLeave={() => setOver(undefined)}
              onDrop={(e) => onDrop(e, col.status)}
              className="flex max-h-[65vh] min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2"
            >
              {col.items.map((l) => (
                <BoardCard key={l.id} lead={l} onMove={move} />
              ))}
              {col.total > col.items.length && (
                <Link
                  to={`/leads${toSearch({ ...tableQuery, status: [col.status] })}`}
                  className="rounded-md px-2 py-1.5 text-center text-xs font-medium text-brand-700 hover:bg-brand-50"
                >
                  y {formatNumber(col.total - col.items.length)} mas en la tabla
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>
      {losing && (
        <StatusDialog
          key={losing.key}
          lead={losing.lead}
          open
          initial="PERDIDO"
          onOpenChange={(o) => !o && setLosing(undefined)}
        />
      )}
    </div>
  )
}
