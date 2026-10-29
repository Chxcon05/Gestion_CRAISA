import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
export default function Agenda() {
  const [filterKey, setFilterKey] = useState('todos')
  const [leads, setLeads] = useState([])
  useEffect(() => {
    fetch('/js/leads-data.js').catch(() => {})
    // Fallback para datos en memoria
    const all = window.CRAISA_LEADS || []
    setLeads(all.filter(l => l.proxFecha && l.proxAccion))
  }, [])

  const userRaw = sessionStorage.getItem('craisa_user')
  let userRole = 'ADMIN'
  try { userRole = JSON.parse(userRaw || '{}').role || 'ADMIN'; } catch (e) {}

  const filtered = filterKey === 'todos' ? leads : leads.filter(l => l.proxFecha && l.proxFecha.indexOf(filterKey) !== -1)
  const visible = userRole === 'VENDEDOR' ? filtered.filter(l => l.responsable === 'Admin CRAISA') : filtered

  return (
    <main className="main" style={{ paddingTop: 2 }}>
      <div className="container">
        <div className="page-header">
          <div><span className="eyebrow">Seguimiento y tareas</span><h1>Agenda de Seguimiento</h1></div>
          <div className="page-actions"><Link to="/dashboard" className="btn btn-secondary">Dashboard</Link></div>
        </div>
        {userRole === 'VENDEDOR' && <div style={{ padding: '1rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 10, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10 }}>Solo se muestran próximas acciones asignadas a tu cartera.</div>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 15, flexWrap: 'wrap' }}>
          {['hoy', '22/10', '23/10', '24/10', 'todos'].map(k => (
            <button key={k} onClick={() => setFilterKey(k)} style={{ borderRadius: 6, border: '1px solid var(--border-subtle)', background: filterKey === k ? 'var(--craisa-primary)' : '#fff', color: filterKey === k ? '#fff' : 'var(--text-secondary)', padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{k}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {visible.map(l => (
            <div key={l.code} style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--craisa-primary)', fontFamily: 'var(--font-display)' }}>{l.proxFecha ? l.proxFecha.split('/')[0] : '—'}</div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 6, color: 'var(--text-tertiary)', fontWeight: 700 }}>{l.proxFecha ? l.proxFecha.split('/')[1] : ''}</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginTop: 8 }}>{l.client}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{l.company} · {l.canal}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>Responsable: <strong>{l.responsable || 'Sin asignar'}</strong> · {l.linea}</div>
              <Link to={`/leads/${l.code}`} style={{ display: 'inline-block', marginTop: 10, padding: '6px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 6, textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>Ver detalle</Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
