const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.findMany({ take: 3, orderBy: { createdAt: 'desc' }, include: { auditLogs: { take: 1, orderBy: { createdAt: 'desc' } } } }).then(r => {
  r.forEach(l => console.log(l.code, 'creado:', l.createdAt ? l.createdAt.toISOString() : '—', 'audit[0]:', l.auditLogs && l.auditLogs[0] ? l.auditLogs[0].action : '—'));
  p.$disconnect();
});
