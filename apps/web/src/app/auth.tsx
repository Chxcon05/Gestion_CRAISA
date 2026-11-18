import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation } from 'react-router'
import type { Role, SessionUser } from '@craisa/shared'
import { api, ApiError } from '@/lib/api'
import { PageLoader } from '@/components/page-loader'

const AuthContext = createContext<SessionUser | null>(null)

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<SessionUser>('/auth/me'),
    retry: (n, e) => !(e instanceof ApiError && e.status === 401) && n < 2,
    staleTime: 5 * 60_000,
  })
}

export function useUser() {
  const u = useContext(AuthContext)
  if (!u) throw new Error('useUser fuera de RequireAuth')
  return u
}

export function useLogout() {
  const qc = useQueryClient()
  return async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    qc.clear()
    window.location.assign('/login')
  }
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe()
  const location = useLocation()
  if (me.isPending) {
    return <PageLoader />
  }
  if (me.isError) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <AuthContext.Provider value={me.data}>{children}</AuthContext.Provider>
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const u = useUser()
  if (!roles.includes(u.role)) return <Navigate to="/" replace />
  return <>{children}</>
}
