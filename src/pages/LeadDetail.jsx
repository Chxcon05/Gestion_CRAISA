import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../hooks/useApi.js'

export default function LeadDetail() {
  const navigate = useNavigate()
  const { code } = useParams()
  const [leads, setLeads] = useState([])
  const [lead, setLead] = useState(null)
  const [note, setNote] = useState('')
  const [tareasNote, setTareasNote] = useState('')
  const [auditNote, setAuditNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('interacciones')
  const originalLeadRef = useRef(null)
  const initialLeadRef = useRef(null)

  useEffect(() => {
    let token = sessionStorage.getItem('token')
    if (!token) {
      fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }) })
        .then(r => r.json()).then(d => { if (d.token) { token = d.token; sessionStorage.setItem('token', token) } }).catch(() => {})
    }
    // Siempre usar datos de la base para evitar confusiones con caché
    api('/api/leads', { headers: { Authorization: 'Bearer ' + (token || '') } })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : []
        setLeads(list)
        const found = list.find(l => (l.code || l.id) === code || (l.id || l.code) === code)
        if (found) { setLead(found); originalLeadRef.current = found; if (!initialLeadRef.current) initialLeadRef.current = found }
      })
      .catch(() => setLeads([]))
  }, [code])

  const handleSave = () => {
    if (!lead) return
    const token = sessionStorage.getItem('token')
    const id = lead.code || lead.id || code
    console.log('Saving lead', id, 'with token?', !!token)
    const orig = initialLeadRef.current || lead
    const payloadBase = { ...lead, bitacora: note || lead?.bitacora || '', tareas: tareasNote || '', auditLogs: '' }
    const cambios = []
    if (payloadBase.estado !== orig?.estado) cambios.push('Estado actualizado: ' + (orig?.estado || '-') + ' -> ' + payloadBase.estado)
    if (payloadBase.proxAccion !== orig?.proxAccion) cambios.push('Accion programada: ' + (orig?.proxAccion || '-') + ' -> ' + payloadBase.proxAccion)
    if (payloadBase.proxFecha !== orig?.proxFecha) cambios.push('Fecha contacto: ' + (orig?.proxFecha || '-') + ' -> ' + payloadBase.proxFecha)
    if (payloadBase.responsable !== orig?.responsable) cambios.push('Responsable: ' + (orig?.responsable || '-') + ' -> ' + payloadBase.responsable)
    if (payloadBase.linea !== orig?.linea) cambios.push('Linea: ' + (orig?.linea || '-') + ' -> ' + payloadBase.linea)
    if (payloadBase.company !== orig?.company) cambios.push('Empresa: ' + (orig?.company || '-') + ' -> ' + payloadBase.company)
    if (payloadBase.canal !== orig?.canal) cambios.push('Canal: ' + (orig?.canal || '-') + ' -> ' + payloadBase.canal)
    if (payloadBase.client !== orig?.client) cambios.push('Cliente actualizado: ' + (orig?.client || '-') + ' -> ' + payloadBase.client)
    if (payloadBase.phone !== orig?.phone) cambios.push('Telefono actualizado: ' + (orig?.phone || '-') + ' -> ' + payloadBase.phone)
    if (payloadBase.email !== orig?.email) cambios.push('Correo actualizado: ' + (orig?.email || '-') + ' -> ' + payloadBase.email)
    if (payloadBase.product !== orig?.product) cambios.push('Producto actualizado: ' + (orig?.product || '-') + ' -> ' + payloadBase.product)
    if (payloadBase.description !== orig?.description) cambios.push('Descripcion actualizada: ' + (orig?.description || '-') + ' -> ' + payloadBase.description)
    if (payloadBase.valorEstimado !== orig?.valorEstimado && payloadBase.valorEstimado !== undefined) cambios.push('Valor actualizado: ' + (orig?.valorEstimado || '-') + ' -> ' + payloadBase.valorEstimado)
    if (payloadBase.lossReason !== orig?.lossReason) cambios.push('Motivo perdida actualizado: ' + (orig?.lossReason || '-') + ' -> ' + payloadBase.lossReason)
    if (note && note.trim() !== '') cambios.push(`Nota agregada: "${note.trim().length > 40 ? note.trim().slice(0, 40) + '...' : note.trim()}"`)
    const auditMsg = cambios.length ? cambios.join('  -  ') : `Estado: ${payloadBase.estado || '—'}  -  Acción: ${payloadBase.proxAccion || '—'}  -  Línea: ${payloadBase.linea || '—'}  -  Canal: ${payloadBase.canal || '—'}`
    const payload = { ...payloadBase, auditLogs: auditMsg }
    fetch('/api/leads/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token || '') },
      body: JSON.stringify(payload)
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(() => {
        // PATCH exitoso: recargar el lead completo desde /api/leads
        api('/api/leads/' + id, { headers: { Authorization: 'Bearer ' + (token || '') } })
          .then(r => r.json())
          .then(d => { setLead(d); setSaved(true); window.location.href = '/leads' })
          .catch(() => { setLead(payload); setSaved(true); window.location.href = '/leads' })
      })
      .catch(() => { setLead(payload); setSaved(true); window.location.href = '/leads' })
  }

  const estados = ['nuevo','asignado','contactado','seguimiento','oportunidad','ganado','perdido']
  const motivos = ['Sin especificar','Precio alto','Competencia','Sin presupuesto','Fuera de zona','Producto no disponible','Sin respuesta']

  if (!lead && leads.length > 0) {
    return (
      <main className="main" style={{ paddingTop: '1.5rem', background: 'var(--bg-page)', minHeight: '100vh' }}>
        <div className="container">
          <div className="page-header">
            <div><h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, textTransform: 'uppercase' }}>No encontrado</h1></div>
            <Link to="/leads" className="btn btn-secondary">Volver</Link>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>El lead <strong>{code}</strong> no fue encontrado en la base de datos.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="main" style={{ paddingTop: '1.5rem', background: 'var(--bg-page)', minHeight: '100vh' }}>
      <div className="container">
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <span className="eyebrow">Ficha del lead</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', color: 'var(--text-primary)', lineHeight: 1.1 }}>{lead?.code || code}</h1>
          </div>
          <div className="page-actions">
            <Link to="/leads" className="btn btn-secondary">Volver al listado</Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem', alignItems: 'start' }}>
          {/* Datos */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', background: '#FFFFFF' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '.9375rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem' }}>Información del lead</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.75rem' }}>
              <EditableField label="Cliente" value={lead?.client || ''} onChange={v => setLead({ ...lead, client: v })} />
              <EditableField label="Empresa" value={lead?.company || ''} onChange={v => setLead({ ...lead, company: v })} />
              <div style={{ marginBottom: '.75rem' }}>
                <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '.25rem' }}>Canal</label>
                <select value={lead?.canal || ''} onChange={e => setLead({ ...lead, canal: e.target.value })} style={{ width: '100%', padding: '.625rem', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: '.875rem', background: '#fff' }}>
                  <option>Sitio web</option><option>Facebook</option><option>Instagram</option><option>WhatsApp</option><option>Llamada</option><option>Correo</option><option>Feria</option><option>Visita comercial</option><option>Otro</option>
                </select>
              </div>
              <div style={{ marginBottom: '.75rem' }}>
                <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '.25rem' }}>Línea</label>
                <select value={lead?.linea || lead?.businessLine || ''} onChange={e => setLead({ ...lead, linea: e.target.value, businessLine: e.target.value })} style={{ width: '100%', padding: '.625rem', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: '.875rem', background: '#fff' }}>
                  <option>Agrícola</option><option>Construcción</option><option>Carga</option><option>Precisión</option><option>Postventa</option><option>Institucional</option>
                </select>
              </div>
              <div style={{ marginBottom: '.75rem' }}>
                <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '.25rem' }}>Estado</label>
                <select value={lead?.estado || lead?.status || ''} onChange={e => setLead({ ...lead, estado: e.target.value, status: e.target.value })} style={{ width: '100%', padding: '.625rem', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: '.875rem', background: '#fff' }}>
                  {estados.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <EditableField label="Responsable" value={lead?.responsable || ''} onChange={v => setLead({ ...lead, responsable: v })} />
              <EditableField label="Teléfono" value={lead?.phone || ''} onChange={v => setLead({ ...lead, phone: v })} />
              <EditableField label="Correo" value={lead?.email || ''} onChange={v => setLead({ ...lead, email: v })} />
              <EditableField label="Producto" value={lead?.product || ''} onChange={v => setLead({ ...lead, product: v })} />
              <EditableField label="Valor estimado" value={lead?.valorEstimado || ''} onChange={v => setLead({ ...lead, valorEstimado: v })} />
              <EditableField label="Próxima acción" value={lead?.proxAccion || lead?.nextAction || ''} onChange={v => setLead({ ...lead, proxAccion: v, nextAction: v })} />
              <div style={{ marginTop: '.25rem', display: 'flex', gap: '.5rem' }}>
                <input type="date" min={new Date().toISOString().split('T')[0]} value={lead?.proxFecha || lead?.recontactAt ? (lead?.recontactAt || lead?.proxFecha || '').split('T')[0] : new Date().toISOString().split('T')[0]} onChange={e => setLead({ ...lead, proxFecha: e.target.value, recontactAt: e.target.value })} style={{ width: '100%', padding: '.5rem', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: '.875rem', background: '#fff' }} />
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '.25rem' }}>Descripción</label>
              <textarea value={lead?.description || ''} onChange={e => setLead({ ...lead, description: e.target.value })} rows={3} style={{ width: '100%', padding: '.625rem', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: '.875rem', resize: 'vertical', fontFamily: 'inherit', background: '#FAFBFC' }} />
            </div>
          </div>

          {/* Actualización */}
          <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--shadow-card)', background: '#FFFFFF' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '.9375rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '.75rem' }}>Actualizar</h2>

            <div style={{ marginBottom: '.75rem' }}>
              <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '.25rem' }}>Estado</label>
              <select value={lead?.estado || lead?.status || ''} onChange={e => setLead({ ...lead, estado: e.target.value, status: e.target.value })} style={{ width: '100%', padding: '.625rem', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: '.875rem', background: '#fff' }}>
                {estados.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '.75rem' }}>
              <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '.25rem' }}>Motivo de pérdida (si corresponde)</label>
              <select value={lead?.lossReason || ''} onChange={e => setLead({ ...lead, lossReason: e.target.value })} style={{ width: '100%', padding: '.625rem', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: '.875rem', background: '#fff' }}>
                {motivos.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '.75rem' }}>
              <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '.25rem' }}>Nota de gestión</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Escriba una nota..." style={{ width: '100%', padding: '.625rem', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: '.875rem', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <button onClick={handleSave} className="btn btn-primary" style={{ width: '100%' }}>Guardar cambios</button>
            {saved && <div style={{ marginTop: '.5rem', fontSize: '.75rem', color: 'var(--line-carga)', fontWeight: 600 }}>âœ“ Cambios guardados</div>}

            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '.75rem', background: '#fff', marginTop: '.75rem' }}>
              <div style={{ display: 'flex', gap: '.25rem', marginBottom: '.75rem' }}>
                {['interacciones','tareas','bitacora'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '.35rem .6rem', border: '1px solid var(--border-default)', borderRadius: 6, background: activeTab === t ? '#003087' : '#fff', color: activeTab === t ? '#fff' : 'var(--text-primary)', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{t === 'interacciones' ? 'Interacciones' : t === 'tareas' ? 'Tareas' : 'Bitácora'}</button>
                ))}
              </div>
              {activeTab === 'interacciones' && (
                <div>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Nota de gestión..." style={{ width: '100%', padding: '.5rem', border: '1px solid var(--border-default)', borderRadius: 4, fontSize: '.75rem', resize: 'vertical', fontFamily: 'inherit', background: '#FAFBFC', marginBottom: '.5rem' }} />
                  {!lead?.interanes || lead.interanes.length === 0 ? <div style={{ fontSize: '.75rem', color: 'var(--text-tertiary)' }}>Sin interacciones.</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                      {lead.interanes.slice(0, 3).map((i, idx) => (
                        <div key={idx} style={{ padding: '.375rem', border: '1px solid var(--border-subtle)', borderRadius: 4, background: '#fff', fontSize: '.75rem' }}>
                          <div style={{ fontWeight: 600 }}>{i.type || 'nota'}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '.6875rem' }}>{i.content ? (i.content.length > 45 ? i.content.slice(0, 45) + '...' : i.content) : '—'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'tareas' && (
                <div>
                  <textarea value={tareasNote} onChange={e => setTareasNote(e.target.value)} rows={2} placeholder="Agregar tarea..." style={{ width: '100%', padding: '.5rem', border: '1px solid var(--border-default)', borderRadius: 4, fontSize: '.75rem', resize: 'vertical', fontFamily: 'inherit', background: '#FAFBFC', marginBottom: '.5rem' }} />
                  {!lead?.tareas || lead.tareas.length === 0 ? <div style={{ fontSize: '.75rem', color: 'var(--text-tertiary)' }}>Sin tareas.</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                      {lead.tareas.slice(0, 3).map((t, idx) => (
                        <div key={idx} style={{ padding: '.375rem', border: '1px solid var(--border-subtle)', borderRadius: 4, background: '#fff', fontSize: '.75rem' }}>
                          <div style={{ fontWeight: 600 }}>{t.title || '—'}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '.6875rem' }}>{t.completed ? 'âœ“ Completado' : 'Pendiente'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'bitacora' && (
                <div>
                  <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '.5rem' }}>Cambios automáticos</div>
                  {!lead?.auditLogs || lead.auditLogs.length === 0 ? <div style={{ fontSize: '.75rem', color: 'var(--text-tertiary)' }}>Sin registros de bitácora.</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                      {lead.auditLogs.filter(a => a.action !== 'personalizado' && a.action !== 'nota_manual').slice(0, 8).map((a, idx) => (
                        <div key={idx} style={{ padding: '.5rem', border: '1px solid #e5e7eb', borderRadius: 6, background: '#FAFBFC', fontSize: '.75rem', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#111827', fontSize: '.8125rem' }}>{a.action || 'Actualización'}</div>
                            <div style={{ color: '#6b7280', fontSize: '.625rem' }}>{a.details || ''}</div>
                          </div>
                          <div style={{ fontSize: '.625rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>{a.createdAt ? new Date(a.createdAt).toLocaleString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function Info({ label, value }) {
  return (
    <div style={{ background: '#FAFBFC', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '.625rem .875rem' }}>
      <div style={{ fontSize: '.6875rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: '.125rem' }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '.875rem' }}>{value}</div>
    </div>
  )
}

function EditableField({ label, value, onChange }) {
  return (
    <div style={{ background: '#FAFBFC', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '.625rem .875rem' }}>
      <label style={{ fontSize: '.6875rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em', display: 'block', marginBottom: '.25rem' }}>{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '.25rem .5rem', border: '1px solid var(--border-default)', borderRadius: 4, fontSize: '.875rem', background: '#fff', fontFamily: 'inherit', color: 'var(--text-primary)', outline: 'none' }}
      />
    </div>
  )
}

