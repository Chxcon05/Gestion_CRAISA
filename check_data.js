const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.findMany({ take: 5, include: { interactions: { take: 3, orderBy: { createdAt: 'desc' } }, auditLogs: { take: 3, orderBy: { createdAt: 'desc' } }, leadActions: { take: 3, orderBy: { createdAt: 'desc' } } }).then(r => {
  r.forEach(l => {
    const inter = (l.interactions || []).length;
    const audit = (l.auditLogs || []).length;
    const act = (l.leadActions || []).length;
    const audit0 = l.auditLogs && l.auditLogs[0] ? l.auditLogs[0].action : '—';
    const inter0 = l.interactions && l.interactions[0] ? l.interactions[0].content : '—';
    const act0 = l.leadActions && l.leadActions[0] ? l.leadActions[0].action : '—';
    console.log(l.code, 'inter:', inter, 'audit:', audit, 'acts:', act, 'audit[0]=' + audit0, 'inter[0]=' + inter0, 'act[0]=' + act0);
  });
  p.$disconnect();
});
