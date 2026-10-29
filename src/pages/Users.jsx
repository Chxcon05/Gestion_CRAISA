import React, { useEffect, useState } from 'react'
import { api } from '../hooks/useApi.js'

export default function Users() {
  // Solo ADMIN puede acceder
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'VENDEDOR', line: '' })
  const [msg, setMsg] = useState('')
  const [validated, setValidated] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'ADMIN') setDenied(true);
      } catch (e) { setDenied(true); }
    } else {
      setDenied(true);
    }
  }, [])

  if (denied) {
    window.location.href = '/dashboard';
    return <div style={{ padding: 40, textAlign: 'center' }}>Solo administradores pueden acceder a esta página.</div>;
  }

  async function loadUsers() {
    let token = sessionStorage.getItem('token')
    if (!token) {
      try {
        const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }) })
        const d = await r.json()
        if (d.token) { token = d.token; sessionStorage.setItem('token', token) }
      } catch (e) {}
    }
    try {
      const raw = await api('/api/users', { headers: { Authorization: 'Bearer ' + (token || '') } })
      if (!raw.ok) { setUsers([]); return }
      const d = await raw.json()
      setUsers(Array.isArray(d) ? d : [])
    } catch (e) { setUsers([]) }
  }

  useEffect(() => { loadUsers() }, [])

  async function deleteUser(id, name, email) {
    // No borrar al usuario de la sesión activa
    try {
      const token = sessionStorage.getItem('token');
      let myId = null;
      if (token) {
        try { myId = JSON.parse(atob(token.split('.')[1])).id; } catch (e) {}
      }
      if (myId === id) { setMsg('No puedes eliminar tu propio usuario'); return; }
      // No borrar Admin CRAISA
      if (email === 'admin@craisa.com' || name === 'Admin CRAISA') { setMsg('No se puede eliminar al usuario Admin CRAISA'); return; }
    } catch (e) {}
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      let token = sessionStorage.getItem('token');
      if (!token) {
        const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }) });
        const d = await r.json();
        token = d.token;
        sessionStorage.setItem('token', token);
      }
      const r = await fetch('/api/users/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
      const data = await r.json();
      if (!r.ok) return setMsg(data.error || 'Error al eliminar usuario');
      setMsg('Usuario eliminado');
      loadUsers();
    } catch (e) { setMsg('Error de conexión') }
  }

  async function submit(e) {
    e.preventDefault(); setMsg('')
    if (!form.line || !form.line.trim()) { setMsg('La línea es obligatoria'); return; }
    const lbls = ['Nombre', 'Email', 'Contraseña', 'Línea']
    const missing = [];
    if (!form.name.trim()) missing.push(lbls[0]);
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) missing.push(lbls[1]);
    if (!form.password || form.password.length < 4) missing.push(lbls[2]);
    if (missing.length > 0) { setMsg(`Faltan campos obligatorios: ${missing.join(', ')}`); return }
    try {
      let token = sessionStorage.getItem('token')
      if (!token) {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' })
        })
        const loginData = await loginRes.json()
        if (loginData.token) { token = loginData.token; sessionStorage.setItem('token', token) }
      }
      const r = await api('/api/users', {
        method: 'POST',
        body: JSON.stringify(form),
        headers: { Authorization: 'Bearer ' + token }
      })
      const data = await r.json()
      if (!r.ok) return setMsg(data.error || 'Error al crear usuario')
      setMsg('Usuario creado: ' + data.user.name + ' (' + data.user.role + ')')
      setForm({ name: '', email: '', password: '', role: 'VENDEDOR', line: '' })
      loadUsers()
    } catch (e) { setMsg('Error de conexión') }
  }

  return (
    <main className="main" style={{ paddingTop: 2 }}>
      <div className="container">
        <div className="page-header"><div><h1>Usuarios</h1><p className="page-subtitle">Solo administradores pueden crear nuevos usuarios</p></div></div>
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Crear nuevo usuario</h3>
          <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '.75rem', alignItems: 'end' }}>
            <div><label className="form-label">Nombre</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="form-label">Correo</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
            <div><label className="form-label">Contraseña</label><input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></div>
            <div><label className="form-label">Rol</label>
              <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="VENDEDOR">Vendedor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div><label className="form-label">Línea</label><input className="form-input" value={form.line} onChange={e => setForm({ ...form, line: e.target.value })} /></div>
            <button type="submit" className="btn btn-primary">Crear usuario</button>
          </form>
          {msg && <div style={{ marginTop: '.75rem', padding: '.75rem', borderRadius: 6, background: msg.includes('creado') ? 'rgba(61,174,43,0.08)' : 'rgba(220,38,38,0.08)', color: msg.includes('creado') ? 'var(--line-carga)' : '#DC2626', fontSize: '.875rem', fontWeight: 600 }}>{msg}</div>}
        </div>
        <div className="card">
          <div className="card-header"><h3>Usuarios registrados</h3></div>
          <div className="card-body">
            <table className="table">
              <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Línea</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}><td style={{ fontWeight: 600 }}>{u.name}</td><td>{u.email}</td><td><span className={`badge ${u.role === 'ADMIN' ? 'badge-ganado' : 'badge-nuevo'}`}>{u.role}</span></td><td>{u.line || '—'}</td><td style={{ fontSize: '.75rem', color: u.active ? 'var(--line-carga)' : 'var(--line-agricola)' }}>{u.active ? 'Activo' : 'Inactivo'}</td><td style={{ textAlign: 'center', padding: '0 .5rem' }}><button className="btn btn-outline-danger btn-sm" onClick={() => deleteUser(u.id, u.name, u.email)} style={{ fontSize: '0.75rem' }}>×</button></td></tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '1.5rem' }}>No hay usuarios registrados</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}