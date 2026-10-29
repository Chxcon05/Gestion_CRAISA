import React, { useEffect, useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../hooks/useApi.js'

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCanal, setFilterCanal] = useState('')
  const location = useLocation()
  useEffect(() => {
    let token = sessionStorage.getItem('token');
    if (!token) {
      fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }) })
        .then(r => r.json()).then(d => { if (d.token) { token = d.token; sessionStorage.setItem('token', token); } }).catch(() => {});
    }
    api('/api/leads', { headers: { Authorization: 'Bearer ' + (token || '') } })
      .then(r => r.json())
      .then(d => { setLeads(Array.isArray(d) ? d : []) })
      .catch(e => { console.error('Leads fetch error:', e); setLeads([]); })
  }, [location.pathname])

  const filtered = useMemo(() => {
    let res = leads
    if (search.trim()) {
      const s = search.toLowerCase()
      res = res.filter(l => (l.client || '').toLowerCase().includes(s) || (l.company || '').toLowerCase().includes(s) || (l.code || '').toLowerCase().includes(s))
    }
    if (filterStatus) res = res.filter(l => (l.estado || l.status) === filterStatus)
    if (filterCanal) res = res.filter(l => (l.canal || '').toLowerCase() === filterCanal.toLowerCase())
    return res
  }, [leads, search, filterStatus, filterCanal])

  const statuses = ['nuevo','asignado','contactado','seguimiento','oportunidad','ganado','perdido']
  const canales = [...new Set(leads.map(l => l.canal || 'otro'))].sort()

  return (
    <main className="main" style={{ paddingTop: '1.5rem', background: 'var(--bg-page)', minHeight: '100vh' }}>
      <div className="container">
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <span className="eyebrow">Listado</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', color: 'var(--text-primary)', lineHeight: 1.1 }}>Leads</h1>
          </div>
          <div className="page-actions">
            <Link to="/leads/new" className="btn btn-primary">+ Nuevo</Link>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Buscar cliente, empresa, código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '.625rem .875rem', fontSize: '.875rem', border: '1px solid var(--border-default)', borderRadius: 6, background: '#fff', flex: 1, minWidth: 240 }}
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '.625rem .875rem', fontSize: '.875rem', border: '1px solid var(--border-default)', borderRadius: 6, background: '#fff' }}>
            <option value="">Todos los estados</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterCanal} onChange={e => setFilterCanal(e.target.value)} style={{ padding: '.625rem .875rem', fontSize: '.875rem', border: '1px solid var(--border-default)', borderRadius: 6, background: '#fff' }}>
            <option value="">Todos los canales</option>
            {canales.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="card" style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', background: '#FFFFFF' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead style={{ borderBottom: '2px solid var(--border-default)', background: '#F3F4F6' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '.625rem .875rem', color: 'var(--text-tertiary)', fontWeight: 700, fontSize: '.6875rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Código</th>
                <th>Cliente</th>
                <th>Empresa</th>
                <th>Estado</th>
                <th>Canal</th>
                <th>Línea</th>
                <th>Responsable</th>
                <th>Valor</th>
                <th>Nota pérdida</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.code || l.id || Math.random()} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '.625rem .875rem', whiteSpace: 'nowrap' }}>
                    <Link to={`/leads/${l.code || l.id}`} style={{ fontWeight: 700, color: 'var(--craisa-primary)', textDecoration: 'none', fontSize: '.8125rem' }}>{l.code || '—'}</Link>
                  </td>
                  <td style={{ padding: '.625rem .875rem', color: 'var(--text-secondary)' }}>{l.client || '—'}</td>
                  <td style={{ padding: '.625rem .875rem', color: 'var(--text-secondary)' }}>{l.company || '—'}</td>
                  <td style={{ padding: '.625rem .875rem' }}>
                    <span className={`badge badge-${(l.estado || l.status || 'nuevo')}`} style={{ fontSize: 11 }}>{(l.estado || l.status || 'nuevo')}</span>
                  </td>
                  <td style={{ padding: '.625rem .875rem', color: 'var(--text-secondary)' }}>{l.canal || '—'}</td>
                  <td style={{ padding: '.625rem .875rem', color: 'var(--text-secondary)' }}>{(l.linea || l.businessLine || '').replace('Agrícola', 'Agricola').replace('Construcción', 'Construccion').replace('Precisión', 'Precision').replace('Postventa', 'Postventa').replace('Institucional', 'Institucional') || '—'}</td>
                  <td style={{ padding: '.625rem .875rem', color: 'var(--text-secondary)' }}>{l.responsable || '—'}</td>
                  <td style={{ padding: '.625rem .875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{l.valorEstimado || '—'}</td>
                  <td style={{ padding: '.625rem .875rem', fontSize: '.75rem', color: 'var(--text-tertiary)' }}>{l.lossReason || '—'}</td>
                  <td style={{ padding: '.625rem .875rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link to={`/leads/${l.code || l.id}`} className="btn btn-secondary" style={{ fontSize: '.75rem', padding: '.25rem .5rem', textDecoration: 'none' }}>Editar</Link>
                      <button onClick={async (e) => { e.preventDefault(); if (!confirm('¿Borrar lead ' + (l.code || l.id) + '?')) return; try { let t = sessionStorage.getItem('token'); await fetch(`/api/leads/${l.code || l.id || ''}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + (t || '') } }); window.location.reload(); } catch (err) { alert('No se pudo borrar'); } }} className="btn btn-secondary" style={{ fontSize: '.75rem', padding: '.25rem .5rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Borrar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No se encontraron leads</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
