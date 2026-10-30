const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.auditLog.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { lead: true } }).then(r => {
  r.forEach(a => console.log('LEAD', a.lead ? a.lead.code : '—', 'action=', a.action, 'detail=', a.detail));
  p.$disconnect();
});
