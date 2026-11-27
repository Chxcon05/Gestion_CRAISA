import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { LeadListItem } from '@craisa/shared'
import { formatDate, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/states'
import { useCalendar, type Filters } from './hooks'

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
const MAX_PER_DAY = 3

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

const monthTitle = (month: string) =>
  new Intl.DateTimeFormat('es-CR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))

/** Celdas del mes de lunes a domingo; null rellena los dias de la semana anteriores al dia 1. */
function monthCells(month: string): (string | null)[] {
  const first = new Date(`${month}-01T00:00:00Z`)
  const lead = (first.getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ]
}

function CalendarItem({ lead, overdue }: { lead: LeadListItem; overdue: boolean }) {
  return (
    <Link
      to={`/leads/${lead.code}`}
      className={cn(
        'block truncate rounded-md px-1.5 py-1 text-xs leading-tight hover:bg-stone-100',
        overdue ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'text-stone-700',
      )}
      title={`${lead.contactName}: ${lead.nextAction ?? ''}`}
    >
      <span className="font-medium">{lead.contactName}</span>
      {lead.nextAction && <span className="text-stone-500"> / {lead.nextAction}</span>}
    </Link>
  )
}

export function CalendarView({ filters, update }: { filters: Filters; update: (p: Partial<Filters>) => void }) {
  const today = todayIso()
  const month = filters.month || today.slice(0, 7)
  const cal = useCalendar(filters, month)
  const [openDay, setOpenDay] = useState<string>()

  // En el mes en curso lo vencido se agrupa en hoy, que es lo primero que hay que atender. En un mes
  // pasado se deja en su dia: hoy no es una celda de ese mes y la accion desapareceria.
  const showsToday = month === today.slice(0, 7)
  const byDay = useMemo(() => {
    const map = new Map<string, LeadListItem[]>()
    for (const l of cal.data ?? []) {
      const day = showsToday && l.nextActionAt && l.nextActionAt < today ? today : l.nextActionAt
      if (!day) continue
      map.set(day, [...(map.get(day) ?? []), l])
    }
    return map
  }, [cal.data, today, showsToday])

  const isOverdue = (l: LeadListItem) => Boolean(l.nextActionAt && l.nextActionAt < today)
  const cells = monthCells(month)
  const daysWithLeads = cells.filter((d): d is string => Boolean(d && byDay.has(d)))

  return (
    <div className={cn('transition-opacity', cal.isPlaceholderData && 'opacity-60')}>
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-6">
        <h2 className="text-base font-semibold text-stone-900 first-letter:uppercase">{monthTitle(month)}</h2>
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="icon" aria-label="Mes anterior" onClick={() => update({ month: shiftMonth(month, -1) })}>
            <ChevronLeft />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => update({ month: '' })} disabled={month === today.slice(0, 7)}>
            Hoy
          </Button>
          <Button variant="secondary" size="icon" aria-label="Mes siguiente" onClick={() => update({ month: shiftMonth(month, 1) })}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      {cal.isPending ? (
        <div className="grid grid-cols-7 gap-px p-4">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : cal.isError ? (
        <ErrorState message={cal.error.message} onRetry={() => cal.refetch()} />
      ) : (
        <>
          <div className="hidden sm:block">
            <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/60 text-center text-[11px] font-semibold tracking-wide text-stone-500 uppercase">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-stone-100">
              {cells.map((day, i) => {
                const items = day ? (byDay.get(day) ?? []) : []
                return (
                  <div key={day ?? `blank-${i}`} className={cn('min-h-28 bg-white p-1.5', !day && 'bg-stone-50/60')}>
                    {day && (
                      <>
                        <span
                          className={cn(
                            'mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                            day === today ? 'bg-brand-700 font-semibold text-white' : 'text-stone-500',
                          )}
                        >
                          {Number(day.slice(8))}
                        </span>
                        <div className="space-y-0.5">
                          {items.slice(0, MAX_PER_DAY).map((l) => (
                            <CalendarItem key={l.id} lead={l} overdue={isOverdue(l)} />
                          ))}
                          {items.length > MAX_PER_DAY && (
                            <button
                              type="button"
                              onClick={() => setOpenDay(day)}
                              className="w-full rounded-md px-1.5 py-0.5 text-left text-xs font-medium text-brand-700 hover:bg-brand-50"
                            >
                              +{items.length - MAX_PER_DAY} mas
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="sm:hidden">
            {daysWithLeads.length === 0 ? null : (
              <ul className="divide-y divide-stone-100">
                {daysWithLeads.map((day) => (
                  <li key={day} className="px-4 py-3">
                    <p className={cn('mb-1.5 text-xs font-semibold text-stone-500 uppercase', day === today && 'text-brand-700')}>
                      {day === today ? 'Hoy' : formatDate(day, { weekday: 'long', year: undefined })}
                    </p>
                    <div className="space-y-1">
                      {byDay.get(day)!.map((l) => (
                        <CalendarItem key={l.id} lead={l} overdue={isOverdue(l)} />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {daysWithLeads.length === 0 && (
            <EmptyState title="Sin acciones programadas este mes" description="Las proximas acciones de los leads abiertos aparecen en su fecha." />
          )}
        </>
      )}

      <Dialog
        open={Boolean(openDay)}
        onOpenChange={(o) => !o && setOpenDay(undefined)}
        title={openDay ? (openDay === today ? 'Hoy' : formatDate(openDay, { weekday: 'long' })) : ''}
      >
        <div className="max-h-[60vh] space-y-1 overflow-y-auto">
          {(openDay ? (byDay.get(openDay) ?? []) : []).map((l) => (
            <CalendarItem key={l.id} lead={l} overdue={isOverdue(l)} />
          ))}
        </div>
      </Dialog>
    </div>
  )
}
