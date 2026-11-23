import type { ReactNode } from 'react'
import * as D from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Dialog({ open, onOpenChange, title, description, children, footer, className }: DialogProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-stone-950/50 data-[state=open]:animate-in" />
        <D.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-stone-200 bg-white shadow-xl focus:outline-none',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
            <div>
              <D.Title className="text-base font-semibold text-stone-900">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-sm text-stone-500">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{title}</D.Description>
              )}
            </div>
            <D.Close className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600" aria-label="Cerrar">
              <X className="size-4" />
            </D.Close>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-stone-100 bg-stone-50/60 px-5 py-3">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

export function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o: boolean) => void; children: ReactNode }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-stone-950/50" />
        <D.Content className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-xl focus:outline-none">
          <D.Title className="sr-only">Menu de navegacion</D.Title>
          <D.Description className="sr-only">Secciones del sistema</D.Description>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
