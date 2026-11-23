import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDown, ArrowRight, ArrowUp, Download } from 'lucide-react'
import { CLOSED_STATUSES, ROLES_WITH_GLOBAL_SCOPE, type Channel, type CountItem, type DashboardData, type LeadStatus } from '@craisa/shared'
import { api, toSearch } from '@/lib/api'
import { formatDate, formatNumber, shiftIso, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUser } from '@/app/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/states'
import { StatusBadge } from '@/components/status'
import { ResponseCard } from './ResponseCard'

type Preset = 'all' | '7' | '30' | '90' | 'year' | 'custom'
type Granularity = 'day' | 'week' | 'month'
type Range = { from?: string; to?: string }

// Orden de uso, no alfabetico: primero el historial completo (lo mismo que el listado) y luego de corto a largo plazo.
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: 'year', label: 'Este año' },
  { key: 'custom', label: 'Personalizado' },
]

const GRANULARITY_LABEL: Record<Granularity, string> = { day: 'dia', week: 'semana', month: 'mes' }

function rangeFor(p: Preset, custom: { from: string; to: string }): Range {
  const to = todayIso()
  if (p === 'all') return {}
  if (p === 'custom') return custom
  if (p === 'year') return { from: `${to.slice(0, 4)}-01-01`, to }
  return { from: shiftIso(to, 1 - Number(p)), to }
}

function granularityFor({ from, to }: Range): Granularity {
  if (!from || !to) return 'month'
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000
  if (days <= 31) return 'day'
  return days <= 120 ? 'week' : 'month'
}

/** Mismo largo justo antes del periodo elegido; sin limites (Todo) no hay con que comparar. */
function previousRange({ from, to }: Range): Range | null {
  if (!from || !to) return null
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1
  return { from: shiftIso(from, -days), to: shiftIso(from, -1) }
}

const todayFmt = new Intl.DateTimeFormat('es-CR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Costa_Rica' })
const todayLabel = () => todayFmt.format(new Date())

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Costa_Rica' }).format(new Date()))
  if (h < 12) return 'Buenos dias'
  return h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`
const pctChange = (now: number, before: number | undefined) => (before === undefined || before === 0 ? null : ((now - before) / before) * 100)
const oneDecimal = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 1 })

// Azul y verde de la marca CRAISA; el verde va oscurecido para que se lea sobre blanco.
const BRAND = '#1a58b0'
const LIME = '#7cb82f'

/** Variacion contra el periodo anterior. "inverse": subir es malo (por ejemplo, leads sin atender). */
function Delta({ value, unit = '%', inverse }: { value: number | null; unit?: string; inverse?: boolean }) {
  if (value === null || !Number.isFinite(value)) return null
  const up = value >= 0
  const good = inverse ? !up : up
  const Arrow = up ? ArrowUp : ArrowDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        good ? 'bg-lime-soft text-lime-ink' : 'bg-red-50 text-red-600',
      )}
    >
      <Arrow className="size-3" strokeWidth={2.75} aria-hidden />
      {oneDecimal.format(Math.abs(value))}
      {unit}
    </span>
  )
}

// En vez de un icono decorativo, cada cifra lleva un trazo con datos: la tendencia o la proporcion que la explica.
function KpiCard(props: { label: string; value: string; delta?: ReactNode; hint: string; visual: ReactNode }) {
  return (
    <div className="flex flex-col bg-white p-5 sm:p-6">
      <h3 className="min-w-0 text-sm leading-snug font-medium text-stone-500 sm:truncate">{props.label}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <span className="font-display text-[2rem] leading-none font-semibold tracking-tight text-stone-900 tabular-nums sm:text-[2.5rem]">
          {props.value}
        </span>
        {props.delta}
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] text-stone-500 sm:truncate">{props.hint}</p>
      <div className="mt-auto pt-5">{props.visual}</div>
    </div>
  )
}

const METER_TONES = { amber: 'bg-amber-400', brand: 'bg-brand-600', lime: 'bg-lime-brand' }

function Meter({ share, tone }: { share: number; tone: keyof typeof METER_TONES }) {
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden>
      <span className={cn('block h-full rounded-full', METER_TONES[tone])} style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }} />
    </span>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <Meter share={0} tone="brand" />
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${22 - (v / max) * 20}`)
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="block h-6 w-full" aria-hidden>
      <polygon points={`0,24 ${pts.join(' ')} 100,24`} fill={BRAND} opacity={0.08} />
      <polyline points={pts.join(' ')} fill="none" stroke={BRAND} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

const DAY_TONES = {
  amber: { bar: 'bg-amber-500', edge: 'border-amber-500' },
  blue: { bar: 'bg-brand-600', edge: 'border-brand-600' },
  red: { bar: 'bg-red-600', edge: 'border-red-600' },
}

function DaySegment(props: { to: string; label: string; value: number; tone: keyof typeof DAY_TONES; share: number }) {
  const t = DAY_TONES[props.tone]
  return (
    <Link to={props.to} className="group flex min-w-0 flex-col justify-between gap-3 rounded-sm">
      <span className={cn('border-l-2 pl-3', t.edge)}>
        <span className="block font-display text-2xl font-semibold text-stone-900 tabular-nums">{formatNumber(props.value)}</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-stone-500 group-hover:text-stone-800">
          {props.label}
          <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </span>
      </span>
      <span className="block h-1.5 overflow-hidden rounded-full bg-stone-200/70">
        <span className={cn('block h-full rounded-full', t.bar)} style={{ width: `${Math.max(6, props.share * 100)}%` }} />
      </span>
    </Link>
  )
}

function DayStrip({ kpis }: { kpis: DashboardData['kpis'] }) {
  const sum = Math.max(1, kpis.overdue + kpis.dueToday + kpis.dueWeek)
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <DaySegment
        to="/leads?overdue=1&sort=nextActionAt&dir=asc"
        label="Acciones vencidas"
        value={kpis.overdue}
        tone="red"
        share={kpis.overdue / sum}
      />
      <DaySegment to="/leads?due=today" label="Para hoy" value={kpis.dueToday} tone="amber" share={kpis.dueToday / sum} />
      <DaySegment
        to="/leads?due=week&sort=nextActionAt&dir=asc"
        label="Proximos 7 dias"
        value={kpis.dueWeek}
        tone="blue"
        share={kpis.dueWeek / sum}
      />
    </div>
  )
}

const monthFmt = new Intl.DateTimeFormat('es-CR', { month: 'short', year: '2-digit', timeZone: 'UTC' })

function periodLabel(p: string, g: Granularity) {
  if (g === 'month') return monthFmt.format(new Date(`${p}-01T00:00:00Z`))
  return formatDate(p, { year: undefined })
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const now = payload.find((p) => p.dataKey === 'count')?.value ?? 0
  const before = payload.find((p) => p.dataKey === 'prev')?.value
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-stone-900">{label}</p>
      <p className="text-stone-600 tabular-nums">{plural(now, 'lead', 'leads')}</p>
      {before !== undefined && <p className="text-stone-400 tabular-nums">Periodo anterior: {formatNumber(before)}</p>}
    </div>
  )
}

function Trend(props: { series: DashboardData['series']; previous?: DashboardData['series']; granularity: Granularity }) {
  // El periodo anterior se alinea por posicion (dia 1 con dia 1) y se dibuja punteado detras del actual.
  const data = props.series.map((s, i) => ({ ...s, label: periodLabel(s.period, props.granularity), prev: props.previous?.[i]?.count }))
  const axis = { fontSize: 11, fill: '#a8a29e' }
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
        <defs>
          <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e7e5e4" strokeDasharray="4 4" />
        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#d6d3d1', strokeDasharray: 4 }} />
        {props.previous && (
          <Line type="monotone" dataKey="prev" stroke="#d6d3d1" strokeWidth={1.75} strokeDasharray="5 4" dot={false} activeDot={false} />
        )}
        <Area type="monotone" dataKey="count" stroke={BRAND} strokeWidth={2.25} fill="url(#fillLeads)" activeDot={{ r: 4, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Barras horizontales con el nombre del canal: se leen sin pasar el mouse por cada una.
function ChannelBars({ items, onPick }: { items: CountItem<Channel>[]; onPick: (key: Channel) => void }) {
  const max = Math.max(1, ...items.map((d) => d.count))
  const top = items.reduce<CountItem<Channel> | null>((a, d) => (a === null || d.count > a.count ? d : a), null)
  return (
    <ul className="space-y-1">
      {items.map((d) => {
        const isTop = top !== null && d.key === top.key && d.count > 0
        return (
          <li key={d.key}>
            <button
              type="button"
              onClick={() => onPick(d.key)}
              aria-label={`${d.label}: ${plural(d.count, 'lead', 'leads')}`}
              className="group grid w-full grid-cols-[6.5rem_1fr_2.25rem] items-center gap-3 rounded-md px-1.5 py-1.5 text-left text-[13px] hover:bg-stone-50"
            >
              <span className={cn('truncate', isTop ? 'font-semibold text-brand-700' : 'text-stone-600 group-hover:text-stone-900')}>
                {d.label}
              </span>
              <span className="block h-2 overflow-hidden rounded-full bg-stone-100">
                <span
                  className={cn('block h-full rounded-full transition-colors', isTop ? 'bg-brand-700' : 'bg-stone-300 group-hover:bg-brand-300')}
                  style={{ width: `${d.count === 0 ? 0 : Math.max(4, (d.count / max) * 100)}%` }}
                />
              </span>
              <span className="text-right font-medium text-stone-700 tabular-nums">{formatNumber(d.count)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function WinGauge({ rate, won, closed, onShow }: { rate: number; won: number; closed: number; onShow: () => void }) {
  const ticks = 44
  const filled = Math.round((Math.min(100, Math.max(0, rate)) / 100) * ticks)
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[17rem]">
        <svg viewBox="0 0 240 132" className="w-full" aria-hidden>
          {Array.from({ length: ticks }, (_, i) => {
            const a = Math.PI - (i / (ticks - 1)) * Math.PI
            const on = i < filled
            return (
              <line
                key={i}
                x1={120 + 84 * Math.cos(a)}
                y1={122 - 84 * Math.sin(a)}
                x2={120 + 112 * Math.cos(a)}
                y2={122 - 112 * Math.sin(a)}
                stroke={on ? LIME : '#e7e5e4'}
                strokeOpacity={on ? 0.4 + 0.6 * (i / Math.max(1, filled - 1)) : 1}
                strokeWidth={5}
                strokeLinecap="round"
              />
            )
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <p className="font-display text-[2.25rem] leading-none font-semibold tracking-tight text-stone-900 tabular-nums">{rate.toLocaleString('es-CR')} %</p>
          <p className="mt-1.5 text-xs text-stone-500">
            {formatNumber(won)} ganados de {formatNumber(closed)} cerrados
          </p>
        </div>
      </div>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onShow}>
        Ver ganados
      </Button>
    </div>
  )
}

function Funnel({ data, onPick }: { data: CountItem<LeadStatus>[]; onPick: (s: LeadStatus) => void }) {
  const total = data.reduce((a, d) => a + d.count, 0)
  const max = Math.max(1, ...data.map((d) => d.count))
  // Un solo tono para las etapas abiertas; el color se reserva para el resultado (ganado o perdido).
  const color = (s: LeadStatus) => (s === 'GANADO' ? LIME : s === 'PERDIDO' ? '#d6d3d1' : BRAND)
  const row = (d: CountItem<LeadStatus>) => {
    const pct = total ? Math.round((d.count / total) * 100) : 0
    return (
      <li key={d.key}>
        <button
          type="button"
          onClick={() => onPick(d.key)}
          className="group grid w-full grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-stone-50 sm:grid-cols-[10.5rem_1fr_5rem]"
        >
          <span className="truncate text-sm text-stone-700">{d.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-stone-100">
            <span
              className="block h-full rounded-full transition-[width] duration-500 group-hover:brightness-110"
              style={{ width: `${Math.max(d.count ? 3 : 0, (d.count / max) * 100)}%`, background: color(d.key) }}
            />
          </span>
          <span className="text-right text-sm tabular-nums">
            <span className="font-semibold text-stone-900">{formatNumber(d.count)}</span>
            <span className="ml-1.5 text-xs text-stone-400">{pct}%</span>
          </span>
        </button>
      </li>
    )
  }
  return (
    <div className="space-y-3">
      <ol className="space-y-0.5" aria-label="Leads abiertos por etapa">
        {data.filter((d) => !CLOSED_STATUSES.includes(d.key)).map(row)}
      </ol>
      <div className="border-t border-dashed border-stone-200 pt-3">
        <p className="mb-1 px-2 text-xs font-medium text-stone-400">Cerrados</p>
        <ol className="space-y-0.5" aria-label="Leads cerrados">
          {data.filter((d) => CLOSED_STATUSES.includes(d.key)).map(row)}
        </ol>
      </div>
    </div>
  )
}

function LineTable({ items, onPick }: { items: CountItem[]; onPick: (key: string) => void }) {
  const sorted = [...items].sort((a, b) => b.count - a.count)
  const total = sorted.reduce((a, d) => a + d.count, 0)
  const max = Math.max(1, ...sorted.map((d) => d.count))
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-stone-200/80 text-left text-xs font-medium text-stone-500">
          <th className="py-2.5 pl-6 font-medium">Linea</th>
          <th className="hidden w-2/5 py-2.5 font-medium sm:table-cell">Participacion</th>
          <th className="py-2.5 text-right font-medium">Leads</th>
          <th className="py-2.5 pr-6 text-right font-medium">%</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {sorted.map((d) => (
          <tr key={d.key} className="hover:bg-stone-50">
            <td className="py-3 pl-6">
              <button type="button" onClick={() => onPick(d.key)} className="font-medium text-stone-800 hover:text-brand-700">
                {d.label}
              </button>
            </td>
            <td className="hidden py-3 pr-6 sm:table-cell" aria-label={`${total ? Math.round((d.count / total) * 100) : 0}% del total`}>
              <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-stone-100">
                <span className="block h-full rounded-full bg-brand-600" style={{ width: `${(d.count / max) * 100}%` }} />
              </span>
            </td>
            <td className="py-3 text-right font-semibold text-stone-900 tabular-nums">{formatNumber(d.count)}</td>
            <td className="py-3 pr-6 text-right text-stone-500 tabular-nums">{total ? Math.round((d.count / total) * 100) : 0}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Agenda({ items }: { items: DashboardData['upcoming'] }) {
  const today = todayIso()
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <p className="text-sm font-medium text-stone-900">Todo al dia</p>
        <p className="mt-1 text-sm text-stone-500">No hay acciones pendientes para esta semana.</p>
      </div>
    )
  }
  return (
    <ul className="divide-y divide-stone-100">
      {items.map((u) => {
        const date = u.nextActionAt ?? ''
        const overdue = date < today
        const isToday = date === today
        const d = new Date(`${date}T00:00:00Z`)
        return (
          <li key={u.code}>
            <Link to={`/leads/${u.code}`} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 sm:px-6">
              <span
                className={cn(
                  'flex w-11 shrink-0 flex-col items-center rounded-lg border py-1.5 leading-none',
                  overdue ? 'border-red-200 bg-red-50 text-red-700' : isToday ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-stone-200 bg-white text-stone-700',
                )}
              >
                <span className="text-[10px] font-medium uppercase">
                  {new Intl.DateTimeFormat('es-CR', { month: 'short', timeZone: 'UTC' }).format(d).replace('.', '')}
                </span>
                <span className="text-base font-semibold tabular-nums">{d.getUTCDate()}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-900">{u.nextAction}</p>
                <p className="truncate text-xs text-stone-500">
                  {u.contactName}
                  {u.company ? ` / ${u.company}` : ''}
                </p>
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                <StatusBadge status={u.status} />
                {u.assignedTo && <span className="text-xs text-stone-400">{u.assignedTo.name}</span>}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function PeriodPicker(props: {
  preset: Preset
  setPreset: (p: Preset) => void
  custom: { from: string; to: string }
  setCustom: (c: { from: string; to: string }) => void
}) {
  const { preset, setPreset, custom, setCustom } = props
  return (
    <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
      <fieldset className="inline-flex max-w-full min-w-0 gap-0.5 overflow-x-auto rounded-lg bg-stone-100 p-1 [scrollbar-width:none]">
        <legend className="sr-only">Periodo</legend>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={preset === p.key}
            onClick={() => setPreset(p.key)}
            className={cn(
              'shrink-0 rounded-md px-3 py-1 text-[13px] font-medium whitespace-nowrap transition-colors',
              preset === p.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900',
            )}
          >
            {p.label}
          </button>
        ))}
      </fieldset>
      {preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="Desde"
            value={custom.from}
            max={custom.to}
            onChange={(e) => setCustom({ ...custom, from: e.target.value })}
            className="w-[9.5rem]"
          />
          <Input
            type="date"
            aria-label="Hasta"
            value={custom.to}
            min={custom.from}
            onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            className="w-[9.5rem]"
          />
        </div>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const user = useUser()
  const navigate = useNavigate()
  const [preset, setPreset] = useState<Preset>('all')
  const [custom, setCustom] = useState({ from: shiftIso(todayIso(), -29), to: todayIso() })
  const range = rangeFor(preset, custom)
  const granularity = granularityFor(range)
  const prevRange = previousRange(range)

  const q = useQuery({
    queryKey: ['dashboard', range, granularity],
    queryFn: () => api<DashboardData>(`/dashboard${toSearch({ ...range, granularity })}`),
  })
  const prev = useQuery({
    queryKey: ['dashboard', prevRange, granularity],
    queryFn: () => api<DashboardData>(`/dashboard${toSearch({ ...prevRange, granularity })}`),
    enabled: prevRange !== null,
  })

  // Mismo periodo que el tablero: el listado filtrado muestra exactamente los leads de cada barra.
  const toLeads = (extra: Record<string, string>) => navigate(`/leads${toSearch({ ...range, ...extra })}`)
  const firstName = user.name.split(' ')[0]
  const k = q.data?.kpis
  const p = prevRange ? prev.data : undefined
  const periodText =
    preset === 'all'
      ? q.data
        ? `todo el historial, desde el ${formatDate(q.data.range.from)}`
        : 'todo el historial'
      : `del ${formatDate(range.from)} al ${formatDate(range.to)}`
  const vsText = (before: number | undefined, fallback: string) =>
    before === undefined ? fallback : `vs. ${formatNumber(before)} el periodo anterior`
  const nuevos = (d?: DashboardData) => d?.byStatus.find((s) => s.key === 'NUEVO')?.count

  return (
    <>
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-stone-500 first-letter:uppercase">{todayLabel()}</p>
          <h1 className="text-[2rem] leading-tight font-semibold tracking-tight text-stone-900 sm:text-[2.5rem]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-2 text-[15px] text-stone-500">
            {k
              ? k.overdue + k.dueToday > 0
                ? `Tiene ${plural(k.overdue, 'accion vencida', 'acciones vencidas')} y ${plural(k.dueToday, 'para hoy', 'para hoy')}. Empiece por ahi.`
                : 'No hay seguimientos atrasados. Buen trabajo.'
              : 'Cargando el resumen...'}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <PeriodPicker preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom} />
          <Button variant="secondary" asChild>
            <a href={`/api/leads/export.xlsx${toSearch(range)}`} download title="Descarga los leads del periodo para Excel">
              <Download />
              Exportar
            </a>
          </Button>
        </div>
      </div>

      {q.isPending ? (
        <DashboardSkeleton />
      ) : q.isError ? (
        <Card>
          <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="grid grid-cols-2 gap-px overflow-hidden bg-stone-200/80 xl:grid-cols-4">
            <KpiCard
              label={preset === 'all' ? 'Leads registrados' : 'Leads en el periodo'}
              value={formatNumber(q.data.kpis.total)}
              delta={<Delta value={pctChange(q.data.kpis.total, p?.kpis.total)} />}
              hint={vsText(p?.kpis.total, `${formatNumber(q.data.kpis.open)} siguen abiertos`)}
              visual={<Sparkline values={q.data.series.map((s) => s.count)} />}
            />
            <KpiCard
              label="Nuevos sin atender"
              value={formatNumber(nuevos(q.data) ?? 0)}
              delta={<Delta value={pctChange(nuevos(q.data) ?? 0, nuevos(p))} inverse />}
              hint={vsText(nuevos(p), 'Esperan primer contacto')}
              visual={<Meter share={(nuevos(q.data) ?? 0) / Math.max(1, q.data.kpis.open)} tone="amber" />}
            />
            <KpiCard
              label="Oportunidades"
              value={formatNumber(q.data.kpis.opportunities)}
              delta={<Delta value={pctChange(q.data.kpis.opportunities, p?.kpis.opportunities)} />}
              hint={vsText(p?.kpis.opportunities, 'Negocios en curso')}
              visual={<Meter share={q.data.kpis.opportunities / Math.max(1, q.data.kpis.open)} tone="brand" />}
            />
            <KpiCard
              label="Tasa de cierre"
              value={`${q.data.kpis.winRate.toLocaleString('es-CR')} %`}
              visual={<Meter share={q.data.kpis.winRate / 100} tone="lime" />}
              delta={<Delta value={p ? q.data.kpis.winRate - p.kpis.winRate : null} unit=" pts" />}
              hint={
                p
                  ? `vs. ${p.kpis.winRate.toLocaleString('es-CR')} % el periodo anterior`
                  : `${formatNumber(q.data.kpis.won)} ganados de ${formatNumber(q.data.kpis.won + q.data.kpis.lost)} cerrados`
              }
            />
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Leads ingresados</CardTitle>
                    <CardDescription>
                      Por {GRANULARITY_LABEL[granularity]}, {periodText}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grid items-end gap-4 md:grid-cols-[10rem_1fr]">
                  <div className="md:pb-6">
                    <p className="font-display text-[2.75rem] leading-none font-semibold tracking-tight text-stone-900 tabular-nums">
                      {formatNumber(q.data.kpis.total)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <Delta value={pctChange(q.data.kpis.total, p?.kpis.total)} />
                      {p ? 'vs. periodo anterior' : `${formatNumber(q.data.kpis.open)} abiertos`}
                    </div>
                  </div>
                  <Trend series={q.data.series} previous={p?.series} granularity={granularity} />
                </CardContent>
                <div className="border-t border-stone-100 bg-stone-50/60 px-5 pt-5 pb-6 sm:px-6">
                  <h2 className="mb-4 font-display text-base font-semibold text-stone-900">Tu dia</h2>
                  <DayStrip kpis={q.data.kpis} />
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Embudo comercial</CardTitle>
                    <CardDescription>En que etapa estan los leads. Pulse una etapa para verlos.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4">
                  <Funnel data={q.data.byStatus} onPick={(s) => toLeads({ status: s })} />
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div>
                    <CardTitle>Linea de negocio</CardTitle>
                    <CardDescription>Interes de los clientes por linea</CardDescription>
                  </div>
                </CardHeader>
                <LineTable items={q.data.byLine} onPick={(key) => toLeads({ businessLineId: key })} />
              </Card>

              {/* Un vendedor solo ve sus leads: la vista por vendedor le mostraria una sola fila. */}
              <ResponseCard data={q.data.response} showSellers={ROLES_WITH_GLOBAL_SCOPE.includes(user.role)} />
            </div>

            <div className="min-w-0 space-y-6">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Canal de origen</CardTitle>
                    <CardDescription>Por donde llegan las consultas</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <ChannelBars items={q.data.byChannel} onPick={(key) => toLeads({ channel: key })} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Tasa de cierre</CardTitle>
                    <CardDescription>Ganados sobre el total de cerrados</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pb-6">
                  <WinGauge
                    rate={q.data.kpis.winRate}
                    won={q.data.kpis.won}
                    closed={q.data.kpis.won + q.data.kpis.lost}
                    onShow={() => toLeads({ status: 'GANADO' })}
                  />
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div>
                    <CardTitle>Agenda</CardTitle>
                    <CardDescription>Vencidas y de los proximos 7 dias</CardDescription>
                  </div>
                  <Link
                    to="/leads?sort=nextActionAt&dir=asc"
                    className="inline-flex items-center gap-1 text-[13px] font-medium whitespace-nowrap text-brand-700 hover:underline"
                  >
                    Ver todas <ArrowRight className="size-3.5" />
                  </Link>
                </CardHeader>
                <Agenda items={q.data.upcoming} />
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
