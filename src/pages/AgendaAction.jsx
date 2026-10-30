import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../hooks/useApi.js'

export default function AgendaAction() {
  const { code } = useParams()
  const [lead, setLead] = useState(null)
  const [action, setAction] = useState('')
  const todayStr = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(todayStr)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let token = sessionStorage.getItem('token')
    if (!token) {
      fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }) })
        .then(r => r.json()).then(d => { if (d.token) { token = d.token; sessionStorage.setItem('token', token) } }).catch(() => {})
    }
    const load = () => {
      let t = sessionStorage.getItem('token')
      api('/api/leads', { headers: { Authorization: 'Bearer ' + (t || '') } }).then(r => r.json()).then(d => {
        const arr = Array.isArray(d) ? d : []
        const found = arr.find(l => l.code === code)
        if (found) { setLead(found); const acts = found.actions || []; const last = acts[acts.length - 1] || {}; setAction(last.action || ''); setDate(last.date ? last.date.split('/').reverse().join('-') : new Date().toISOString().split('T')[0]) }
      }).catch(() => {})
    }
    load()
  }, [code])

  const handleSave = async () => {
    try {
      const trimmed = action.trim()
      if (!trimmed) { alert('Debe escribir una acción'); return }
      if (date < todayStr) { alert('La fecha no puede ser anterior a hoy'); return }
      const token = sessionStorage.getItem('token')
      const d = date.split('-')
      const fmt = `${d[2]}/${d[1]}`
      await fetch('/api/leads/' + code + '/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token || '') },
        body: JSON.stringify({ action: trimmed, actionDate: fmt })
      })
      setSaved(true)
      setTimeout(() => { window.location.href = '/agenda' }, 1500)
    } catch (e) { alert('Error al guardar') }
  }

  return (
    <main className="main" style={{ paddingTop: 32, background: 'var(--bg-page)', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 640 }}>
        <Link to="/agenda" style={{ color: '#0044BB', fontWeight: 600, textDecoration: 'none', fontSize: 13, marginBottom: 20, display: 'inline-block' }}>← Volver a Agenda</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#111827', marginBottom: 6 }}>Asignar acción</h1>
        <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 24 }}>{lead ? `${lead.client} · ${lead.company || ''}` : 'Cargando...'}</div>

        <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,.03)' }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 6 }}>¿Qué acción se asigna?</label>
          <input value={action} onChange={e => setAction(e.target.value)} placeholder="Ej: Llamada de seguimiento, envío de propuesta..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 16 }} />

          <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 6 }}>¿Cuándo?</label>
          <input type="date" value={date} min={todayStr} onChange={e => setDate(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 20 }} />

          <button onClick={handleSave} style={{ padding: '10px 24px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{saved ? 'Guardado' : 'Guardar acción'}</button>
        </div>
      </div>
    </main>
  )
}
