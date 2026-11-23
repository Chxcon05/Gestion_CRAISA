import { PRIORITY_LABELS, STATUS_LABELS, type LeadStatus, type Priority, type PriorityLevel } from '@craisa/shared'
import { cn } from '@/lib/utils'

// Las etapas abiertas van en la gama de azules y el color fuerte se reserva para oportunidad y cierre.
// El texto siempre acompana al color (no se comunica solo con color).
export const STATUS_STYLES: Record<LeadStatus, { badge: string; dot: string; chart: string }> = {
  NUEVO: { badge: 'bg-sky-50 text-sky-800 ring-sky-600/20', dot: 'bg-sky-500', chart: '#0ea5e9' },
  ASIGNADO: { badge: 'bg-blue-50 text-blue-800 ring-blue-600/20', dot: 'bg-blue-500', chart: '#3b82f6' },
  CONTACTADO: { badge: 'bg-indigo-50 text-indigo-800 ring-indigo-600/20', dot: 'bg-indigo-500', chart: '#6366f1' },
  EN_SEGUIMIENTO: { badge: 'bg-teal-50 text-teal-800 ring-teal-600/20', dot: 'bg-teal-600', chart: '#0d9488' },
  OPORTUNIDAD: { badge: 'bg-amber-50 text-amber-800 ring-amber-600/25', dot: 'bg-amber-500', chart: '#f59e0b' },
  GANADO: { badge: 'bg-lime-soft text-lime-ink ring-lime-brand/40', dot: 'bg-lime-brand', chart: '#7cb82f' },
  PERDIDO: { badge: 'bg-stone-100 text-stone-600 ring-stone-500/20', dot: 'bg-stone-400', chart: '#a8a29e' },
}

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        s.badge,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  )
}

// Rojo, ambar y gris en lugar de verde-amarillo-rojo: la prioridad alta pide atencion, no es "mala".
const PRIORITY_STYLES: Record<PriorityLevel, string> = {
  ALTA: 'bg-red-50 text-red-700 ring-red-600/20',
  MEDIA: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  BAJA: 'bg-stone-100 text-stone-600 ring-stone-500/20',
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  if (!priority.level) return <span className={cn('text-xs text-stone-400', className)}>-</span>
  return (
    <span
      title={`Puntaje ${priority.score} de 100: ${priority.reasons.join(', ')}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        PRIORITY_STYLES[priority.level],
        className,
      )}
    >
      {PRIORITY_LABELS[priority.level]}
      <span className="tabular-nums opacity-70">{priority.score}</span>
    </span>
  )
}
