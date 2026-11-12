import type { ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { Button } from './ui/button'
import { initials } from '@/lib/format'

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 rounded-2xl bg-brand-50 p-4 text-brand-600 ring-8 ring-brand-50/40">
        <Inbox className="size-6" />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-red-50 p-3 text-red-500">
        <AlertTriangle className="size-6" />
      </div>
      <p className="text-sm font-semibold text-slate-900">No se pudo cargar la informacion</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message ?? 'Revise la conexion e intente de nuevo.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const AVATAR_TONES = [
  'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-teal-100 text-teal-800',
  'bg-indigo-100 text-indigo-800',
]

// Color fijo por nombre: la misma persona se reconoce igual en el listado, la bitacora y los filtros.
function toneFor(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]
}

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${toneFor(name)} ${className}`}
    >
      {initials(name)}
    </span>
  )
}

export function PersonChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Avatar name={name} className="size-6 text-[10px]" />
      <span className="text-slate-700">{name}</span>
    </span>
  )
}
