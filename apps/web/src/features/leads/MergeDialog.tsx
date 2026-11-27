import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { DuplicateMatch, LeadDetail } from '@craisa/shared'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/status'

type Side = { code: string; company: string | null; contactName: string; owner: string; status: LeadDetail['status'] }

function Column({ side, keep, onKeep }: { side: Side; keep: boolean; onKeep: () => void }) {
  return (
    <label
      className={cn(
        'block cursor-pointer rounded-xl border p-3 text-sm transition-colors',
        keep ? 'border-brand-300 bg-brand-50/60' : 'border-stone-200 hover:border-stone-300',
      )}
    >
      <span className="flex items-center gap-2 font-medium">
        <input type="radio" name="merge-keep" checked={keep} onChange={onKeep} className="accent-brand-700" />
        Conservar este
      </span>
      <span className="mt-2 block font-mono text-xs text-stone-500">{side.code}</span>
      <span className="block font-medium text-stone-900">{side.contactName}</span>
      {side.company && <span className="block text-stone-600">{side.company}</span>}
      <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <StatusBadge status={side.status} />
        {side.owner}
      </span>
    </label>
  )
}

export function MergeDialog({ lead, other, onClose }: { lead: LeadDetail; other: DuplicateMatch; onClose: () => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [keepOther, setKeepOther] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const mine: Side = { ...lead, owner: lead.assignedTo?.name ?? 'Sin asignar' }
  const theirs: Side = { ...other, owner: other.assignedTo?.name ?? 'Sin asignar' }
  const [keep, drop] = keepOther ? [theirs, mine] : [mine, theirs]

  const submit = async () => {
    setBusy(true)
    try {
      const merged = await api<LeadDetail>(`/leads/${keep.code}/merge`, { method: 'POST', json: { from: drop.code } })
      qc.setQueryData(['lead', merged.code], merged)
      qc.removeQueries({ queryKey: ['lead', drop.code] })
      void qc.invalidateQueries({ queryKey: ['leads'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      void qc.invalidateQueries({ queryKey: ['duplicates'] })
      toast.success(`${drop.code} se fusiono en ${keep.code}`)
      onClose()
      if (keepOther) navigate(`/leads/${keep.code}`, { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo fusionar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Fusionar leads"
      description="La bitacora del otro lead pasa al que se conserva y el otro se elimina. No se puede deshacer."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            Fusionar
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Column side={mine} keep={!keepOther} onKeep={() => setKeepOther(false)} />
        <Column side={theirs} keep={keepOther} onKeep={() => setKeepOther(true)} />
      </div>
      <p className="mt-3 text-xs text-stone-500">Del otro lead solo se toman los datos que le falten al conservado, como el correo o la empresa.</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </Dialog>
  )
}
