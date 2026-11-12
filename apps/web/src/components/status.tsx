import { STATUS_LABELS, type LeadStatus } from '@craisa/shared'
import { cn } from '@/lib/utils'

// Un color por etapa del embudo; el texto siempre acompana al color (no se comunica solo con color).
export const STATUS_STYLES: Record<LeadStatus, { badge: string; dot: string; chart: string }> = {
  NUEVO: { badge: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500', chart: '#0ea5e9' },
  ASIGNADO: { badge: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20', dot: 'bg-indigo-500', chart: '#6366f1' },
  CONTACTADO: { badge: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500', chart: '#8b5cf6' },
  EN_SEGUIMIENTO: { badge: 'bg-amber-50 text-amber-800 ring-amber-600/25', dot: 'bg-amber-500', chart: '#f59e0b' },
  OPORTUNIDAD: { badge: 'bg-orange-50 text-orange-800 ring-orange-600/25', dot: 'bg-orange-500', chart: '#f97316' },
  GANADO: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', chart: '#10b981' },
  PERDIDO: { badge: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400', chart: '#94a3b8' },
}

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        s.badge,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  )
}
