import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../hooks/useApi.js'

export default function NewLead() {
  const [form, setForm] = useState({ client: '', company: '', phone: '', email: '', canal: 'WhatsApp', linea: 'Agrícola', product: '', descripcion: '', estado: 'nuevo', proxAccion: '', proxFecha: '', valor: '$0' })
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault(); setMsg('')
    try {
      let token = sessionStorage.getItem('token');
      if (!token) {
        const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@craisa.com', password: 'demo123' }) });
        const d = await r.json();
        token = d.token;
        sessionStorage.setItem('token', token);
      }
      const r = await api('/api/leads', { method: 'POST', body: JSON.stringify({ client: form.client, company: form.company, phone: form.phone, email: form.email, canal: form.canal, linea: form.linea, product: form.product, descripcion: form.descripcion, estado: form.estado, proxAccion: form.proxAccion, proxFecha: form.proxFecha, valor: form.valor }), headers: { Authorization: 'Bearer ' + (token || '') } })
      const data = await r.json()
      if (!r.ok) return setMsg(data.error || 'Error al crear lead')
      setMsg('Lead creado: ' + (data.code || ''))
      window.location.href = '/leads'
      return null
    } catch (e) { setMsg('Error de conexión') }
  }

  return (
    <main className="main" style={{ paddingTop: 2 }}>
      <div className="container">
        <div className="page-header" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '.25rem' }}><div style={{ textAlign: 'center' }}><h1 style={{ margin: 0 }}>Nuevo Lead</h1><p className="page-subtitle" style={{ margin: 0 }}>Registra una nueva consulta comercial</p></div></div>
        <div className="card" style={{ padding: '1.5rem', maxWidth: 720, margin: '0 auto' }}>
          <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '.75rem' }}>
            <div><label className="form-label">Cliente</label><input className="form-input" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} required /></div>
            <div><label className="form-label">Empresa</label><input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
            <div><label className="form-label">Teléfono</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="form-label">Correo</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="form-label">Canal</label>
              <select className="form-select" value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })}>
                <option>Sitio web</option><option>Facebook</option><option>Instagram</option><option>WhatsApp</option><option>Llamada</option><option>Correo</option><option>Feria</option><option>Visita comercial</option><option>Otro</option>
              </select>
            </div>
            <div><label className="form-label">Línea</label>
              <select className="form-select" value={form.linea} onChange={e => setForm({ ...form, linea: e.target.value })}>
                <option>Agrícola</option><option>Construcción</option><option>Carga</option><option>Precisión</option><option>Postventa</option><option>Institucional</option>
              </select>
            </div>
            <div><label className="form-label">Producto</label><input className="form-input" value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} /></div>
            <div><label className="form-label">Estado</label>
              <select className="form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                <option>nuevo</option><option>asignado</option><option>contactado</option><option>seguimiento</option><option>oportunidad</option><option>ganado</option><option>perdido</option>
              </select>
            </div>
            <div><label className="form-label">Próxima acción</label><input className="form-input" value={form.proxAccion} onChange={e => setForm({ ...form, proxAccion: e.target.value })} /></div>
            <div><label className="form-label">Valor estimado</label><input className="form-input" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} required /></div>
            <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Descripción</label><textarea className="form-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} /></div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button type="submit" className="btn btn-primary">Crear lead</button>
              <Link to="/leads" className="btn btn-outline">Cancelar</Link>
            </div>
          </form>
          {msg && <div style={{ marginTop: '.75rem', padding: '.75rem', borderRadius: 6, background: msg.includes('creado') ? 'rgba(61,174,43,0.08)' : 'rgba(220,38,38,0.08)', color: msg.includes('creado') ? 'var(--line-carga)' : '#DC2626', fontSize: '.875rem', fontWeight: 600 }}>{msg}</div>}
        </div>
      </div>
    </main>
  )
}
