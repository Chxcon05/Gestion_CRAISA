import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { ChevronDown, Inbox, LayoutDashboard, LogOut, Menu as MenuIcon, Package, Plus, Search, Users } from 'lucide-react'
import { ROLE_LABELS } from '@craisa/shared'
import { cn } from '@/lib/utils'
import { useLogout, useUser } from './auth'
import { Avatar } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { NotificationsBell, useNotifications } from '@/features/notifications/NotificationsBell'

type NavEntry = { to: string; label: string; icon: typeof Inbox; end?: boolean; badge?: boolean }

const NAV: NavEntry[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/leads', label: 'Leads', icon: Inbox, badge: true },
]
const ADMIN_NAV: NavEntry[] = [
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
]

export function Logo({ className }: { className?: string }) {
  // El archivo trae el sello Carbono Neutral a la derecha; se recorta para mostrar solo la marca.
  return (
    <span className={cn('block h-8 w-[5.7rem] overflow-hidden', className)}>
      <img src="/logo-craisa.png" alt="CRAISA" className="h-full max-w-none" />
    </span>
  )
}

function useNavEntries() {
  const user = useUser()
  return user.role === 'ADMIN' ? [...NAV, ...ADMIN_NAV] : NAV
}

function OverdueBadge() {
  const overdue = useNotifications((d) => d.overdue)
  if (!overdue.data) return null
  return (
    <span title="Acciones vencidas" className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white tabular-nums">
      {overdue.data}
    </span>
  )
}

// La marca de la seccion activa va inclinada como el logotipo de CRAISA: es el detalle que la distingue de una plantilla.
function TopNav() {
  const entries = useNavEntries()
  return (
    <nav aria-label="Principal" className="hidden h-full items-stretch gap-1 lg:flex">
      {entries.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'relative inline-flex items-center gap-2 px-3 text-sm font-medium transition-colors',
              isActive
                ? 'text-stone-900 after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:-skew-x-[20deg] after:bg-brand-700'
                : 'text-stone-500 hover:text-stone-900',
            )
          }
        >
          {item.label}
          {item.badge && <OverdueBadge />}
        </NavLink>
      ))}
    </nav>
  )
}

function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  const entries = useNavEntries()
  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <Link to="/" onClick={onNavigate} aria-label="CRAISA, ir al inicio">
        <Logo />
      </Link>
      <GlobalSearch onDone={onNavigate} />
      <nav aria-label="Principal" className="space-y-1">
        {entries.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium',
                isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
              )
            }
          >
            <item.icon className="size-[18px]" />
            <span className="flex-1">{item.label}</span>
            {item.badge && <OverdueBadge />}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function GlobalSearch({ onDone }: { onDone?: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  // Ctrl+K (Cmd+K en Mac) enfoca el buscador desde cualquier pantalla, como en la mayoria de las apps.
  useEffect(() => {
    if (onDone) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/leads?q=${encodeURIComponent(q.trim())}` : '/leads')
    setQ('')
    onDone?.()
  }
  return (
    <search className="block w-full">
      <form onSubmit={submit} className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar leads..."
          aria-label="Buscar leads"
          className="h-9 w-full rounded-lg border border-transparent bg-stone-100 pr-14 pl-9 text-sm placeholder:text-stone-400 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-600/20 focus:outline-none"
        />
        {!onDone && (
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-stone-200 bg-white px-1.5 py-0.5 font-sans text-[10px] text-stone-400 xl:block">
            Ctrl K
          </kbd>
        )}
      </form>
    </search>
  )
}

function UserMenu() {
  const user = useUser()
  const logout = useLogout()
  return (
    <Menu>
      <MenuTrigger className="flex items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 text-left hover:bg-stone-100" aria-label="Cuenta de usuario">
        <Avatar name={user.name} className="size-8 text-xs" />
        <span className="hidden max-w-36 truncate text-sm font-medium text-stone-800 xl:block">{user.name}</span>
        <ChevronDown className="hidden size-4 text-stone-400 sm:block" />
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>
          <span className="block font-medium text-stone-900">{user.name}</span>
          {ROLE_LABELS[user.role]}
        </MenuLabel>
        <MenuSeparator />
        <MenuItem onSelect={logout}>
          <LogOut />
          Cerrar sesion
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-canvas">
      <Sheet open={open} onOpenChange={setOpen}>
        <MobileNav onNavigate={() => setOpen(false)} />
      </Sheet>

      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:gap-8 lg:px-8">
          <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <MenuIcon className="size-5" />
          </Button>
          <Link to="/" aria-label="CRAISA, ir al inicio" className="shrink-0">
            <Logo className="h-7 w-[5rem]" />
          </Link>
          <TopNav />
          <div className="flex-1" />
          <div className="hidden w-56 md:block xl:w-64">
            <GlobalSearch />
          </div>
          <Button asChild className="max-sm:size-9 max-sm:px-0">
            <Link to="/leads/nuevo">
              <Plus />
              <span className="max-sm:sr-only">Nuevo lead</span>
            </Link>
          </Button>
          <NotificationsBell className="flex size-9 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900" />
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
