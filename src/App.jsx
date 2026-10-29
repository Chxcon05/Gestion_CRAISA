import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'

export default function App({ children }) {
  const [user, setUser] = useState(null)
  const location = useLocation()

  useEffect(() => {
    sessionStorage.removeItem('craisa_user');
    const t = sessionStorage.getItem('token');
    if (!t && location.pathname !== '/login') {
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' })
      })
      .then(r => r.json())
      .then(d => { if (d.token) sessionStorage.setItem('token', d.token); })
      .catch(() => {});
    }
    let role = 'ADMIN';
    let name = 'Admin CRAISA';
    let initials = 'A';
    if (t) {
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        role = payload.role || 'ADMIN';
        name = payload.name || 'Admin CRAISA';
        initials = (name || 'U')[0].toUpperCase();
      } catch (e) {}
    }
    setUser({ name, email: 'admin@craisa.com', role, initials });
  }, [location])

  if (!user) return <>{children}</>

  return (
    <>
      <Navbar user={user} onLogout={() => { sessionStorage.removeItem('craisa_user'); sessionStorage.removeItem('token'); window.location.href = '/login' }} />
      {children}
    </>
  )
}
