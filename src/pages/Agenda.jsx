import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../hooks/useApi.js'

export default function Agenda() {
  const [filterKey, setFilterKey] = useState('Todos')
  const [leads, setLeads] = useState([])
  const [actionDates, setActionDates] = useState({})

  useEffect(() => {
    let token = sessionStorage.getItem('token')
    if (!token) {
      fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }) })
        .then(r => r.json()).then(d => { if (d.token) { token = d.token; sessionStorage.setItem('token', token) } }).catch(() => {})
    }
    const load = () => {
      let t = sessionStorage.getItem('token')
      api('/api/leads', { headers: { Authorization: 'Bearer ' + (t || '') } }).then(r => r.json()).then(d => setLeads(Array.isArray(d) ? d : [])).catch(() => setLeads([]))
    }
    load()
  }, [])

  const today = new Date()
  const todayStr = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}`

  const allWithInfo = leads.filter(l => l.proxFecha || l.proxAccion || l.estado || l.client)

  const getCategory = (dateStr) => {
    if (!dateStr) return 'Lejano'
    const [d, m] = dateStr.split('/')
    const diffDays = Math.round((new Date(2026, m-1, d) - today) / (1000*60*60*24))
    return diffDays <= 2 ? 'Urgente' : diffDays <= 7 ? 'Cercano' : 'Lejano'
  }

  const filtered = ['Todos', 'Urgente', 'Cercano', 'Lejano'].includes(filterKey)
    ? (filterKey === 'Todos' ? allWithInfo : allWithInfo.filter(l => getCategory(l.proxFecha) === filterKey))
    : allWithInfo

  const sorted = [...filtered].sort((a, b) => {
    const da = a.proxFecha ? a.proxFecha.split('/').reverse().join('-') : (a.date ? a.date.split('/').reverse().join('-') : '9999-99-99')
    const db = b.proxFecha ? b.proxFecha.split('/').reverse().join('-') : (b.date ? b.date.split('/').reverse().join('-') : '9999-99-99')
    return da.localeCompare(db)
  })

  const urgencyColors = { Urgente: '#c0392b', Cercano: '#e67e22', Lejano: '#27ae60' }

  return (
    <main className="main" style={{ paddingTop: 32, background: 'var(--bg-page)', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 1100 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>Seguimiento  -  Tareas</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '4px 0 0', lineHeight: 1.1 }}>Agenda</h1>
          </div>
          <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '8px 18px', fontWeight: 600 }}>Dashboard</Link>
        </header>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {['Todos', 'Urgente', 'Cercano', 'Lejano'].map(k => (
            <button key={k} onClick={() => setFilterKey(k)} style={{
              borderRadius: 8, border: filterKey === k ? '1.5px solid var(--craisa-primary)' : '1px solid #e2e8f0',
              background: filterKey === k ? '#f0f4fa' : '#fff',
              color: filterKey === k ? 'var(--craisa-primary)' : 'var(--text-secondary)',
              padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s ease'
            }}>{k}</button>
          ))}
        </div>

        {sorted.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: 16, background: '#f9fafb', border: '1px dashed #e5e7eb', borderRadius: 14 }}>No hay próximas acciones para esta categoría.</div>}

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {sorted.map(l => {
            const cat = getCategory(l.proxFecha)
            const urgencyColors = { Urgente: '#c0392b', Cercano: '#e67e22', Lejano: '#27ae60' }
            const urgencyLabels = { Urgente: 'URGENTE', Cercano: 'CERCANO', Lejano: 'LEJANO' }
            const urgency = urgencyColors[cat] || '#9ca3af'
            const labelText = urgencyLabels[cat] || cat
            return (
              <div key={l.code || l.client} style={{
                background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16, padding: 24,
                boxShadow: '0 2px 8px rgba(0,0,0,.03), 0 12px 32px rgba(0,0,0,.04)',
                transition: 'transform .2s ease, box-shadow .2s ease', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: urgency, borderRadius: '3px 0 0 3px' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: urgency + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: urgency }}>{l.proxFecha ? l.proxFecha.split('/')[0] : (l.date ? l.date.split('/')[0] : '—')}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: urgency, textTransform: 'uppercase' }}>{labelText}</div>
                    <div style={{ fontWeight: 800, fontSize: 19, color: '#111827', fontFamily: 'var(--font-display)', lineHeight: 1.15 }}>{l.client || '—'}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{l.company || ''}  -  {l.canal || ''}</div>
                  </div>
                </div>
                <div style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>
                  <strong style={{ color: '#111827', fontWeight: 700 }}>{(l.actions && l.actions.length ? (l.actions[l.actions.length - 1].action || '') : '').trim() || 'Sin acción programada'}</strong>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                  Responsable: <strong style={{ color: '#374151' }}>{l.responsable || 'Sin asignar'}</strong>  -  Línea: <span style={{ color: '#374151' }}>{l.linea || l.businessLine || '—'}</span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 14, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>Ingresado: <strong style={{ color: '#374151' }}>{l.date || '—'}</strong></span>
                  <span>Última edit: <strong style={{ color: '#374151' }}>{l.auditLogs && l.auditLogs[0] ? new Date(l.auditLogs[0].createdAt).toLocaleDateString('es-CR') : (l.interanes && l.interanes[0] ? new Date(l.interanes[0].createdAt).toLocaleDateString('es-CR') : '—')}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                  <input type="date" value={actionDates[l.code || l.client] || new Date().toISOString().split('T')[0]} onChange={e => setActionDates(prev => ({ ...prev, [l.code || l.client]: e.target.value }))} style={{ padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }} />
                  <Link to={`/agenda/action/${l.code || ''}`} style={{ padding: '5px 14px', background: '#111827', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 700, fontSize: 11, display: 'inline-block' }}>Asignar acción</Link>
                </div>
                <Link to={`/leads/${l.code}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 20px', background: '#111827', borderRadius: 8,
                  textDecoration: 'none', color: '#fff', fontWeight: 700, fontSize: 13,
                  transition: 'background .15s ease', boxShadow: '0 2px 6px rgba(0,0,0,.15)'
                }}>
                  Ver detalle <span style={{ fontSize: 10 }}>→</span>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}