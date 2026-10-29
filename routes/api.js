const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const users = { 'admin@craisa.com': { password: 'demo123', role: 'ADMIN', name: 'Admin CRAISA', initials: 'AD' } };
  const u = users[email];
  if (u && u.password === password) {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: email, role: u.role, name: u.name, initials: u.initials }, process.env.JWT_SECRET || 'craisa-dev-secret', { expiresIn: '8h' });
    return res.json({ token, user: { email, role: u.role, name: u.name, initials: u.initials } });
  }
  return res.status(401).json({ error: 'Credenciales incorrectas' });
});

router.get('/leads', authMiddleware, async (req, res) => {
  const user = req.user || {};
  let where = {};
  if (user.role === 'VENDEDOR' && user.name) {
    where.responsableId = user.name;
  }
  const data = await prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(data);
});

router.get('/leads/:id', authMiddleware, async (req, res) => {
  const item = await prisma.lead.findUnique({ where: { code: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Lead no encontrado' });
  res.json(item);
});

router.post('/leads', authMiddleware, async (req, res) => {
  const newLead = await prisma.lead.create({ data: {
    ...req.body,
    code: req.body.code || 'LEAD-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*10000)).padStart(4,'0'),
    status: req.body.status || req.body.estado || 'nuevo',
  }});
  res.status(201).json(newLead);
});

router.patch('/leads/:id', authMiddleware, async (req, res) => {
  const updated = await prisma.lead.update({ where: { code: req.params.id }, data: req.body });
  res.json(updated);
});

router.get('/leads/export', authMiddleware, async (req, res) => {
  const data = await prisma.lead.findMany();
  const header = 'code,client,company,status,channel,linear,valorEstimado,lossReason,fecha\n';
  const rows = data.map(l => [
    l.code || '', (l.client || '').replace(/,/g, ''), (l.company || '').replace(/,/g, ''),
    l.status || '', l.channel || '', l.businessLine || '',
    l.estimatedValue || '', l.lossReason || '', l.entryDate ? new Date(l.entryDate).toISOString() : ''
  ].join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(header + rows);
});

module.exports = router;
