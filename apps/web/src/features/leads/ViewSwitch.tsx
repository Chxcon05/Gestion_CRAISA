import { CalendarDays, Columns3, Rows3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeadsView } from './hooks'

// Orden de uso, no alfabetico: la tabla es la vista por defecto y va primero.
const VIEWS: { value: LeadsView; label: string; icon: typeof Rows3 }[] = [
  { value: '', label: 'Tabla', icon: Rows3 },
  { value: 'board', label: 'Tablero', icon: Columns3 },
  { value: 'calendar', label: 'Calendario', icon: CalendarDays },
]

export function ViewSwitch({ value, onChange }: { value: LeadsView; onChange: (v: LeadsView) => void }) {
  return (
    <fieldset className="inline-flex shrink-0 rounded-lg border border-stone-200 bg-stone-50 p-0.5">
      <legend className="sr-only">Vista</legend>
      {VIEWS.map((v) => (
        <button
          key={v.value || 'table'}
          type="button"
          aria-pressed={value === v.value}
          onClick={() => onChange(v.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-colors [&_svg]:size-4',
            value === v.value ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800',
          )}
        >
          <v.icon aria-hidden />
          {v.label}
        </button>
      ))}
    </fieldset>
  )
}
