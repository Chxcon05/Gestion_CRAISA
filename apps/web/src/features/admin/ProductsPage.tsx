import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState, PageHeader } from '@/components/states'
import { useCatalogs } from '@/features/leads/hooks'

function useCatalogMutation<V>(fn: (v: V) => Promise<unknown>, done: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalogs'] })
      toast.success(done)
    },
    onError: (e) => toast.error(e.message),
  })
}

function InlineAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => Promise<unknown> }) {
  const [name, setName] = useState('')
  const valid = name.trim().length >= 2
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (valid === false) return
    await onAdd(name.trim())
    setName('')
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        aria-label={placeholder}
        placeholder={placeholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8"
      />
      <Button type="submit" size="sm" variant="secondary" disabled={valid === false}>
        <Plus />
        Agregar
      </Button>
    </form>
  )
}

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? 'Clic para desactivar' : 'Clic para activar'}
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        active ? 'bg-lime-soft text-lime-ink ring-lime-brand/40' : 'bg-stone-100 text-stone-500 ring-stone-400/20',
      )}
    >
      {active ? 'Activo' : 'Inactivo'}
    </button>
  )
}

export function ProductsPage() {
  const catalogs = useCatalogs()
  const addLine = useCatalogMutation(
    (name: string) => api('/catalogs/lines', { method: 'POST', json: { name } }),
    'Linea agregada',
  )
  const patchLine = useCatalogMutation(
    ({ id, active }: { id: string; active: boolean }) => api(`/catalogs/lines/${id}`, { method: 'PATCH', json: { active } }),
    'Linea actualizada',
  )
  const addProduct = useCatalogMutation(
    (v: { name: string; businessLineId: string }) => api('/catalogs/products', { method: 'POST', json: v }),
    'Producto agregado',
  )
  const patchProduct = useCatalogMutation(
    ({ id, active }: { id: string; active: boolean }) =>
      api(`/catalogs/products/${id}`, { method: 'PATCH', json: { active } }),
    'Producto actualizado',
  )

  return (
    <>
      <PageHeader
        title="Productos"
        description="Lo que el cliente puede consultar, agrupado por linea de negocio. Es la lista que aparece al registrar o editar un lead; desactivar una opcion la oculta sin cambiar los leads que ya la tienen."
      />
      {catalogs.isPending ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : catalogs.isError ? (
        <Card>
          <ErrorState message={catalogs.error.message} onRetry={() => catalogs.refetch()} />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Nueva linea de negocio</CardTitle>
                <CardDescription>Agrupa productos afines, por ejemplo Agricola o Construccion. Cada linea tiene su propia tarjeta abajo.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <InlineAdd placeholder="Nombre de la linea" onAdd={(name) => addLine.mutateAsync(name)} />
            </CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {catalogs.data.lines.map((line) => {
              const products = catalogs.data.products.filter((p) => p.businessLineId === line.id)
              return (
                <Card key={line.id} className={cn(line.active ? '' : 'opacity-70')}>
                  <CardHeader className="items-center">
                    <CardTitle>{line.name}</CardTitle>
                    <Toggle active={line.active} onClick={() => patchLine.mutate({ id: line.id, active: line.active === false })} />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {products.length === 0 ? (
                      <p className="text-sm text-stone-500">Sin productos.</p>
                    ) : (
                      <ul className="divide-y divide-stone-100">
                        {products.map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                            <span className={cn(p.active ? 'text-stone-800' : 'text-stone-400 line-through')}>{p.name}</span>
                            <Toggle
                              active={p.active}
                              onClick={() => patchProduct.mutate({ id: p.id, active: p.active === false })}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                    <InlineAdd
                      placeholder="Nuevo producto"
                      onAdd={(name) => addProduct.mutateAsync({ name, businessLineId: line.id })}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
