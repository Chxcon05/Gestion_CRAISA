import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
export default function Navbar({ user, onLogout }) {
  const [lineState, setLineState] = useState(user?.line || '')
  console.log('Navbar user:', user?.name, user?.email)
  console.log('Navbar user:', user?.name, user?.email, user?.role)
  
  React.useEffect(() => {
    const fetchLine = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) return;
        let uid = user?.id;
        try { uid = JSON.parse(atob(token.split('.')[1])).id; } catch (e) {}
        if (!uid) return;
        const r = await fetch('/api/users', { headers: { Authorization: 'Bearer ' + token } });
        const d = await r.json();
        if (Array.isArray(d)) {
          const me = d.find(u => u.id === uid);
          if (me && me.line) setLineState(me.line);
        }
      } catch (e) {}
    };
    fetchLine();
  }, [user?.id]);
  const loc = useLocation()
  const links = [
    { to: '/dashboard', label: 'Dashboard', svg: `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>` },
    { to: '/leads', label: 'Leads', svg: `<path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 3v18"/>` },
    { to: '/reports', label: 'Reportes', svg: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>` },
    { to: '/agenda', label: 'Agenda', svg: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>` },
  ]
  const [open, setOpen] = useState(false)

  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo-section">
          <img src="/assets/logo-craisa.png" alt="CRAISA" className="logo-img" style={{ height: 36, cursor: 'pointer' }} onClick={() => window.location.href = '/dashboard'} />
          <div className="logo-text"><span className="logo-title">Sistema de Gestión de Leads</span><span className="logo-subtitle">{user?.name || 'Administrador'}</span></div>
        </div>
        <nav className="nav" aria-label="Navegación principal">
          {links.map(l => (
            <Link key={l.to} className={`nav-link ${loc.pathname === l.to ? 'active' : ''}`} to={l.to}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" dangerouslySetInnerHTML={{ __html: l.svg }} />
              <span>{l.label}</span>
            </Link>
          ))}
          {user?.role === 'ADMIN' && (
            <Link to="/users" className={`nav-link ${loc.pathname === '/users' ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              <span>Usuarios</span>
            </Link>
          )}
        </nav>
        <div className="user-menu" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '.625rem' }}>
          <button type="button" onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: '.625rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="Menú de usuario">
            <div className="user-avatar" style={{ background: '#143F7F' }}>{user?.initials || 'AD'}</div>
            <div className="user-info" style={{ textAlign: 'left' }}>
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role === 'ADMIN' ? 'Administrador' : 'Vendedor'} · {lineState || user?.line || 'Agrícola'}</span>
            </div>
          </button>
          {open && (
            <div style={{ position: 'absolute', top: 48, right: 0, background: '#fff', border: '1px solid var(--border-default)', borderRadius: 8, padding: '.5rem 0', minWidth: 160, boxShadow: 'var(--shadow-lg)', zIndex: 200 }}>
              <Link to="/profile" style={{ display: 'block', padding: '.625rem 1rem', fontSize: '.8125rem', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }} onClick={() => setOpen(false)}>Editar perfil</Link>
              <button onClick={() => { setOpen(false); onLogout() }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '.625rem 1rem', fontSize: '.8125rem', background: 'none', border: 'none', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>Salir</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
