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
  { email: 'carlos.mora@craisa.test', name: 'Carlos Mora', role: 'VENDEDOR' },
]
const DEMO_PASSWORD = 'Craisa2026!'

const inputClass =
  'h-10 w-full rounded-md border border-stone-300 bg-white pr-3 pl-10 text-sm text-stone-900 shadow-xs placeholder:text-stone-400 transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/15'

// Mismos tonos que el embudo del tablero: azul para las etapas abiertas y verde de la marca para el cierre.
const FUNNEL_PREVIEW = [
  { label: 'Nuevo', w: 82, color: '#1a58b0' },
  { label: 'Contactado', w: 64, color: '#1a58b0' },
  { label: 'En seguimiento', w: 48, color: '#1a58b0' },
  { label: 'Oportunidad', w: 34, color: '#1a58b0' },
  { label: 'Ganado', w: 22, color: '#7cb82f' },
]

/** Vista previa decorativa del sistema: muestra lo que el usuario encontrara al ingresar. */
function ProductPreview() {
  return (
    <div aria-hidden className="relative mx-auto h-[23rem] w-full max-w-[30rem] select-none">
      <div className="absolute top-0 left-0 w-[17rem] rounded-xl bg-white p-5 shadow-2xl shadow-brand-950/40">
        <p className="text-xs font-medium text-stone-500">Embudo comercial</p>
        <div className="mt-3 space-y-2.5">
          {FUNNEL_PREVIEW.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <span className="w-24 truncate text-[11px] text-stone-500">{f.label}</span>
              <span className="h-2 flex-1 overflow-hidden bg-stone-100">
                <span className="block h-full" style={{ width: `${f.w}%`, background: f.color }} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-8 right-0 w-[12.5rem] rounded-xl bg-white p-4 shadow-2xl shadow-brand-950/40">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-stone-500">Tasa de cierre</p>
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">+4,2</span>
        </div>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">44,6 %</p>
        <svg viewBox="0 0 160 40" className="mt-2 h-10 w-full">
          <path
            d="M0 32 L20 28 L40 30 L60 20 L80 22 L100 14 L120 16 L140 8 L160 6"
            fill="none"
            stroke="#1a58b0"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="absolute right-6 bottom-0 left-10 rounded-xl bg-white p-4 shadow-2xl shadow-brand-950/40">
        <div className="flex items-center gap-3">
          <Avatar name="Ana Rodriguez" className="size-10 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-stone-900">Ana Rodriguez</p>
            <p className="truncate text-xs text-stone-500">Finca La Sabana / Tractor 75 HP</p>
          </div>
          <StatusBadge status="OPORTUNIDAD" />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
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
            <p className="text-sm font-medium text-brand-700">Gestion de leads comerciales</p>
            <h1 className="mt-2 text-[2rem] leading-tight font-semibold tracking-tight text-stone-900">Iniciar sesion</h1>
            <p className="mt-2 text-sm text-stone-500">Ingrese con su cuenta corporativa para dar seguimiento a sus leads.</p>

            <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[13px] font-medium text-stone-700">
                  Correo
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
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
                <label htmlFor="password" className="block text-[13px] font-medium text-stone-700">
                  Contrasena
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone-400" />
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
                    className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-600"
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
                  className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{errors.root.message}</span>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Ingresando...' : 'Ingresar'}
                {isSubmitting ? null : <ArrowRight />}
              </Button>
            </form>

            {import.meta.env.DEV && (
              <div className="mt-10">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-stone-200" />
                  <span className="text-xs font-medium text-stone-400">Cuentas de demostracion</span>
                  <span className="h-px flex-1 bg-stone-200" />
                </div>
                <ul className="mt-4 space-y-2">
                  {DEMO_ACCOUNTS.map((a) => (
                    <li key={a.email}>
                      <button
                        type="button"
                        onClick={() => fillDemo(a.email)}
                        className="flex w-full items-center gap-3 rounded-md border border-stone-200 px-3 py-2.5 text-left transition-colors hover:border-stone-300 hover:bg-stone-50"
                      >
                        <Avatar name={a.name} className="size-8" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-stone-900">{ROLE_LABELS[a.role]}</span>
                          <span className="block truncate text-xs text-stone-500">{a.email}</span>
                        </span>
                        <span className="text-xs font-medium text-brand-700">Usar</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-center text-xs text-stone-400">
                  Contrasena de todas: <span className="font-mono text-stone-600">{DEMO_PASSWORD}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-stone-400">
          <ShieldCheck className="size-3.5" />
          Prototipo interno de CRAISA. Uso exclusivo con datos ficticios.
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-brand-700 lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(115deg,white_0_1px,transparent_1px_36px)]"
        />
        <div className="relative">
          <span aria-hidden className="mb-6 block h-1.5 w-14 -skew-x-[20deg] bg-lime-brand" />
          <p className="max-w-md font-display text-[2.5rem] leading-[1.1] font-semibold tracking-[-0.01em] text-white">
            Cada consulta comercial, registrada y con seguimiento.
          </p>
          <p className="mt-5 max-w-md text-base text-brand-100">
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
