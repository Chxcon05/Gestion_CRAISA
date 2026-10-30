const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.findUnique({ where: { code: 'LEAD-2026-0338' }, include: { leadActions: { take: 3, orderBy: { createdAt: 'desc' } } } }).then(l => console.log('LEAD-2026-0338 actions:', (l ? l.leadActions || [] : []).map(a => a.action))).catch(e => console.log('err')).finally(() => p.$disconnect());
