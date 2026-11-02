import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'

export default function App({ children }) {
  const [user, setUser] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const t = sessionStorage.getItem('token')

    // Si no hay token y no está en login, redirigir al login
    if (!t && location.pathname !== '/login') {
      navigate('/login', { replace: true })
      return
    }

    let role = 'ADMIN'
    let name = 'Admin CRAISA'
    let initials = 'A'
    let line = ''

    if (t) {
      try {
        const payload = JSON.parse(atob(t.split('.')[1]))
        role = payload.role || 'ADMIN'
        name = payload.name || 'Admin CRAISA'
        initials = (name || 'U')[0].toUpperCase()
        line = payload.line || ''
      } catch (e) {}
    }

    setUser({ name, email: 'admin@craisa.com', role, initials, line })
  }, [location, navigate])

  if (!user) return <>{children}</>

  return (
    <>
      <Navbar user={user} onLogout={() => { sessionStorage.removeItem('craisa_user'); sessionStorage.removeItem('token'); window.location.href = '/login' }} />
      {children}
    </>
  )
}
