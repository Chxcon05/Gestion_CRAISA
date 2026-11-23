import { useState } from 'react'
import type { DashboardData, ResponseTimeRow } from '@craisa/shared'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Bajo 48 h se lee mejor en horas; mas alla, "3.5 dias" dice mas que "84 h".
export function formatHours(h: number | null) {
  if (h === null) return '-'
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `${formatNumber(Math.round(h * 10) / 10)} h`
  return `${formatNumber(Math.round((h / 24) * 10) / 10)} dias`
}

// El mismo corte que "en menos de 24 h": verde dentro del dia, ambar hasta dos dias, rojo despues.
const tone = (h: number) => (h < 24 ? 'bg-lime-brand' : h < 48 ? 'bg-amber-400' : 'bg-red-400')

function Rows({ rows }: { rows: ResponseTimeRow[] }) {
  if (!rows.length) return <p className="px-6 py-6 text-sm text-stone-500">Todavia no hay leads contactados en el periodo.</p>
  const max = Math.max(1, ...rows.map((r) => r.avgHours))
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-stone-200/80 text-left text-xs font-medium text-stone-500">
          <th className="py-2.5 pl-6 font-medium">Nombre</th>
          <th className="hidden w-2/5 py-2.5 font-medium sm:table-cell">Promedio</th>
          <th className="py-2.5 text-right font-medium">Tiempo</th>
          <th className="py-2.5 pr-6 text-right font-medium">Leads</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {rows.map((r) => (
          <tr key={r.key}>
            <td className="py-3 pl-6 font-medium text-stone-800">{r.label}</td>
            <td className="hidden py-3 pr-6 sm:table-cell" aria-hidden>
              <span className="block h-1.5 overflow-hidden rounded-full bg-stone-100">
                <span className={cn('block h-full rounded-full', tone(r.avgHours))} style={{ width: `${(r.avgHours / max) * 100}%` }} />
              </span>
            </td>
            <td className="py-3 text-right font-semibold whitespace-nowrap text-stone-900 tabular-nums">{formatHours(r.avgHours)}</td>
            <td className="py-3 pr-6 text-right text-stone-500 tabular-nums">{formatNumber(r.contacted)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ResponseCard({ data, showSellers }: { data: DashboardData['response']; showSellers: boolean }) {
  const [view, setView] = useState<'seller' | 'channel'>(showSellers ? 'seller' : 'channel')
  const tabs = [...(showSellers ? [['seller', 'Por vendedor'] as const] : []), ['channel', 'Por canal'] as const]
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Tiempo de respuesta</CardTitle>
          <CardDescription>Del ingreso del lead hasta que se marca Contactado</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3 pb-4">
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{formatHours(data.avgHours)}</p>
          <p className="text-xs text-stone-500">promedio ({formatNumber(data.contacted)} leads)</p>
        </div>
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{data.contacted ? `${data.within24h}%` : '-'}</p>
          <p className="text-xs text-stone-500">en menos de 24 h</p>
        </div>
        <div>
          <p className={cn('font-display text-2xl font-semibold tracking-tight tabular-nums', data.pending ? 'text-amber-700' : 'text-stone-900')}>
            {formatNumber(data.pending)}
          </p>
          <p className="text-xs text-stone-500">sin contactar todavia</p>
        </div>
      </CardContent>
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Agrupar tiempo de respuesta" className="mx-5 mb-3 inline-flex gap-0.5 rounded-lg bg-stone-100 p-1 sm:mx-6">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium',
                view === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <Rows rows={view === 'seller' ? data.bySeller : data.byChannel} />
    </Card>
  )
}
