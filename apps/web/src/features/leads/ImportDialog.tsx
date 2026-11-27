import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, Download, FileSpreadsheet } from 'lucide-react'
import { IMPORT_MAX_BYTES, type ImportPreview, type ImportResult } from '@craisa/shared'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

// Los errores llegan por campo del lead; se muestran con el nombre de la columna que ve el usuario en Excel.
const COLUMN_OF: Record<string, string> = {
  assignedToId: 'Responsable',
  businessLineId: 'Linea',
  channel: 'Canal',
  company: 'Empresa',
  contactName: 'Nombre',
  description: 'Descripcion',
  email: 'Correo',
  entryDate: 'Fecha de ingreso',
  phone: 'Telefono',
  productId: 'Producto',
}

const leads = (n: number) => (n === 1 ? '1 lead' : `${n} leads`)

function readBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(new Error('No se pudo leer el archivo'))
    r.readAsDataURL(file)
  })
}

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [payload, setPayload] = useState<{ data: string; fileName: string }>()
  const [preview, setPreview] = useState<ImportPreview>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const reset = () => {
    setPayload(undefined)
    setPreview(undefined)
    setError(undefined)
  }

  const pick = async (file: File | undefined) => {
    reset()
    if (!file) return
    if (file.size > IMPORT_MAX_BYTES) {
      setError('El archivo debe pesar menos de 5 MB')
      return
    }
    setBusy(true)
    try {
      const next = { data: await readBase64(file), fileName: file.name }
      setPreview(await api<ImportPreview>('/leads/import/preview', { method: 'POST', json: next }))
      setPayload(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo revisar el archivo')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!payload) return
    setBusy(true)
    try {
      const res = await api<ImportResult>('/leads/import', { method: 'POST', json: payload })
      toast.success(res.created === 1 ? 'Se importo 1 lead' : `Se importaron ${res.created} leads`)
      void qc.invalidateQueries({ queryKey: ['leads'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      reset()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo importar')
    } finally {
      setBusy(false)
    }
  }

  const withIssues = preview?.rows.filter((r) => Object.keys(r.errors).length || r.duplicates.length) ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
      title="Importar leads desde Excel"
      description="Primero se revisa el archivo; no se crea nada hasta que confirme."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void confirm()} disabled={busy || !preview?.valid}>
            Importar {leads(preview?.valid ?? 0)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          Use la plantilla: trae las columnas en orden y listas para canal, linea y responsable.{' '}
          <a href="/api/leads/import/template.xlsx" download className="inline-flex items-center gap-1 font-medium text-brand-700 underline underline-offset-2">
            <Download className="size-3.5" aria-hidden />
            Descargar plantilla
          </a>
        </p>
        <Field label="Archivo de Excel" htmlFor="import-file" error={error}>
          <Input
            id="import-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            onChange={(e) => void pick(e.target.files?.[0])}
          />
        </Field>

        {busy && !preview && <p className="text-sm text-stone-500">Revisando el archivo...</p>}

        {preview && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium text-stone-800">
              <FileSpreadsheet className="size-4 text-brand-700" aria-hidden />
              {preview.valid === 1 ? '1 listo para importar' : `${preview.valid} listos para importar`}
              {preview.invalid > 0 && <span className="text-red-600">, {preview.invalid} con errores</span>}
            </p>
            {withIssues.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-stone-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-stone-50 text-left text-xs text-stone-500">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Fila
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Nombre
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Revision
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {withIssues.map((r) => (
                      <tr key={r.row} className="align-top">
                        <td className="px-3 py-2 text-stone-500 tabular-nums">{r.row}</td>
                        <td className="px-3 py-2">{r.contactName || <span className="text-stone-400">Sin nombre</span>}</td>
                        <td className="space-y-1 px-3 py-2">
                          {Object.entries(r.errors).map(([k, msg]) => (
                            <p key={k} className="text-red-600">
                              {COLUMN_OF[k] ? `${COLUMN_OF[k]}: ` : ''}
                              {msg}
                            </p>
                          ))}
                          {r.duplicates.length > 0 && (
                            <p className="flex items-start gap-1 text-amber-700">
                              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                              Mismo cliente que {r.duplicates.join(', ')}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-stone-500">Las filas con errores no se importan. Los posibles duplicados si: revise despues si conviene fusionarlos.</p>
          </div>
        )}
      </div>
    </Dialog>
  )
}
