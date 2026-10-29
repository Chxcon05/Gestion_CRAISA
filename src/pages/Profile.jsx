import React, { useState, useEffect } from 'react'

export default function Profile() {
  const [user, setUser] = useState({})
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ id: payload.id, name: payload.name, email: payload.email, role: payload.role, line: payload.line || '' })
      } catch (e) {}
    }
  }, [])

  async function handleSave() {
    setMsg('')
    try {
      const token = sessionStorage.getItem('token')
      if (!user.id || !token) { setMsg('No hay sesión activa'); return }
      const r = await fetch('/api/users/' + user.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ name: user.name, email: user.email, line: user.line })
      })
      const data = await r.json()
      if (!r.ok) return setMsg(data.error || 'Error al actualizar perfil')
      setMsg('Perfil actualizado: ' + data.user.name)
      sessionStorage.setItem('token', '') // limpio token para que App.jsx actualice con nuevos datos si es necesario
    } catch (e) { setMsg('Error de conexión') }
  }

  function handleChange(e) {
    setUser({ ...user, [e.target.name]: e.target.value })
  }

  return (
    <main className="main" style={{ paddingTop: 2 }}>
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="page-header"><div><h1>Mi perfil</h1></div></div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label className="form-label">Nombre completo</label>
            <input className="form-input" name="name" value={user.name || ''} onChange={handleChange} />

            <label className="form-label">Correo</label>
            <input className="form-input" name="email" value={user.email || ''} onChange={handleChange} required />

            <label className="form-label">Línea</label>
            <input className="form-input" name="line" value={user.line || ''} onChange={handleChange} />

            <button type="button" className="btn btn-primary" style={{ marginTop: '.5rem' }} onClick={handleSave}>Guardar cambios</button>
          </form>
          {msg && <div style={{ marginTop: '.75rem', padding: '.75rem', borderRadius: 6, background: msg.includes('Perfil actualizado') ? 'rgba(61,174,43,0.08)' : 'rgba(220,38,38,0.08)', color: msg.includes('Perfil actualizado') ? 'var(--line-carga)' : '#DC2626', fontSize: '.875rem', fontWeight: 600 }}>{msg}</div>}
        </div>
      </div>
    </main>
  )
}