import { useState } from 'react'
import { toast } from 'sonner'
import { LEAD_STATUSES, STATUS_LABELS, type LeadDetail, type LeadStatus } from '@craisa/shared'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { STATUS_STYLES } from '@/components/status'
import { useLeadMutation } from './hooks'

interface Props {
  lead: LeadDetail
  open: boolean
  onOpenChange: (o: boolean) => void
  initial?: LeadStatus
}

// El padre lo remonta con una key nueva en cada apertura, asi el estado interno arranca limpio.
export function StatusDialog({ lead, open, onOpenChange, initial }: Props) {
  const [status, setStatus] = useState<LeadStatus>(initial ?? lead.status)
  const [note, setNote] = useState('')
  const [lossReason, setLossReason] = useState(lead.lossReason ?? '')
  const [error, setError] = useState<string>()


  const change = useLeadMutation(() =>
    api<LeadDetail>(`/leads/${lead.code}/status`, { method: 'POST', json: { status, note, lossReason } }),
  )

  const submit = async () => {
    if (status === 'PERDIDO' && lossReason.trim() === '') {
      setError('Indique el motivo de perdida')
      return
    }
    try {
      await change.mutateAsync(undefined)
      toast.success(`Estado actualizado a ${STATUS_LABELS[status]}`)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? (e.fields?.lossReason ?? e.message) : 'No se pudo actualizar')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Actualizar estado"
      description={`${lead.code} - ${lead.contactName}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={change.isPending || (status === lead.status && note.trim() === '')}>
            {change.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-stone-700">Nuevo estado</legend>
          <div className="grid grid-cols-2 gap-2">
            {LEAD_STATUSES.map((s) => (
              <label
                key={s}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                  status === s ? 'border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-500' : 'border-stone-200 hover:bg-stone-50',
                )}
              >
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  className="sr-only"
                />
                <span className={cn('size-2 rounded-full', STATUS_STYLES[s].dot)} aria-hidden />
                {STATUS_LABELS[s]}
                {s === lead.status && <span className="ml-auto text-[11px] text-stone-400">actual</span>}
              </label>
            ))}
          </div>
        </fieldset>
        {status === 'PERDIDO' && (
          <Field label="Motivo de perdida" htmlFor="lossReason" required error={error}>
            <Input
              id="lossReason"
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              placeholder="Ej.: Compro a la competencia"
            />
          </Field>
        )}
        <Field label="Nota de gestion" htmlFor="statusNote" hint="Queda registrada en la bitacora del lead.">
          <Textarea id="statusNote" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && status !== 'PERDIDO' && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  )
}
