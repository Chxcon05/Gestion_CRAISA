const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.findUnique({ where: { code: 'LEAD-2026-1017' }, include: { auditLogs: { take: 2, orderBy: { createdAt: 'desc' } }, interactions: { take: 2, orderBy: { createdAt: 'desc' } }, leadActions: { take: 2, orderBy: { createdAt: 'desc' } } }).then(l => {
  console.log('code=', l ? l.code : 'NO ENCONTRADO');
  if (l) console.log('createdAt=', l.createdAt ? l.createdAt.toISOString() : '—', 'inter=', (l.interactions||[]).length, 'audit=', (l.auditLogs||[]).length, 'acts=', (l.leadActions||[]).length);
  p.$disconnect();
});
