import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { ROLES, ROLE_LABELS, userCreateSchema, type Role } from '@craisa/shared'
import type { z } from 'zod'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUser } from '@/app/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, ErrorState, PageHeader } from '@/components/states'

interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  whatsapp: string | null
  createdAt: string
}
type NewUser = z.input<typeof userCreateSchema>
type NewUserData = z.output<typeof userCreateSchema>

function NewUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState } = useForm<NewUser, unknown, NewUserData>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { role: 'VENDEDOR' },
  })
  const create = useMutation({
    mutationFn: (v: NewUserData) => api('/users', { method: 'POST', json: v }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['catalogs'] })
      toast.success('Usuario creado')
      reset()
      onOpenChange(false)
    },
    onError: (e) => toast.error(e.message),
  })
  const e = formState.errors
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo usuario"
      description="Comparta la contrasena inicial por un canal seguro."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button form="new-user" type="submit" disabled={create.isPending}>
            Crear usuario
          </Button>
        </>
      }
    >
      <form id="new-user" noValidate onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4">
        <Field label="Nombre" htmlFor="u-name" required error={e.name?.message}>
          <Input id="u-name" {...register('name')} aria-invalid={Boolean(e.name)} />
        </Field>
        <Field label="Correo" htmlFor="u-email" required error={e.email?.message}>
          <Input id="u-email" type="email" {...register('email')} aria-invalid={Boolean(e.email)} />
        </Field>
        <Field label="Rol" htmlFor="u-role" required>
          <NativeSelect id="u-role" {...register('role')}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="WhatsApp"
          htmlFor="u-whatsapp"
          hint="Recibe aqui el aviso de cada lead que se le asigne."
          error={e.whatsapp?.message}
        >
          <Input id="u-whatsapp" type="tel" inputMode="tel" placeholder="8888 7777" {...register('whatsapp')} aria-invalid={Boolean(e.whatsapp)} />
        </Field>
        <Field label="Contrasena inicial" htmlFor="u-pass" required error={e.password?.message}>
          <Input
            id="u-pass"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            aria-invalid={Boolean(e.password)}
          />
        </Field>
      </form>
    </Dialog>
  )
}

export function UsersPage() {
  const me = useUser()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const users = useQuery({ queryKey: ['users'], queryFn: () => api<UserRow[]>('/users') })
  const update = useMutation({
    mutationFn: ({ id, ...data }: { id: string; role?: Role; active?: boolean; whatsapp?: string }) =>
      api(`/users/${id}`, { method: 'PATCH', json: data }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['catalogs'] })
      toast.success('Usuario actualizado')
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Administrador (Mercadeo) gestiona todo y ve y exporta todos los leads; Vendedor solo los suyos."
        actions={
          <Button onClick={() => setOpen(true)}>
            <UserPlus />
            Nuevo usuario
          </Button>
        }
      />
      <Card className="overflow-hidden">
        {users.isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : users.isError ? (
          <ErrorState message={users.error.message} onRetry={() => users.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200/80 text-left text-xs font-medium text-stone-500">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Usuario
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Rol
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
                    WhatsApp
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    Alta
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Acceso
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => {
                  const self = u.id === me.id
                  return (
                    <tr key={u.id} className={cn('border-b border-stone-100 last:border-0', u.active ? '' : 'bg-stone-50/60')}>
                      <td className="px-4 py-3">
                        <div className={cn('flex items-center gap-3', u.active ? '' : 'opacity-60')}>
                          <Avatar name={u.name} className="size-8" />
                          <div>
                            <p className="font-medium text-stone-900">
                              {u.name} {self && <span className="text-xs font-normal text-stone-400">(usted)</span>}
                            </p>
                            <p className="text-xs text-stone-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <NativeSelect
                          aria-label={`Rol de ${u.name}`}
                          value={u.role}
                          disabled={self}
                          onChange={(ev) => update.mutate({ id: u.id, role: ev.target.value as Role })}
                          className="h-8 w-40"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </NativeSelect>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {/* key con el numero: tras guardar, el input se remonta con el valor que devolvio el API. */}
                        <Input
                          key={u.whatsapp ?? ''}
                          aria-label={`WhatsApp de ${u.name}`}
                          type="tel"
                          inputMode="tel"
                          placeholder="Sin numero"
                          defaultValue={u.whatsapp ?? ''}
                          onBlur={(ev) => {
                            const value = ev.target.value.trim()
                            if (value !== (u.whatsapp ?? '')) update.mutate({ id: u.id, whatsapp: value })
                          }}
                          className="h-8 w-40"
                        />
                      </td>
                      <td className="hidden px-4 py-3 text-stone-500 sm:table-cell">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant={u.active ? 'secondary' : 'primary'}
                          size="sm"
                          disabled={self}
                          onClick={() => update.mutate({ id: u.id, active: u.active === false })}
                        >
                          {u.active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <NewUserDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
