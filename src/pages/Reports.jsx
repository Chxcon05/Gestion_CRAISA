import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../hooks/useApi.js'

export default function Reports() {
  const [leads, setLeads] = useState([])
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  useEffect(() => {
    let token = sessionStorage.getItem('token')
    if (!token) {
      fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }) })
        .then(r => r.json()).then(d => { if (d.token) { token = d.token; sessionStorage.setItem('token', token) } }).catch(() => {})
    }
    api('/api/leads', { headers: { Authorization: 'Bearer ' + (token || '') } })
      .then(r => r.json()).then(d => setLeads(Array.isArray(d) ? d : [])).catch(() => setLeads([]))
  }, [])

  const total = leads.length
  const ganadas = leads.filter(l => (l.estado || l.status) === 'ganado').length
  const perdidas = leads.filter(l => (l.estado || l.status) === 'perdido').length
  const conversionRate = total ? Math.round((ganadas / total) * 100) : 0
  const estados = ['nuevo','asignado','contactado','seguimiento','oportunidad','ganado','perdido']

  const funnelStages = [
    { label: 'Nuevo', count: leads.filter(l => (l.estado || l.status) === 'nuevo').length, color: '#0044BB' },
    { label: 'Asignado', count: leads.filter(l => (l.estado || l.status) === 'asignado').length, color: '#FFB800' },
    { label: 'Contactado', count: leads.filter(l => (l.estado || l.status) === 'contactado').length, color: '#00AA44' },
    { label: 'Seguimiento', count: leads.filter(l => (l.estado || l.status) === 'seguimiento').length, color: '#9933FF' },
    { label: 'Oportunidad', count: leads.filter(l => (l.estado || l.status) === 'oportunidad').length, color: '#ff6600' },
    { label: 'Ganado', count: ganadas, color: '#555555' },
    { label: 'Perdido', count: perdidas, color: '#ff0000' },
  ]

  const canales = {}
  leads.forEach(l => { canales[l.canal || 'otro'] = (canales[l.canal || 'otro'] || 0) + 1 })
  const canalEntries = Object.entries(canales)

  return (
    <main className="main" style={{ paddingTop: '1.5rem', background: 'var(--bg-page)', minHeight: '100vh' }}>
      <div className="container">
        {/* Header */}
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <div className="eyebrow">Reportes  -  Actualizado hoy</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: '.25rem' }}>Reportes</h1>
            <p className="page-subtitle">Resumen ejecutivo  -  Funnel  -  Pipeline  -  Canal  -  Equipo  -  Pérdidas</p>
          </div>
          <div className="page-actions">
            <Link to="/dashboard" className="btn btn-secondary">Volver al Dashboard</Link>
          </div>
        </div>

        {/* Resumen ejecutivo */}
        <section style={{ marginBottom: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
              <span style={{ width: 3, height: 14, background: 'var(--craisa-primary)', borderRadius: 2 }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '.9375rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Resumen ejecutivo</h2>
            </div>
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <KpiCard value={total} label="Total Leads" color="var(--craisa-primary)" />
              <KpiCard value={ganadas} label="Ganados" color="var(--line-carga)" />
              <KpiCard value={perdidas} label="Perdidos" color="var(--line-agricola)" />
              <KpiCard value={conversionRate + '%'} label="Conversión" color="var(--line-construccion)" />
            </div>
          </div>
        </section>

        {/* Funnel */}
        <section style={{ marginBottom: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
              <span style={{ width: 3, height: 14, background: 'var(--craisa-primary)', borderRadius: 2 }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '.9375rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Funnel</h2>
            </div>
            <div style={{ display: 'flex', gap: '.75rem', overflowX: 'auto', paddingBottom: '.25rem' }}>
              {funnelStages.map((s, i) => (
                <div key={s.label} style={{ flex: 1, minWidth: 140, borderRadius: 8, background: '#FAFBFC', border: '1px solid var(--border-subtle)', padding: '1rem', textAlign: 'center', position: 'relative' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontSize: '.6875rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: '.25rem' }}>{s.label}</div>
                  <div style={{ height: 4, borderRadius: 2, marginTop: '.75rem', background: s.color }} />
                  {i < funnelStages.length - 1 && (
                    <div style={{ position: 'absolute', right: -10, top: '50%', width: 20, height: 2, background: 'var(--border-default)', transform: 'translateY(-50%)', zIndex: 2 }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pipeline y Canal lado a lado en desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Pipeline */}
          <section>
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', background: '#FFFFFF', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
                <span style={{ width: 3, height: 14, background: 'var(--craisa-primary)', borderRadius: 2 }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '.9375rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Pipeline (Estado)</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {estados.map(e => {
                  const c = leads.filter(l => (l.estado || l.status) === e).length
                  const pct = total ? Math.round(c / total * 100) : 0
                  return (
                    <div key={e} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.625rem .75rem', borderRadius: 6, background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                      <div style={{ flex: 1, minWidth: 90 }}>
                        <div style={{ fontSize: '.75rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{e}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-tertiary)' }}>{pct}%</div>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', minWidth: 36, textAlign: 'right' }}>{c}</div>
                      <div style={{ width: 100, height: 6, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ height: '100%', borderRadius: 3, background: `var(--estado-${e === 'nuevo' ? 'nuevo' : e === 'ganado' ? 'ganado' : e === 'perdido' ? 'perdido' : e === 'contactado' ? 'contactado' : 'institucional'})`, width: pct + '%' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Canal */}
          <section>
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', background: '#FFFFFF', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
                <span style={{ width: 3, height: 14, background: 'var(--craisa-primary)', borderRadius: 2 }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '.9375rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Canal</h2>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                {canalEntries.map(([k, v]) => (
                  <div key={k} style={{ background: '#FFFFFF', border: '1px solid var(--border-default)', borderRadius: 8, padding: '.5rem .875rem', boxShadow: 'var(--shadow-xs)' }}>
                    <div style={{ fontSize: '.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Canal</div>
                    <div style={{ fontSize: '.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{k}</div>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--craisa-primary)' }}>{v} leads</div>
                  </div>
                ))}
                {canalEntries.length === 0 && <div style={{ fontSize: '.875rem', color: 'var(--text-tertiary)' }}>Sin datos de canal</div>}
              </div>
            </div>
          </section>
        </div>

        {/* Equipo y Pérdidas lado a lado */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Equipo */}
          <section>
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', background: '#FFFFFF', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
                <span style={{ width: 3, height: 14, background: 'var(--craisa-primary)', borderRadius: 2 }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '.9375rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Equipo</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {(() => {
                  const mapa = { 'admin@craisa.com': 'Admin CRAISA', 'admin@craisa': 'Admin CRAISA' }
                  const g = {}
                  leads.forEach(l => {
                    let v = (l.responsable || '').trim()
                    if (v.includes('@')) v = mapa[v] || v.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    if (!v || v === 'Sin asignar') v = 'Sin asignar'
                    if (!g[v]) g[v] = { total: 0, ganados: 0 }
                    g[v].total++; if ((l.estado || l.status) === 'ganado') g[v].ganados++
                  })
                  const users = Object.keys(g).filter(k => k && k !== 'Sin asignar')
                  if (!users.length) return null
                  users.sort((a, b) => g[b].total - g[a].total)
                  return users.slice(0, 3).map(n => {
                    const x = g[n]; const w = x.total ? Math.round((x.ganados / x.total) * 100) : 0
                    return (
                      <div key={n} style={{ padding: '.875rem', border: '1px solid var(--border-subtle)', borderRadius: 6, background: '#FAFBFC' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.25rem' }}>
                          <div style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--text-primary)' }}>{n}</div>
                          <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{x.total} leads  -  {x.ganados} ganados  -  {w}% cierre</div>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(to right, var(--craisa-primary), var(--line-carga))', width: (x.ganados / x.total * 100) + '%' }} />
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </section>

          {/* Pérdidas */}
          <section>
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', background: '#FFFFFF', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
                <span style={{ width: 3, height: 14, background: 'var(--craisa-primary)', borderRadius: 2 }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '.9375rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Pérdidas</h2>
                <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: 'var(--text-tertiary)' }}>{leads.filter(l => (l.estado || l.status) === 'perdido').length} perdidos</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.625rem' }}>
                {(() => {
                  const perdidos = leads.filter(l => (l.estado || l.status) === 'perdido')
                  const reasons = {}
                  perdidos.forEach(l => { const r = l.lossReason || 'Sin especificar'; reasons[r] = (reasons[r] || 0) + 1 })
                  const entries = Object.entries(reasons).sort((a,b) => b[1]-a[1])
                  const totalP = perdidos.length || 1
                  return entries.map(([label, count]) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '.25rem' }}>
                        <span>{label}</span>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{Math.round(count/totalP*100)}% ({count})</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: 'var(--line-agricola)', width: (count/totalP*100) + '%' }} />
                      </div>
                    </div>
                  ))
                })()}
                {leads.filter(l => (l.estado || l.status) === 'perdido').length === 0 && <div style={{ fontSize: '.875rem', color: 'var(--text-tertiary)' }}>No hay leads perdidos registrados.</div>}
              </div>
            </div>
          </section>
        </div>

        {/* Detalle de leads */}
        <section style={{ marginBottom: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
              <span style={{ width: 3, height: 14, background: 'var(--craisa-primary)', borderRadius: 2 }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '.9375rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Detalle por lead</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
                    <th style={{ textAlign: 'left', padding: '.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.6875rem', textTransform: 'uppercase' }}>Código</th>
                    <th style={{ textAlign: 'left', padding: '.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.6875rem', textTransform: 'uppercase' }}>Cliente / Empresa</th>
                    <th style={{ textAlign: 'left', padding: '.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.6875rem', textTransform: 'uppercase' }}>Estado</th>
                    <th style={{ textAlign: 'left', padding: '.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.6875rem', textTransform: 'uppercase' }}>Canal / Línea</th>
                    <th style={{ textAlign: 'left', padding: '.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.6875rem', textTransform: 'uppercase' }}>Responsable</th>
                    <th style={{ textAlign: 'left', padding: '.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.6875rem', textTransform: 'uppercase' }}>Valor</th>
                    <th style={{ padding: '.5rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 10).map(l => {
                    const mapa = { 'admin@craisa.com': 'Admin CRAISA', 'admin@craisa': 'Admin CRAISA' }
                    let resp = (l.responsable || '').trim()
                    if (resp.includes('@')) resp = mapa[resp] || resp.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    return (
                      <tr key={l.id || l.code} style={{ borderBottom: '1px solid var(--border-light)', background: '#fff' }}>
                        <td style={{ padding: '.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{l.code || l.id}</td>
                        <td style={{ padding: '.5rem', color: 'var(--text-secondary)' }}>{l.client || l.firstName || '—'}{l.company ? `  -  ${l.company}` : ''}</td>
                        <td style={{ padding: '.5rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{(l.estado || l.status || '—').toLowerCase()}</td>
                        <td style={{ padding: '.5rem', color: 'var(--text-secondary)' }}>{l.canal || l.channel || '—'}{l.linea || l.businessLine ? ` / ${(l.linea || l.businessLine || '').toUpperCase()}` : ''}</td>
                        <td style={{ padding: '.5rem', color: 'var(--text-tertiary)', fontSize: '.75rem' }}>{resp || '—'}</td>
                        <td style={{ padding: '.5rem', color: 'var(--text-secondary)' }}>{l.valorEstimado ? `₡${String(l.valorEstimado).replace(/\$/g, '').trim()}` : '—'}</td>
                        <td style={{ padding: '.5rem', textAlign: 'right' }}>
                          <button
                            style={{ fontSize: '.6875rem', padding: '.25rem .5rem', borderRadius: 4, border: '1px solid var(--border-default)', background: '#fff', color: 'var(--craisa-primary)', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => {
                              setDetailOpen(true)
                              setDetail(l)
                            }}
                          >Ver detalle</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {leads.length === 0 && <div style={{ padding: '.75rem', fontSize: '.875rem', color: 'var(--text-tertiary)' }}>No hay leads para mostrar.</div>}
            </div>
          </div>
        </section>

        {/* Modal panel detalle */}
        {detailOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5.5rem 1rem 1rem' }} onClick={() => setDetailOpen(false)}>
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: 'var(--shadow-card)', maxWidth: 780, width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.25rem 1.25rem .75rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Detalle del lead</h2>
                <button onClick={() => { setDetailOpen(false); setDetail(null) }} style={{ background: 'none', border: 'none', fontSize: '1.25rem', lineHeight: 1, cursor: 'pointer', color: 'var(--text-tertiary)' }}>×</button>
              </div>
              <div style={{ padding: '1.25rem' }}>
                {!detail && <div style={{ fontSize: '.875rem', color: 'var(--text-tertiary)' }}>Cargando...</div>}
                {detail && detail.error && <div style={{ fontSize: '.875rem', color: 'var(--danger)' }}>{detail.error}</div>}
                {detail && !detail.error && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.75rem', marginBottom: '1rem' }}>
                      <div><strong style={{ fontSize: '.6875rem', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Código</strong><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{detail.code || detail.id}</div></div>
                      <div><strong style={{ fontSize: '.6875rem', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Cliente</strong><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{detail.client || detail.firstName || '—'} {detail.company ? `(${detail.company})` : ''}</div></div>
                      <div><strong style={{ fontSize: '.6875rem', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Estado</strong><div style={{ textTransform: 'capitalize', fontWeight: 700, color: 'var(--text-primary)' }}>{(detail.status || detail.estado || '—').toLowerCase()}</div></div>
                      <div><strong style={{ fontSize: '.6875rem', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Canal / Línea</strong><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{detail.channel || detail.canal || '—'} / {(detail.businessLine || detail.linea || '—').toUpperCase()}</div></div>
                      <div><strong style={{ fontSize: '.6875rem', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Responsable</strong><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{(() => {
                        const mapa = { 'admin@craisa.com': 'Admin CRAISA', 'admin@craisa': 'Admin CRAISA' }
                        let v = (detail.responsable || detail.responsableId || '').trim()
                        if (v.includes('@')) v = mapa[v] || v.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                        return v || '—'
                      })()}</div></div>
                      <div><strong style={{ fontSize: '.6875rem', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Valor estimado</strong><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{(() => {
                        const v = detail.estimatedValue !== undefined && detail.estimatedValue !== null ? detail.estimatedValue : (detail.valorEstimado !== undefined && detail.valorEstimado !== null ? detail.valorEstimado : null);
                        if (v === null || v === '') return '—';
                        const s = String(v).replace(/\$/g, '').trim();
                        return s ? `₡${s}` : '—';
                      })()}</div></div>
                    </div>

                    {detail.description && (
                      <div style={{ marginBottom: '1rem', padding: '.75rem', background: '#FAFBFC', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '.6875rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '.25rem' }}>Descripción / Notas del lead</div>
                        <div style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>{detail.description}</div>
                      </div>
                    )}

                    {detail.tags && detail.tags.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '.6875rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '.5rem' }}>Etiquetas</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                          {detail.tags.map(t => (
                            <span key={t.id || t.name} style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 6, padding: '.25rem .5rem', fontSize: '.6875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em', color: 'var(--text-primary)', marginBottom: '.5rem' }}>Notas de gestión (Interacciones)</h3>
                      {(!detail.interanes || detail.interanes.length === 0) ? <div style={{ fontSize: '.8rem', color: 'var(--text-tertiary)' }}>Sin interacciones registradas.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                          {detail.interanes.map(i => (
                            <div key={i.id} style={{ padding: '.6rem', border: '1px solid var(--border-subtle)', borderRadius: 6, background: '#fff' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '.75rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{i.type || 'nota'}</span>
                                <span style={{ fontSize: '.6875rem', color: 'var(--text-tertiary)' }}>{i.createdAt ? new Date(i.createdAt).toLocaleString() : '—'}</span>
                              </div>
                              <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>{i.content || '—'}</div>
                              {(i.previousStatus || i.newStatus) && (
                                <div style={{ fontSize: '.6875rem', color: 'var(--text-tertiary)', marginTop: '.25rem' }}>
                                  {i.previousStatus ? `Estado anterior: ${i.previousStatus}` : ''}{(i.previousStatus && i.newStatus) ? ' → ' : ''}{i.newStatus ? `Estado nuevo: ${i.newStatus}` : ''}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em', color: 'var(--text-primary)', marginBottom: '.5rem' }}>Tareas</h3>
                      {(!detail.tareas || detail.tareas.length === 0) ? <div style={{ fontSize: '.8rem', color: 'var(--text-tertiary)' }}>Sin tareas registradas.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                          {detail.tareas.map(t => (
                            <div key={t.id} style={{ padding: '.6rem', border: '1px solid var(--border-subtle)', borderRadius: 6, background: '#fff' }}>
                              <div style={{ fontWeight: 700, fontSize: '.8rem', color: 'var(--text-primary)' }}>{t.title || '—'}</div>
                              {t.notes && <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>{t.notes}</div>}
                              <div style={{ fontSize: '.6875rem', color: 'var(--text-tertiary)', marginTop: '.25rem' }}>
                                Fecha límite: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}  -  Completado: {t.completed ? 'Sí' : 'No'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 style={{ fontSize: '.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em', color: 'var(--text-primary)', marginBottom: '.5rem' }}>Bitácora</h3>
                      {(!detail.auditLogs || detail.auditLogs.filter(a => a.action !== 'personalizado' && a.action !== 'nota_manual').length === 0) ? <div style={{ fontSize: '.8rem', color: 'var(--text-tertiary)' }}>Sin registros.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                          {detail.auditLogs.filter(a => a.action !== 'personalizado' && a.action !== 'nota_manual').map(a => (
                            <div key={a.id || a.createdAt} style={{ padding: '.6rem', border: '1px solid #e5e7eb', borderRadius: 6, background: '#FAFBFC' }}>
                              <div style={{ fontWeight: 700, fontSize: '.75rem', color: '#111827', marginBottom: '.25rem' }}>{a.action || 'Actualización'}</div>
                              <div style={{ fontSize: '.8rem', color: '#374151' }}>{a.details || ''}</div>
                              <div style={{ fontSize: '.6875rem', color: '#9ca3af', marginTop: '.25rem' }}>{a.createdAt ? new Date(a.createdAt).toLocaleString('es-CR') : ''}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}

function KpiCard({ value, label, color }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid var(--border-default)', borderRadius: 8, padding: '1rem', boxShadow: 'var(--shadow-card)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: color, borderRadius: 2 }} />
      <div style={{ paddingLeft: '.5rem' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{value}</div>
        <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '.25rem', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div>
      </div>
    </div>
  )
}
