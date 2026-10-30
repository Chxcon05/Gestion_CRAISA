const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.auditLog.findMany({ where: { action: { contains: 'eliminado' } }, orderBy: { createdAt: 'desc' }, take: 3 }).then(r => {
  r.forEach(a => console.log('AUDIT', a.createdAt, 'leadId=', a.leadId, 'action=', a.action, 'detail=', a.detail));
  p.$disconnect();
});
