import { useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  ImagePlus,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Trash2,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'
import {
  CLOSED_STATUSES,
  LEAD_STATUSES,
  NOTE_IMAGES_MAX,
  ROLES_WITH_GLOBAL_SCOPE,
  STATUS_LABELS,
  type LeadDetail,
  type LeadStatus,
} from '@craisa/shared'
import { useUser } from '@/app/auth'
import { api } from '@/lib/api'
import { formatDate, formatDateTime, relativeTime, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input, NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, ErrorState, PersonChip } from '@/components/states'
import { StatusBadge } from '@/components/status'
import { ChannelLabel } from '@/components/channel'
import { useCatalogs, useLead, useLeadMutation } from './hooks'
import { StatusDialog } from './StatusDialog'
import { Timeline } from './Timeline'
import { DuplicateWarning, useDuplicates } from './DuplicateWarning'
import { stripDataUrl, toNoteImage } from './images'

const FUNNEL: readonly LeadStatus[] = LEAD_STATUSES.filter((s) => s !== 'PERDIDO')

function Stepper({ lead, onPick }: { lead: LeadDetail; onPick: (s: LeadStatus) => void }) {
  const current = FUNNEL.indexOf(lead.status)
  const lost = lead.status === 'PERDIDO'
  const readOnly = lead.canEdit === false
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
      <ol className="flex flex-1 items-start overflow-x-auto pb-1" aria-label="Etapas del lead">
        {FUNNEL.map((s, i) => {
          const done = lost === false && i < current
          const here = lead.status === s
          return (
            <li key={s} className="flex min-w-[5.5rem] flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span
                  className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done || here ? 'bg-brand-600' : 'bg-stone-200')}
                />
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => onPick(s)}
                  aria-current={here ? 'step' : undefined}
                  aria-label={`Pasar a ${STATUS_LABELS[s]}`}
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all disabled:cursor-default',
                    here
                      ? 'border-brand-700 bg-brand-700 text-white ring-3 ring-brand-100'
                      : done
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-stone-200 bg-white text-stone-400 hover:border-brand-300 hover:text-brand-600',
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </button>
                <span
                  className={cn(
                    'h-0.5 flex-1',
                    i === FUNNEL.length - 1 ? 'bg-transparent' : done ? 'bg-brand-600' : 'bg-stone-200',
                  )}
                />
              </div>
              <span
                className={cn(
                  'mt-2 px-1 text-center text-xs leading-tight',
                  here ? 'font-semibold text-brand-800' : 'text-stone-500',
                )}
              >
                {STATUS_LABELS[s]}
              </span>
            </li>
          )
        })}
      </ol>
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onPick('PERDIDO')}
        aria-current={lost ? 'step' : undefined}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-xs font-medium disabled:cursor-default lg:self-center',
          lost
            ? 'border-stone-600 bg-stone-600 text-white'
            : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50',
        )}
      >
        <XCircle className="size-3.5" />
        {lost ? 'Perdido' : 'Marcar como perdido'}
      </button>
    </div>
  )
}

/** Telefono local de Costa Rica (8 digitos) a formato internacional para WhatsApp. */
function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits.length === 8 ? `506${digits}` : digits}`
}

const contactAction =
  'inline-flex h-9 items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50'

function ContactActions({ lead }: { lead: LeadDetail }) {
  return (
    <div className="flex flex-wrap gap-2">
      {lead.phone && (
        <>
          <a href={`tel:${lead.phone}`} className={contactAction}>
            <Phone className="size-4 text-brand-600" />
            Llamar
          </a>
          <a href={whatsappUrl(lead.phone)} target="_blank" rel="noreferrer" className={contactAction}>
            <MessageCircle className="size-4 text-emerald-600" />
            WhatsApp
          </a>
        </>
      )}
      {lead.email && (
        <a href={`mailto:${lead.email}`} className={contactAction}>
          <Mail className="size-4 text-sky-600" />
          Correo
        </a>
      )}
    </div>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2.5 text-sm">
      <dt className="text-stone-500">{label}</dt>
      <dd className="min-w-0 text-stone-900">{children || <span className="text-stone-400">-</span>}</dd>
    </div>
  )
}

function NoteForm({ lead }: { lead: LeadDetail }) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const add = useLeadMutation(() =>
    api<LeadDetail>(`/leads/${lead.code}/notes`, {
      method: 'POST',
      json: { content: text, images: images.map(stripDataUrl) },
    }),
  )
  const empty = text.trim() === '' && images.length === 0

  const attach = async (files: Blob[]) => {
    const room = NOTE_IMAGES_MAX - images.length
    const picked = files.filter((f) => f.type.startsWith('image/'))
    if (picked.length > room) toast.error(`Maximo ${NOTE_IMAGES_MAX} imagenes por nota`)
    for (const file of picked.slice(0, room)) {
      try {
        const url = await toNoteImage(file)
        setImages((prev) => [...prev, url])
      } catch {
        toast.error('No se pudo leer la imagen')
      }
    }
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (empty) return
        try {
          await add.mutateAsync(undefined)
          setText('')
          setImages([])
          toast.success('Nota agregada')
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se pudo guardar la nota')
        }
      }}
      className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 focus-within:border-brand-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-600/20"
    >
      <label htmlFor="note" className="sr-only">
        Nota de gestion
      </label>
      <textarea
        id="note"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => {
          const files = Array.from(e.clipboardData.files)
          if (files.some((f) => f.type.startsWith('image/'))) {
            e.preventDefault()
            void attach(files)
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          void attach(Array.from(e.dataTransfer.files))
        }}
        placeholder="Registre una llamada, un correo o un acuerdo. Puede pegar capturas del chat con Ctrl+V."
        className="w-full resize-none bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
      />
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {images.map((src, i) => (
            <li key={src} className="relative">
              <img src={src} alt={`Captura ${i + 1}`} className="size-16 rounded-lg border border-stone-200 object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                aria-label={`Quitar captura ${i + 1}`}
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-stone-700 text-white hover:bg-stone-900"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={images.length >= NOTE_IMAGES_MAX}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus />
          Adjuntar captura
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          aria-label="Adjuntar captura"
          onChange={(e) => {
            void attach(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
        <Button type="submit" size="sm" disabled={add.isPending || empty}>
          {add.isPending ? 'Guardando...' : 'Agregar nota'}
        </Button>
      </div>
    </form>
  )
}

function NextActionCard({ lead }: { lead: LeadDetail }) {
  const [editing, setEditing] = useState(false)
  const [action, setAction] = useState(lead.nextAction ?? '')
  const [date, setDate] = useState(lead.nextActionAt ?? '')
  const save = useLeadMutation(() =>
    api<LeadDetail>(`/leads/${lead.code}`, { method: 'PATCH', json: { nextAction: action, nextActionAt: date } }),
  )
  const closed = CLOSED_STATUSES.includes(lead.status)
  const overdue = Boolean(lead.nextActionAt) && (lead.nextActionAt ?? '') < todayIso() && closed === false
  const isToday = lead.nextActionAt === todayIso()

  return (
    <Card className={cn(overdue && 'border-red-200 ring-1 ring-red-100')}>
      <CardHeader className="items-center">
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className={cn('size-4', overdue ? 'text-red-500' : 'text-brand-500')} />
          Proxima accion
        </CardTitle>
        {lead.canEdit && editing === false && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {lead.nextAction ? 'Cambiar' : 'Definir'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await save.mutateAsync(undefined)
                setEditing(false)
                toast.success('Proxima accion actualizada')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
              }
            }}
          >
            <Input
              aria-label="Accion"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Ej.: Enviar cotizacion"
            />
            <Input aria-label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={save.isPending}>
                Guardar
              </Button>
            </div>
          </form>
        ) : lead.nextAction ? (
          <>
            <p className="text-base font-medium text-stone-900">{lead.nextAction}</p>
            {lead.nextActionAt && (
              <p
                className={cn(
                  'mt-1 text-sm',
                  overdue ? 'font-medium text-red-600' : isToday ? 'font-medium text-amber-700' : 'text-stone-500',
                )}
              >
                {isToday ? 'Hoy' : formatDate(lead.nextActionAt, { weekday: 'long' })}
                {overdue ? ', vencida' : null}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-stone-500">
            {closed ? 'Lead cerrado, no requiere seguimiento.' : 'Sin proxima accion. Defina una para no perder el seguimiento.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function AssigneeCard({ lead }: { lead: LeadDetail }) {
  const user = useUser()
  const catalogs = useCatalogs()
  const save = useLeadMutation((assignedToId: string) =>
    api<LeadDetail>(`/leads/${lead.code}`, { method: 'PATCH', json: { assignedToId } }),
  )
  // El API solo deja a los vendedores asignarse a si mismos, asi que a ellos se les muestra sin selector.
  const canReassign = lead.canEdit && ROLES_WITH_GLOBAL_SCOPE.includes(user.role)

  return (
    <Card className={cn(!lead.assignedTo && 'border-amber-200 ring-1 ring-amber-100')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className={cn('size-4', lead.assignedTo ? 'text-brand-500' : 'text-amber-500')} />
          Responsable
        </CardTitle>
      </CardHeader>
      <CardContent>
        {canReassign ? (
          <>
            <label htmlFor="assignee" className="sr-only">
              Responsable
            </label>
            <NativeSelect
              id="assignee"
              value={lead.assignedTo?.id ?? ''}
              disabled={save.isPending}
              onChange={async (e) => {
                const name = e.target.selectedOptions[0]?.text
                try {
                  await save.mutateAsync(e.target.value)
                  toast.success(`Lead asignado a ${name}`)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'No se pudo asignar')
                }
              }}
            >
              {!lead.assignedTo && (
                <option value="" disabled>
                  Sin asignar
                </option>
              )}
              {(catalogs.data?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </NativeSelect>
            <p className="mt-2 text-xs text-stone-500">
              {lead.assignedTo ? 'Al cambiarlo se le avisa al nuevo responsable.' : 'Elija quien atiende este lead.'}
            </p>
          </>
        ) : lead.assignedTo ? (
          <PersonChip name={lead.assignedTo.name} />
        ) : (
          <p className="text-sm text-stone-500">Sin asignar</p>
        )}
      </CardContent>
    </Card>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-56 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )
}

export function LeadDetailPage() {
  const { code = '' } = useParams()
  const lead = useLead(code)
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [statusOpen, setStatusOpen] = useState(false)
  const [pick, setPick] = useState<LeadStatus>()
  const [dialogKey, setDialogKey] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const duplicates = useDuplicates(lead.data?.phone, lead.data?.email, code)

  if (lead.isPending) return <DetailSkeleton />
  if (lead.isError) return <ErrorState message={lead.error.message} onRetry={() => lead.refetch()} />
  const l = lead.data

  const openStatus = (s?: LeadStatus) => {
    setPick(s)
    setDialogKey((k) => k + 1)
    setStatusOpen(true)
  }

  // Volver en el historial conserva los filtros de la lista o el tablero de donde se vino; si se entro
  // directo por un enlace (aviso de WhatsApp), no hay a donde volver y se cae en la lista.
  const goBack = () => (location.key === 'default' ? navigate('/leads') : navigate(-1))

  const remove = async () => {
    try {
      await api(`/leads/${l.code}`, { method: 'DELETE' })
      await qc.invalidateQueries({ queryKey: ['leads'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`Lead ${l.code} eliminado`)
      navigate('/leads')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  return (
    <>
      <nav aria-label="Ruta" className="mb-4 flex items-center gap-1 text-sm text-stone-500">
        <Button variant="secondary" size="icon" className="mr-2" onClick={goBack} aria-label="Volver" title="Volver">
          <ArrowLeft />
        </Button>
        <Link to="/leads" className="hover:text-stone-900">
          Leads
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-mono text-stone-700">{l.code}</span>
      </nav>

      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Avatar name={l.contactName} className="hidden size-14 text-base sm:inline-flex" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-stone-900">{l.contactName}</h1>
                <StatusBadge status={l.status} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                {l.company && (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="size-4 text-stone-400" />
                    {l.company}
                  </span>
                )}
                <ChannelLabel auto={l.autoCaptured} channel={l.channel} />
                <span>
                  {l.businessLine.name}
                  {l.product && ` / ${l.product.name}`}
                </span>
              </p>
              <div className="mt-4">
                <ContactActions lead={l} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {l.canEdit && (
              <>
                <Button onClick={() => openStatus()}>Actualizar estado</Button>
                <Button variant="secondary" asChild>
                  <Link to={`/leads/${l.code}/editar`}>
                    <Pencil />
                    Editar
                  </Link>
                </Button>
              </>
            )}
            {l.canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-stone-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => setConfirmDelete(true)}
                aria-label="Eliminar lead"
                title="Eliminar lead"
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-stone-100 bg-stone-50/50 px-5 py-6 sm:px-6">
          <Stepper lead={l} onPick={openStatus} />
          {l.status === 'PERDIDO' && l.lossReason && (
            <p className="mt-4 rounded-md bg-white px-3 py-2 text-sm text-stone-600 ring-1 ring-stone-200">
              <span className="font-medium">Motivo de perdida:</span> {l.lossReason}
            </p>
          )}
        </div>
      </Card>

      <DuplicateWarning matches={duplicates.data} className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Consulta del cliente</CardTitle>
              <span className="text-xs text-stone-500">Ingreso el {formatDate(l.entryDate)}</span>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line text-stone-700">{l.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bitacora de gestion</CardTitle>
              <span className="text-xs text-stone-500">{l.interactions.length} registros</span>
            </CardHeader>
            <CardContent className="space-y-6">
              {l.canEdit && <NoteForm lead={l} />}
              <Timeline items={l.interactions} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <NextActionCard key={`${l.nextAction}-${l.nextActionAt}`} lead={l} />

          <AssigneeCard lead={l} />

          <Card>
            <CardHeader>
              <CardTitle>Detalle</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <dl className="divide-y divide-stone-100">
                <Info label="Codigo">
                  <span className="font-mono">{l.code}</span>
                </Info>
                <Info label="Telefono">{l.phone}</Info>
                <Info label="Correo">{l.email && <span className="break-all">{l.email}</span>}</Info>
                <Info label="Producto">{l.product?.name}</Info>
                <Info label="Registrado por">{l.createdBy?.name}</Info>
                <Info label="Ultima actualizacion">
                  <span title={formatDateTime(l.updatedAt)}>{relativeTime(l.updatedAt)}</span>
                </Info>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <StatusDialog key={dialogKey} lead={l} open={statusOpen} onOpenChange={setStatusOpen} initial={pick} />
      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar lead"
        description={`Se eliminara ${l.code} con toda su bitacora. Esta accion no se puede deshacer.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={remove}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-stone-600">
          Si el lead solo dejo de ser relevante, considere marcarlo como <strong>{STATUS_LABELS.PERDIDO}</strong>: asi se
          conserva el historial en el tablero.
        </p>
      </Dialog>
    </>
  )
}
