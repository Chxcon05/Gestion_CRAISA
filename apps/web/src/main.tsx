import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ApiError, setUnauthorizedHandler } from '@/lib/api'
import { router } from '@/app/router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Un 4xx no se arregla reintentando; solo se reintentan fallas de red o del servidor.
      retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2,
    },
  },
})

// Si la sesion expira en medio del trabajo, se vuelve al login sin perder la ruta actual.
setUnauthorizedHandler(() => {
  queryClient.clear()
  if (window.location.pathname !== '/login') {
    void router.navigate('/login', { replace: true, state: { from: window.location.pathname + window.location.search } })
  }
})

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </StrictMode>,
  )
}
