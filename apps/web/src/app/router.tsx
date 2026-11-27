import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { AppLayout } from './layout'
import { RequireAuth, RequireRole } from './auth'
import { LoginPage } from '@/features/auth/LoginPage'
import { NavigationProgress, PageLoader } from '@/components/page-loader'

// Ruta raiz sin path: envuelve tambien al login, asi la barra se ve al entrar despues de ingresar.
function RootShell() {
  return (
    <>
      <NavigationProgress />
      <Outlet />
    </>
  )
}

// Cada pantalla se descarga al visitarla: el login y el listado no cargan la libreria de graficos.
export const router = createBrowserRouter([
  {
    element: <RootShell />,
    hydrateFallbackElement: <PageLoader />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
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
            path: 'admin/auditoria',
            lazy: () =>
              import('@/features/admin/AuditPage').then((m) => ({
                Component: () => (
                  <RequireRole roles={['ADMIN']}>
                    <m.AuditPage />
                  </RequireRole>
                ),
              })),
          },
          {
            path: 'admin/productos',
            lazy: () =>
              import('@/features/admin/ProductsPage').then((m) => ({
                Component: () => (
                  <RequireRole roles={['ADMIN']}>
                    <m.ProductsPage />
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
    ],
  },
])
