import type { ReactNode } from 'react'
import * as L from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <L.Root htmlFor={htmlFor} className="block text-[13px] font-medium text-stone-700">
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        )}
      </L.Root>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-stone-500">{hint}</p>
      )}
    </div>
  )
}
