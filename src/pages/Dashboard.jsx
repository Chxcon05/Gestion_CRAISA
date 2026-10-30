import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../hooks/useApi.js'

export default function Dashboard() {
  // Donut chart component for Estado de leads
  const DonutChart = ({ data, sum, radius = 70, strokeWidth = 18, circumference, gap = 2, colors, labels }) => {
    const [hover, setHover] = useState(null)
    return (
    <div style={{ position: 'relative', width: radius * 2, height: radius * 2 }}>
      <svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`} style={{ transform: 'rotate(-90deg)' }}>
        <g>
          {data.map((d, i) => {
            const dash = d.pct * circumference
            const isHovered = hover === d.estado
            return (
              <circle
                key={d.estado}
                cx={radius}
                cy={radius}
                r={radius - strokeWidth / 2}
                stroke={colors[d.estado]}
                strokeOpacity={isHovered ? 1 : 0.85}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={`${dash - gap} ${circumference - dash + gap}`}
                strokeDashoffset={-d.startOffset}
                fill="none"
                strokeLinecap="round"
                style={{ transition: 'all .2s ease', cursor: 'pointer', filter: isHovered ? 'brightness(1.15)' : 'brightness(1)' }}
                onMouseEnter={() => setHover(d.estado)}
                onMouseLeave={() => setHover(null)}
              />
            )
          })}
          {sum === 0 && <circle cx={radius} cy={radius} r={radius - strokeWidth / 2} stroke="var(--border-default)" strokeWidth={strokeWidth} fill="none" strokeDasharray={`${circumference}`} />}
        </g>
      </svg>
      {/* Tooltip */}
      {hover && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#1a1a2e',
          color: '#fff',
          padding: '.5rem .75rem',
          borderRadius: 8,
          fontSize: '.75rem',
          fontWeight: 600,
          textAlign: 'center',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,.25)',
          zIndex: 10,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ textTransform: 'capitalize', letterSpacing: '.02em', fontSize: '.875rem', marginBottom: '.125rem' }}>{(labels && labels[hover]) ? labels[hover] : hover}</div>
          <div style={{ fontWeight: 700, color: colors[hover], fontSize: '1rem' }}>{data.find(x => x.estado === hover)?.count || 0} <span style={{ fontWeight: 400, color: '#ccc' }}>({sum ? Math.round((data.find(x => x.estado === hover)?.count || 0) / sum * 100) : 0}%)</span></div>
        </div>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, width: radius * 2, height: radius * 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: radius * 0.25, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{sum}</span>
        <span style={{ fontSize: '.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Total leads</span>
      </div>
    </div>
  )}
  const [leads, setLeads] = useState([])
  useEffect(() => {
    let token = sessionStorage.getItem('token')
    if (!token) {
      fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }) })
      .then(r => r.json()).then(d => { if (d.token) { token = d.token; sessionStorage.setItem('token', token); } }).catch(() => {})
    }
    const load = () => {
      let token = sessionStorage.getItem('token')
      if (!token) {
        fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }) })
          .then(r => r.json()).then(d => { if (d.token) { token = d.token; sessionStorage.setItem('token', token); } }).catch(() => {})
      }
      api('/api/leads', { headers: { Authorization: 'Bearer ' + (token || '') } }).then(r => r.json()).then(d => setLeads(Array.isArray(d) ? d : [])).catch(() => setLeads([]))
    }
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [])

  const total = leads.length
  const ganadas = leads.filter(l => (l.estado || l.status) === 'ganado').length
  const perdidas = leads.filter(l => (l.estado || l.status) === 'perdido').length
  const others = total - ganadas - perdidas
  const conversionRate = total ? Math.round((ganadas / total) * 100) : 0
  const firstLead = leads[0] || {}

  return (
    <main className="main" style={{ paddingTop: 2 }}>
      <div className="container">
        {/* Hero */}
        <div className="card" style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 8, padding: '2rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <span className="eyebrow">Resumen comercial · Actualizado hoy</span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '.25rem 0', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', lineHeight: 1.1 }}>Dashboard Comercial</h1>
              <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>
                Cliente: <strong>{firstLead.client || '—'}</strong> · Canal: <strong>{firstLead.canal || '—'}</strong> · Estado: <strong>{firstLead.estado || '—'}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', padding: '.75rem 1rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 6 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--craisa-primary)', fontFamily: 'var(--font-display)' }}>{total}</div>
                <div style={{ fontSize: '.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '.25rem' }}>Leads</div>
              </div>
              <div style={{ textAlign: 'center', padding: '.75rem 1rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 6 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--line-carga)', fontFamily: 'var(--font-display)' }}>{conversionRate}%</div>
                <div style={{ fontSize: '.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '.25rem' }}>Conversión</div>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <Kpi val={total} label="Total Leads" icon="M3 3h18v18H3z" color="var(--craisa-primary)" />
          <Kpi val={others} label="En gestión" icon="M12 6v6l4 2" color="var(--line-construccion)" />
          <Kpi val={ganadas} label="Ganados" icon="M9 12l2 2 4-4" color="var(--line-carga)" />
          <Kpi val={perdidas} label="Perdidos" icon="M3 3v18h18" color="var(--line-agricola)" />
          <Kpi val={conversionRate} label="Conversión %" icon="M12 2l3 3-3 3-3-3 3-3" color="var(--carbon-green)" />
        </div>

        {/* Perfil */}
        <div className="dash-section" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-section-header"><div className="dash-section-title" style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Perfil del cliente</div></div>
          <div className="dash-section-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {( () => {
                const c = firstLead.client || '—';
                const r = (firstLead.responsable || '').trim();
                const rmap = { 'admin@craisa.com': 'Admin CRAISA', 'admin@craisa': 'Admin CRAISA' };
                const rn = r && r.includes('@') ? (rmap[r] || r.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())) : r;
                return (
                  <>
                    <Info title="Cliente" value={c} meta={firstLead.company ? `Empresa: ${firstLead.company}` : '—'} />
                    <Info title="Canal" value={firstLead.canal ? firstLead.canal.toUpperCase() : '—'} meta={firstLead.linea ? `Línea: ${firstLead.linea}` : '—'} />
                    <Info title="Estado" value={firstLead.estado ? firstLead.estado.toUpperCase() : '—'} meta={rn ? `Responsable: ${rn}` : '—'} />
                  </>
                );
              })() }
            </div>
          </div>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <Link to="/leads" className="btn btn-primary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 3v18"/></svg> Ver Leads</Link>
          <Link to="/reports" className="btn btn-secondary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Reportes</Link>
          <Link to="/agenda" className="btn btn-secondary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Agenda</Link>
        </div>

        {/* Estado de leads - Gráfico circular interactivo */}
        <div className="dash-section" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-section-header"><div className="dash-section-title" style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Estado de leads</div></div>
          <div className="dash-section-body">
            {(() => {
              const estados = ['nuevo','asignado','contactado','seguimiento','oportunidad','ganado','perdido']
              const colors = { nuevo: '#0044BB', asignado: '#FFB800', contactado: '#00AA44', seguimiento: '#9933FF', oportunidad: '#FF6600', ganado: '#555555', perdido: '#CC0000' }
              const labels = { nuevo: 'Nuevo', asignado: 'Asignado', contactado: 'Contactado', seguimiento: 'Seguimiento', oportunidad: 'Oportunidad', ganado: 'Ganado', perdido: 'Perdido' }
              const data = estados.map(e => ({ estado: e, count: leads.filter(l => (l.estado || l.status) === e).length })).filter(d => d.count > 0)
              const sum = data.reduce((a,b) => a + b.count, 0)
              const radius = 110
              const strokeWidth = 18
              const circumference = 2 * Math.PI * (radius - strokeWidth / 2)
              const gap = 2
              
              // Build segment geometry
              const segments = data.map((d, i) => {
                const pct = d.count / sum
                const dash = pct * circumference
                const startOffset = data.slice(0, i).reduce((acc, s) => acc + (s.count / sum) * circumference, 0)
                return { ...d, pct, dash, startOffset }
              })
              
              return (
                <>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                <DonutChart 
                  data={segments} 
                  sum={sum} 
                  radius={radius} 
                  strokeWidth={strokeWidth} 
                  circumference={circumference} 
                  gap={gap}
                  colors={colors}
                  labels={labels}
                />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: '.75rem', marginTop: '1.5rem', width: '100%' }}>
                  {Object.entries(colors).map(([estado, color]) => (
                    <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.9rem', color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 600 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <span>{(labels && labels[estado]) ? labels[estado] : estado}</span>
                    </div>
                  ))}
                </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Por línea de negocio */}
        <div className="dash-section" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-section-header"><div className="dash-section-title" style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Distribución por línea</div><span style={{ fontSize: '.75rem', color: 'var(--text-tertiary)' }}>Según negocio</span></div>
          <div className="dash-section-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem' }}>
              {[
                { label: 'Agrícola', color: 'var(--line-agricola)' },
                { label: 'Construcción', color: 'var(--line-construccion)' },
                { label: 'Carga', color: 'var(--line-carga)' },
                { label: 'Precisión', color: 'var(--line-precision)' },
                { label: 'Postventa', color: 'var(--line-postventa)' },
                { label: 'Institucional', color: 'var(--craisa-primary)' },
              ].map(({ label, color }) => {
                const c = leads.filter(l => ((l.linea || l.businessLine || l.lineName || '').trim().toLowerCase()) === label.toLowerCase()).length
                return (
                  <div key={label} style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 6, padding: '.75rem', boxShadow: 'var(--shadow-card)', transition: 'transform .15s ease, box-shadow .15s ease', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,.08)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}>
                    <div style={{ fontSize: '.6875rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{c}</div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-subtle)', marginTop: '.25rem', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: color, width: (total ? (c/total*100) : 0) + '%' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Por canal */}
        <div className="dash-section" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-section-header"><div className="dash-section-title" style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Distribución por canal</div></div>
          <div className="dash-section-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
              {[...new Set(leads.map(l => l.canal || 'otro'))].map(c => {
                const count = leads.filter(l => (l.canal || 'otro') === c).length
                return (
                  <div key={c} style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 6, padding: '.5rem .75rem', boxShadow: 'var(--shadow-xs)', transition: 'transform .15s ease, box-shadow .15s ease', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,.08)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c}</div>
                    <div style={{ fontSize: '.6875rem', color: 'var(--text-tertiary)' }}>{count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Actividad reciente – últimas 5 acciones de cualquier página */}
                <Section title="Actividad reciente" block="" rows={(() => {
          const mapa = { 'admin@craisa.com': 'Admin CRAISA', 'admin@craisa': 'Admin CRAISA' }
          const nombreResp = (r) => {
            if (!r || r === 'Sin asignar') return 'Sin asignar'
            if (r.includes('@')) return mapa[r] || r.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            return r
          }
          const eventos = []
          ;(leads || []).forEach(l => {
            const code = l.code || ''
            const resp = nombreResp(l.responsable || l.responsableId || '')
            ;(l.interanes || []).forEach(i => {
              let fecha = (i.createdAt ? new Date(i.createdAt) : null) || (l.createdAt ? new Date(l.createdAt) : new Date())
              if (isNaN(fecha)) return
              eventos.push({ fecha, tipo: 'interacción', descripcion: i.content || '', autor: resp, codigo: code, prev: i.previousStatus, nuevo: i.newStatus })
            })
            ;(l.auditLogs || []).forEach(a => {
              if (!a.createdAt) return
              eventos.push({ fecha: new Date(a.createdAt), tipo: 'auditoría', descripcion: a.action || '', details: a.details || '', autor: resp, codigo: code })
            })
            ;(l.actions || []).forEach(a => {
              if (!a.createdAt) return
              eventos.push({ fecha: new Date(a.createdAt), tipo: 'acción', descripcion: a.action || '', autor: resp, codigo: code })
            })
          })
          eventos.sort((a, b) => b.fecha - a.fecha)
          return eventos.slice(0, 5).map(e => {
            const fechaStr = e.fecha ? e.fecha.toLocaleDateString('es-CR') : '—'
            const linea = e.codigo + ' · ' + e.tipo + ' · ' + fechaStr
            let detalle = ''
            if (e.tipo === 'auditoría' && e.details) detalle = (e.descripcion || '') + ' — ' + e.details
            else if (e.descripcion) detalle = e.descripcion
            else detalle = (e.prev || e.nuevo ? (e.prev || '—') + ' → ' + (e.nuevo || '—') : '—')
            return [e.autor || '—', linea, detalle]
          })
        })() } />


        {/* Rendimiento */}
        <div className="dash-section" style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
          <div className="dash-section-header" style={{ padding: '.875rem 1.25rem', borderBottom: '1px solid var(--border-light)', background: '#FAFBFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="dash-section-title" style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ width: 3, height: 14, background: 'var(--craisa-primary)', borderRadius: 2 }} />
              <span style={{ fontSize: '.7rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginRight: '.5rem' }}>Vendedores</span>
              Rendimiento del equipo
            </div>
          </div>
          <div className="dash-section-body" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {(() => {
                const grupos = {}
                leads.forEach(l => {
                  let v = (l.responsable || '').trim()
                  if (v.includes('@')) {
                    const mapa = { 'admin@craisa.com': 'Admin CRAISA', 'admin@craisa': 'Admin CRAISA' }
                    v = mapa[v] || v.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  }
                  if (!v || v === 'Sin asignar') v = 'Sin asignar'
                  if (!grupos[v]) grupos[v] = { total: 0, ganados: 0 }
                  grupos[v].total++
                  if ((l.estado || l.status) === 'ganado') grupos[v].ganados++
                })
                const nombres = Object.keys(grupos).filter(n => n && n !== 'Sin asignar')
                if (nombres.length === 0) return <div style={{ fontSize: '.85rem', color: 'var(--text-tertiary)' }}>No hay vendedores registrados.</div>
                return nombres.map(v => {
                  const g = grupos[v]
                  const cierre = g.total ? Math.round((g.ganados / g.total) * 100) : 0
                  return (
                    <div key={v} style={{ display: 'flex', gap: '1rem', padding: '.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: '.7rem', color: 'var(--text-tertiary)', fontWeight: 600, minWidth: 100 }}>{v}</span>
                      <span style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{g.total} leads · {g.ganados} ganados · {cierre}% cierre</span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>

        {/* Motivos de pérdida */}
        <div className="dash-section" style={{ marginBottom: 1 }}>
          <div className="dash-section-header"><div className="dash-section-title" style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Motivos de pérdida</div><span style={{ fontSize: '.75rem', color: 'var(--text-tertiary)' }}>{leads.filter(l => (l.estado || l.status) === 'perdido').length} perdidos</span></div>
          <div className="dash-section-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {(() => {
                const perdidos = leads.filter(l => (l.estado || l.status) === 'perdido')
                const reasons = {}
                perdidos.forEach(l => { const r = l.lossReason || 'Sin especificar'; reasons[r] = (reasons[r] || 0) + 1 })
                const entries = Object.entries(reasons).sort((a,b) => b[1]-a[1])
                const totalP = perdidos.length || 1
                return entries.map(([label, count]) => {
                  const pct = Math.round(count/totalP*100)
                  return (
                    <div key={label} style={{ background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 12, padding: '.9rem 1.1rem', boxShadow: 'var(--shadow-card)', marginBottom: '.6rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '.85rem', color: '#000', fontWeight: 800 }}>{pct}%</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.01em' }}>{label}</div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-subtle)', marginTop: '.35rem', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: 'var(--line-agricola)', width: pct + '%' }} />
                        </div>
                      </div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{count} · {totalP}</div>
                    </div>
                  )
                })
              })()}
              {leads.filter(l => (l.estado || l.status) === 'perdido').length === 0 && <div style={{ fontSize: '.75rem', color: 'var(--text-tertiary)' }}>No hay leads perdidos registrados.</div>}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function Kpi({ val, label, icon, color }) {
  return (
    <div className="kpi-box" style={{ flex: 1, minWidth: 180, background: '#fff', border: '1px solid var(--border-default)', borderRadius: 8, padding: '1.25rem', boxShadow: 'var(--shadow-card)', position: 'relative', overflow: 'hidden', transition: 'transform .15s ease, box-shadow .15s ease', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,.08)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: color || 'var(--craisa-primary)', borderRadius: 2 }} />
      <div style={{ paddingLeft: '.5rem' }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{val}</div>
        <div style={{ fontSize: '.8125rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '.25rem' }}>{label}</div>
      </div>
    </div>
  )
}

function Info({ title, value, meta }) {
  return (
    <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-default)', borderRadius: 8, background: '#fff' }}>
      <div style={{ fontSize: '.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{title}</div>
      <div style={{ fontWeight: 800, color: 'var(--craisa-primary)', fontSize: '1.5rem', margin: '.25rem 0', fontFamily: 'var(--font-display)' }}>{value}</div>
      <div style={{ fontSize: '.75rem', color: 'var(--text-tertiary)' }}>{meta}</div>
    </div>
  )
}

function Section({ title, block, rows }) {
  return (
    <div className="dash-section" style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
      <div className="dash-section-header" style={{ padding: '.875rem 1.25rem', borderBottom: '1px solid var(--border-light)', background: '#FAFBFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="dash-section-title" style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <span style={{ width: 3, height: 14, background: 'var(--craisa-primary)', borderRadius: 2 }} />
          <span style={{ fontSize: '.7rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginRight: '.5rem' }}>{block}</span>
          {title}
        </div>
      </div>
      <div className="dash-section-body" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {rows.map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', padding: '.5rem 0', borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <span style={{ fontSize: '.7rem', color: 'var(--text-tertiary)', fontWeight: 600, minWidth: 100 }}>{k}</span>
              <span style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
