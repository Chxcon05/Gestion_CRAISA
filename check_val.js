const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.findMany({ where: { code: 'LEAD-2026-0527' }, select: { code: true, estimatedValue: true, firstName: true } }).then(r => console.log('DB nuevo:', r)).catch(e => console.log('err')).finally(() => p.$disconnect());
