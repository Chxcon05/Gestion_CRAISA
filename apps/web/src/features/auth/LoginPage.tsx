import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import { ROLE_LABELS, loginSchema, type Role, type SessionUser } from '@craisa/shared'
import type { z } from 'zod'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/states'
import { StatusBadge } from '@/components/status'
import { Logo } from '@/app/layout'

type Values = z.input<typeof loginSchema>

// Solo en desarrollo: son las cuentas ficticias del seed. La build de produccion elimina este bloque.
const DEMO_ACCOUNTS: { email: string; name: string; role: Role }[] = [
  { email: 'admin@craisa.test', name: 'Admin CRAISA', role: 'ADMIN' },
  { email: 'mercadeo@craisa.test', name: 'Mariana Solis', role: 'MERCADEO' },
  { email: 'carlos.mora@craisa.test', name: 'Carlos Mora', role: 'VENDEDOR' },
]
const DEMO_PASSWORD = 'Craisa2026!'

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:outline-none aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-500/10'

const FUNNEL_PREVIEW = [
  { label: 'Nuevo', w: 82, color: '#0ea5e9' },
  { label: 'Contactado', w: 64, color: '#8b5cf6' },
  { label: 'En seguimiento', w: 48, color: '#f59e0b' },
  { label: 'Oportunidad', w: 34, color: '#f97316' },
  { label: 'Ganado', w: 22, color: '#10b981' },
]

/** Vista previa decorativa del sistema: muestra lo que el usuario encontrara al ingresar. */
function ProductPreview() {
  return (
    <div aria-hidden className="relative mx-auto h-[23rem] w-full max-w-[30rem] select-none">
      <div className="absolute top-0 left-0 w-[17rem] rounded-2xl bg-white p-5 shadow-2xl shadow-brand-950/30">
        <p className="text-xs font-medium text-slate-500">Embudo comercial</p>
        <div className="mt-3 space-y-2.5">
          {FUNNEL_PREVIEW.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <span className="w-24 truncate text-[11px] text-slate-500">{f.label}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full" style={{ width: `${f.w}%`, background: f.color }} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-8 right-0 w-[12.5rem] rounded-2xl bg-white p-4 shadow-2xl shadow-brand-950/30">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">Tasa de cierre</p>
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">+4,2</span>
        </div>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">44,6 %</p>
        <svg viewBox="0 0 160 40" className="mt-2 h-10 w-full">
          <path
            d="M0 32 L20 28 L40 30 L60 20 L80 22 L100 14 L120 16 L140 8 L160 6"
            fill="none"
            stroke="#2d5fae"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="absolute right-6 bottom-0 left-10 rounded-2xl bg-white p-4 shadow-2xl shadow-brand-950/30">
        <div className="flex items-center gap-3">
          <Avatar name="Ana Rodriguez" className="size-10 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">Ana Rodriguez</p>
            <p className="truncate text-xs text-slate-500">Finca La Sabana / Tractor 75 HP</p>
          </div>
          <StatusBadge status="OPORTUNIDAD" />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <MessageCircle className="size-3.5" />
          <span className="font-medium">Hoy:</span> enviar cotizacion por WhatsApp
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(loginSchema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const user = await api<SessionUser>('/auth/login', { method: 'POST', json: values })
      qc.setQueryData(['me'], user)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'No se pudo iniciar sesion' })
    }
  })

  const fillDemo = (email: string) => {
    setValue('email', email)
    setValue('password', DEMO_PASSWORD)
    clearErrors()
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <Logo className="h-9 w-[6.3rem]" />

        <div className="flex flex-1 items-center py-12">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-900">Bienvenido de nuevo</h1>
            <p className="mt-2 text-sm text-slate-500">Ingrese para dar seguimiento a sus leads comerciales.</p>

            <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[13px] font-medium text-slate-700">
                  Correo
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="nombre@craisa.com"
                    className={inputClass}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-xs font-medium text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[13px] font-medium text-slate-700">
                  Contrasena
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={cn(inputClass, 'pr-11')}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                    className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs font-medium text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {errors.root && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{errors.root.message}</span>
                </div>
              )}

              <Button type="submit" size="lg" className="h-11 w-full rounded-xl text-[15px]" disabled={isSubmitting}>
                {isSubmitting ? 'Ingresando...' : 'Ingresar'}
                {isSubmitting ? null : <ArrowRight />}
              </Button>
            </form>

            {import.meta.env.DEV && (
              <div className="mt-10">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium text-slate-400">Cuentas de demostracion</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <ul className="mt-4 space-y-2">
                  {DEMO_ACCOUNTS.map((a) => (
                    <li key={a.email}>
                      <button
                        type="button"
                        onClick={() => fillDemo(a.email)}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/50"
                      >
                        <Avatar name={a.name} className="size-8" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-900">{ROLE_LABELS[a.role]}</span>
                          <span className="block truncate text-xs text-slate-500">{a.email}</span>
                        </span>
                        <span className="text-xs font-medium text-brand-700">Usar</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-center text-xs text-slate-400">
                  Contrasena de todas: <span className="font-mono text-slate-600">{DEMO_PASSWORD}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="size-3.5" />
          Prototipo interno de CRAISA. Uso exclusivo con datos ficticios.
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-brand-800 lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(96,140,214,0.55),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(11,36,75,0.9),transparent_60%)]" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:40px_40px]"
        />
        <div className="relative">
          <p className="max-w-md text-[2rem] leading-tight font-semibold tracking-tight text-white">
            Cada consulta comercial, registrada y con seguimiento.
          </p>
          <p className="mt-4 max-w-md text-base text-brand-100/80">
            Centralice los leads de todos los canales, sepa que toca hacer hoy y mida los resultados de Mercadeo y Ventas.
          </p>
          <div className="mt-12">
            <ProductPreview />
          </div>
        </div>
      </div>
    </div>
  )
}
