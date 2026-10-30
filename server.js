const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const PORT = process.env.PORT || 8081;
const app = express();
app.use(express.json());
app.use(express.static('.'));

let prisma;
try { prisma = new PrismaClient(); } catch (e) { console.error('Prisma init error:', e); }

function genToken(user) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, line: user.line || '', initials: (user.name || 'U')[0].toUpperCase() }, process.env.JWT_SECRET || 'craisa-dev-secret', { expiresIn: '8h' });
}

function authMiddleware(req, res, next) {
  const jwt = require('jsonwebtoken');
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET || 'craisa-dev-secret');
    req.user = decoded;
    next();
  } catch (e) { console.log('ERROR JWT:', e.message); return res.status(403).json({ error: 'Token inválido' }); }
}

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const hash = require('crypto').createHash('sha256').update(password || '').digest('hex');
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.passwordHash !== hash || !user.active) return res.status(401).json({ error: 'Credenciales incorrectas' });
    return res.json({ token: genToken(user), user: { email: user.email, role: user.role, name: user.name, line: user.line } });
  } catch (e) { return res.status(500).json({ error: 'Error en autenticación' }); }
});

app.get('/api/leads', authMiddleware, async (req, res) => {
  let items = [];
  try {
    items = await prisma.lead.findMany({
      where: req.user.role === 'ADMIN' ? {} : { responsableId: req.user.id },
      orderBy: { entryDate: 'desc' },
      take: 200,
      include: { responsable: true, interactions: { orderBy: { createdAt: 'desc' }, take: 10 }, tasks: { orderBy: { dueDate: 'asc' }, take: 5 }, auditLogs: { orderBy: { createdAt: 'desc' }, take: 5 }, leadActions: true }
    });
  } catch (e) { console.error('GET leads error:', e); }
  res.json(items.map(lead => ({
    code: lead.code, client: lead.firstName, company: lead.company, phone: lead.phone, email: lead.email,
    canal: lead.channel, linea: lead.businessLine, product: lead.product,
    estado: lead.status, responsable: lead.responsable ? (lead.responsable.email || lead.responsable.name || '') : (lead.responsableId || ''),
    proxAccion: lead.nextAction || '', proxFecha: lead.recontactAt ? lead.recontactAt.toLocaleDateString('es-CR') : '', score: lead.score,
    valorEstimado: lead.estimatedValue ? '$' + lead.estimatedValue : '$0', date: lead.entryDate ? lead.entryDate.toLocaleDateString('es-CR') : '', lossReason: lead.lossReason || '', createdAt: lead.entryDate ? lead.entryDate.toISOString() : '',
    interanes: lead.interactions ? lead.interactions.map(i => ({ type: i.type || 'nota', createdAt: i.createdAt ? i.createdAt.toISOString() : '', content: i.content, previousStatus: i.previousStatus, newStatus: i.newStatus })) : [],
    tareas: lead.tasks ? lead.tasks.map(t => ({ title: t.title, notes: t.notes, dueDate: t.dueDate ? t.dueDate.toISOString() : '', completed: !!t.completed })) : [],
    auditLogs: lead.auditLogs ? lead.auditLogs.map(a => ({ action: a.action, createdAt: a.createdAt ? a.createdAt.toISOString() : '', details: a.detail || '' })) : [],
    actions: lead.leadActions ? lead.leadActions.map(a => ({ action: a.action, date: a.actionDate ? a.actionDate.toLocaleDateString('es-CR') : '', createdAt: a.createdAt ? a.createdAt.toISOString() : '' })) : []
  })));
});

app.get('/api/leads/:code', authMiddleware, async (req, res) => {
  let lead = null;
  try { lead = await prisma.lead.findUnique({ where: { code: req.params.code }, include: { notes: true, interactions: { orderBy: { createdAt: 'desc' }, take: 10 }, tasks: { orderBy: { dueDate: 'asc' }, take: 5 }, auditLogs: { orderBy: { createdAt: 'desc' }, take: 5 } } }); } catch (e) {}
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
  res.json({
    code: lead.code, client: lead.clientName, company: lead.companyName, phone: lead.phone, email: lead.email,
    canal: lead.channel, linea: lead.lineName, product: lead.productDesc, description: lead.description,
    estado: lead.state, responsable: lead.responsibleEmail,
    proxAccion: lead.nextAction, proxFecha: lead.recontactAt ? lead.recontactAt.toLocaleDateString('es-CR') : '', score: lead.score,
    valorEstimado: lead.estimatedValue, date: lead.createdAt.toLocaleDateString('es-CR'),
    auditLogs: lead.auditLogs ? lead.auditLogs.map(a => ({ action: a.action, createdAt: a.createdAt ? a.createdAt.toISOString() : '', details: a.detail || '' })) : [],
    bitacora: lead.notes.map(n => ({ user: n.userEmail, when: n.when.toLocaleString(), text: n.text })),
    lossReason: lead.lossReason
  });
});

app.post('/api/leads', authMiddleware, async (req, res) => {
  const b = req.body || {};
  const c = 'LEAD-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900) + 143).padStart(4, '0');
  if (prisma) try {
    await prisma.lead.create({ data: {
      code: c,
      firstName: b.client || 'Sin nombre',
      company: b.company || null,
      phone: b.phone || '',
      email: b.email || null,
      channel: b.canal || 'otro',
      businessLine: b.linea || 'agricola',
      product: b.product || null,
      description: b.descripcion || null,
      status: b.estado || 'nuevo',
      nextAction: b.proxAccion || b.nextAction || '',
      recontactAt: b.proxFecha ? new Date(b.proxFecha.split('/').reverse().join('-')) : null,
      score: parseInt(b.score) || 3,
      estimatedValue: parseInt(String(b.valor || '').replace(/[^0-9]/g, '')) || null,
      responsableId: req.user.id,
    } });
    const leadC = await prisma.lead.findUnique({ where: { code: c } })
    if (leadC) await prisma.auditLog.create({ data: { leadId: leadC.id, userId: req.user?.id || '', action: 'Lead creado: ' + c, detail: (b.client || 'Sin nombre') + ' / ' + (b.company || ''), createdAt: new Date() } })
    return res.json({ code: c, message: 'Lead creado' });
  } catch (e) { console.error('Lead create error:', e); }
  res.json({ code: c, message: 'Lead creado' });
});

app.patch('/api/leads/:code', authMiddleware, async (req, res) => {
  const b = req.body || {};
  if (b.estado && !['nuevo','asignado','contactado','seguimiento','oportunidad','ganado','perdido'].includes(b.estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  const data = {};
  if (b.estado !== undefined || b.status !== undefined) data.status = b.estado || b.status;
  if (b.client !== undefined) data.firstName = b.client;
  if (b.company !== undefined) data.company = b.company;
  if (b.phone !== undefined) data.phone = b.phone;
  if (b.email !== undefined) data.email = b.email;
  if (b.canal !== undefined) data.channel = b.canal;
  if (b.linea !== undefined || b.businessLine !== undefined) data.businessLine = b.linea || b.businessLine;
  if (b.product !== undefined) data.product = b.product;
  if (b.description !== undefined) data.description = b.description;
  if (b.score !== undefined) data.score = parseInt(b.score) || 3;
  if (b.valorEstimado !== undefined || b.estimatedValue !== undefined) {
    const raw = String(b.valorEstimado || b.estimatedValue || '');
    const clean = raw.replace(/[^0-9]/g, '');
    data.estimatedValue = clean ? parseInt(clean, 10) : null;
  }
  if (b.lossReason !== undefined) data.lossReason = b.lossReason;
  if (b.proxAccion !== undefined || b.nextAction !== undefined) data.nextAction = b.proxAccion || b.nextAction || '';
  if (b.proxFecha !== undefined) data.recontactAt = b.proxFecha ? new Date(b.proxFecha.split('/').reverse().join('-')) : null;
  if (b.responsable !== undefined && !b.responsable.includes('@')) data.responsableId = b.responsable;
  try {
    const leadRef = await prisma.lead.findUnique({ where: { code: req.params.code }, select: { id: true } });
    const leadId = leadRef ? leadRef.id : null;
    if (b.bitacora !== undefined && b.bitacora.trim() !== '' && leadId) {
      await prisma.interaction.create({ data: { leadId, userId: req.user?.id, type: 'nota', content: b.bitacora, previousStatus: undefined, newStatus: undefined, createdAt: new Date() } }).catch(e => console.error('Interaction error:', e.message));
    }
    if (b.tareas !== undefined && b.tareas.trim() !== '' && leadId) {
      await prisma.task.create({ data: { leadId, title: b.tareas, notes: b.tareas, dueDate: new Date(Date.now() + 7 * 86400000), completed: false } }).catch(e => console.error('Task error:', e.message));
    }
    if (b.auditLogs !== undefined && b.auditLogs.trim() !== '' && leadId) {
      const newLog = await prisma.auditLog.create({ data: { leadId, userId: req.user?.id, action: b.auditLogs || 'Actualización', detail: '', createdAt: new Date() } }).catch(e => console.error('AuditLog error:', e.message));
      if (newLog && newLog.id) {
        const recent = await prisma.auditLog.findMany({ where: { leadId }, orderBy: { createdAt: 'desc' }, take: 3, select: { id: true } }).catch(() => []);
        const keepIds = recent.map(r => r.id).filter(Boolean);
        await prisma.auditLog.deleteMany({ where: { leadId, NOT: { id: { in: keepIds } } } }).catch(() => {});
      }
    }
  } catch (e) { console.error('Relation creation error:', e.message); }
  try {
    const lead = await prisma.lead.update({ where: { code: req.params.code }, data });
    return res.json({ message: 'Actualizado', code: lead.code, estado: lead.status });
  } catch (e) { console.error('PATCH error:', e.message); }
  res.json({ message: 'Actualizado' });
});

app.post('/api/leads/:code/actions', authMiddleware, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { code: req.params.code } })
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado' })
    const act = await prisma.leadAction.create({
      data: { leadId: lead.id, action: req.body.action || '', actionDate: req.body.actionDate ? new Date(req.body.actionDate.split('/').reverse().join('-')) : null }
    })
    res.json(act)
  } catch (e) { console.error('POST action error:', e.message); res.status(500).json({ error: 'Error al guardar acción' }) }
})

app.get('/api/leads/:code/actions', authMiddleware, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { code: req.params.code }, include: { leadActions: true } })
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado' })
    res.json(lead.leadActions || [])
  } catch (e) { console.error('GET actions error:', e.message); res.status(500).json({ error: 'Error' }) }
})

app.get('/api/audit-recent', authMiddleware, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
    res.json(logs.map(a => ({ action: a.action, detail: a.detail || '', createdAt: a.createdAt ? a.createdAt.toISOString() : '', code: a.leadId ? null : '' })));
  } catch (e) { console.error('GET audit-recent error:', e); res.status(500).json({ error: 'Error' }); }
});

app.delete('/api/leads/:code', authMiddleware, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { code: req.params.code } })
    if (lead) await prisma.auditLog.create({ data: { leadId: lead.id, userId: req.user?.id || '', action: 'Lead eliminado: ' + req.params.code, detail: (lead.firstName || '') + ' / ' + (lead.company || ''), createdAt: new Date() } })
    await prisma.lead.delete({ where: { code: req.params.code } });
    res.json({ message: 'Lead eliminado' });
  } catch (e) { console.error('DELETE lead error:', e.message); res.status(500).json({ error: 'No se pudo eliminar' }); }
});

app.get('/api/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Solo administrador' });
  try {
    const users = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, email: true, role: true, line: true, active: true, createdAt: true } });
    res.json(users);
  } catch (e) { res.status(500).json({ error: 'Error al listar usuarios' }); }
});

app.post('/api/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Solo administrador' });
  const { name, email, password, role, line } = req.body || {};
  if (!line || !line.trim()) return res.status(400).json({ error: 'Línea obligatoria' });
  if (!name || !email || !password) return res.status(400).json({ error: 'Faltan campos obligatorios' });
  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: require('crypto').createHash('sha256').update(password).digest('hex'), role: role || 'VENDEDOR', line: line || null, active: true }
    });
    res.json({ message: 'Usuario creado', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: 'Error al crear usuario' }); }
});

app.patch('/api/users/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) return res.status(403).json({ error: 'Solo administrador o tu propio perfil' });
  try {
    const { name, email, line } = req.body || {};
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { name, email, line: line || null } });
    res.json({ message: 'Perfil actualizado', user: { id: user.id, name: user.name, email: user.email, role: user.role, line: user.line } });
  } catch (e) { res.status(500).json({ error: 'Error al actualizar usuario' }); }
});

app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Solo administrador' });
  if (req.user.id === req.params.id) return res.status(403).json({ error: 'No puedes eliminar tu propio usuario' });
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (existing && (existing.email === 'admin@craisa.com' || existing.name === 'Admin CRAISA')) return res.status(403).json({ error: 'No se puede eliminar al usuario Admin CRAISA' });
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: 'Usuario eliminado' });
  } catch (e) { res.status(500).json({ error: 'Error al eliminar usuario' }); }
});

app.get('/api/leads/export', authMiddleware, (req, res) => {
  res.setHeader('Content-Type', 'text/csv;charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send('code,client,company,status,channel,linea,proxAccion,proxFecha\nLEAD-2026-0142,Ana Rodríguez,Finca La Sabana,nuevo,WhatsApp,Agrícola,Hoy,22/10/2026');
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
