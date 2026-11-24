import { ArrowRightLeft, FilePlus2, MessageCircle, MessageSquareText, UserRoundCheck } from 'lucide-react'
import { STATUS_LABELS, type Interaction } from '@craisa/shared'
import { formatDateTime, relativeTime } from '@/lib/format'
import { StatusBadge } from '@/components/status'

const ICONS = {
  ASIGNACION: { icon: UserRoundCheck, className: 'bg-indigo-50 text-indigo-600', label: 'Asignacion' },
  CAMBIO_ESTADO: { icon: ArrowRightLeft, className: 'bg-amber-50 text-amber-600', label: 'Cambio de estado' },
  CREACION: { icon: FilePlus2, className: 'bg-sky-50 text-sky-600', label: 'Registro' },
  MENSAJE: { icon: MessageCircle, className: 'bg-emerald-50 text-emerald-600', label: 'Escribio' },
  NOTA: { icon: MessageSquareText, className: 'bg-stone-100 text-stone-600', label: 'Nota' },
} as const

// El texto automatico de un cambio de estado ya se ve en las insignias; solo se muestra si el usuario escribio una nota.
function hasOwnText(i: Interaction) {
  if (i.type === 'CREACION' || i.content === '') return false
  if (i.type !== 'CAMBIO_ESTADO' || i.fromStatus === null || i.toStatus === null) return true
  return i.content !== `${STATUS_LABELS[i.fromStatus]} a ${STATUS_LABELS[i.toStatus]}`
}

export function Timeline({ items }: { items: Interaction[] }) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-stone-500">Sin actividad registrada.</p>
  return (
    <ol className="relative space-y-5">
      {items.map((i, idx) => {
        const meta = ICONS[i.type]
        const Icon = meta.icon
        return (
          <li key={i.id} className="relative flex gap-3">
            {idx < items.length - 1 && <span aria-hidden className="absolute top-8 bottom-[-1.25rem] left-4 w-px bg-stone-200" />}
            <span className={`relative flex size-8 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {/* Un mensaje entrante no tiene usuario: lo escribio el cliente, no el sistema. */}
                <span className="font-medium text-stone-900">{i.type === 'MENSAJE' ? 'Cliente' : (i.user?.name ?? 'Sistema')}</span>
                <span className="text-stone-500">{meta.label.toLowerCase()}</span>
                {i.type === 'CAMBIO_ESTADO' && i.toStatus && (
                  <span className="inline-flex items-center gap-1">
                    {i.fromStatus && <span className="text-xs text-stone-400">{STATUS_LABELS[i.fromStatus]}</span>}
                    {i.fromStatus && <span className="text-xs text-stone-400">a</span>}
                    <StatusBadge status={i.toStatus} />
                  </span>
                )}
                <time className="ml-auto text-xs text-stone-400" dateTime={i.createdAt} title={formatDateTime(i.createdAt)}>
                  {relativeTime(i.createdAt)}
                </time>
              </div>
              {hasOwnText(i) && <p className="mt-1 text-sm whitespace-pre-line text-stone-700">{i.content}</p>}
              {i.attachments.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {i.attachments.map((a, n) => (
                    <li key={a.id}>
                      <a href={a.url} target="_blank" rel="noreferrer" title="Ver captura completa">
                        <img
                          src={a.url}
                          alt={`Captura ${n + 1} de la nota`}
                          loading="lazy"
                          className="h-32 w-auto max-w-56 rounded-lg border border-stone-200 object-cover transition-opacity hover:opacity-90"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
