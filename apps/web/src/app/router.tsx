import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from './layout'
import { RequireAuth, RequireRole } from './auth'
import { LoginPage } from '@/features/auth/LoginPage'

// Cada pantalla se descarga al visitarla: el login y el listado no cargan la libreria de graficos.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    hydrateFallbackElement: <div className="min-h-screen bg-slate-50" />,
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, lazy: () => import('@/features/dashboard/DashboardPage').then((m) => ({ Component: m.DashboardPage })) },
      { path: 'leads', lazy: () => import('@/features/leads/LeadsPage').then((m) => ({ Component: m.LeadsPage })) },
      { path: 'leads/nuevo', lazy: () => import('@/features/leads/pages').then((m) => ({ Component: m.LeadNewPage })) },
      { path: 'leads/:code', lazy: () => import('@/features/leads/LeadDetailPage').then((m) => ({ Component: m.LeadDetailPage })) },
      { path: 'leads/:code/editar', lazy: () => import('@/features/leads/pages').then((m) => ({ Component: m.LeadEditPage })) },
      {
        path: 'admin/catalogos',
        lazy: () =>
          import('@/features/admin/CatalogsPage').then((m) => ({
            Component: () => (
              <RequireRole roles={['ADMIN']}>
                <m.CatalogsPage />
              </RequireRole>
            ),
          })),
      },
      {
        path: 'admin/usuarios',
        lazy: () =>
          import('@/features/admin/UsersPage').then((m) => ({
            Component: () => (
              <RequireRole roles={['ADMIN']}>
                <m.UsersPage />
              </RequireRole>
            ),
          })),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
