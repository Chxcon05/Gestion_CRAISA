import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 shadow-xs placeholder:text-stone-400 transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:bg-stone-50 disabled:text-stone-500 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/15'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(field, 'h-9', className)} {...props} />
))
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(field, 'min-h-24 py-2', className)} {...props} />,
)
Textarea.displayName = 'Textarea'

// Select nativo: en movil abre el selector del sistema, que es mas comodo que un popover.
export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn(field, 'h-9 appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-stone-400" />
    </div>
  ),
)
NativeSelect.displayName = 'NativeSelect'
