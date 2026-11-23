import type { ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  CHANNELS,
  CHANNEL_LABELS,
  LEAD_STATUSES,
  ROLES_WITH_GLOBAL_SCOPE,
  STATUS_LABELS,
  leadCreateSchema,
  type LeadCreateInput,
  type LeadDetail,
} from '@craisa/shared'
import { api, ApiError } from '@/lib/api'
import { todayIso } from '@/lib/format'
import { useUser } from '@/app/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect, Textarea } from '@/components/ui/input'
import { CHANNEL_ICONS } from '@/components/channel'
import { cn } from '@/lib/utils'
import { useCatalogs, useLeadMutation } from './hooks'
import { DuplicateWarning, useDuplicates } from './DuplicateWarning'

type FormValues = LeadCreateInput

function toForm(l: LeadDetail): FormValues {
  return {
    entryDate: l.entryDate,
    contactName: l.contactName,
    company: l.company ?? '',
    phone: l.phone ?? '',
    email: l.email ?? '',
    channel: l.channel,
    businessLineId: l.businessLine.id,
    productId: l.product?.id ?? '',
    description: l.description,
    assignedToId: l.assignedTo?.id ?? '',
    status: l.status,
    nextAction: l.nextAction ?? '',
    nextActionAt: l.nextActionAt ?? '',
    lossReason: l.lossReason ?? '',
  }
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  )
}

export function LeadForm({ lead }: { lead?: LeadDetail }) {
  const user = useUser()
  const navigate = useNavigate()
  const catalogs = useCatalogs()
  const global = ROLES_WITH_GLOBAL_SCOPE.includes(user.role)
  const editing = Boolean(lead)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(leadCreateSchema),
    defaultValues: lead
      ? toForm(lead)
      : {
          entryDate: todayIso(),
          status: 'NUEVO',
          assignedToId: global ? '' : user.id,
          businessLineId: '',
          productId: '',
        },
  })

  const [lineId, status, channel] = useWatch({ control, name: ['businessLineId', 'status', 'channel'] })
  const products = (catalogs.data?.products ?? []).filter((p) => p.businessLineId === lineId && p.active)
  const [phone, email] = useWatch({ control, name: ['phone', 'email'] })
  const duplicates = useDuplicates(phone, email, lead?.code)

  const save = useLeadMutation(async (values: FormValues) => {
    if (lead) {
      const { status: _status, lossReason: _loss, ...rest } = values
      return api<LeadDetail>(`/leads/${lead.code}`, { method: 'PATCH', json: rest })
    }
    return api<LeadDetail>('/leads', { method: 'POST', json: values })
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(values)
      if (!saved) return
      toast.success(editing ? 'Cambios guardados' : `Lead ${saved.code} registrado`)
      navigate(`/leads/${saved.code}`)
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [k, msg] of Object.entries(e.fields)) setError(k as keyof FormValues, { message: msg })
      }
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  })

  const err = (k: keyof FormValues) => errors[k]?.message
  const aria = (k: keyof FormValues) => ({
    'aria-invalid': Boolean(errors[k]),
    'aria-describedby': errors[k] ? `${k}-error` : undefined,
  })
  const lines = (catalogs.data?.lines ?? []).filter((l) => l.active || l.id === lineId)
  const showLossReason = editing === false && status === 'PERDIDO'

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Section title="Contacto" description="Quien hizo la consulta. Indique al menos telefono o correo.">
        <Field label="Nombre" htmlFor="contactName" required error={err('contactName')}>
          <Input id="contactName" autoComplete="name" {...register('contactName')} {...aria('contactName')} />
        </Field>
        <Field label="Empresa" htmlFor="company" error={err('company')}>
          <Input id="company" autoComplete="organization" {...register('company')} {...aria('company')} />
        </Field>
        <Field label="Telefono" htmlFor="phone" error={err('phone')}>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="8888-8888" {...register('phone')} {...aria('phone')} />
        </Field>
        <Field label="Correo" htmlFor="email" error={err('email')}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} {...aria('email')} />
        </Field>
        <DuplicateWarning matches={duplicates.data} className="sm:col-span-2" />
      </Section>

      <Section title="Origen e interes" description="Por donde llego la consulta y que le interesa al cliente.">
        {/* Fichas en lugar de un desplegable: los 9 canales se ven de un vistazo y se eligen con un toque. */}
        <fieldset className="sm:col-span-2" aria-describedby={errors.channel ? 'channel-error' : undefined}>
          <legend className="mb-2 text-[13px] font-medium text-stone-700">
            Canal de origen
            <span className="ml-0.5 text-red-600" aria-hidden>
              *
            </span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CHANNELS.map((c) => {
              const Icon = CHANNEL_ICONS[c]
              const selected = channel === c
              return (
                <label
                  key={c}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/40',
                    selected
                      ? 'border-brand-500 bg-brand-50 font-medium text-brand-800'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50',
                    errors.channel && !selected && 'border-red-200',
                  )}
                >
                  <input type="radio" value={c} {...register('channel')} className="sr-only" />
                  <Icon className={cn('size-4', selected ? 'text-brand-600' : 'text-stone-400')} />
                  {CHANNEL_LABELS[c]}
                </label>
              )
            })}
          </div>
          {errors.channel && (
            <p id="channel-error" role="alert" className="mt-1.5 text-xs font-medium text-red-600">
              {errors.channel.message}
            </p>
          )}
        </fieldset>
        <Field label="Fecha de ingreso" htmlFor="entryDate" required error={err('entryDate')}>
          <Input id="entryDate" type="date" max={todayIso()} {...register('entryDate')} {...aria('entryDate')} />
        </Field>
        <div className="hidden sm:block" />
        <Field label="Linea de negocio" htmlFor="businessLineId" required error={err('businessLineId')}>
          <NativeSelect
            id="businessLineId"
            // Al cambiar la linea, el producto elegido deja de ser valido.
            {...register('businessLineId', { onChange: () => setValue('productId', '') })}
            {...aria('businessLineId')}
          >
            <option value="">Seleccione...</option>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Producto de interes"
          htmlFor="productId"
          error={err('productId')}
          hint={lineId ? undefined : 'Elija primero la linea'}
        >
          <NativeSelect id="productId" disabled={!lineId} {...register('productId')} {...aria('productId')}>
            <option value="">Sin especificar</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Descripcion de la consulta"
          htmlFor="description"
          required
          error={err('description')}
          className="sm:col-span-2"
        >
          <Textarea id="description" rows={4} {...register('description')} {...aria('description')} />
        </Field>
      </Section>

      <Section title="Asignacion y seguimiento" description="Quien atiende el lead y cual es el siguiente paso.">
        <Field
          label="Responsable"
          htmlFor="assignedToId"
          required
          error={err('assignedToId')}
          hint={global ? undefined : 'Los vendedores registran leads a su nombre'}
        >
          <NativeSelect id="assignedToId" disabled={!global} {...register('assignedToId')} {...aria('assignedToId')}>
            <option value="">Seleccione...</option>
            {(catalogs.data?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {editing ? (
          <div className="hidden sm:block" />
        ) : (
          <Field label="Estado inicial" htmlFor="status" error={err('status')}>
            <NativeSelect id="status" {...register('status')}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        <Field label="Proxima accion" htmlFor="nextAction" error={err('nextAction')} hint="Ej.: Enviar cotizacion">
          <Input id="nextAction" {...register('nextAction')} {...aria('nextAction')} />
        </Field>
        <Field label="Fecha de la proxima accion" htmlFor="nextActionAt" error={err('nextActionAt')}>
          <Input id="nextActionAt" type="date" {...register('nextActionAt')} {...aria('nextActionAt')} />
        </Field>
        {showLossReason && (
          <Field label="Motivo de perdida" htmlFor="lossReason" required error={err('lossReason')} className="sm:col-span-2">
            <Input id="lossReason" {...register('lossReason')} {...aria('lossReason')} />
          </Field>
        )}
      </Section>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button variant="secondary" asChild>
          <Link to={lead ? `/leads/${lead.code}` : '/leads'}>Cancelar</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar lead'}
        </Button>
      </div>
    </form>
  )
}
