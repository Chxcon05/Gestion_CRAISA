import { useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { FolderTree, Inbox, LayoutDashboard, LogOut, Menu as MenuIcon, Plus, Search, Users } from 'lucide-react'
import { ROLE_LABELS, type Paginated } from '@craisa/shared'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useLogout, useUser } from './auth'
import { Avatar } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/dialog'

const NAV = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/leads', label: 'Leads', icon: Inbox, badge: true },
]
const ADMIN_NAV = [
  { to: '/admin/catalogos', label: 'Catalogos', icon: FolderTree },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
]

// Comparte cache con el resto de consultas de leads, asi que se refresca al gestionar cualquier lead.
function useOverdueCount() {
  return useQuery({
    queryKey: ['leads', 'overdue-count'],
    queryFn: () => api<Paginated<unknown>>('/leads?overdue=1&pageSize=5'),
    select: (d) => d.total,
    staleTime: 60_000,
  })
}

export function Logo({ className }: { className?: string }) {
  // El archivo trae el sello Carbono Neutral a la derecha; se recorta para mostrar solo la marca.
  return (
    <span className={cn('block h-8 w-[5.6rem] overflow-hidden', className)}>
      <img src="/logo-craisa.png" alt="CRAISA" className="h-full max-w-none" />
    </span>
  )
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const user = useUser()
  const overdue = useOverdueCount()
  const link = (item: { to: string; label: string; icon: typeof Inbox; end?: boolean; badge?: boolean }) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className={cn('size-[18px]', isActive ? 'text-brand-700' : 'text-slate-400 group-hover:text-slate-600')} />
          <span className="flex-1">{item.label}</span>
          {item.badge && Boolean(overdue.data) && (
            <span
              title="Acciones vencidas"
              className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 tabular-nums"
            >
              {overdue.data}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
  return (
    <nav aria-label="Principal" className="flex flex-1 flex-col gap-6 px-3">
      <div className="space-y-0.5">{NAV.map(link)}</div>
      {user.role === 'ADMIN' && (
        <div className="space-y-0.5">
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Administracion</p>
          {ADMIN_NAV.map(link)}
        </div>
      )}
    </nav>
  )
}

function UserCard() {
  const user = useUser()
  const logout = useLogout()
  return (
    <div className="mx-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <Avatar name={user.name} className="size-9 text-xs" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
        <p className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
      </div>
      <Button variant="ghost" size="icon" className="size-8 text-slate-400" onClick={logout} aria-label="Cerrar sesion" title="Cerrar sesion">
        <LogOut />
      </Button>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 bg-white py-5">
      <Link to="/" onClick={onNavigate} className="px-6" aria-label="CRAISA, ir al inicio">
        <Logo />
      </Link>
      <div className="px-3">
        <Button asChild className="w-full justify-start" size="lg">
          <Link to="/leads/nuevo" onClick={onNavigate}>
            <Plus />
            Nuevo lead
          </Link>
        </Button>
      </div>
      <NavItems onNavigate={onNavigate} />
      <UserCard />
    </div>
  )
}

function GlobalSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/leads?q=${encodeURIComponent(q.trim())}` : '/leads')
    setQ('')
  }
  return (
    <search className="block w-full max-w-md">
    <form onSubmit={submit} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar cliente, empresa o codigo de lead"
        aria-label="Buscar leads"
        className="h-10 w-full rounded-full border border-slate-200 bg-slate-100/70 pr-4 pl-9 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/15 focus:outline-none"
      />
    </form>
    </search>
  )
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-slate-50 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 lg:block">
        <SidebarContent />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </Sheet>

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <MenuIcon className="size-5" />
        </Button>
        <Link to="/" className="lg:hidden" aria-label="CRAISA, ir al inicio">
          <Logo className="h-6 w-[4.25rem]" />
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
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
