import type { ReactNode } from 'react'
import * as M from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

export const Menu = M.Root
export const MenuTrigger = M.Trigger

export function MenuContent({ children, align = 'end' }: { children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        className="z-50 min-w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
      >
        {children}
      </M.Content>
    </M.Portal>
  )
}

export function MenuItem({ className, ...props }: M.DropdownMenuItemProps) {
  return (
    <M.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 outline-none select-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 [&_svg]:size-4 [&_svg]:text-slate-400',
        className,
      )}
      {...props}
    />
  )
}

export const MenuSeparator = () => <M.Separator className="my-1 h-px bg-slate-100" />
export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <M.Label className="px-2.5 py-2 text-xs text-slate-500">{children}</M.Label>
)
