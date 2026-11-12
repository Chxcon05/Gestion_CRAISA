import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowRight, Briefcase, CalendarCheck, CalendarDays, Inbox, Sparkles, Trophy, type LucideIcon } from 'lucide-react'
import { CLOSED_STATUSES, type Channel, type CountItem, type DashboardData, type LeadStatus } from '@craisa/shared'
import { api, toSearch } from '@/lib/api'
import { formatDate, formatNumber, shiftIso, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUser } from '@/app/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/states'
import { STATUS_STYLES, StatusBadge } from '@/components/status'
import { CHANNEL_ICONS } from '@/components/channel'

type Preset = 'all' | '7' | '30' | '90' | 'year' | 'custom'
type Granularity = 'day' | 'week' | 'month'
type Range = { from?: string; to?: string }

// Orden de uso, no alfabetico: primero el historial completo (lo mismo que el listado) y luego de corto a largo plazo.
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: 'year', label: 'Este anio' },
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

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Costa_Rica' }).format(new Date()))
  if (h < 12) return 'Buenos dias'
  return h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`

/* ---------- Tu dia ---------- */

const DAY_TONES = {
  red: { card: 'hover:border-red-200', icon: 'bg-red-50 text-red-600', value: 'text-red-600' },
  amber: { card: 'hover:border-amber-200', icon: 'bg-amber-50 text-amber-600', value: 'text-slate-900' },
  blue: { card: 'hover:border-brand-200', icon: 'bg-brand-50 text-brand-600', value: 'text-slate-900' },
}

function DayCard(props: { to: string; label: string; hint: string; value: number; icon: typeof Inbox; tone: keyof typeof DAY_TONES }) {
  const t = DAY_TONES[props.tone]
  const Icon = props.icon
  const quiet = props.value === 0
  return (
    <Link
      to={props.to}
      className={cn(
        'group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-md',
        t.card,
      )}
    >
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', quiet ? 'bg-slate-100 text-slate-400' : t.icon)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-slate-500">{props.label}</span>
        <span className={cn('block text-2xl font-semibold tabular-nums', quiet ? 'text-slate-400' : t.value)}>{formatNumber(props.value)}</span>
        <span className="block truncate text-xs text-slate-400">{props.hint}</span>
      </span>
      <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
    </Link>
  )
}

/* ---------- Indicadores ---------- */

function Stat(props: { label: string; value: string; hint: string; icon: typeof Inbox }) {
  const Icon = props.icon
  return (
    <div className="flex flex-col gap-1 px-5 py-4 sm:px-6">
      <span className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
        <Icon className="size-4 text-slate-400" />
        {props.label}
      </span>
      <span className="text-[1.75rem] leading-tight font-semibold tracking-tight text-slate-900 tabular-nums">{props.value}</span>
      <span className="text-xs text-slate-500">{props.hint}</span>
    </div>
  )
}

/* ---------- Embudo ---------- */

function Funnel({ data, onPick }: { data: CountItem<LeadStatus>[]; onPick: (s: LeadStatus) => void }) {
  const total = data.reduce((a, d) => a + d.count, 0)
  const max = Math.max(1, ...data.map((d) => d.count))
  const open = data.filter((d) => !CLOSED_STATUSES.includes(d.key))
  const closed = data.filter((d) => CLOSED_STATUSES.includes(d.key))
  const row = (d: CountItem<LeadStatus>) => {
    const pct = total ? Math.round((d.count / total) * 100) : 0
    return (
      <li key={d.key}>
        <button
          type="button"
          onClick={() => onPick(d.key)}
          className="group grid w-full grid-cols-[7.5rem_1fr_4.5rem] sm:grid-cols-[11rem_1fr_4.5rem] items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
        >
          <span className="flex items-center gap-2 truncate text-sm text-slate-700">
            <span className={cn('size-2 shrink-0 rounded-full', STATUS_STYLES[d.key].dot)} aria-hidden />
            {d.label}
          </span>
          <span className="h-7 overflow-hidden rounded-md bg-slate-100">
            <span
              className="block h-full rounded-md transition-[width] duration-500 group-hover:brightness-95"
              style={{ width: `${Math.max(d.count ? 3 : 0, (d.count / max) * 100)}%`, background: STATUS_STYLES[d.key].chart }}
            />
          </span>
          <span className="text-right text-sm tabular-nums">
            <span className="font-semibold text-slate-900">{formatNumber(d.count)}</span>
            <span className="ml-1.5 text-xs text-slate-400">{pct}%</span>
          </span>
        </button>
      </li>
    )
  }
  return (
    <div className="space-y-4">
      <ol className="space-y-0.5" aria-label="Leads abiertos por etapa">
        {open.map(row)}
      </ol>
      <div className="border-t border-dashed border-slate-200 pt-3">
        <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Cerrados</p>
        <ol className="space-y-0.5" aria-label="Leads cerrados">
          {closed.map(row)}
        </ol>
      </div>
    </div>
  )
}

/* ---------- Barras simples (canal, linea) ---------- */

function BarList({ items, onPick, iconFor }: { items: CountItem[]; onPick: (key: string) => void; iconFor?: (key: string) => LucideIcon }) {
  const sorted = [...items].sort((a, b) => b.count - a.count)
  const max = Math.max(1, ...sorted.map((d) => d.count))
  const total = sorted.reduce((a, d) => a + d.count, 0)
  return (
    <ul className="space-y-1">
      {sorted.map((d) => (
        <li key={d.key}>
          <button
            type="button"
            onClick={() => onPick(d.key)}
            className="group relative flex w-full items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
          >
            <span
              aria-hidden
              className="absolute inset-y-0.5 left-0 rounded-lg bg-brand-100/70 transition-[width] duration-500 group-hover:bg-brand-100"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
            <span className="relative flex flex-1 items-center gap-2 truncate text-slate-700">
              <BarIcon icon={iconFor?.(d.key)} />
              {d.label}
            </span>
            <span className="relative font-semibold text-slate-900 tabular-nums">{formatNumber(d.count)}</span>
            <span className="relative w-10 text-right text-xs text-slate-400 tabular-nums">
              {total ? Math.round((d.count / total) * 100) : 0}%
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function BarIcon({ icon: Icon }: { icon?: LucideIcon }) {
  return Icon ? <Icon className="size-4 text-slate-400" aria-hidden /> : null
}

/* ---------- Agenda ---------- */

function Agenda({ items }: { items: DashboardData['upcoming'] }) {
  const today = todayIso()
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <span className="mb-3 rounded-2xl bg-emerald-50 p-3 text-emerald-600">
          <CalendarCheck className="size-6" />
        </span>
        <p className="text-sm font-medium text-slate-900">Todo al dia</p>
        <p className="mt-1 text-sm text-slate-500">No hay acciones pendientes para esta semana.</p>
      </div>
    )
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((u) => {
        const date = u.nextActionAt ?? ''
        const overdue = date < today
        const isToday = date === today
        const d = new Date(`${date}T00:00:00Z`)
        return (
          <li key={u.code}>
            <Link to={`/leads/${u.code}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 sm:px-6">
              <span
                className={cn(
                  'flex w-11 shrink-0 flex-col items-center rounded-lg border py-1 leading-none',
                  overdue ? 'border-red-200 bg-red-50 text-red-700' : isToday ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700',
                )}
              >
                <span className="text-[10px] font-medium uppercase">
                  {new Intl.DateTimeFormat('es-CR', { month: 'short', timeZone: 'UTC' }).format(d).replace('.', '')}
                </span>
                <span className="text-base font-semibold tabular-nums">{d.getUTCDate()}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{u.nextAction}</p>
                <p className="truncate text-xs text-slate-500">
                  {u.contactName}
                  {u.company ? ` / ${u.company}` : ''}
                </p>
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                <StatusBadge status={u.status} />
                {u.assignedTo && <span className="text-xs text-slate-400">{u.assignedTo.name}</span>}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/* ---------- Evolucion ---------- */

const monthFmt = new Intl.DateTimeFormat('es-CR', { month: 'short', year: '2-digit', timeZone: 'UTC' })

function periodLabel(p: string, g: Granularity) {
  if (g === 'month') return monthFmt.format(new Date(`${p}-01T00:00:00Z`))
  return formatDate(p, { year: undefined })
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-slate-900">{label}</p>
      <p className="text-slate-600 tabular-nums">{plural(payload[0]?.value ?? 0, 'lead', 'leads')}</p>
    </div>
  )
}

function Trend({ series, granularity }: { series: DashboardData['series']; granularity: Granularity }) {
  const data = series.map((s) => ({ ...s, label: periodLabel(s.period, granularity) }))
  const axis = { fontSize: 12, fill: '#94a3b8' }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2d5fae" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#2d5fae" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: 4 }} />
        <Area type="monotone" dataKey="count" stroke="#1c4c94" strokeWidth={2.25} fill="url(#fillLeads)" activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ---------- Pagina ---------- */

function PeriodPicker(props: {
  preset: Preset
  setPreset: (p: Preset) => void
  custom: { from: string; to: string }
  setCustom: (c: { from: string; to: string }) => void
}) {
  const { preset, setPreset, custom, setCustom } = props
  return (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset className="inline-flex flex-wrap gap-0.5 rounded-xl bg-slate-200/60 p-1">
        <legend className="sr-only">Periodo</legend>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={preset === p.key}
            onClick={() => setPreset(p.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all',
              preset === p.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
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
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-96 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
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

  const q = useQuery({
    queryKey: ['dashboard', range, granularity],
    queryFn: () => api<DashboardData>(`/dashboard${toSearch({ ...range, granularity })}`),
  })

  // Mismo periodo que el tablero: el listado filtrado muestra exactamente los leads de cada barra.
  const toLeads = (extra: Record<string, string>) => navigate(`/leads${toSearch({ ...range, ...extra })}`)
  const firstName = user.name.split(' ')[0]
  const k = q.data?.kpis
  const periodText =
    preset === 'all'
      ? q.data
        ? `todo el historial, desde el ${formatDate(q.data.range.from)}`
        : 'todo el historial'
      : `del ${formatDate(range.from)} al ${formatDate(range.to)}`

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {k
            ? k.overdue + k.dueToday > 0
              ? `Tiene ${plural(k.overdue, 'accion vencida', 'acciones vencidas')} y ${plural(k.dueToday, 'para hoy', 'para hoy')}. Empiece por ahi.`
              : 'No hay seguimientos atrasados. Buen trabajo.'
            : 'Cargando el resumen...'}
        </p>
      </div>

      {q.isPending ? (
        <DashboardSkeleton />
      ) : q.isError ? (
        <Card>
          <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
        </Card>
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="tu-dia">
            <h2 id="tu-dia" className="mb-3 text-sm font-semibold text-slate-900">
              Tu dia
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <DayCard
                to="/leads?overdue=1&sort=nextActionAt&dir=asc"
                label="Acciones vencidas"
                hint="Seguimientos atrasados de leads abiertos"
                value={q.data.kpis.overdue}
                icon={AlertTriangle}
                tone="red"
              />
              <DayCard
                to="/leads?due=today"
                label="Para hoy"
                hint="Acciones programadas para hoy"
                value={q.data.kpis.dueToday}
                icon={CalendarCheck}
                tone="amber"
              />
              <DayCard
                to="/leads?due=week&sort=nextActionAt&dir=asc"
                label="Proximos 7 dias"
                hint="Para planificar la semana"
                value={q.data.kpis.dueWeek}
                icon={CalendarDays}
                tone="blue"
              />
            </div>
          </section>

          <section aria-labelledby="resultados" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="resultados" className="text-sm font-semibold text-slate-900">
                  Resultados
                </h2>
                <p className="text-[13px] text-slate-500">Leads ingresados en {periodText}.</p>
              </div>
              <PeriodPicker preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom} />
            </div>

            <Card className="grid grid-cols-2 divide-slate-100 lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-slate-100 lg:[&>*:nth-child(-n+2)]:border-b-0">
              <Stat
                label={preset === 'all' ? 'Leads registrados' : 'Leads en el periodo'}
                value={formatNumber(q.data.kpis.total)}
                hint={`${formatNumber(q.data.kpis.open)} siguen abiertos`}
                icon={Inbox}
              />
              <Stat
                label="Nuevos sin atender"
                value={formatNumber(q.data.byStatus.find((s) => s.key === 'NUEVO')?.count ?? 0)}
                hint="Esperan primer contacto"
                icon={Sparkles}
              />
              <Stat
                label="Oportunidades"
                value={formatNumber(q.data.kpis.opportunities)}
                hint="Negocios en curso"
                icon={Briefcase}
              />
              <Stat
                label="Tasa de cierre"
                value={`${q.data.kpis.winRate.toLocaleString('es-CR')} %`}
                hint={`${formatNumber(q.data.kpis.won)} ganados de ${formatNumber(q.data.kpis.won + q.data.kpis.lost)} cerrados`}
                icon={Trophy}
              />
            </Card>

            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
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
              <Card className="lg:col-span-2">
                <CardHeader>
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

            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <div>
                    <CardTitle>Leads ingresados</CardTitle>
                    <CardDescription>Por {GRANULARITY_LABEL[granularity]} de ingreso</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pl-2">
                  <Trend series={q.data.series} granularity={granularity} />
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div>
                    <CardTitle>Canal de origen</CardTitle>
                    <CardDescription>Por donde llegan las consultas</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4">
                  <BarList
                    items={q.data.byChannel}
                    onPick={(key) => toLeads({ channel: key })}
                    iconFor={(key) => CHANNEL_ICONS[key as Channel]}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Linea de negocio</CardTitle>
                  <CardDescription>Interes de los clientes por linea</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-4">
                <BarList items={q.data.byLine} onPick={(key) => toLeads({ businessLineId: key })} />
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </>
  )
}
