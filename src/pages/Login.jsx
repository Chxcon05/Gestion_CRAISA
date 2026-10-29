import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('admin@craisa.com')
  const [password, setPassword] = useState('demo123')
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault(); setErr('')
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!r.ok) return setErr('Credenciales incorrectas')
      const d = await r.json()
      sessionStorage.removeItem('craisa_user')
      sessionStorage.removeItem('token')
      localStorage.removeItem('craisa_user')
      localStorage.removeItem('token')
      sessionStorage.setItem('craisa_user', JSON.stringify(d.user))
      sessionStorage.setItem('token', d.token)
      console.log('Login guardado:', d.user?.name, d.user?.email, d.user?.role)
      window.location.href = '/dashboard'
    } catch (e) { setErr('Error de conexión') }
  }

  return (
    <>
      <main className="main" style={{ paddingTop: '5rem' }}>
        <div className="container" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div className="page-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '1.5rem' }}>
              <div><h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '.25rem', fontFamily: 'var(--font-display)' }}>CRAISA Leads</h1></div>
            </div>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
              <label className="form-label">Correo electrónico</label>
              <input type="email" className="form-input" placeholder="admin@craisa.com" value={email} onChange={e => setEmail(e.target.value)} required />
              <label className="form-label">Contraseña</label>
              <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              {err && <div className="form-error">{err}</div>}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '.75rem' }}>Ingresar</button>
            </form>
            <details style={{ marginTop: '1.25rem', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              <summary style={{ cursor: 'pointer' }}>Credenciales demo</summary>
              <div style={{ marginTop: '.5rem', padding: '.75rem', background: 'var(--bg-subtle)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                Admin: <strong>admin@craisa.com</strong> / <strong>demo123</strong>
              </div>
            </details>
            <img src="/assets/logo-craisa.png" alt="CRAISA" style={{ height: 40, marginTop: '1.5rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          </div>
        </div>
      </main>
    </>
  )
}
