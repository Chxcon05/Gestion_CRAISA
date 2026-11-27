import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import type { DuplicateMatch } from '@craisa/shared'
import { api, toSearch } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/status'

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

// Mismo umbral que el API: con menos de 7 digitos o un correo incompleto no vale la pena consultar.
const worthChecking = (phone: string, email: string) => phone.replace(/\D/g, '').length >= 7 || /.+@.+\..+/.test(email)

export function useDuplicates(phone: string | null | undefined, email: string | null | undefined, exclude?: string) {
  const p = useDebounced(phone?.trim() ?? '', 400)
  const e = useDebounced(email?.trim() ?? '', 400)
  return useQuery({
    queryKey: ['duplicates', p, e, exclude],
    queryFn: () => api<DuplicateMatch[]>(`/leads/duplicates${toSearch({ phone: p, email: e, exclude })}`),
    enabled: worthChecking(p, e),
    staleTime: 30_000,
  })
}

const MATCH_LABEL = { email: 'correo', phone: 'telefono' } as const

// onMerge solo llega en el detalle y para el admin: en el formulario el lead todavia no existe.
export function DuplicateWarning({
  matches,
  className,
  onMerge,
}: {
  matches: DuplicateMatch[] | undefined
  className?: string
  onMerge?: (m: DuplicateMatch) => void
}) {
  if (!matches?.length) return null
  return (
    <output className={cn('block rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900', className)}>
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        {matches.length === 1 ? 'Este cliente ya tiene un lead' : `Este cliente ya tiene ${matches.length} leads`}
      </p>
      <ul className="mt-2 space-y-1.5">
        {matches.map((m) => (
          <li key={m.code} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {m.canOpen ? (
              <Link to={`/leads/${m.code}`} className="font-mono text-xs font-medium underline underline-offset-2 hover:text-amber-950">
                {m.code}
              </Link>
            ) : (
              <span className="font-mono text-xs font-medium">{m.code}</span>
            )}
            <span>{m.contactName}</span>
            <StatusBadge status={m.status} />
            <span className="text-xs text-amber-800">
              {formatDate(m.entryDate)} / {m.assignedTo ? m.assignedTo.name : 'Sin asignar'} / mismo{' '}
              {m.matchedBy.map((k) => MATCH_LABEL[k]).join(' y ')}
            </span>
            {onMerge && m.canOpen && (
              <button
                type="button"
                onClick={() => onMerge(m)}
                className="rounded-md border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
              >
                Fusionar
              </button>
            )}
          </li>
        ))}
      </ul>
    </output>
  )
}
