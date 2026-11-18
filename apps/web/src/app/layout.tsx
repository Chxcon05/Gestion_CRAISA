import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Inbox, LayoutDashboard, LogOut, Menu as MenuIcon, Package, Plus, Search, Users } from 'lucide-react'
import { ROLE_LABELS } from '@craisa/shared'
import { cn } from '@/lib/utils'
import { useLogout, useUser } from './auth'
import { Avatar } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'
import { NotificationsBell, useNotifications } from '@/features/notifications/NotificationsBell'

const NAV = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/leads', label: 'Leads', icon: Inbox, badge: true },
]
const ADMIN_NAV = [
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

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const user = useUser()
  const overdue = useNotifications((d) => d.overdue)
  const link = (item: { to: string; label: string; icon: typeof Inbox; end?: boolean; badge?: boolean }) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700 before:absolute before:top-1/2 before:-left-4 before:h-7 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-brand-600'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className={cn('size-[18px]', isActive ? 'text-brand-600' : 'text-slate-500 group-hover:text-slate-700')} />
          <span className="flex-1">{item.label}</span>
          {item.badge && Boolean(overdue.data) && (
            <span
              title="Acciones vencidas"
              className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 tabular-nums"
            >
              {overdue.data}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
  return (
    <nav aria-label="Principal" className="flex flex-1 flex-col gap-4 px-4">
      <div className="space-y-1">{NAV.map(link)}</div>
      {user.role === 'ADMIN' && (
        <div className="space-y-1 border-t border-slate-100 pt-4">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Administracion</p>
          {ADMIN_NAV.map(link)}
        </div>
      )}
    </nav>
  )
}

// La accion mas frecuente del equipo va abajo y destacada: llamadas, ferias y visitas no entran solas.
function NewLeadCard({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="relative mx-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-800 to-brand-950 p-4 text-white">
      <span
        aria-hidden
        className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:12px_12px] [mask-image:linear-gradient(to_bottom_left,black,transparent_60%)]"
      />
      <span className="relative mb-3 flex size-8 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
        <Plus className="size-4" />
      </span>
      <p className="relative text-[15px] font-semibold">Registrar consulta</p>
      <p className="relative mt-1 text-xs leading-relaxed text-brand-100/90">Llamadas, ferias y visitas tambien son leads.</p>
      <Button asChild size="md" className="relative mt-3 w-full bg-white text-brand-700 shadow-none hover:bg-brand-50">
        <Link to="/leads/nuevo" onClick={onNavigate}>
          Nuevo lead
        </Link>
      </Button>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5 bg-white pb-4">
      <Link to="/" onClick={onNavigate} className="flex h-16 shrink-0 items-center border-b border-slate-100 px-7" aria-label="CRAISA, ir al inicio">
        <Logo />
      </Link>
      <NavItems onNavigate={onNavigate} />
      <NewLeadCard onNavigate={onNavigate} />
    </div>
  )
}

function GlobalSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  // Ctrl+K (Cmd+K en Mac) enfoca el buscador desde cualquier pantalla, como en la mayoria de las apps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/leads?q=${encodeURIComponent(q.trim())}` : '/leads')
    setQ('')
  }
  return (
    <search className="block w-full max-w-md">
      <form onSubmit={submit} className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente, empresa o codigo..."
          aria-label="Buscar leads"
          className="h-10 w-full rounded-full border border-slate-200 bg-white pr-16 pl-10 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:outline-none"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[11px] text-slate-400 md:block">
          Ctrl K
        </kbd>
      </form>
    </search>
  )
}

const roundIcon = 'flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900'

function HeaderActions() {
  const user = useUser()
  const logout = useLogout()
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <NotificationsBell className={roundIcon} />
      <div className="flex items-center gap-3 sm:border-l sm:border-slate-200 sm:pl-3">
        <Avatar name={user.name} className="size-10 text-xs max-sm:hidden" />
        <div className="hidden leading-tight md:block">
          <p className="max-w-40 truncate text-sm font-semibold text-slate-900">{user.name}</p>
          <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
        </div>
        <button type="button" className={roundIcon} onClick={logout} aria-label="Cerrar sesion" title="Cerrar sesion">
          <LogOut className="size-[18px]" />
        </button>
      </div>
    </div>
  )
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-canvas lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200/70 lg:block">
        <SidebarContent />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </Sheet>

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <MenuIcon className="size-5" />
        </Button>
        <Link to="/" className="lg:hidden" aria-label="CRAISA, ir al inicio">
          <Logo className="h-6 w-[4.3rem]" />
        </Link>
        <div className="hidden flex-1 sm:block">
          <GlobalSearch />
        </div>
        <div className="flex-1 sm:hidden" />
        {pathname !== '/leads/nuevo' && (
          <Button asChild size="icon" className="lg:hidden" aria-label="Nuevo lead">
            <Link to="/leads/nuevo">
              <Plus />
            </Link>
          </Button>
        )}
        <HeaderActions />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
