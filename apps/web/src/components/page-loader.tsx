import { useNavigation } from 'react-router'

// Mismas clases que la pantalla de index.html (estilos en linea alli): al montar React y mientras se valida
// la sesion se ve exactamente lo mismo, sin parpadeo entre la carga del HTML y la de la app.
export function PageLoader() {
  return (
    <output className="splash">
      <span className="splash-logo">
        <img src="/logo-craisa.png" alt="CRAISA" />
      </span>
      <div className="splash-track" aria-hidden="true">
        <div className="splash-bar" />
      </div>
      <span className="splash-sr">Cargando</span>
    </output>
  )
}

// Cada seccion se descarga al visitarla; sin esta barra el clic parece no hacer nada mientras llega.
// Aparece con retraso (ver nav-progress en index.css) para no destellar cuando la seccion ya esta en cache.
export function NavigationProgress() {
  const busy = useNavigation().state !== 'idle'
  if (!busy) return null
  return (
    <>
      <div aria-hidden className="nav-progress fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-brand-100">
        <div className="nav-progress-bar h-full w-1/3 rounded-full bg-brand-500" />
      </div>
      <output className="sr-only">Cargando seccion</output>
    </>
  )
}
