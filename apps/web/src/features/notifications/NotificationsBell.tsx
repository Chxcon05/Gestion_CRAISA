import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import * as P from '@radix-ui/react-popover'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlarmClock, Bell, CheckCheck, Globe, MessageSquare, UserPlus } from 'lucide-react'
import type { NotificationItem, NotificationsResponse, NotificationType } from '@craisa/shared'
import { api } from '@/lib/api'
import { formatNumber, relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

// Cuelga de 'leads' para refrescarse con cualquier gestion de leads; el intervalo trae lo que hicieron otros.
const KEY = ['leads', 'notifications']

export function useNotifications<T = NotificationsResponse>(select?: (d: NotificationsResponse) => T) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api<NotificationsResponse>('/notifications'),
    select,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

const ICONS: Record<NotificationType, typeof Bell> = {
  ACTIVIDAD: MessageSquare,
  ASIGNACION: UserPlus,
  LEAD_AUTOMATICO: Globe,
}

function Item({ n, onOpen }: { n: NotificationItem; onOpen: (n: NotificationItem) => void }) {
  const Icon = ICONS[n.type]
  const unread = n.readAt === null
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(n)}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none',
          unread && 'bg-brand-50/40',
        )}
      >
        <span
          className={cn(
            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
            unread ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500',
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm', unread ? 'font-medium text-slate-900' : 'text-slate-700')}>{n.message}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {n.lead.code} · {n.lead.contactName}
          </span>
          <span className="mt-1 block text-[11px] text-slate-400">{relativeTime(n.createdAt)}</span>
        </span>
        {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-600" aria-label="Sin leer" />}
      </button>
    </li>
  )
}

export function NotificationsBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const query = useNotifications()
  const read = useMutation({
    mutationFn: (id?: string) => api(id ? `/notifications/${id}/read` : '/notifications/read-all', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const unread = query.data?.unread ?? 0
  const overdue = query.data?.overdue ?? 0
  const items = query.data?.items ?? []

  const openItem = (n: NotificationItem) => {
    if (n.readAt === null) read.mutate(n.id)
    setOpen(false)
    navigate(`/leads/${n.lead.code}`)
  }

  const label = [unread ? `${unread} sin leer` : '', overdue ? `${overdue} acciones vencidas` : ''].filter(Boolean).join(', ')

  return (
    <P.Root open={open} onOpenChange={setOpen}>
      <P.Trigger className={cn(className, 'relative')} aria-label={label ? `Notificaciones: ${label}` : 'Notificaciones'} title="Notificaciones">
        <Bell className="size-[18px]" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white tabular-nums ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : (
          overdue > 0 && <span className="absolute top-2 right-2.5 size-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden />
        )}
      </P.Trigger>
      <P.Portal>
        <P.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 flex max-h-[min(32rem,calc(100vh-6rem))] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl focus:outline-none"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notificaciones</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => read.mutate(undefined)}
                disabled={read.isPending}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" />
                Marcar todas como leidas
              </button>
            )}
          </div>

          {overdue > 0 && (
            <Link
              to="/leads?overdue=1&sort=nextActionAt&dir=asc"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-red-100 bg-red-50/70 px-4 py-3 transition-colors hover:bg-red-50"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlarmClock className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-red-700">
                  {formatNumber(overdue)} {overdue === 1 ? 'accion vencida' : 'acciones vencidas'}
                </span>
                <span className="block text-xs text-red-600/80">Seguimientos con fecha pasada, sin cerrar</span>
              </span>
            </Link>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {query.isPending ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Cargando...</p>
            ) : query.isError ? (
              <p className="px-4 py-8 text-center text-sm text-red-600">{query.error.message}</p>
            ) : items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">Sin notificaciones</p>
                <p className="mt-1 text-xs text-slate-500">Aqui vera los leads que le asignen y lo que otros hagan en sus leads.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <Item key={n.id} n={n} onOpen={openItem} />
                ))}
              </ul>
            )}
          </div>
        </P.Content>
      </P.Portal>
    </P.Root>
  )
}
