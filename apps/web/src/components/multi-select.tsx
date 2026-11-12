import * as P from '@radix-ui/react-popover'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
}

interface MultiSelectProps {
  label: string
  options: Option[]
  value: string[]
  onChange: (v: string[]) => void
}

export function MultiSelect({ label, options, value, onChange }: MultiSelectProps) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const active = value.length > 0
  return (
    <P.Root>
      <P.Trigger
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm whitespace-nowrap shadow-xs transition-colors',
          active
            ? 'border-brand-200 bg-brand-50 text-brand-800'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        )}
      >
        {label}
        {active && (
          <span className="rounded-full bg-brand-700 px-1.5 text-[11px] leading-4 font-semibold text-white">{value.length}</span>
        )}
        <ChevronDown className="size-4 text-slate-400" />
      </P.Trigger>
      <P.Portal>
        <P.Content align="start" sideOffset={6} className="z-50 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <fieldset className="max-h-72 overflow-y-auto">
            <legend className="sr-only">{label}</legend>
            {options.map((o) => {
              const checked = value.includes(o.value)
              return (
                <label
                  key={o.value}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100 has-[:focus-visible]:bg-slate-100"
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} className="peer sr-only" />
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-4 items-center justify-center rounded border peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40',
                      checked ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white',
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  {o.label}
                </label>
              )
            })}
          </fieldset>
          {active && (
            <div className="mt-1 border-t border-slate-100 pt-1">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-slate-500 hover:bg-slate-100"
              >
                Limpiar seleccion
              </button>
            </div>
          )}
        </P.Content>
      </P.Portal>
    </P.Root>
  )
}
